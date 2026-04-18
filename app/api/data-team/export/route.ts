import { NextResponse } from "next/server";
import { db } from "../../../../db";
import { dataTeamPartners, teamMembers, teams, requestForPartners } from "../../../../db/schema";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";
import { eq, and } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as any).role;
    if (role !== "PMO_OPS" && role !== "PROCUREMENT" && role !== "QA" && role !== "PEOPLE_CULTURE" && role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get("id");

    // Fetch assignments with deep relations, filter by ID if provided
    const assignments = await db.query.dataTeamPartners.findMany({
      where: assignmentId ? eq(dataTeamPartners.id, assignmentId) : undefined,
      with: {
        request: true,
        partner: true,
        teams: {
          with: {
            members: {
              where: eq(teamMembers.isActive, 1) // Only active members
            },
            trainingProcess: true
          }
        }
      },
      orderBy: (dt, { desc }) => [desc(dt.createdAt)]
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Data Team Personnel");

    // Define Columns
    worksheet.columns = [
      { header: "No Tim", key: "teamNo", width: 20 },
      { header: "Status Tim", key: "teamStatus", width: 15 },
      { header: "SOW", key: "sow", width: 40 },
      { header: "Nama Anggota", key: "memberName", width: 25 },
      { header: "Perusahaan", key: "company", width: 30 },
      { header: "Posisi Anggota", key: "memberPosition", width: 20 },
      { header: "No KTP", key: "nik", width: 20 },
      { header: "Foto KTP", key: "ktpPhoto", width: 25 },
      { header: "Foto Selfie", key: "selfiePhoto", width: 25 },
      { header: "No Handphone Anggota", key: "memberPhone", width: 20 },
      { header: "File TKPK 1", key: "tkpkFile", width: 15 },
      { header: "Provinsi", key: "provinsi", width: 20 },
      { header: "Area", key: "area", width: 20 },
    ];

    // Style Header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    let currentRow = 2;

    for (const assignment of assignments) {
      if (!assignment.teams) continue;

      for (const team of assignment.teams) {
        if (!team.members || team.members.length === 0) continue;

        for (const member of team.members) {
          const row = worksheet.getRow(currentRow);
          row.height = 100; // Large height for images
          row.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

          row.getCell("teamNo").value = team.displayId || `#TM-${team.teamNumber}`;
          row.getCell("teamStatus").value = team.status || "-";
          row.getCell("sow").value = assignment.request?.sowPekerjaan || "-";
          row.getCell("memberName").value = member.name || "-";
          row.getCell("company").value = assignment.companyName || assignment.partner?.companyName || "-";
          row.getCell("memberPosition").value = member.position || "-";
          row.getCell("nik").value = member.nik || "-";
          row.getCell("memberPhone").value = member.phone || "-";
          row.getCell("provinsi").value = assignment.request?.provinsi || "-";
          row.getCell("area").value = assignment.request?.area || "-";

          // Handle Hyperlink for TKPK 1
          if (team.tkpk1FilePath) {
            row.getCell("tkpkFile").value = {
              text: "Klik Disini",
              hyperlink: `${process.env.NEXTAUTH_URL || ''}${team.tkpk1FilePath}`,
              tooltip: "Buka File TKPK 1"
            };
            row.getCell("tkpkFile").font = { color: { argb: 'FF0000FF' }, underline: true };
          } else {
            row.getCell("tkpkFile").value = "-";
          }

          // Embedded Images (KTP)
          if (member.ktpFilePath) {
            const fullPath = path.join(process.cwd(), "public", member.ktpFilePath);
            if (fs.existsSync(fullPath)) {
              try {
                const imageId = workbook.addImage({
                  buffer: fs.readFileSync(fullPath) as any,
                  extension: path.extname(fullPath).slice(1) as any,
                });
                worksheet.addImage(imageId, {
                  tl: { col: 7, row: currentRow - 1 },
                  ext: { width: 150, height: 120 },
                  editAs: 'oneCell'
                });
              } catch (e) {
                row.getCell("ktpPhoto").value = "Error Image";
              }
            } else {
              row.getCell("ktpPhoto").value = "File Not Found";
            }
          } else {
            row.getCell("ktpPhoto").value = "-";
          }

          // Embedded Images (Selfie)
          if (member.selfieFilePath) {
            const fullPath = path.join(process.cwd(), "public", member.selfieFilePath);
            if (fs.existsSync(fullPath)) {
              try {
                const imageId = workbook.addImage({
                  buffer: fs.readFileSync(fullPath) as any,
                  extension: path.extname(fullPath).slice(1) as any,
                });
                worksheet.addImage(imageId, {
                  tl: { col: 8, row: currentRow - 1 },
                  ext: { width: 150, height: 120 },
                  editAs: 'oneCell'
                });
              } catch (e) {
                row.getCell("selfiePhoto").value = "Error Image";
              }
            } else {
              row.getCell("selfiePhoto").value = "File Not Found";
            }
          } else {
            row.getCell("selfiePhoto").value = "-";
          }

          currentRow++;
        }
      }
    }

    // Write to Buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="Expert_Data_Team_Personnel_New.xlsx"',
      },
    });

  } catch (error: any) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Failed to generate export file: " + error.message }, { status: 500 });
  }
}
