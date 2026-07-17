import { NextResponse } from "next/server";
import { db } from "../../../../db";
import { users, passwordResetTokens } from "../../../../db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { getErrorMessage } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    const { email, token, newPassword } = await req.json();

    if (!email || !token || !newPassword) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Password minimal harus 6 karakter" }, { status: 400 });
    }

    // 1. Verify token exists and is valid
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    
    const [resetRecord] = await db
      .select()
      .from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.email, email),
        eq(passwordResetTokens.token, hashedToken)
      ))
      .limit(1);

    if (!resetRecord) {
      return NextResponse.json({ error: "Link reset password tidak valid atau sudah digunakan." }, { status: 400 });
    }

    // 2. Check expiration
    if (new Date() > new Date(resetRecord.expiresAt)) {
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, resetRecord.id));
      return NextResponse.json({ error: "Link reset password telah kedaluwarsa. Silakan minta link baru." }, { status: 400 });
    }

    // 3. Update User Password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.email, email));

    // 4. Delete the token so it can't be reused
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, resetRecord.id));

    return NextResponse.json({ message: "Password Anda berhasil diperbarui. Silakan login kembali." });
  } catch (error) {
    console.error("Reset password API error:", error);
    return NextResponse.json({ error: "Gagal memperbarui password: " + getErrorMessage(error) }, { status: 500 });
  }
}
