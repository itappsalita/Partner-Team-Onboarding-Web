import { NextResponse } from "next/server";
import { db } from "../../../../db";
import { dataTeamPartners } from "../../../../db/schema";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { eq } from "drizzle-orm";
import { getErrorMessage } from "@/lib/errors";

const UPLOAD_DIR = join(process.cwd(), "public/uploads");

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params;
    const id = idStr;
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    
    if (!session || (role !== "PROCUREMENT" && role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Unauthorized. Procurement or Superadmin only." }, { status: 403 });
    }

    const formData = await req.formData();
    const torFile = formData.get("torFile") as File | null;
    const bakFile = formData.get("bakFile") as File | null;

    const current = await db.query.dataTeamPartners.findFirst({
      where: eq(dataTeamPartners.id, id)
    });

    if (!current) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    await mkdir(UPLOAD_DIR, { recursive: true });

    let torFilePath = current.torFilePath;
    let bakFilePath = current.bakFilePath;

    if (torFile && torFile.size > 0) {
      const bytes = await torFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = `tor_${Date.now()}_${torFile.name.replace(/\s+/g, '_')}`;
      await writeFile(join(UPLOAD_DIR, filename), buffer);
      torFilePath = `/uploads/${filename}`;
    }

    if (bakFile && bakFile.size > 0) {
      const bytes = await bakFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = `bak_${Date.now()}_${bakFile.name.replace(/\s+/g, '_')}`;
      await writeFile(join(UPLOAD_DIR, filename), buffer);
      bakFilePath = `/uploads/${filename}`;
    }

    await db.update(dataTeamPartners)
      .set({ torFilePath, bakFilePath })
      .where(eq(dataTeamPartners.id, id));

    return NextResponse.json({ message: "Documents updated successfully", torFilePath, bakFilePath });
  } catch (error) {
    console.error("Document update error:", error);
    return NextResponse.json({ error: "Failed to update documents: " + getErrorMessage(error) }, { status: 500 });
  }
}
