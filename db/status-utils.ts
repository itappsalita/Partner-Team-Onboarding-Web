import { db } from "./index";
import { requestForPartners, dataTeamPartners, teams, teamMembers } from "./schema";
import { eq, sql, and, ne } from "drizzle-orm";

/**
 * Status Priority (Lowest to Highest)
 * Any missing team (quota not met) counts as the lowest possible status: 'REQUESTED'
 */
const STATUS_HIERARCHY: Record<string, number> = {
  'REQUESTED': 0,
  'SOURCING': 1,
  'WAIT_SCHEDULE_TRAINING': 2,
  'TRAINING_SCHEDULED': 2, // Training Scheduled counts as ON_TRAINING
  'TRAINING_EVALUATED': 3, // Evaluation Pass
  'COMPLETED': 4
};

const REQUEST_STATUS_MAPPING: Record<number, any> = {
  0: 'REQUESTED',
  1: 'SOURCING',
  2: 'ON_TRAINING',
  3: 'TRAINED',
  4: 'COMPLETED'
};

/**
 * Recalculates the status of a specific Team based on quota and leader existence.
 * Returns the new status string.
 */
/**
 * Recalculates the status of a specific Team based on the certification status 
 * of its members. Updates the team status to COMPLETED only when all members 
 * have issued certificates.
 * 
 * @param {any} tx - The Drizzle transaction object or database instance.
 * @param {string} teamId - The ID of the team to recalculate.
 * @returns {Promise<void>}
 */
export async function recalculateTeamStatus(tx: any, teamId: string) {
  // 1. Get the team and its request configuration
  const team = await tx.query.teams.findFirst({
    where: eq(teams.id, teamId),
    with: {
        dataTeamPartner: {
            with: {
                request: true
            }
        },
        members: {
            where: eq(teamMembers.isActive, 1)
        }
    }
  });

  if (!team) return 'SOURCING';

  const quota = team.dataTeamPartner?.request?.membersPerTeam || 0;
  const currentMembers = team.members || [];
  const currentMemberCount = currentMembers.length;
  const hasLeader = currentMembers.some((m: any) => m.position === 'Leader');

  // 2. Logika Downgrade:
  // Jika anggota kurang dari kuota ATAU tidak ada leader, status harus SOURCING
  if (currentMemberCount < quota || !hasLeader) {
    if (team.status !== 'SOURCING' && team.status !== 'CANCELED' && team.status !== 'COMPLETED') {
      await tx.update(teams)
        .set({ status: 'SOURCING' })
        .where(eq(teams.id, teamId));
      
      const reason = currentMemberCount < quota ? `Under Quota: ${currentMemberCount}/${quota}` : "No Leader Found";
      console.log(`[STATUS] Team #${teamId} downgraded to SOURCING (${reason})`);
      return 'SOURCING';
    }
  }

  return team.status;
}

/**
 * Recalculates the status of a Partner Assignment (dataTeamPartners) 
 * based on its children teams.
 */
/**
 * Recalculates the status of a specific Partner Assignment (dataTeamPartner).
 * Aggregates the statuses of all teams under this assignment.
 * 
 * @param {any} tx - The Drizzle transaction object or database instance.
 * @param {string} assignmentId - The ID of the data_team_partner record.
 * @returns {Promise<void>}
 */
