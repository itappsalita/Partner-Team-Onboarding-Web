import { NextResponse } from "next/server";
import { db } from "@/db";
import { teamMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getErrorMessage } from "@/lib/errors";

/**
 * @swagger
 * /api/certificates/email-ext:
 *   put:
 *     summary: Set/update Alita external email credentials (IT BM / SUPERADMIN only)
 *     description: Updates alitaExtEmail and alitaEmailPassword for a member. Does not generate a certificate PDF and does not affect team/request completion status - that is handled separately by /api/certificates/issue.
 *     tags: [Certificates]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [memberId, alitaExtEmail, alitaEmailPassword]
 *             properties:
 *               memberId:
 *                 type: string
 *               alitaExtEmail:
 *                 type: string
 *               alitaEmailPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email ext credentials updated successfully.
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
    if (role !== "IT_BM" && role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Access denied. IT BM only." }, { status: 403 });
    }

    const { memberId, alitaExtEmail, alitaEmailPassword } = await req.json();
    if (!memberId || !alitaExtEmail || !alitaEmailPassword) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const memberData = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.id, memberId),
    });
    if (!memberData) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    await db
      .update(teamMembers)
      .set({ alitaExtEmail, alitaEmailPassword })
      .where(eq(teamMembers.id, memberId));

    return NextResponse.json({ message: "Email ext credentials updated successfully" });
  } catch (error) {
    console.error("Set email-ext error:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan email ext: " + getErrorMessage(error) },
      { status: 500 },
    );
  }
}
