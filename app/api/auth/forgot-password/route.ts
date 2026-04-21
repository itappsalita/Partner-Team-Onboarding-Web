import { NextResponse } from "next/server";
import { db } from "../../../../db";
import { users, passwordResetTokens } from "../../../../db/schema";
import { eq, lt, or } from "drizzle-orm";
import crypto from "crypto";
import { sendPasswordResetEmail } from "../../../../lib/mail";
import { generateUuid } from "../../../../lib/uuid";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // 1. Check if user exists
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user) {
      // For security, don't reveal if user exists or not
      // But we can return success since the "email will be sent" message is generic
      return NextResponse.json({ message: "Jika email terdaftar, instruksi reset password akan dikirimkan." });
    }

    // 2. Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

    // 3. Save to database
    // Delete existing tokens for this email AND clean up all expired tokens globally
    await db.delete(passwordResetTokens).where(
      or(
        eq(passwordResetTokens.email, email),
        lt(passwordResetTokens.expiresAt, new Date())
      )
    );
    
    await db.insert(passwordResetTokens).values({
      id: generateUuid(),
      email: email,
      token: hashedToken,
      expiresAt: expiresAt,
    });

    // 4. Send email
    await sendPasswordResetEmail(email, token);

    return NextResponse.json({ message: "Instruksi reset password telah dikirimkan ke email Anda." });
  } catch (error: any) {
    console.error("Forgot password API error:", error);
    return NextResponse.json({ error: "Gagal memproses permintaan: " + error.message }, { status: 500 });
  }
}
