import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, teams, teamMembers, dataTeamPartners, requestForPartners } from "@/db/schema";
import { count, eq, and, isNotNull, isNull, ne, sql } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isPartner = (session?.user as any)?.role === 'PARTNER';
    const partnerId = isPartner ? (session.user as any).id : null;

    // 1. KPI Basic Counts
    const [partnersCount] = await db.select({ value: count() }).from(users).where(eq(users.role, 'PARTNER'));
    
    // Teams count
    let teamsQuery = db.select({ value: count() }).from(teams).where(ne(teams.status, 'CANCELED'));
    if (isPartner) {
      teamsQuery = db.select({ value: count() })
        .from(teams)
        .innerJoin(dataTeamPartners, eq(teams.dataTeamPartnerId, dataTeamPartners.id))
        .where(and(ne(teams.status, 'CANCELED'), eq(dataTeamPartners.partnerId, partnerId!))) as any;
    }
    const [teamsCount] = await teamsQuery;

    // Members count
    let membersQuery = db.select({ value: count() })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(and(ne(teams.status, 'CANCELED'), eq(teamMembers.isActive, 1)));
    
    if (isPartner) {
      membersQuery = db.select({ value: count() })
        .from(teamMembers)
        .innerJoin(teams, eq(teamMembers.teamId, teams.id))
        .innerJoin(dataTeamPartners, eq(teams.dataTeamPartnerId, dataTeamPartners.id))
        .where(and(
          ne(teams.status, 'CANCELED'), 
          eq(dataTeamPartners.partnerId, partnerId!),
          eq(teamMembers.isActive, 1)
        )) as any;
    }
    const [membersCount] = await membersQuery;

    // Certified Members count
    let certifiedQuery = db.select({ value: count() })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(and(
        ne(teams.status, 'CANCELED'), 
        isNotNull(teamMembers.certificateFilePath),
        eq(teamMembers.isActive, 1)
      ));

    if (isPartner) {
      certifiedQuery = db.select({ value: count() })
        .from(teamMembers)
        .innerJoin(teams, eq(teamMembers.teamId, teams.id))
        .innerJoin(dataTeamPartners, eq(teams.dataTeamPartnerId, dataTeamPartners.id))
        .where(and(
          ne(teams.status, 'CANCELED'), 
          isNotNull(teamMembers.certificateFilePath),
          eq(dataTeamPartners.partnerId, partnerId!),
          eq(teamMembers.isActive, 1)
        )) as any;
    }
    const [certifiedMembersCount] = await certifiedQuery;

    // Requests count
    let requestsQuery = db.select({ value: count() }).from(requestForPartners);
    if (isPartner) {
      requestsQuery = db.select({ value: count() })
        .from(requestForPartners)
        .innerJoin(dataTeamPartners, eq(requestForPartners.id, dataTeamPartners.requestId))
        .where(eq(dataTeamPartners.partnerId, partnerId!)) as any;
    }
    const [requestsCount] = await requestsQuery;

    // 2. Onboarding Pipeline Logic
    // For Partners, focus on their assigned quota or capacity
    let totalKebutuhanQuery = db.select({ value: sql<number>`SUM(${requestForPartners.jumlahKebutuhan})` }).from(requestForPartners);
    if (isPartner) {
      totalKebutuhanQuery = db.select({ value: sql<number>`SUM(${requestForPartners.jumlahKebutuhan})` })
        .from(requestForPartners)
        .innerJoin(dataTeamPartners, eq(requestForPartners.id, dataTeamPartners.requestId))
        .where(eq(dataTeamPartners.partnerId, partnerId!)) as any;
    }
    const [totalKebutuhan] = await totalKebutuhanQuery;
    const totalQuest = totalKebutuhan.value || 0;
    const unassignedSlots = Math.max(0, totalQuest - teamsCount.value);
    
    let sourcingTeamsQuery = db.select({ value: count() }).from(teams).where(eq(teams.status, 'SOURCING'));
    if (isPartner) {
      sourcingTeamsQuery = db.select({ value: count() })
        .from(teams)
        .innerJoin(dataTeamPartners, eq(teams.dataTeamPartnerId, dataTeamPartners.id))
        .where(and(eq(teams.status, 'SOURCING'), eq(dataTeamPartners.partnerId, partnerId!))) as any;
    }
    const [sourcingTeamsCount] = await sourcingTeamsQuery;
    const totalSourcing = unassignedSlots + sourcingTeamsCount.value;

    // Pipeline stages
    let scheduledQuery = db.select({ value: count() })
      .from(teams)
      .where(and(ne(teams.status, 'CANCELED'), sql`${teams.status} IN ('WAIT_SCHEDULE_TRAINING', 'TRAINING_SCHEDULED')`));
    
    if (isPartner) {
      scheduledQuery = db.select({ value: count() })
        .from(teams)
        .innerJoin(dataTeamPartners, eq(teams.dataTeamPartnerId, dataTeamPartners.id))
        .where(and(ne(teams.status, 'CANCELED'), sql`${teams.status} IN ('WAIT_SCHEDULE_TRAINING', 'TRAINING_SCHEDULED')`, eq(dataTeamPartners.partnerId, partnerId!))) as any;
    }
    const [scheduledTeamsCount] = await scheduledQuery;

    let evaluatedQuery = db.select({ value: count() }).from(teams).where(eq(teams.status, 'TRAINING_EVALUATED'));
    if (isPartner) {
      evaluatedQuery = db.select({ value: count() })
        .from(teams)
        .innerJoin(dataTeamPartners, eq(teams.dataTeamPartnerId, dataTeamPartners.id))
        .where(and(eq(teams.status, 'TRAINING_EVALUATED'), eq(dataTeamPartners.partnerId, partnerId!))) as any;
    }
    const [evaluatedTeamsCount] = await evaluatedQuery;
    
    // Other metrics
    let pendingCertsQuery = db.select({ value: count() }).from(teamMembers).innerJoin(teams, eq(teamMembers.teamId, teams.id)).where(and(eq(teamMembers.isActive, 1), eq(teamMembers.isAttendedTraining, 1), isNull(teamMembers.certificateFilePath), ne(teams.status, 'CANCELED')));
    if (isPartner) {
      pendingCertsQuery = db.select({ value: count() }).from(teamMembers).innerJoin(teams, eq(teamMembers.teamId, teams.id)).innerJoin(dataTeamPartners, eq(teams.dataTeamPartnerId, dataTeamPartners.id)).where(and(eq(teamMembers.isActive, 1), eq(teamMembers.isAttendedTraining, 1), isNull(teamMembers.certificateFilePath), ne(teams.status, 'CANCELED'), eq(dataTeamPartners.partnerId, partnerId!))) as any;
    }
    const [pendingCerts] = await pendingCertsQuery;
    
    let issuedEmailsQuery = db.select({ value: count() }).from(teamMembers).innerJoin(teams, eq(teamMembers.teamId, teams.id)).where(and(eq(teamMembers.isActive, 1), isNotNull(teamMembers.alitaExtEmail), ne(teams.status, 'CANCELED')));
    if (isPartner) {
      issuedEmailsQuery = db.select({ value: count() }).from(teamMembers).innerJoin(teams, eq(teamMembers.teamId, teams.id)).innerJoin(dataTeamPartners, eq(teams.dataTeamPartnerId, dataTeamPartners.id)).where(and(eq(teamMembers.isActive, 1), isNotNull(teamMembers.alitaExtEmail), ne(teams.status, 'CANCELED'), eq(dataTeamPartners.partnerId, partnerId!))) as any;
    }
    const [issuedEmails] = await issuedEmailsQuery;

    const pipelineData = [
      { name: "Sourcing/Assigned", value: totalSourcing },
      { name: "Training Scheduled", value: scheduledTeamsCount.value },
      { name: "Training Evaluated", value: evaluatedTeamsCount.value },
      { name: "Ext Emails Issued", value: issuedEmails.value }
    ];

    // 3. Distribution Map Refinement
    // For Admin: Show request demand per province
    // For Partner: Show THEIR actual formed teams per province
    let provinceMap: Record<string, number> = {};

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
