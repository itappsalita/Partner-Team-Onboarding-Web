import { NextResponse } from "next/server";
import { db } from "@/db";
import { dataTeamPartners, trainingProcesses, teamMembers, teams } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { createNotification, notifyUsersByRole } from "@/lib/notifications";
import { getErrorMessage } from "@/lib/errors";

export async function PUT(req: Request) {
  try {
    const {
      teamId,
      attendedMemberIds,
      memberScores,
      result,
      whatsappGroupJustification,
      evaluationNotes
    } = await req.json();

    if (!teamId) {
      return NextResponse.json({ error: "Missing teamId" }, { status: 400 });
    }

    // 1. Transaction to ensure consistency
    await db.transaction(async (tx) => {
      // a. Handle Attendance Logic (Update isAttendedTraining in teamMembers table)
      // Reset all members of this team
      await tx.update(teamMembers)
        .set({ isAttendedTraining: 0 })
        .where(eq(teamMembers.teamId, teamId));

      // Mark attended members
      if (attendedMemberIds && attendedMemberIds.length > 0) {
        await tx.update(teamMembers)
          .set({ isAttendedTraining: 1 })
          .where(inArray(teamMembers.id, attendedMemberIds));
      }

      // Save score per member
      if (memberScores && typeof memberScores === 'object') {
        for (const [memberId, score] of Object.entries(memberScores)) {
          const scoreValue = score !== null && score !== undefined && String(score) !== ''
            ? parseInt(String(score))
            : null;
          await tx.update(teamMembers)
            .set({ score: scoreValue })
            .where(eq(teamMembers.id, memberId));
        }
      }

      // b. Update Training Process result
      await tx.update(trainingProcesses)
        .set({ 
          result, 
          whatsappGroupJustification,
          evaluationNotes
        })
        .where(eq(trainingProcesses.teamId, teamId));

      // c. Update Team Status
      await tx.update(teams)
        .set({ status: 'TRAINING_EVALUATED' })
        .where(eq(teams.id, teamId));

      // c.1 Update Assignment Status to ON_TRAINING (or keeping it if it was)
      const teamDetails = await tx.query.teams.findFirst({
        where: eq(teams.id, teamId),
        with: { dataTeamPartner: true }
      });
      
      if (teamDetails?.dataTeamPartner) {
        await tx.update(dataTeamPartners)
          .set({ status: 'ON_TRAINING' })
          .where(eq(dataTeamPartners.id, teamDetails.dataTeamPartnerId));

        // d. Collective Check for Request Status using central Utility
      }
    });

    // 2. Notify the Partner
    const teamWithPartner = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
      with: {
        dataTeamPartner: true
      }
    });

    if (teamWithPartner?.dataTeamPartner?.partnerId) {
      await createNotification({
        userId: teamWithPartner.dataTeamPartner.partnerId,
        title: `Hasil Evaluasi Training: ${result}`,
        message: `Evaluasi training untuk unit ${teamWithPartner.displayId} telah selesai dengan hasil: ${result}.`,
        type: "TRAINING",
        link: `/data-team?assignmentId=${teamWithPartner.dataTeamPartnerId}&openModal=true`
      });
    }

    // 3. Notify People & Culture (certificate) and IT BM (external email) in parallel if the result is PASS (LULUS)
    // In-app notification + email are both handled inside notifyUsersByRole (lib/notifications.ts).
    if (result === 'LULUS') {
      const unitLabel = teamWithPartner?.displayId || teamId;
      const certLink = `/certificates?highlight=${teamWithPartner?.id || teamId}`;

      await Promise.all([
        notifyUsersByRole({
          role: "PEOPLE_CULTURE",
          title: "Penertiban Sertifikat Baru",
          message: `Unit ${unitLabel} telah LULUS training. Silakan tinjau dan terbitkan sertifikat.`,
          type: "CERTIFICATE",
          link: certLink
        }),
        notifyUsersByRole({
          role: "IT_BM",
          title: "Pembuatan Email Eksternal Baru",
          message: `Unit ${unitLabel} telah LULUS training. Silakan buat/isi email eksternal Alita untuk anggota tim.`,
          type: "CERTIFICATE",
          link: certLink
        }),
      ]);
    }

    return NextResponse.json({ message: "Training evaluation saved successfully." });
  } catch (error) {
    console.error("Evaluation error:", error);
    return NextResponse.json({ error: "Gagal menyimpan hasil evaluasi training: " + (getErrorMessage(error) || "Unknown error") }, { status: 500 });
  }
}
