import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";
// Forced refresh to clear stale Next.js cache
import { db } from "@/db";
import { teamMembers, teams, dataTeamPartners, certificateSequences } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { recalculateRequestStatus } from "@/db/status-utils";
import { createNotification } from "@/lib/notifications";
import path from "path";
import fs from "fs-extra";
import { generateCertificatePdf, getRomanMonth } from "./certUtils";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

function formatCertificateNumber(sequence: number, date: Date) {
  const monthRoman = getRomanMonth(date.getMonth() + 1);
  const year = date.getFullYear();
  return `${sequence}-SERT/ADM-APM/PC/${monthRoman}/${year}`;
}

function formatCertificateRelativePath(certificateNumber: string) {
  return `/uploads/certificates/${certificateNumber.replace(/\//g, "-")}.pdf`;
}

/**
 * @swagger
 * /api/certificates/issue:
 *   put:
 *     summary: Issue certificate (People & Culture / SUPERADMIN only)
 *     description: Generates a PDF certificate for a member (via Puppeteer). Automatically triggers team and request status synchronization. Does not touch Alita external email credentials - see /api/certificates/email-ext for that.
 *     tags: [Certificates]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [memberId]
 *             properties:
 *               memberId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Certificate generated successfully.
 *       400:
 *         description: Missing required fields.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Access denied.
 *       404:
 *         description: Member not found.
 */
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = session.user.role;
    if (role !== "PEOPLE_CULTURE" && role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Access denied. People & Culture only." }, { status: 403 });
    }

    const { memberId } = await req.json();

    if (!memberId) {
      return NextResponse.json(
        { error: "Missing required field: memberId" },
        { status: 400 },
      );
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
                request: true,
              },
            },
          },
        },
      },
    });

    if (!memberData)
      return NextResponse.json({ error: "Member not found" }, { status: 404 });

    // 2. Handle Certificate Generation conditionally
    let relativePath = memberData.certificateFilePath;
    let certNumber = memberData.certificateNumber;
    let fullCertNo = "";

    if (!memberData.certificateFilePath) {
      // Generate Certificate Number
      const issuedAt = new Date();
      const [lastCertificate] = await db
        .select({
          maxCertificateNumber: sql<number>`max(${teamMembers.certificateNumber})`,
        })
        .from(teamMembers);

      // Fetch sequence start from database
      const [seqRecord] = await db.select().from(certificateSequences).limit(1);
      const dbSequenceStart = seqRecord ? seqRecord.sequenceStart : 314;

      certNumber = Math.max(
        Number(lastCertificate?.maxCertificateNumber || 0) + 1,
        dbSequenceStart,
      );
      fullCertNo = formatCertificateNumber(certNumber, issuedAt);

      // Prepare PDF Data
      const certInputData = {
        NO_SERTIFIKAT: fullCertNo,
        EMPLOYEE_NAME: memberData.name,
        KTP: memberData.nik,
        OCCUPATION: memberData.position,
        Date_Training: memberData.team?.trainingProcess?.trainingDate
          ? new Date(memberData.team.trainingProcess.trainingDate).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : "-",
        Tanggal_Sertifikat: issuedAt.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      };

      // Generate & Save PDF
      const pdfBuffer = await generateCertificatePdf(certInputData);
      relativePath = formatCertificateRelativePath(fullCertNo);
      const absolutePath = path.join(
        process.cwd(),
        "public",
        relativePath.replace(/^\/+/, ""),
      );

      await fs.ensureDir(path.dirname(absolutePath));
      await fs.writeFile(absolutePath, pdfBuffer);
    } else {
      // For existing certificates, keep the number for the response display
      const issuedAt = memberData.certificateDate
        ? new Date(memberData.certificateDate)
        : new Date();
      fullCertNo = formatCertificateNumber(certNumber || 0, issuedAt);

      if (relativePath && certNumber) {
        const nextRelativePath = formatCertificateRelativePath(fullCertNo);

        if (relativePath !== nextRelativePath) {
          const currentAbsolutePath = path.join(
            process.cwd(),
            "public",
            relativePath.replace(/^\/+/, ""),
          );
          const nextAbsolutePath = path.join(
            process.cwd(),
            "public",
            nextRelativePath.replace(/^\/+/, ""),
          );

          if (await fs.pathExists(currentAbsolutePath)) {
            await fs.ensureDir(path.dirname(nextAbsolutePath));
            if (!(await fs.pathExists(nextAbsolutePath))) {
              await fs.move(currentAbsolutePath, nextAbsolutePath);
            }
            relativePath = nextRelativePath;
          }
        }
      }
    }

    // 3. Update Member Record
    await db
      .update(teamMembers)
      .set({
        certificateNumber: certNumber,
        certificateFilePath: relativePath,
        certificateDate: new Date(),
      })
      .where(eq(teamMembers.id, memberId));

    // 4. Collective Check for Completion
    const teamId = memberData.teamId;
    const requestId = memberData.team?.dataTeamPartner?.requestId;

    if (teamId) {
      // 6a. Check for Team completion
      const allTeamMembers = await db.query.teamMembers.findMany({
        where: eq(teamMembers.teamId, teamId),
      });

      const totalTeamMembers = allTeamMembers.length;
      const certifiedTeamMembers = allTeamMembers.filter(
        (m) => m.certificateFilePath || m.id === memberId,
      ).length;

      if (totalTeamMembers > 0 && totalTeamMembers === certifiedTeamMembers) {
        await db
          .update(teams)
          .set({ status: "COMPLETED" })
          .where(eq(teams.id, teamId));
      }
    }

    if (requestId) {
      await db.transaction(async (tx) => {
        // --- 6.a Update THIS Partner's Assignment Status ---
        const partnerAssignmentId = memberData.team?.dataTeamPartnerId;
        if (partnerAssignmentId) {
          const partnerTeams = await tx.query.teams.findMany({
            where: eq(teams.dataTeamPartnerId, partnerAssignmentId),
          });

          const allPartnerTeamsCompleted = partnerTeams.every(
            (t) => t.status === "COMPLETED",
          );
          const anyPartnerTeamOnTraining = partnerTeams.some(
            (t) => t.status !== "SOURCING",
          );

          let newPartnerStatus = "SOURCING";
          if (allPartnerTeamsCompleted) {
            newPartnerStatus = "COMPLETED";
          } else if (anyPartnerTeamOnTraining) {
            newPartnerStatus = "ON_TRAINING";
          }

          await tx
            .update(dataTeamPartners)
            .set({ status: newPartnerStatus })
            .where(eq(dataTeamPartners.id, partnerAssignmentId));
        }

        // --- 6.b Update Global Request Status using utility ---
        await recalculateRequestStatus(tx, requestId);
      });
    }

    // 5. Notify the Partner
    if (memberData.team?.dataTeamPartner?.partnerId) {
      await createNotification({
        userId: memberData.team.dataTeamPartner.partnerId,
        title: "Sertifikat Diterbitkan",
        message: `Sertifikat untuk ${memberData.name} telah diterbitkan.`,
        type: "CERTIFICATE",
        link: `/data-team?assignmentId=${memberData.team.dataTeamPartnerId}&openModal=true`,
      });
    }

    return NextResponse.json({
      message: "Certificate generated successfully",
      filePath: relativePath,
      certNumber: fullCertNo,
    });
  } catch (error) {
    console.error("Issue certificate error:", error);
    return NextResponse.json(
      { error: "Gagal memproses sertifikat: " + getErrorMessage(error) },
      { status: 500 },
    );
  }
}
