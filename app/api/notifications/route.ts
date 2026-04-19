import { NextResponse } from "next/server";
import { db } from "../../../db";
import { notifications } from "../../../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Mendapatkan daftar notifikasi pengguna
 *     description: Mengambil maksimal 50 notifikasi terbaru milik pengguna yang sedang login.
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mengambil daftar notifikasi
 *       401:
 *         description: Tidak terautentikasi
 *       500:
 *         description: Gagal mengambil data
 */

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const userNotifications = await db.query.notifications.findMany({
      where: eq(notifications.userId, userId),
      orderBy: [desc(notifications.createdAt)],
      limit: 50,
    });

    return NextResponse.json(userNotifications);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/notifications:
 *   patch:
 *     summary: Menandai notifikasi sebagai sudah dibaca
 *     description: Mengubah status isRead menjadi 1 untuk satu notifikasi atau semua notifikasi milik user.
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 description: ID notifikasi (kosongkan jika readAll=true)
 *               readAll:
 *                 type: boolean
 *                 description: Set true untuk menandai semua sebagai dibaca
 *     responses:
 *       200:
 *         description: Berhasil memperbarui status
 *       400:
 *         description: Data input tidak valid
 */
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { id, readAll } = await req.json();

    if (readAll) {
      await db.update(notifications)
        .set({ isRead: 1 })
        .where(eq(notifications.userId, userId));
      return NextResponse.json({ message: "All notifications marked as read" });
    }

    if (!id) {
      return NextResponse.json({ error: "Notification ID is required" }, { status: 400 });
    }

    await db.update(notifications)
      .set({ isRead: 1 })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));

    return NextResponse.json({ message: "Notification marked as read" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}
