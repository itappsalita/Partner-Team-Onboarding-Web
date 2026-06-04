import { NextResponse } from "next/server";
import { db } from "../../../db";
import { projectIds } from "../../../db/schema";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { eq, asc } from "drizzle-orm";

const ALLOWED_ROLES = ["SUPERADMIN", "PMO_OPS"];

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const showAll = searchParams.get("all") === "true";

    let rows;
    if (showAll) {
      rows = await db
        .select()
        .from(projectIds)
        .orderBy(asc(projectIds.projectId));
    } else {
      rows = await db
        .select()
        .from(projectIds)
        .where(eq(projectIds.isActive, 1))
        .orderBy(asc(projectIds.projectId));
    }

    return NextResponse.json({ data: rows });
  } catch {
    return NextResponse.json({ error: "Failed to fetch project IDs" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || !ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { projectId, projectName } = body;

    if (!projectId?.trim() || !projectName?.trim()) {
      return NextResponse.json({ error: "Project ID dan Project Name wajib diisi" }, { status: 400 });
    }

    await db.insert(projectIds).values({
      projectId: projectId.trim(),
      projectName: projectName.trim(),
      isActive: 1,
    });

    return NextResponse.json({ message: "Project ID berhasil ditambahkan" }, { status: 201 });
  } catch (error: any) {
    if (error.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "Project ID sudah ada" }, { status: 409 });
    }
    return NextResponse.json({ error: "Gagal menambahkan Project ID" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || !ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { id, projectId, projectName, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });
    }

    const updateData: any = {};
    if (projectId !== undefined) updateData.projectId = projectId.trim();
    if (projectName !== undefined) updateData.projectName = projectName.trim();
    if (isActive !== undefined) updateData.isActive = Number(isActive);

    await db.update(projectIds).set(updateData).where(eq(projectIds.id, id));

    return NextResponse.json({ message: "Project ID berhasil diperbarui" });
  } catch (error: any) {
    if (error.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "Project ID sudah ada" }, { status: 409 });
    }
    return NextResponse.json({ error: "Gagal memperbarui Project ID" }, { status: 500 });
  }
}
