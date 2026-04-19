import { NextResponse } from "next/server";
import { db } from "../../../../db";
import { dataTeamPartners, trainingProcesses, users, requestForPartners, teams } from "../../../../db/schema";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { eq, or } from "drizzle-orm";
import { createNotification } from "../../../../lib/notifications";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as any).role;
    if (role !== "QA" && role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Access denied. QA only." }, { status: 403 });
    }

    // Fetch all teams with training-related statuses
    const results = await db.query.teams.findMany({
      where: (t, { or, eq }) => or(
        eq(t.status, 'WAIT_SCHEDULE_TRAINING'),
        eq(t.status, 'TRAINING_SCHEDULED'),
        eq(t.status, 'TRAINING_EVALUATED'),
        eq(t.status, 'COMPLETED')
      ),
      with: {
        members: true,
        trainingProcess: {
          with: {
            qa: {
              columns: {
                name: true
              }
            }
          }
        },
        dataTeamPartner: {
          with: {
            request: true,
            partner: {
              columns: {
                name: true,
                email: true,
              }
            }
          }
        }
      },
      orderBy: (t, { desc }) => [desc(t.createdAt)]
    });

    return NextResponse.json(results);
  } catch (error: any) {
    console.error("Fetch training schedule error:", error);
    return NextResponse.json({ error: "Failed to fetch training schedules" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as any).role;
    const userId = (session.user as any).id;
    if (role !== "QA" && role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Access denied. QA only." }, { status: 403 });
    }

    const body = await req.json();
    const { teamId, trainingDate } = body;

    if (!teamId || !trainingDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Update Training Process
    await db.update(trainingProcesses)
      .set({ 
        trainingDate: new Date(trainingDate),
        qaId: userId
      })
      .where(eq(trainingProcesses.teamId, teamId));

    await db.update(teams)
      .set({ status: 'TRAINING_SCHEDULED' })
      .where(eq(teams.id, teamId));

    // 3. Notify the Partner
    const teamWithPartner = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
      with: {
        dataTeamPartner: true
      }
    });

    if (teamWithPartner?.dataTeamPartner?.partnerId) {
      await createNotification({
        userId: teamWithPartner.dataTeamPartner.partnerId,
        title: "Jadwal Training Ditetapkan",
        message: `Jadwal training untuk unit ${teamWithPartner.displayId} telah ditetapkan pada ${new Date(trainingDate).toLocaleDateString('id-ID')}.`,
        type: "TRAINING",
        link: `/data-team?highlight=${teamWithPartner.dataTeamPartnerId}`
      });
    }

    return NextResponse.json({ message: "Training schedule updated successfully." });
  } catch (error: any) {
    console.error("Update schedule error:", error);
    return NextResponse.json({ error: "Gagal memperbarui jadwal training" }, { status: 500 });
  }
}
