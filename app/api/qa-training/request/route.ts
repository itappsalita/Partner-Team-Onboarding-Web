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
      if (!teamId) throw new Error("Team ID is required for this operation");

      // Fetch team data with RFP details
      const team = await tx.query.teams.findFirst({
        where: eq(teams.id, teamId),
        with: {
            dataTeamPartner: {
                with: {
                    request: true
                }
            }
        }
      }) as any;

      if (!team) throw new Error("Team not found");
      
      const requiredQuota = team.dataTeamPartner?.request?.membersPerTeam || 0;
      notificationDisplayId = team.displayId || team.id;
      highlightId = teamId;

      // Fetch current active members
      const members = await tx.query.teamMembers.findMany({
        where: and(eq(teamMembers.teamId, teamId), eq(teamMembers.isActive, 1))
      });

      // VALIDATION
      const hasLeader = members.some(m => m.position === "Leader");
      if (members.length !== requiredQuota) {
        throw new Error(`Kriteria kuota tidak terpenuhi. Dibutuhkan tepat ${requiredQuota} anggota aktif (Ditemukan: ${members.length}).`);
      }
      if (!hasLeader) {
        throw new Error("Tim wajib memiliki minimal satu anggota dengan posisi Leader.");
      }
      if (!team.tkpk1Number) {
        throw new Error("Nomor Sertifikat TKPK1 wajib diisi sebelum pengajuan.");
      }

      const allTrained = members.length > 0 && members.every(m => m.isAttendedTraining === 1);
      const newStatus = allTrained ? 'COMPLETED' : 'WAIT_SCHEDULE_TRAINING';

      // Update Team Status
      await tx.update(teams)
        .set({ status: newStatus })
        .where(eq(teams.id, teamId));

      // 2. Manage Training Process Record
      let trainingRecord = await tx.query.trainingProcesses.findFirst({
        where: eq(trainingProcesses.teamId, teamId)
      });

      if (!trainingRecord) {
        await tx.insert(trainingProcesses).values({
          id: generateUuid(),
          teamId: teamId,
          result: allTrained ? 'LULUS' : 'PENDING',
          evaluationNotes: allTrained ? "Verifikasi Personil Bersertifikat (Lulus Otomatis)" : null
        });
      } else if (allTrained) {
        await tx.update(trainingProcesses)
          .set({ 
              result: 'LULUS',
              evaluationNotes: "Verifikasi Personil Bersertifikat (Lulus Otomatis)"
          })
          .where(eq(trainingProcesses.teamId, teamId));
      }

      // 3. Update assignment & request status
      await recalculateAssignmentStatus(tx, team.dataTeamPartnerId);
      await recalculateRequestStatus(tx, team.dataTeamPartner?.requestId);
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
