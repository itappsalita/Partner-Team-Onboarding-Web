import { NextResponse } from "next/server";
import { db } from "@/db";
import { certificateSequences, teamMembers } from "@/db/schema";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch current sequence from DB
    const [seqRecord] = await db.select().from(certificateSequences).limit(1);
    const sequenceStart = seqRecord ? seqRecord.sequenceStart : 314;

    // 2. Fetch max certificate number from members
    const [lastCertificate] = await db
      .select({
        maxCertificateNumber: sql<number>`max(${teamMembers.certificateNumber})`,
      })
      .from(teamMembers);
    const maxCertificateNumber = Number(lastCertificate?.maxCertificateNumber || 0);

    // 3. Compute next certificate number
    const nextCertificateNumber = Math.max(maxCertificateNumber + 1, sequenceStart);

    return NextResponse.json({
      sequenceStart,
      maxCertificateNumber,
      nextCertificateNumber,
    });
  } catch (error: any) {
    console.error("GET sequence settings error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data sequence: " + error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sequenceStart } = await req.json();

    if (sequenceStart === undefined || isNaN(Number(sequenceStart)) || Number(sequenceStart) < 1) {
      return NextResponse.json(
        { error: "Invalid sequence start value. Must be a positive number." },
        { status: 400 }
      );
    }

    const parsedSequenceStart = Math.floor(Number(sequenceStart));

    // Validation: cannot be less than the next available number (maxCertificateNumber + 1)
    const [lastCertificate] = await db
      .select({
        maxCertificateNumber: sql<number>`max(${teamMembers.certificateNumber})`,
      })
      .from(teamMembers);
    const maxCertificateNumber = Number(lastCertificate?.maxCertificateNumber || 0);
    const minAllowed = maxCertificateNumber + 1;

    if (parsedSequenceStart < minAllowed) {
      return NextResponse.json(
        { error: `Nomor sertifikat start tidak boleh kurang dari nomor berikutnya yang diperbolehkan (${minAllowed}).` },
        { status: 400 }
      );
    }

    // Upsert logic
    const seqRecords = await db.select().from(certificateSequences).limit(1);
    
    if (seqRecords.length > 0) {
      await db
        .update(certificateSequences)
        .set({ sequenceStart: parsedSequenceStart })
        .where(eq(certificateSequences.id, seqRecords[0].id));
    } else {
      await db.insert(certificateSequences).values({
        sequenceStart: parsedSequenceStart,
      });
    }

    return NextResponse.json({
      message: "Sequence start updated successfully",
      sequenceStart: parsedSequenceStart,
    });
  } catch (error: any) {
    console.error("PUT sequence settings error:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan data sequence: " + error.message },
      { status: 500 }
    );
  }
}
