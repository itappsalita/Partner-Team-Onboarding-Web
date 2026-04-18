import { NextResponse } from "next/server";
// Forced refresh to clear stale Next.js cache
import { db } from "@/db";
import { teamMembers, teams, dataTeamPartners } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { recalculateRequestStatus } from "@/db/status-utils";
import path from "path";
import fs from "fs-extra";
import { generateCertificatePdf } from "./certUtils";

export async function PUT(req: Request) {
  try {
    const { memberId, alitaExtEmail, alitaEmailPassword } = await req.json();

    if (!memberId || !alitaExtEmail) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Fetch Member Data with Relations
    const memberData = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.id, memberId),
      with: {
        team: {
          with: {
            trainingProcess: true,
            dataTeamPartner: {
              with: {
                request: true
              }
            }
          }
        }
      }
    });

    if (!memberData) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    // 2. Handle Certificate Generation conditionally
    let relativePath = memberData.certificateFilePath;
    let certNumber = memberData.certificateNumber;
    let fullCertNo = "";

    if (!memberData.certificateFilePath) {
      // Generate Certificate Number
      const year = new Date().getFullYear();
      fullCertNo = `ALT/CERT/${year}/${(memberData.seqNumber || 0).toString().padStart(4, '0')}`;
      certNumber = memberData.seqNumber || 0;

      // Prepare PDF Data
      const certInputData = {
        NO_SERTIFIKAT: fullCertNo,
        EMPLOYEE_NAME: memberData.name,
        KTP: memberData.nik,
        OCCUPATION: memberData.position,
        Date_Training: memberData.team?.trainingProcess?.trainingDate 
          ? new Date(memberData.team.trainingProcess.trainingDate).toLocaleDateString("id-ID")
          : "-",
        Tanggal_Sertifikat: new Date().toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })
      };

      // Generate & Save PDF
      const pdfBuffer = await generateCertificatePdf(certInputData);
      const fileName = `${memberData.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      relativePath = `/uploads/certificates/${fileName}`;
      const absolutePath = path.join(process.cwd(), "public", "uploads", "certificates", fileName);

      await fs.ensureDir(path.dirname(absolutePath));
      await fs.writeFile(absolutePath, pdfBuffer);
    } else {
      // For existing certificates, keep the number for the response display
      const year = new Date().getFullYear(); // Fallback to current year for display if needed
      fullCertNo = `ALT/CERT/${year}/${(certNumber || 0).toString().padStart(4, '0')}`;
    }

    // 5. Update Member Record
    await db.update(teamMembers)
      .set({
        alitaExtEmail,
        alitaEmailPassword,
        certificateNumber: certNumber,
        certificateFilePath: relativePath
      })
      .where(eq(teamMembers.id, memberId));

    // 6. Collective Check for Completion
    const teamId = memberData.teamId;
    const requestId = memberData.team?.dataTeamPartner?.requestId;

    if (teamId) {
      // 6a. Check for Team completion
      const allTeamMembers = await db.query.teamMembers.findMany({
        where: eq(teamMembers.teamId, teamId)
      });

      const totalTeamMembers = allTeamMembers.length;
      const certifiedTeamMembers = allTeamMembers.filter(m => m.certificateFilePath || m.id === memberId).length;

      if (totalTeamMembers > 0 && totalTeamMembers === certifiedTeamMembers) {
        await db.update(teams)
          .set({ status: 'COMPLETED' })
          .where(eq(teams.id, teamId));
      }
    }

    if (requestId) {
      await db.transaction(async (tx) => {
        // --- 6.a Update THIS Partner's Assignment Status ---
        const partnerAssignmentId = memberData.team?.dataTeamPartnerId;
        if (partnerAssignmentId) {
          const partnerTeams = await tx.query.teams.findMany({
            where: eq(teams.dataTeamPartnerId, partnerAssignmentId)
          });
          
          const allPartnerTeamsCompleted = partnerTeams.every(t => t.status === 'COMPLETED');
          const anyPartnerTeamOnTraining = partnerTeams.some(t => t.status !== 'SOURCING');

          let newPartnerStatus = 'SOURCING';
          if (allPartnerTeamsCompleted) {
            newPartnerStatus = 'COMPLETED';
          } else if (anyPartnerTeamOnTraining) {
            newPartnerStatus = 'ON_TRAINING';
          }

          await tx.update(dataTeamPartners)
            .set({ status: newPartnerStatus })
            .where(eq(dataTeamPartners.id, partnerAssignmentId));
        }

        // --- 6.b Update Global Request Status using utility ---
        await recalculateRequestStatus(tx, requestId);
      });
    }

    return NextResponse.json({ 
      message: memberData.certificateFilePath 
        ? "Credentials updated successfully" 
        : "Certificate generated & Access issued successfully",
      filePath: relativePath,
      certNumber: fullCertNo
    });
  } catch (error: any) {
    console.error("Issue certificate error:", error);
    return NextResponse.json({ error: "Gagal memproses sertifikat: " + error.message }, { status: 500 });
  }
}
