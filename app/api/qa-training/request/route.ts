import { NextResponse } from "next/server";
import { db } from "@/db";
import { dataTeamPartners, teams, trainingProcesses, teamMembers } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { recalculateRequestStatus, recalculateAssignmentStatus } from "@/db/status-utils";
import { generateUuid } from "@/lib/uuid";
import { notifyUsersByRole } from "@/lib/notifications";

export async function POST(req: Request) {
  try {
    const { dataTeamPartnerId, teamId } = await req.json();

    if (!dataTeamPartnerId && !teamId) {
      return NextResponse.json({ error: "Missing target ID (dataTeamPartnerId or teamId)" }, { status: 400 });
    }

    let notificationDisplayId = "";
    let highlightId = "";

    // 1. Transaction to update statuses
    await db.transaction(async (tx) => {
      let targetTeamIds: string[] = [];
      let currentAssignmentId = dataTeamPartnerId;

      if (teamId) {
        // Individual Team Request
        const team = await tx.query.teams.findFirst({
          where: eq(teams.id, teamId),
        });
        if (!team) throw new Error("Team not found");
        targetTeamIds = [teamId];
        currentAssignmentId = team.dataTeamPartnerId;
        notificationDisplayId = team.displayId || team.id;
      } else {
        // Batch Assignment Request
        const partnerTeams = await tx.query.teams.findMany({
          where: eq(teams.dataTeamPartnerId, dataTeamPartnerId),
        });
        if (partnerTeams.length === 0) throw new Error("No teams found for this assignment");
        targetTeamIds = partnerTeams.map(t => t.id);
      }

      const assignment = await tx.query.dataTeamPartners.findFirst({
        where: eq(dataTeamPartners.id, currentAssignmentId),
      });

      if (!assignment) throw new Error("Partner Assignment not found");
      
      if (!notificationDisplayId) {
        notificationDisplayId = assignment.displayId || assignment.id;
      }

      highlightId = targetTeamIds[0] || currentAssignmentId;

      // 1a. Process Each Team for Status Upgrade or Training Queue
      for (const tId of targetTeamIds) {
        // Fetch current active members for this team
        const members = await tx.query.teamMembers.findMany({
          where: and(eq(teamMembers.teamId, tId), eq(teamMembers.isActive, 1))
        });

        const allTrained = members.length > 0 && members.every(m => m.isAttendedTraining === 1);
        const newStatus = allTrained ? 'COMPLETED' : 'WAIT_SCHEDULE_TRAINING';

        // Update Team Status
        await tx.update(teams)
          .set({ status: newStatus })
          .where(eq(teams.id, tId));

        // 2. Manage Training Process Record
        let trainingRecord = await tx.query.trainingProcesses.findFirst({
          where: eq(trainingProcesses.teamId, tId)
        });

        if (!trainingRecord) {
          await tx.insert(trainingProcesses).values({
            id: generateUuid(),
            teamId: tId,
            result: allTrained ? 'LULUS' : 'PENDING',
            evaluationNotes: allTrained ? "Verifikasi Personil Bersertifikat (Lulus Otomatis)" : null
          });
        } else if (allTrained) {
          // If already exists but we are jumping to COMPLETED, ensure record reflects it
          await tx.update(trainingProcesses)
            .set({ 
                result: 'LULUS',
                evaluationNotes: "Verifikasi Personil Bersertifikat (Lulus Otomatis)"
            })
            .where(eq(trainingProcesses.teamId, tId));
        }
      }

      // 1b. Update assignment status based on new team statuses
      await recalculateAssignmentStatus(tx, currentAssignmentId);

      // 1c. Update the parent request status based on ALL assignments
      await recalculateRequestStatus(tx, assignment.requestId);
    });

    // Notify QA team
    await notifyUsersByRole({
      role: "QA",
      title: "Permintaan Verifikasi/Training Baru",
      message: `Partner telah mengajukan verifikasi/training untuk unit di bawah ${notificationDisplayId}.`,
      type: "TRAINING",
      link: `/qa-training?highlight=${highlightId}`
    });

    return NextResponse.json({ message: "Training requested successfully." });
  } catch (error: any) {
    console.error("Training request error:", error);
    return NextResponse.json({ error: "Gagal memproses request training: " + error.message }, { status: 500 });
  }
}
