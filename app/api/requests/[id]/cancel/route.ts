import { NextResponse } from "next/server";
import { db } from "@/db";
import { requestForPartners } from "@/db/schema";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { eq } from "drizzle-orm";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: requestId } = await params;
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;

    if (!session || (role !== "PMO_OPS" && role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Unauthorized. PMO Ops atau Superadmin only." }, { status: 403 });
    }

    // Fetch request
    const request = await db.query.requestForPartners.findFirst({
      where: eq(requestForPartners.id, requestId),
    });

    if (!request) {
      return NextResponse.json({ error: "Request tidak ditemukan." }, { status: 404 });
    }

    // Only allow cancel if status is REQUESTED
    if (request.status !== "REQUESTED") {
      return NextResponse.json({
        error: "Request hanya bisa dibatalkan jika statusnya masih REQUESTED.",
      }, { status: 400 });
    }

    // Update status to CANCELED
    await db.update(requestForPartners)
      .set({ status: "CANCELED" })
      .where(eq(requestForPartners.id, requestId));

    return NextResponse.json({ message: "Request berhasil dibatalkan." });
  } catch (error: any) {
    console.error("Cancel request error:", error);
    return NextResponse.json({ error: "Gagal membatalkan request: " + error.message }, { status: 500 });
  }
}
