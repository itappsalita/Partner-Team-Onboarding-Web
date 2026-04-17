import { NextResponse } from "next/server";
import { db } from "../../../../db";
import { teams, dataTeamPartners, requestForPartners } from "../../../../db/schema";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { eq } from "drizzle-orm";
import { generateUuid } from "../../../../lib/uuid";

import fs from "fs-extra";

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
    if ((session.user as any).role === "PARTNER") {
        const assignment = await db.query.dataTeamPartners.findFirst({
            where: and(eq(dataTeamPartners.id, dataTeamPartnerId), eq(dataTeamPartners.partnerId, (session.user as any).id))
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
  } catch (error: any) {
    console.error("Fetch teams error:", error);
    return NextResponse.json({ error: "Failed to fetch teams: " + error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const dataTeamPartnerId = formData.get("dataTeamPartnerId") as string;
    
    // Security Check: Ensure partner owns the assignment they are adding team to
    if ((session.user as any).role === "PARTNER") {
        const assignment = await db.query.dataTeamPartners.findFirst({
            where: and(eq(dataTeamPartners.id, dataTeamPartnerId), eq(dataTeamPartners.partnerId, (session.user as any).id))
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

    if (!dataTeamPartnerId || !leaderName || !leaderPhone || !tkpk1Number) {
      return NextResponse.json({ error: "Missing required fields (Nama, Phone, No TKPK)" }, { status: 400 });
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

    // 3. Insert into DB
    const teamId = generateUuid();
    await db.insert(teams).values({
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

    // 4. Fetch the generated seq_number to create displayId
    const [newTeam] = await db.select({ seqNumber: teams.seqNumber })
      .from(teams)
      .where(eq(teams.id, teamId));
    
    const displayId = `TM-${newTeam.seqNumber.toString().padStart(5, '0')}`;
    
    await db.update(teams)
      .set({ displayId })
      .where(eq(teams.id, teamId));

    return NextResponse.json({ message: "Team added successfully", id: teamId, displayId }, { status: 201 });
  } catch (error: any) {
    console.error("Team creation error:", error);
    return NextResponse.json({ error: "Failed to add team" }, { status: 500 });
  }
}

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

    if (!id || !leaderName || !leaderPhone || !tkpk1Number || !location) {
      return NextResponse.json({ error: "Missing required fields (Nama, Phone, Lokasi, No TKPK)" }, { status: 400 });
    }

    // Handle File Uploads
    await mkdir(UPLOAD_DIR, { recursive: true });
    const tkpk1FilePath = await saveFile(tkpk1File, "tkpk");
    const firstAidFilePath = await saveFile(firstAidFile, "firstaid");
    const electricalFilePath = await saveFile(electricalFile, "elec");

    // Prepare update object (only include provided fields)
    const updateData: any = {
      leaderName,
      leaderPhone,
      tkpk1Number,
      position,
      location,
      firstAidNumber,
      electricalNumber,
    };

    if (tkpk1FilePath) updateData.tkpk1FilePath = tkpk1FilePath;
    if (firstAidFilePath) updateData.firstAidFilePath = firstAidFilePath;
    if (electricalFilePath) updateData.electricalFilePath = electricalFilePath;

    await db.update(teams)
      .set(updateData)
      .where(eq(teams.id, id));

    return NextResponse.json({ message: "Team updated successfully" });
  } catch (error: any) {
    console.error("Team update error:", error);
    return NextResponse.json({ error: "Failed to update team: " + error.message }, { status: 500 });
  }
}
