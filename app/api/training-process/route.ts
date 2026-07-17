import { NextResponse } from "next/server";
import { db } from "../../../db";
import { trainingProcesses } from "../../../db/schema";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { generateUuid } from "../../../lib/uuid";
import { eq } from "drizzle-orm";

/**
 * @swagger
 * /api/training-process:
 *   get:
 *     summary: Fetch all training records
 *     description: Retrieves the complete history of team evaluations and training statuses.
 *     tags: [Training]
 *     responses:
 *       200:
 *         description: A list of training process records.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const allTraining = await db.select().from(trainingProcesses);
    return NextResponse.json(allTraining);
  } catch {
    return NextResponse.json({ error: "Failed to fetch training data" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/training-process:
 *   post:
 *     summary: Record team training results
 *     description: Submits evaluation data for a team. Restricted to QA role.
 *     tags: [Training]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [teamId]
 *             properties:
 *               teamId:
 *                 type: string
 *               trainingDate:
 *                 type: string
 *                 format: date-time
 *               result:
 *                 type: string
 *                 enum: [PENDING, LULUS, TIDAK_LULUS]
 *               whatsappGroupJustification:
 *                 type: string
 *     responses:
 *       201:
 *         description: Training record updated successfully.
 *       403:
 *         description: Forbidden. QA only.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "QA") {
      return NextResponse.json({ error: "Unauthorized. QA only." }, { status: 403 });
    }

    const body = await req.json();
    const { teamId, trainingDate, result, whatsappGroupJustification } = body;

    if (!teamId) {
      return NextResponse.json({ error: "Missing teamId" }, { status: 400 });
    }

    const trainingId = generateUuid();
    await db.insert(trainingProcesses).values({
      id: trainingId,
      teamId: teamId,
      qaId: session.user.id,
      trainingDate: trainingDate ? new Date(trainingDate) : null,
      result: result || 'PENDING',
      whatsappGroupJustification: whatsappGroupJustification || null
    });

    // Fetch the generated seq_number to create displayId
    const [newTrn] = await db.select({ seqNumber: trainingProcesses.seqNumber })
      .from(trainingProcesses)
      .where(eq(trainingProcesses.id, trainingId));
    
    const displayId = `TRN-${(newTrn?.seqNumber || 0).toString().padStart(5, '0')}`;
    
    await db.update(trainingProcesses)
      .set({ displayId })
      .where(eq(trainingProcesses.id, trainingId));

    return NextResponse.json({ message: "Training record updated successfully", id: trainingId, displayId }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to update training record" }, { status: 500 });
  }
}
