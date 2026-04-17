import { NextResponse } from "next/server";
import { db } from "../../../../../db";
import { teamMembers, teams } from "../../../../../db/schema";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { eq } from "drizzle-orm";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const memberId = id;
    if (!memberId) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    // Fetch member to check certification status
    const member = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.id, memberId),
    });

    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    // Conditional Delete Logic
    if (member.certificateFilePath) {
      // If already certified, just deactivate
      await db.update(teamMembers)
        .set({ isActive: 0 })
        .where(eq(teamMembers.id, memberId));
      
      return NextResponse.json({ message: "Member deactivated (certified records preserved)." });
    } else {
      // If not certified, hard delete
      await db.delete(teamMembers).where(eq(teamMembers.id, memberId));
    }

    // SYNC: If the removed member was a leader, clear the teams table fields
    if (member.position === "Leader") {
      await db.update(teams)
        .set({ 
          leaderName: "", 
          leaderPhone: "" 
        })
        .where(eq(teams.id, member.teamId));
    }

    return NextResponse.json({ message: "Member removal processed successfully." });

  } catch (error: any) {
    console.error("Delete member error:", error);
    return NextResponse.json({ error: "Failed to process member removal" }, { status: 500 });
  }
}
