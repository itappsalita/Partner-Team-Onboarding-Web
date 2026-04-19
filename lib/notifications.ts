import { db } from "../db";
import { notifications, users } from "../db/schema";
import { generateUuid } from "./uuid";
import { eq, inArray } from "drizzle-orm";

export type NotificationType = "RFP" | "ASSIGNMENT" | "TRAINING" | "CERTIFICATE" | "SYSTEM";

/**
 * Creates a single notification for a specific user
 */
export async function createNotification({
  userId,
  title,
  message,
  type,
  link,
}: {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
}) {
  try {
    const id = generateUuid();
    await db.insert(notifications).values({
      id,
      userId,
      title,
      message,
      type,
      link,
      isRead: 0,
    });
    return { success: true, id };
  } catch (error) {
    console.error("Failed to create notification:", error);
    return { success: false, error };
  }
}

/**
 * Creates notifications for all users with a specific role
 */
export async function notifyUsersByRole({
  role,
  title,
  message,
  type,
  link,
}: {
  role: "PROCUREMENT" | "QA" | "PMO_OPS" | "SUPERADMIN" | "PARTNER" | "PEOPLE_CULTURE";
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
}) {
  try {
    // Fetch all users with the specified role
    const matchingUsers = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.role, role));

    if (matchingUsers.length === 0) return { success: true, count: 0 };

    // Create notifications for each user
    const notificationValues = matchingUsers.map((user) => ({
      id: generateUuid(),
      userId: user.id,
      title,
      message,
      type,
      link,
      isRead: 0,
    }));

    await db.insert(notifications).values(notificationValues);
    
    return { success: true, count: matchingUsers.length };
  } catch (error) {
    console.error(`Failed to notify users with role ${role}:`, error);
    return { success: false, error };
  }
}