export async function recalculateAssignmentStatus(tx: any, assignmentId: string) {
  const assignment = await tx.query.dataTeamPartners.findFirst({
    where: eq(dataTeamPartners.id, assignmentId),
    with: {
      teams: true
    }
  });

  if (!assignment) return;

  // If assignment is canceled or COMPLETED, leave it as is (lock status)
  if (assignment.status === 'CANCELED' || assignment.status === 'COMPLETED') return;

  // 1. Get status of all teams
  const teamStatuses = assignment.teams.filter((t: any) => t.status !== 'CANCELED').map((t: any) => t.status);
  
  if (teamStatuses.length === 0) {
    await tx.update(dataTeamPartners)
      .set({ status: 'SOURCING' })
      .where(and(
        eq(dataTeamPartners.id, assignmentId),
        ne(dataTeamPartners.status, 'COMPLETED')
      ));
    return;
  }

  // 2. Find the "worst" status
  let lowestScore = 999;
  for (const s of teamStatuses) {
    const score = STATUS_HIERARCHY[s] ?? 1;
    if (score < lowestScore) lowestScore = score;
  }

  // Map to Assignment Status
  // SOURCING (1) -> SOURCING
  // WAIT_SCHEDULE_TRAINING/TRAINING_SCHEDULED (2) -> ON_TRAINING
  // TRAINING_EVALUATED (3) -> TRAINED
  // COMPLETED (4) -> COMPLETED
  const mapping: Record<number, string> = {
    1: 'SOURCING',
    2: 'ON_TRAINING',
    3: 'TRAINED',
    4: 'COMPLETED'
  };

  const newStatus = mapping[lowestScore] || 'SOURCING';

  if (assignment.status !== newStatus) {
    await tx.update(dataTeamPartners)
      .set({ status: newStatus })
      .where(and(
        eq(dataTeamPartners.id, assignmentId),
        ne(dataTeamPartners.status, 'COMPLETED')
      ));
    
    console.log(`[STATUS] Assignment #${assignmentId} updated to ${newStatus}`);
  }
}

/**
 * Recalculates the status of a Request For Partner based on the 
 * "worst-case" status among all required teams.
 */
/**
 * Recalculates the overarching status of a Request based on its partner assignments.
 * Implements a 'worst-case' logic hierarchy where the lowest status in the chain 
 * determines the overall request status.
 * 
 * Hierarchy: SOURCING > ON_TRAINING > PARTIAL > COMPLETED
 * 
 * @param {any} tx - The Drizzle transaction object or database instance.
 * @param {string} requestId - The ID of the request to recalculate.
 * @returns {Promise<void>}
 */
export async function recalculateRequestStatus(tx: any, requestId: string) {
  // 1. Get the Request Quota and Current Status
  const [request] = await tx.select({ 
    jumlahKebutuhan: requestForPartners.jumlahKebutuhan,
    status: requestForPartners.status
  }).from(requestForPartners).where(eq(requestForPartners.id, requestId));

  if (!request) return;

  // If request is already COMPLETED, lock it
  if (request.status === 'COMPLETED') return;

  // 2. Get all ACTIVE teams currently assigned for this request
  // IMPORTANT: Exclude any CANCELED assignments or teams from the calculation
  const allTeams = await tx.select({
    status: teams.status
  })
  .from(dataTeamPartners)
  .innerJoin(teams, eq(teams.dataTeamPartnerId, dataTeamPartners.id))
  .where(and(
    eq(dataTeamPartners.requestId, requestId),
    ne(dataTeamPartners.status, 'CANCELED'),
    ne(teams.status, 'CANCELED')
  ));

  // 3. Logic:
  // - If assigned teams < quota, lowest status is 'REQUESTED'
  // - Otherwise, lowest status is the minimum status among all teams
    
  let lowestScore = 999;

  if (allTeams.length < request.jumlahKebutuhan) {
    lowestScore = 0; // REQUESTED
  } else {
    for (const team of allTeams) {
        const score = STATUS_HIERARCHY[team.status] ?? 1; // Default to SOURCING
        if (score < lowestScore) {
            lowestScore = score;
        }
    }
  }

  // 4. Map score back to requestStatusEnum
  const newStatus = REQUEST_STATUS_MAPPING[lowestScore] || 'REQUESTED';

  // 5. Update the Request Table (with lock check)
  await tx.update(requestForPartners)
    .set({ status: newStatus })
    .where(and(
        eq(requestForPartners.id, requestId),
        ne(requestForPartners.status, 'COMPLETED')
    ));
    
  console.log(`[STATUS] Request #${requestId} recalculated to ${newStatus}`);
}
