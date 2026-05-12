import { NextResponse } from "next/server";
import { join } from "path";
import { db } from "../../../../db";
import { teamMembers, teams } from "../../../../db/schema";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import fs from "fs-extra";
import { eq, and } from "drizzle-orm";
import { generateUuid } from "../../../../lib/uuid";
import { recalculateTeamStatus, recalculateAssignmentStatus, recalculateRequestStatus } from "../../../../db/status-utils";

const UPLOAD_DIR = join(process.cwd(), "public/uploads");

/**
 * @swagger
 * /api/data-team/members:
 *   get:
 *     summary: Fetch all members in a team
 *     description: Retrieves the list of personnel assigned to a specific teamId. Partners are restricted to their own teams.
 *     tags: [Members]
 *     parameters:
 *       - in: query
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A list of team members.
 *       400:
 *         description: Missing teamId.
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");

    if (!teamId) {
      return NextResponse.json({ error: "Missing teamId" }, { status: 400 });
    }

    // Security Check: If partner, ensure they own the team
    if ((session.user as any).role === "PARTNER") {
        const team = await db.query.teams.findFirst({
            where: eq(teams.id, teamId),
            with: { dataTeamPartner: true }
        });
        if (!team || team.dataTeamPartner.partnerId !== (session.user as any).id) {
            return NextResponse.json({ error: "Access Denied: team not found or belongs to another partner" }, { status: 403 });
        }
    }

    const allMembers = await db.query.teamMembers.findMany({
      where: eq(teamMembers.teamId, teamId),
    });

    return NextResponse.json(allMembers);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/data-team/members:
 *   post:
 *     summary: Register a new team member
 *     description: Registers personnel, performs NIK validation, handles KTP/Selfie uploads, and automatically detects if the member is a certified veteran (Returning Member).
 *     tags: [Members]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               teamId:
 *                 type: string
 *               name:
 *                 type: string
 *               nik:
 *                 type: string
 *               phone:
 *                 type: string
 *               position:
 *                 type: string
 *               ktpFile:
 *                 type: string
 *                 format: binary
 *               selfieFile:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Member added successfully (new or returning).
 *       400:
 *         description: Missing fields, NIK already active, or quota full.
 *       403:
 *         description: Forbidden. Accessing another partner's team.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const teamId = formData.get("teamId") as string;
    const memberNumber = parseInt(formData.get("memberNumber") as string);
    const name = formData.get("name") as string;
    const position = formData.get("position") as string;
    const nik = formData.get("nik") as string;
    const phone = formData.get("phone") as string;
    const ktpFile = formData.get("ktpFile") as File | null;
    const selfieFile = formData.get("selfieFile") as File | null;
    const emergencyContactName = formData.get("emergencyContactName") as string | null;
    const emergencyContactPhone = formData.get("emergencyContactPhone") as string | null;

    if (!teamId || !name || !nik || !ktpFile || !selfieFile) {
      return NextResponse.json({ error: "Missing required fields (Name, NIK, KTP Photo, and Selfie Photo are mandatory)" }, { status: 400 });
    }

    // 1. Quota & Security Check
    const currentTeam = await db.query.teams.findFirst({
        where: eq(teams.id, teamId),
        with: {
            dataTeamPartner: { with: { request: true } },
            members: { where: eq(teamMembers.isActive, 1) }
        }
    });

    if (!currentTeam) return NextResponse.json({ error: "Team not found" }, { status: 404 });

    // Security Check: If partner, ensure they own the team
    if ((session.user as any).role === "PARTNER") {
        if (currentTeam.dataTeamPartner.partnerId !== (session.user as any).id) {
            return NextResponse.json({ error: "Access Denied: team not found or belongs to another partner" }, { status: 403 });
        }
    }
    const mQuota = currentTeam.dataTeamPartner.request.membersPerTeam || 0;
    if (mQuota > 0 && currentTeam.members.length >= mQuota) {
        return NextResponse.json({ error: `Kuota Anggota Tim sudah terpenuhi (${mQuota} orang).` }, { status: 400 });
    }

    // 2. NIK Active Check
    const activeMember = await db.query.teamMembers.findFirst({
        where: and(eq(teamMembers.nik, nik), eq(teamMembers.isActive, 1))
    });
    if (activeMember) return NextResponse.json({ error: "NIK sudah aktif di tim lain." }, { status: 400 });

    // 3. Handle KTP Upload
    await fs.ensureDir(UPLOAD_DIR);
    const bytes = await ktpFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `ktp_${Date.now()}_${ktpFile.name.replace(/\s+/g, '_')}`;
    await fs.writeFile(join(UPLOAD_DIR, filename), buffer);
    const ktpFilePath = `/uploads/${filename}`;

    // 4. Handle Selfie Upload
    const selfieBytes = await selfieFile.arrayBuffer();
    const selfieBuffer = Buffer.from(selfieBytes);
    const selfieFilename = `selfie_${Date.now()}_${selfieFile.name.replace(/\s+/g, '_')}`;
    await fs.writeFile(join(UPLOAD_DIR, selfieFilename), selfieBuffer);
    const selfieFilePath = `/uploads/${selfieFilename}`;

    // 5. Returning Member Logic (Check for previously certified records)
    const oldMember = await db.query.teamMembers.findFirst({
        where: and(eq(teamMembers.nik, nik), eq(teamMembers.isActive, 0)),
        orderBy: (tm, { desc }) => [desc(tm.createdAt)]
    });

    const insertData: any = {
      teamId,
      memberNumber,
      name,
      position,
      nik,
      phone,
      emergencyContactName: emergencyContactName || null,
      emergencyContactPhone: emergencyContactPhone || null,
      ktpFilePath,
      selfieFilePath,
    };

    if (oldMember && oldMember.certificateFilePath) {
        insertData.certificateFilePath = oldMember.certificateFilePath;
        insertData.certificateNumber = oldMember.certificateNumber;
        insertData.alitaExtEmail = oldMember.alitaExtEmail;
        insertData.alitaEmailPassword = oldMember.alitaEmailPassword;
        insertData.isAttendedTraining = 1; // Mark as trained
        insertData.isReturning = 1; // Mark as veteran/returning
    }

    // 5. TRANSACTIONAL INSERT & ID GENERATION
    const result = await db.transaction(async (tx) => {
        const memberId = generateUuid();
        
        // Insert member
        await tx.insert(teamMembers).values({
          id: memberId,
          ...insertData
        });

        // Fetch sequence number
        const [newMember] = await tx.select({ seqNumber: teamMembers.seqNumber })
          .from(teamMembers)
          .where(eq(teamMembers.id, memberId));
        
        const displayId = `MBR-${(newMember?.seqNumber || 0).toString().padStart(5, '0')}`;
        
        // Update displayId
        await tx.update(teamMembers)
          .set({ displayId })
          .where(eq(teamMembers.id, memberId));

        // SYNC LEADER TO TEAMS TABLE
        if (position === "Leader") {
            await tx.update(teams)
              .set({ 
                  leaderName: name, 
                  leaderPhone: phone 
              })
              .where(eq(teams.id, teamId));
        }

        // 6. SYNC STATUS (Cascading Update)
        await recalculateTeamStatus(tx, teamId);
        await recalculateAssignmentStatus(tx, currentTeam.dataTeamPartnerId);
        await recalculateRequestStatus(tx, currentTeam.dataTeamPartner.requestId);

        return { id: memberId, displayId };
    });

    return NextResponse.json({ 
      message: oldMember?.certificateFilePath ? "Member added and recognized as returning personnel." : "Member added successfully", 
      id: result.id,
      displayId: result.displayId
    }, { status: 201 });
  } catch (error: any) {
    console.error("Member creation error:", error);
    return NextResponse.json({ error: "Failed to add member" }, { status: 500 });
  }
}
