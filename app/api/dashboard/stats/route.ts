import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, teams, teamMembers, dataTeamPartners, requestForPartners } from "@/db/schema";
import { count, eq, and, isNotNull, isNull, ne, sql } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: Fetch dashboard KPI statistics
 *     description: Retrieves aggregated metrics for the dashboard. Admins see global data, while Partners see data filtered for their own company.
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Dashboard statistics including KPIs, pipeline stages, and province distribution.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 partners: { type: number }
 *                 certifiedMembers: { type: number }
 *                 teams: { type: number }
 *                 members: { type: number }
 *                 pipelineData:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name: { type: string }
 *                       value: { type: number }
 *                 provinceData:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name: { type: string }
 *                       demand: { type: number }
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isPartner = session?.user?.role === 'PARTNER';
    const partnerId = isPartner ? session.user.id : null;

    // 1. KPI Basic Counts
    const [partnersCount] = await db.select({ value: count() }).from(users).where(eq(users.role, 'PARTNER'));

    // Teams count
    const [teamsCount] = isPartner
      ? await db.select({ value: count() })
          .from(teams)
          .innerJoin(dataTeamPartners, eq(teams.dataTeamPartnerId, dataTeamPartners.id))
          .where(and(ne(teams.status, 'CANCELED'), eq(dataTeamPartners.partnerId, partnerId!)))
      : await db.select({ value: count() }).from(teams).where(ne(teams.status, 'CANCELED'));

    // Members count
    const [membersCount] = isPartner
      ? await db.select({ value: count() })
          .from(teamMembers)
          .innerJoin(teams, eq(teamMembers.teamId, teams.id))
          .innerJoin(dataTeamPartners, eq(teams.dataTeamPartnerId, dataTeamPartners.id))
          .where(and(
            ne(teams.status, 'CANCELED'),
            eq(dataTeamPartners.partnerId, partnerId!),
            eq(teamMembers.isActive, 1)
          ))
      : await db.select({ value: count() })
          .from(teamMembers)
          .innerJoin(teams, eq(teamMembers.teamId, teams.id))
          .where(and(ne(teams.status, 'CANCELED'), eq(teamMembers.isActive, 1)));

    // Certified Members count
    const [certifiedMembersCount] = isPartner
      ? await db.select({ value: count() })
          .from(teamMembers)
          .innerJoin(teams, eq(teamMembers.teamId, teams.id))
          .innerJoin(dataTeamPartners, eq(teams.dataTeamPartnerId, dataTeamPartners.id))
          .where(and(
            ne(teams.status, 'CANCELED'),
            isNotNull(teamMembers.certificateFilePath),
            eq(dataTeamPartners.partnerId, partnerId!),
            eq(teamMembers.isActive, 1)
          ))
      : await db.select({ value: count() })
          .from(teamMembers)
          .innerJoin(teams, eq(teamMembers.teamId, teams.id))
          .where(and(
            ne(teams.status, 'CANCELED'),
            isNotNull(teamMembers.certificateFilePath),
            eq(teamMembers.isActive, 1)
          ));

    // Requests count
    const [requestsCount] = isPartner
      ? await db.select({ value: count() })
          .from(requestForPartners)
          .innerJoin(dataTeamPartners, eq(requestForPartners.id, dataTeamPartners.requestId))
          .where(eq(dataTeamPartners.partnerId, partnerId!))
      : await db.select({ value: count() }).from(requestForPartners);

    // 2. Onboarding Pipeline Logic
    // For Partners, focus on their assigned quota or capacity
    const [totalKebutuhan] = isPartner
      ? await db.select({ value: sql<number>`SUM(${requestForPartners.jumlahKebutuhan})` })
          .from(requestForPartners)
          .innerJoin(dataTeamPartners, eq(requestForPartners.id, dataTeamPartners.requestId))
          .where(eq(dataTeamPartners.partnerId, partnerId!))
      : await db.select({ value: sql<number>`SUM(${requestForPartners.jumlahKebutuhan})` }).from(requestForPartners);
    const totalQuest = totalKebutuhan.value || 0;
    const unassignedSlots = Math.max(0, totalQuest - teamsCount.value);

    const [sourcingTeamsCount] = isPartner
      ? await db.select({ value: count() })
          .from(teams)
          .innerJoin(dataTeamPartners, eq(teams.dataTeamPartnerId, dataTeamPartners.id))
          .where(and(eq(teams.status, 'SOURCING'), eq(dataTeamPartners.partnerId, partnerId!)))
      : await db.select({ value: count() }).from(teams).where(eq(teams.status, 'SOURCING'));
    const totalSourcing = unassignedSlots + sourcingTeamsCount.value;

    // Pipeline stages
    const [scheduledTeamsCount] = isPartner
      ? await db.select({ value: count() })
          .from(teams)
          .innerJoin(dataTeamPartners, eq(teams.dataTeamPartnerId, dataTeamPartners.id))
          .where(and(ne(teams.status, 'CANCELED'), sql`${teams.status} IN ('WAIT_SCHEDULE_TRAINING', 'TRAINING_SCHEDULED')`, eq(dataTeamPartners.partnerId, partnerId!)))
      : await db.select({ value: count() })
          .from(teams)
          .where(and(ne(teams.status, 'CANCELED'), sql`${teams.status} IN ('WAIT_SCHEDULE_TRAINING', 'TRAINING_SCHEDULED')`));

    const [evaluatedTeamsCount] = isPartner
      ? await db.select({ value: count() })
          .from(teams)
          .innerJoin(dataTeamPartners, eq(teams.dataTeamPartnerId, dataTeamPartners.id))
          .where(and(eq(teams.status, 'TRAINING_EVALUATED'), eq(dataTeamPartners.partnerId, partnerId!)))
      : await db.select({ value: count() }).from(teams).where(eq(teams.status, 'TRAINING_EVALUATED'));

    // Other metrics
    const [pendingCerts] = isPartner
      ? await db.select({ value: count() }).from(teamMembers).innerJoin(teams, eq(teamMembers.teamId, teams.id)).innerJoin(dataTeamPartners, eq(teams.dataTeamPartnerId, dataTeamPartners.id)).where(and(eq(teamMembers.isActive, 1), eq(teamMembers.isAttendedTraining, 1), isNull(teamMembers.certificateFilePath), ne(teams.status, 'CANCELED'), eq(dataTeamPartners.partnerId, partnerId!)))
      : await db.select({ value: count() }).from(teamMembers).innerJoin(teams, eq(teamMembers.teamId, teams.id)).where(and(eq(teamMembers.isActive, 1), eq(teamMembers.isAttendedTraining, 1), isNull(teamMembers.certificateFilePath), ne(teams.status, 'CANCELED')));

    const [issuedEmails] = isPartner
      ? await db.select({ value: count() }).from(teamMembers).innerJoin(teams, eq(teamMembers.teamId, teams.id)).innerJoin(dataTeamPartners, eq(teams.dataTeamPartnerId, dataTeamPartners.id)).where(and(eq(teamMembers.isActive, 1), isNotNull(teamMembers.alitaExtEmail), ne(teams.status, 'CANCELED'), eq(dataTeamPartners.partnerId, partnerId!)))
      : await db.select({ value: count() }).from(teamMembers).innerJoin(teams, eq(teamMembers.teamId, teams.id)).where(and(eq(teamMembers.isActive, 1), isNotNull(teamMembers.alitaExtEmail), ne(teams.status, 'CANCELED')));

    const pipelineData = [
      { name: "Sourcing/Assigned", value: totalSourcing },
      { name: "Training Scheduled", value: scheduledTeamsCount.value },
      { name: "Training Evaluated", value: evaluatedTeamsCount.value },
      { name: "Ext Emails Issued", value: issuedEmails.value }
    ];

    // 3. Distribution Map Refinement
    // For Admin: Show request demand per province
    // For Partner: Show THEIR actual formed teams per province
    const provinceMap: Record<string, number> = {};

    if (isPartner) {
      // Logic for Partner: Count their teams per province
      const partnerTeams = await db.select({
        provinsi: requestForPartners.provinsi,
        count: count(teams.id)
      })
      .from(teams)
      .innerJoin(dataTeamPartners, eq(teams.dataTeamPartnerId, dataTeamPartners.id))
      .innerJoin(requestForPartners, eq(dataTeamPartners.requestId, requestForPartners.id))
      .where(and(ne(teams.status, 'CANCELED'), eq(dataTeamPartners.partnerId, partnerId!)))
      .groupBy(requestForPartners.provinsi);

      for (const t of partnerTeams) {
        provinceMap[t.provinsi] = t.count;
      }
    } else {
      // Logic for Admin: Global demand per province
      const allRequests = await db.select({
        provinsi: requestForPartners.provinsi,
        demand: requestForPartners.jumlahKebutuhan
      }).from(requestForPartners);

      for (const req of allRequests) {
        if (!provinceMap[req.provinsi]) provinceMap[req.provinsi] = 0;
        provinceMap[req.provinsi] += req.demand;
      }
    }

    const provinceData = Object.keys(provinceMap)
      .map(key => ({ name: key, demand: Number(provinceMap[key]) }))
      .filter(item => item.demand > 0)
      .sort((a, b) => b.demand - a.demand)
      .slice(0, 5);

    return NextResponse.json({
      partners: partnersCount.value,
      certifiedMembers: certifiedMembersCount.value,
      teams: teamsCount.value,
      members: membersCount.value,
      requests: requestsCount.value,
      scheduled: scheduledTeamsCount.value,
      passed: evaluatedTeamsCount.value,
      pendingCerts: pendingCerts.value,
      issuedEmails: issuedEmails.value,
      totalWithoutTeam: totalSourcing,
      pipelineData,
      provinceData
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
