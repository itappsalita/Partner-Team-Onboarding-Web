import { NextResponse } from "next/server";
import { db } from "../../../db";
import { requestForPartners, dataTeamPartners } from "../../../db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { generateUuid } from "../../../lib/uuid";
import { notifyUsersByRole } from "../../../lib/notifications";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Define query options based on role
    const isPartner = session.user.role === "PARTNER";

    const allRequests = await db.query.requestForPartners.findMany({
      with: {
        pmo: {
          columns: {
            name: true,
            email: true,
          }
        },
        dataTeamPartners: {
          where: isPartner ? eq(dataTeamPartners.partnerId, session.user.id) : undefined,
          with: {
            teams: {
              columns: {
                id: true
              }
            }
          }
        }
      },
      orderBy: (requests, { desc }) => [desc(requests.createdAt)],
    });

    // If partner, filter out requests that don't have any associated assignments for them
    const filteredRequests = isPartner
      ? allRequests.filter((req) => req.dataTeamPartners.length > 0)
      : allRequests;

    // Calculate totalRegisteredTeams for each request (excluding CANCELED assignments)
    const requestsWithTotals = filteredRequests.map((req) => {
      const activeAssignments = (req.dataTeamPartners || []).filter((dt) => dt.status !== 'CANCELED');
      const totalRegisteredTeams = activeAssignments.reduce((acc, dt) => acc + (dt.teams?.length || 0), 0);
      // Remove dataTeamPartners from the response
      const { dataTeamPartners, ...rest } = req;
      void dataTeamPartners;
      return {
        ...rest,
        totalRegisteredTeams
      };
    });

    return NextResponse.json(requestsWithTotals);
  } catch {
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role;
    if (role !== "PMO_OPS" && role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Unauthorized. PMO Ops or Superadmin only." }, { status: 403 });
    }

    const body = await req.json();
    const { sowPekerjaan, deskripsi, provinsi, area, jumlahKebutuhan, membersPerTeam, siteId, dueDate } = body;

    if (!sowPekerjaan || !deskripsi || !provinsi || !area || !jumlahKebutuhan || !membersPerTeam || !dueDate) {
      return NextResponse.json({ error: "Missing required fields (including membersPerTeam)" }, { status: 400 });
    }

    // 5. TRANSACTIONAL INSERT & ID GENERATION
    const result = await db.transaction(async (tx) => {
        const requestId = generateUuid();
        await tx.insert(requestForPartners).values({
          id: requestId,
          pmoId: session.user.id,
          sowPekerjaan,
          provinsi,
          area,
          jumlahKebutuhan: parseInt(jumlahKebutuhan),
          membersPerTeam: parseInt(membersPerTeam),
          siteId,
          deskripsi,
          dueDate: new Date(dueDate),
          status: 'REQUESTED'
        });

        // Fetch sequence number
        const [newReq] = await tx.select({ seqNumber: requestForPartners.seqNumber })
          .from(requestForPartners)
          .where(eq(requestForPartners.id, requestId));
        
        const displayId = `REQ-${(newReq?.seqNumber || 0).toString().padStart(5, '0')}`;
        
        // Update displayId
        await tx.update(requestForPartners)
          .set({ displayId })
          .where(eq(requestForPartners.id, requestId));

        return { id: requestId, displayId };
    });

    // Notify Procurement team
    await notifyUsersByRole({
      role: "PROCUREMENT",
      title: "Request For Partner Baru",
      message: `RFP Baru telah dibuat: ${sowPekerjaan} (${result.displayId})`,
      type: "RFP",
      link: `/requests`
    });

    return NextResponse.json({ message: "Request created successfully", id: result.id, displayId: result.displayId }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
  }
}
