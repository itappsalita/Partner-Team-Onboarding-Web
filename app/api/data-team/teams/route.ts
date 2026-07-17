import { NextResponse } from "next/server";
import { db } from "../../../../db";
import { teams, dataTeamPartners } from "../../../../db/schema";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { mkdir } from "fs/promises";
import { join } from "path";
import { eq, and } from "drizzle-orm";
import { generateUuid } from "../../../../lib/uuid";
import { recalculateRequestStatus } from "../../../../db/status-utils";

import fs from "fs-extra";
import { getErrorMessage } from "@/lib/errors";

const UPLOAD_DIR = join(process.cwd(), "public/uploads");

const saveFile = async (file: File | null, prefix: string) => {
  if (!file || file.size === 0) return null;
  
  // Ensure directory exists
  await fs.ensureDir(UPLOAD_DIR);
  
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filename = `${prefix}_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
  await fs.writeFile(join(UPLOAD_DIR, filename), buffer);
  return `/uploads/${filename}`;
};

/**
 * @swagger
 * /api/data-team/teams:
 *   get:
 *     summary: Fetch all teams for a specific assignment
 *     description: Retrieves a list of teams associated with a dataTeamPartnerId. Includes member data.
 *     tags: [Teams]
 *     parameters:
 *       - in: query
 *         name: dataTeamPartnerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A list of teams with their members.
 *       400:
 *         description: Missing dataTeamPartnerId.
 *       403:
 *         description: Forbidden. Accessing data belonging to another partner.
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const dataTeamPartnerId = searchParams.get("dataTeamPartnerId");

    if (!dataTeamPartnerId) {
      return NextResponse.json({ error: "Missing dataTeamPartnerId" }, { status: 400 });
    }

    // Security Check: If partner, ensure they own this dataTeamPartner assignment
    if (session.user.role === "PARTNER") {
        const assignment = await db.query.dataTeamPartners.findFirst({
            where: and(eq(dataTeamPartners.id, dataTeamPartnerId), eq(dataTeamPartners.partnerId, session.user.id))
        });
        if (!assignment) {
            return NextResponse.json({ error: "Access Denied: assignment not found or belongs to another partner" }, { status: 403 });
        }
    }

    // Fetch teams for the specific assignment, including their members
    const teamList = await db.query.teams.findMany({
      where: eq(teams.dataTeamPartnerId, dataTeamPartnerId),
      with: {
        members: true
      },
      orderBy: (t, { asc }) => [asc(t.teamNumber)]
    });

    return NextResponse.json(teamList);
  } catch (error) {
    console.error("Fetch teams error:", error);
    return NextResponse.json({ error: "Failed to fetch teams: " + getErrorMessage(error) }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/data-team/teams:
 *   post:
 *     summary: Add a new team to an assignment
 *     description: Creates a new team entry with leadership and certification data. Validates against the assignment's quota.
 *     tags: [Teams]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               dataTeamPartnerId:
 *                 type: string
 *               teamNumber:
 *                 type: string
 *               leaderName:
 *                 type: string
 *               leaderPhone:
 *                 type: string
 *               tkpk1Number:
 *                 type: string
 *               tkpk1File:
 *                 type: string
 *                 format: binary
 *               position:
 *                 type: string
 *     responses:
 *       201:
 *         description: Team added successfully.
 *       400:
 *         description: Missing fields or quota reached.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const dataTeamPartnerId = formData.get("dataTeamPartnerId") as string;
    
    // Security Check: Ensure partner owns the assignment they are adding team to
    if (session.user.role === "PARTNER") {
        const assignment = await db.query.dataTeamPartners.findFirst({
            where: and(eq(dataTeamPartners.id, dataTeamPartnerId), eq(dataTeamPartners.partnerId, session.user.id))
        });
        if (!assignment) {
            return NextResponse.json({ error: "Access Denied: assignment not found or belongs to another partner" }, { status: 403 });
        }
    }

    const teamNumber = parseInt(formData.get("teamNumber") as string);
    const leaderName = formData.get("leaderName") as string;
    const leaderPhone = formData.get("leaderPhone") as string;
    const tkpk1Number = formData.get("tkpk1Number") as string;
    const position = formData.get("position") as string;
    
    const tkpk1File = formData.get("tkpk1File") as File | null;
    const firstAidNumber = formData.get("firstAidNumber") as string || null;
    const firstAidFile = formData.get("firstAidFile") as File | null;
    const electricalNumber = formData.get("electricalNumber") as string || null;
    const electricalFile = formData.get("electricalFile") as File | null;

    if (!dataTeamPartnerId || !tkpk1Number) {
      return NextResponse.json({ error: "Missing required fields (dataTeamPartnerId, No TKPK)" }, { status: 400 });
    }

    // 1. Fetch Location Automatically from Request
    const dataPartner = await db.query.dataTeamPartners.findFirst({
      where: eq(dataTeamPartners.id, dataTeamPartnerId),
      with: { request: true }
    });

    if (!dataPartner?.request) {
      return NextResponse.json({ error: "Associated request not found" }, { status: 404 });
    }

    const location = `${dataPartner.request.provinsi}, ${dataPartner.request.area}`;
    const quota = dataPartner.request.jumlahKebutuhan;

    // Check existing teams count for this assignment
    const existingTeams = await db.query.teams.findMany({
      where: eq(teams.dataTeamPartnerId, dataTeamPartnerId)
    });

    if (existingTeams.length >= quota) {
      return NextResponse.json({ 
        error: `Kuota Tim sudah terpenuhi (${quota} Tim). Tidak bisa menambah tim lagi.` 
      }, { status: 400 });
    }

    // 2. Handle File Uploads
    await mkdir(UPLOAD_DIR, { recursive: true });
    
    const tkpk1FilePath = await saveFile(tkpk1File, "tkpk");
    if (!tkpk1FilePath) return NextResponse.json({ error: "TKPK Certificate is required" }, { status: 400 });

    const firstAidFilePath = await saveFile(firstAidFile, "firstaid");
    const electricalFilePath = await saveFile(electricalFile, "elec");

    // 3. TRANSACTIONAL INSERT & ID GENERATION
    const result = await db.transaction(async (tx) => {
        const teamId = generateUuid();
        await tx.insert(teams).values({
          id: teamId,
          dataTeamPartnerId,
          teamNumber,
          leaderName,
          leaderPhone,
          tkpk1Number,
          tkpk1FilePath,
          firstAidNumber,
          firstAidFilePath,
          electricalNumber,
          electricalFilePath,
          position,
          location,
        });

        // Fetch sequence number
        const [newTeam] = await tx.select({ seqNumber: teams.seqNumber })
          .from(teams)
          .where(eq(teams.id, teamId));
        
        const displayId = `TM-${(newTeam?.seqNumber || 0).toString().padStart(5, '0')}`;
        
        // Update displayId
        await tx.update(teams)
          .set({ displayId })
          .where(eq(teams.id, teamId));

        return { id: teamId, displayId };
    });

    return NextResponse.json({ message: "Team added successfully", id: result.id, displayId: result.displayId }, { status: 201 });
  } catch (error) {
    console.error("Team creation error:", error);
    return NextResponse.json({ error: "Failed to add team" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/data-team/teams:
 *   put:
 *     summary: Update team technical details
 *     description: Updates certification numbers, files, and leadership info for a team. Triggers a proactive dashboard status recalculation.
 *     tags: [Teams]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               leaderName:
 *                 type: string
 *               tkpk1Number:
 *                 type: string
 *               tkpk1File:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Team updated successfully.
 *       400:
 *         description: Missing ID or required fields.
 */
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const id = formData.get("id") as string;
    const leaderName = formData.get("leaderName") as string;
    const leaderPhone = formData.get("leaderPhone") as string;
    const tkpk1Number = formData.get("tkpk1Number") as string;
    const position = formData.get("position") as string;
    const location = formData.get("location") as string;

    const tkpk1File = formData.get("tkpk1File") as File | null;
    const firstAidNumber = formData.get("firstAidNumber") as string || null;
    const firstAidFile = formData.get("firstAidFile") as File | null;
    const electricalNumber = formData.get("electricalNumber") as string || null;
    const electricalFile = formData.get("electricalFile") as File | null;

    if (!id || !tkpk1Number) {
      return NextResponse.json({ error: "Missing required fields (ID, No TKPK)" }, { status: 400 });
    }

    // Handle File Uploads
    await mkdir(UPLOAD_DIR, { recursive: true });
    const tkpk1FilePath = await saveFile(tkpk1File, "tkpk");
    const firstAidFilePath = await saveFile(firstAidFile, "firstaid");
    const electricalFilePath = await saveFile(electricalFile, "elec");

    // Prepare update object (only include provided fields)
    const updateData: Partial<typeof teams.$inferInsert> = {
      tkpk1Number,
      firstAidNumber,
      electricalNumber,
    };

    if (leaderName) updateData.leaderName = leaderName;
    if (leaderPhone) updateData.leaderPhone = leaderPhone;
    if (position) updateData.position = position;
    if (location) updateData.location = location;

    if (tkpk1FilePath) updateData.tkpk1FilePath = tkpk1FilePath;
    if (firstAidFilePath) updateData.firstAidFilePath = firstAidFilePath;
    if (electricalFilePath) updateData.electricalFilePath = electricalFilePath;

    await db.update(teams)
      .set(updateData)
      .where(eq(teams.id, id));

    // PROACTIVE SYNC: Ensure dashboard is recalculated after team update
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, id),
      with: { dataTeamPartner: true }
    });
    if (team) {
      await recalculateRequestStatus(db, team.dataTeamPartner.requestId);
    }

    return NextResponse.json({ message: "Team updated successfully" });
  } catch (error) {
    console.error("Team update error:", error);
    return NextResponse.json({ error: "Failed to update team: " + getErrorMessage(error) }, { status: 500 });
  }
}
