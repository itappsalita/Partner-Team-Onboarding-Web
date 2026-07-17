import { NextResponse } from "next/server";
import { db } from "../../../../../db";
import { teamMembers, teams } from "../../../../../db/schema";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { eq, and } from "drizzle-orm";
import { recalculateTeamStatus, recalculateAssignmentStatus, recalculateRequestStatus } from "../../../../../db/status-utils";
import fs from "fs-extra";
import { join } from "path";
import { getErrorMessage } from "@/lib/errors";

const UPLOAD_DIR = join(process.cwd(), "public/uploads");

/**
 * @swagger
 * /api/data-team/members/{id}:
 *   delete:
 *     summary: Remove or deactivate a team member
 *     description: Permanently deletes uncertified members or deactivates (soft-delete) certified ones. Automatically downgrades the team and assignment status.
 *     tags: [Members]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member processed and status synchronized successfully.
 *       404:
 *         description: Member not found.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const memberId = id;
    if (!memberId) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    // 1. Fetch member and associated team info for sync
    const member = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.id, memberId),
      with: {
        team: {
            with: {
                dataTeamPartner: true
            }
        }
      }
    });

    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    // 2. TRANSACTIONAL DELETE & SYNC
    await db.transaction(async (tx) => {
        // a. Conditional Delete/Deactivate
        if (member.certificateFilePath) {
          await tx.update(teamMembers)
            .set({ isActive: 0 })
            .where(eq(teamMembers.id, memberId));
        } else {
          await tx.delete(teamMembers).where(eq(teamMembers.id, memberId));
        }

        // b. Leader Sync
        if (member.position === "Leader") {
            await tx.update(teams)
              .set({ leaderName: "", leaderPhone: "" })
              .where(eq(teams.id, member.teamId));
        }

        // c. STATUS SYNC (Cascading Update / Downgrade)
        await recalculateTeamStatus(tx, member.teamId);
        await recalculateAssignmentStatus(tx, member.team.dataTeamPartnerId);
        await recalculateRequestStatus(tx, member.team.dataTeamPartner.requestId);
    });

    return NextResponse.json({ message: "Member removal processed and status synchronized successfully." });

  } catch (error) {
    console.error("Delete member error:", error);
    return NextResponse.json({ error: "Failed to process member removal: " + getErrorMessage(error) }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/data-team/members/{id}:
 *   put:
 *     summary: Update member personnel info
 *     description: Updates position, phone number, and selfie photo. Restricted to teams in SOURCING status. Changes to 'Leader' position or leader phone will sync with the Teams table.
 *     tags: [Members]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               position:
 *                 type: string
 *               phone:
 *                 type: string
 *               selfieFile:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Member updated successfully.
 *       400:
 *         description: Data locked (Team status is not SOURCING).
 *       404:
 *         description: Member not found or inactive.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const memberId = id;

    const formData = await req.formData();
    const position = formData.get("position") as string;
    const phone = ((formData.get("phone") as string) || "").replace(/\D/g, "");
    const emergencyContactName = formData.get("emergencyContactName") as string | null;
    const emergencyContactPhone = ((formData.get("emergencyContactPhone") as string) || "").replace(/\D/g, "") || null;
    const selfieFile = formData.get("selfieFile") as File | null;

    // 1. Fetch member and check team status
    const member = await db.query.teamMembers.findFirst({
        where: and(eq(teamMembers.id, memberId), eq(teamMembers.isActive, 1)),
        with: {
            team: true
        }
    });

    if (!member) return NextResponse.json({ error: "Member not found or inactive" }, { status: 404 });

    // 2. Strict Validation: Only SOURCING teams can be edited
    if (member.team.status !== 'SOURCING') {
        return NextResponse.json({ error: "Data sudah terkunci. Edit hanya diperbolehkan saat tim berstatus SOURCING." }, { status: 400 });
    }

    // 3. Process Upload if new selfie provided
    let selfieFilePath = member.selfieFilePath;
    if (selfieFile && selfieFile.size > 0) {
        await fs.ensureDir(UPLOAD_DIR);
        const bytes = await selfieFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filename = `selfie_upd_${Date.now()}_${selfieFile.name.replace(/\s+/g, '_')}`;
        await fs.writeFile(join(UPLOAD_DIR, filename), buffer);
        selfieFilePath = `/uploads/${filename}`;
    }

    // 4. Update Member in Transaction to handle Leader Sync
    await db.transaction(async (tx) => {
        // a. Update member
        await tx.update(teamMembers)
            .set({
                position: position || member.position,
                phone: phone || member.phone,
                emergencyContactName: emergencyContactName ?? member.emergencyContactName,
                emergencyContactPhone: emergencyContactPhone ?? member.emergencyContactPhone,
                selfieFilePath: selfieFilePath
            })
            .where(eq(teamMembers.id, memberId));

        // b. Leader Sync if position or leader phone changed
        if (position && position !== member.position) {
            if (position === "Leader") {
                // Member becomes leader
                await tx.update(teams)
                    .set({ leaderName: member.name, leaderPhone: phone || member.phone })
                    .where(eq(teams.id, member.teamId));
            } else if (member.position === "Leader") {
                // Member was leader, now is not
                await tx.update(teams)
                    .set({ leaderName: "", leaderPhone: "" })
                    .where(eq(teams.id, member.teamId));
            }
        } else if (member.position === "Leader" && phone && phone !== member.phone) {
            await tx.update(teams)
                .set({ leaderPhone: phone })
                .where(eq(teams.id, member.teamId));
        }
    });

    return NextResponse.json({ message: "Member updated successfully", selfieFilePath });

  } catch (error) {
    console.error("Update member error:", error);
    return NextResponse.json({ error: "Failed to update member: " + getErrorMessage(error) }, { status: 500 });
  }
}
