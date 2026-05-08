import { NextResponse } from "next/server";
import { db } from "../../../../db";
import { dataTeamPartners, teamMembers } from "../../../../db/schema";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import ExcelJS from "exceljs";
import { eq } from "drizzle-orm";

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
    const teamId = searchParams.get("teamId");

    // Fetch assignments with deep relations
    const assignments = await db.query.dataTeamPartners.findMany({
      where: assignmentId ? eq(dataTeamPartners.id, assignmentId) : undefined,
      with: {
        request: true,
        partner: true,
        teams: {
          with: {
            members: {
              where: eq(teamMembers.isActive, 1)
            },
            trainingProcess: true
          }
        }
      },
      orderBy: (dt, { desc }) => [desc(dt.createdAt)]
    });

    const formatDate = (date: Date | string | null | undefined): string =>
      date ? new Date(date).toLocaleDateString("id-ID") : "-";

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Data Team Personnel");

    // Define Columns
    worksheet.columns = [
      { header: "No Tim", key: "teamNo", width: 18 },
      { header: "Status Tim", key: "teamStatus", width: 15 },
      { header: "SOW", key: "sow", width: 35 },
      { header: "Nama Anggota", key: "memberName", width: 25 },
      { header: "Perusahaan", key: "company", width: 28 },
      { header: "Posisi Anggota", key: "memberPosition", width: 18 },
      { header: "No KTP", key: "nik", width: 20 },
      { header: "No Handphone Anggota", key: "memberPhone", width: 22 },
      { header: "Emergency contact phone", key: "emergencyPhone", width: 24 },
      { header: "Emergency contact name", key: "emergencyName", width: 24 },
      { header: "Alamat email", key: "email", width: 28 },
      { header: "Provinsi", key: "provinsi", width: 20 },
      { header: "Status Training", key: "trainingStatus", width: 16 },
      { header: "Nilai Training", key: "trainingScore", width: 14 },
      { header: "TKPK No", key: "tkpkNo", width: 20 },
      { header: "First Aid certificate No", key: "firstAidNo", width: 24 },
      { header: "Electrical certificate No", key: "electricalNo", width: 24 },
      { header: "Training Certificate No", key: "certNo", width: 24 },
      { header: "Email ext", key: "emailExt", width: 28 },
      { header: "Request Date", key: "requestDate", width: 16 },
      { header: "Due Date", key: "dueDate", width: 16 },
      { header: "Assigned Team Date", key: "assignedDate", width: 20 },
      { header: "Data Team Completed Date", key: "completedDate", width: 24 },
      { header: "Training Date", key: "trainingDate", width: 16 },
      { header: "Certificate date created", key: "certificateDate", width: 24 },
    ];

    // Style Header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    let currentRow = 2;

    for (const assignment of assignments) {
      if (!assignment.teams) continue;

      for (const team of assignment.teams) {
        if (teamId && team.id !== teamId) continue;
        if (!team.members || team.members.length === 0) continue;

        for (const member of team.members) {
          const row = worksheet.getRow(currentRow);
          row.height = 20;
          row.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

          row.getCell("teamNo").value = team.displayId || `#TM-${team.teamNumber}`;
          row.getCell("teamStatus").value = team.status || "-";
          row.getCell("sow").value = assignment.request?.sowPekerjaan || "-";
          row.getCell("memberName").value = member.name || "-";
          row.getCell("company").value = assignment.companyName || assignment.partner?.companyName || "-";
          row.getCell("memberPosition").value = member.position || "-";
          row.getCell("nik").value = member.nik || "-";
          row.getCell("memberPhone").value = member.phone || "-";
          row.getCell("emergencyPhone").value = member.emergencyContactPhone || "-";
          row.getCell("emergencyName").value = member.emergencyContactName || "-";
          row.getCell("email").value = member.alitaExtEmail || "-";
          row.getCell("provinsi").value = assignment.request?.provinsi || "-";
          row.getCell("trainingStatus").value = member.isAttendedTraining === 1 ? "LULUS" : "BELUM";
          row.getCell("trainingScore").value = member.score ?? "-";
          row.getCell("tkpkNo").value = team.tkpk1Number || "-";
          row.getCell("firstAidNo").value = team.firstAidNumber || "-";
          row.getCell("electricalNo").value = team.electricalNumber || "-";
          row.getCell("certNo").value = member.certificateNumber ?? "-";
          row.getCell("emailExt").value = member.alitaExtEmail || "-";
          row.getCell("requestDate").value = formatDate(assignment.request?.createdAt);
          row.getCell("dueDate").value = formatDate(assignment.request?.dueDate);
          row.getCell("assignedDate").value = formatDate(assignment.createdAt);
          row.getCell("completedDate").value = formatDate(team.trainingProcess?.createdAt);
          row.getCell("trainingDate").value = formatDate(team.trainingProcess?.trainingDate);
          row.getCell("certificateDate").value = formatDate(member.certificateDate);

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
        "Content-Disposition": 'attachment; filename="Expert_Data_Team_Personnel.xlsx"',
      },
    });

  } catch (error: any) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Failed to generate export file: " + error.message }, { status: 500 });
  }
}
