import { NextResponse } from "next/server";
import { db } from "@/db";
import { teamMembers, teams, dataTeamPartners, requestForPartners, users } from "@/db/schema";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as any).role;
    const allowed = ["SUPERADMIN", "PMO_OPS", "PROCUREMENT", "QA", "PEOPLE_CULTURE"];
    if (!allowed.includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.toLowerCase() || "";

    const allMembers = await db.query.teamMembers.findMany({
      where: eq(teamMembers.isActive, 1),
      with: {
        team: {
          with: {
            dataTeamPartner: {
              with: {
                request: {
                  columns: {
                    sowPekerjaan: true,
                    provinsi: true,
                    area: true,
                  }
                },
                partner: {
                  columns: { name: true, companyName: true }
                }
              }
            }
          }
        }
      },
      orderBy: (m, { desc }) => [desc(m.createdAt)],
    });

    const filtered = search
      ? allMembers.filter(m =>
          m.name.toLowerCase().includes(search) ||
          m.nik.toLowerCase().includes(search) ||
          m.phone?.toLowerCase().includes(search) ||
          m.position?.toLowerCase().includes(search)
        )
      : allMembers;

    return NextResponse.json(filtered);
  } catch (error: any) {
    console.error("Members DB error:", error);
    return NextResponse.json({ error: "Gagal mengambil data anggota" }, { status: 500 });
  }
}
