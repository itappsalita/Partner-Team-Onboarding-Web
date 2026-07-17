import { NextResponse } from "next/server";
import { db } from "@/db";
import { dataTeamPartners, teams } from "@/db/schema";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { eq } from "drizzle-orm";
import { recalculateRequestStatus } from "@/db/status-utils";
import { getErrorMessage } from "@/lib/errors";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params;
    const assignmentId = idStr;
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    
    if (!session || (role !== "PROCUREMENT" && role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Unauthorized. Procurement or Superadmin only." }, { status: 403 });
    }

    // 1. Fetch assignment with its teams
    const assignment = await db.query.dataTeamPartners.findFirst({
      where: eq(dataTeamPartners.id, assignmentId),
      with: {
        teams: true
      }
    });

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    // 2. Check if all teams are in SOURCING status (no training requested yet)
    const canCancel = assignment.teams.every(t => t.status === 'SOURCING');
    if (!canCancel) {
      return NextResponse.json({ 
        error: "Tidak dapat membatalkan penugasan. Beberapa tim sudah memulai proses training atau evaluasi." 
      }, { status: 400 });
    }

    // 3. Perform cancellation in a transaction
    await db.transaction(async (tx) => {
      // 3a. Update assignment status to CANCELED
      await tx.update(dataTeamPartners)
        .set({ status: 'CANCELED' })
        .where(eq(dataTeamPartners.id, assignmentId));

      // 3b. Update all teams status under it to CANCELED as well (consistency)
      await tx.update(teams)
        .set({ status: 'CANCELED' })
        .where(eq(teams.dataTeamPartnerId, assignmentId));

      // 3c. Recalculate Global Request Status using central Utility
      await recalculateRequestStatus(tx, assignment.requestId);
    });

    return NextResponse.json({ message: "Assignment canceled successfully." });
  } catch (error) {
    console.error("Cancel assignment error:", error);
    return NextResponse.json({ error: "Failed to cancel assignment: " + getErrorMessage(error) }, { status: 500 });
  }
}
