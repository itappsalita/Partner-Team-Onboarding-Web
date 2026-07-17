import { db } from "../db";
import { notifications, users } from "../db/schema";
import { generateUuid } from "./uuid";
import { eq } from "drizzle-orm";
import { sendNotificationEmail } from "./mail";

export type NotificationType = "RFP" | "ASSIGNMENT" | "TRAINING" | "CERTIFICATE" | "SYSTEM";

const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

/**
 * Fires off the email counterpart of an in-app notification without blocking the caller.
 * SMTP failures are swallowed here (logged only) - an email hiccup must never fail the
 * in-app notification that already succeeded.
 */
function dispatchNotificationEmail(
  emails: (string | null | undefined)[],
  title: string,
  message: string,
  link?: string,
) {
  const recipients = emails.filter((e): e is string => !!e);
  if (recipients.length === 0) return;

  const bodyHtml = `
    <p>${message}</p>
    ${link ? `<p><a href="${APP_URL}${link}">Lihat detail</a></p>` : ""}
  `;

  sendNotificationEmail(recipients, title, bodyHtml).catch((err) =>
    console.error("Failed to dispatch notification email:", err),
  );
}

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

    const [user] = await db.select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId));
    dispatchNotificationEmail([user?.email], title, message, link);

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
  role: "PROCUREMENT" | "QA" | "PMO_OPS" | "SUPERADMIN" | "PARTNER" | "PEOPLE_CULTURE" | "IT_BM";
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
}) {
  try {
    // Fetch all users with the specified role
    const matchingUsers = await db.select({ id: users.id, email: users.email })
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

    dispatchNotificationEmail(matchingUsers.map((u) => u.email), title, message, link);

    return { success: true, count: matchingUsers.length };
  } catch (error) {
    console.error(`Failed to notify users with role ${role}:`, error);
    return { success: false, error };
  }
}
