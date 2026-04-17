import { NextResponse } from "next/server";
import { join } from "path";
import { db } from "../../../../db";
import { teamMembers, teams } from "../../../../db/schema";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import fs from "fs-extra";
import { eq, and } from "drizzle-orm";
import { generateUuid } from "../../../../lib/uuid";

const UPLOAD_DIR = join(process.cwd(), "public/uploads");

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
      name, // NIK and Name should stay consistent as per user request
      position,
      nik,
      phone, // Updateable Phone
      ktpFilePath, // Updateable KTP
      selfieFilePath, // Updateable Selfie
    };

    if (oldMember && oldMember.certificateFilePath) {
        insertData.certificateFilePath = oldMember.certificateFilePath;
        insertData.certificateNumber = oldMember.certificateNumber;
        insertData.alitaExtEmail = oldMember.alitaExtEmail;
        insertData.alitaEmailPassword = oldMember.alitaEmailPassword;
        insertData.isAttendedTraining = 1; // Mark as trained
    }

    // Insert into DB
    const memberId = generateUuid();
    await db.insert(teamMembers).values({
      id: memberId,
      ...insertData
    });

    // Fetch the generated seq_number to create displayId
    const [newMember] = await db.select({ seqNumber: teamMembers.seqNumber })
      .from(teamMembers)
      .where(eq(teamMembers.id, memberId));
    
    const displayId = `MBR-${(newMember?.seqNumber || 0).toString().padStart(5, '0')}`;
    
    await db.update(teamMembers)
      .set({ displayId })
      .where(eq(teamMembers.id, memberId));

    // 6. SYNC LEADER TO TEAMS TABLE
    if (position === "Leader") {
        await db.update(teams)
          .set({ 
              leaderName: name, 
              leaderPhone: phone 
          })
          .where(eq(teams.id, teamId));
    }

    return NextResponse.json({ 
      message: oldMember?.certificateFilePath ? "Member added and recognized as returning personnel." : "Member added successfully", 
      id: memberId,
      displayId
    }, { status: 201 });
  } catch (error: any) {
    console.error("Member creation error:", error);
    return NextResponse.json({ error: "Failed to add member" }, { status: 500 });
  }
}
