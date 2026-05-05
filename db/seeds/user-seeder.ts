import { drizzle } from "drizzle-orm/mysql2";
import { users } from "../schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.production") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

/**
 * SUPERADMIN Seeder
 * Creates a default SUPERADMIN user for system initialization
 *
 * Usage:
 * npm run seed:user
 */

async function seedSuperAdmin() {
  try {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error("DATABASE_URL not found in .env.local");
    }

    // Parse DATABASE_URL: mysql://root:password@localhost:3306/database
    const url = new URL(databaseUrl);

    const connection = await mysql.createConnection({
      host: url.hostname || "localhost",
      user: url.username || "root",
      password: url.password || "",
      database: url.pathname?.slice(1) || "partner_onboarding_db",
      port: parseInt(url.port || "3306"),
    });

    const db = drizzle(connection);

    const superAdminEmail = "superadmin@alita.id";
    const superAdminPassword = "password123!";

    console.log("🔄 Checking for existing SUPERADMIN...");

    // Check if SUPERADMIN already exists
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.email, superAdminEmail));

    if (existingAdmin.length > 0) {
      console.log("✓ SUPERADMIN user already exists");
      await connection.end();
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(superAdminPassword, 10);

    // Create SUPERADMIN user
    const superAdminId = uuidv4();

    await db.insert(users).values({
      id: superAdminId,
      displayId: `SA-${Date.now()}`,
      name: "Super Administrator",
      email: superAdminEmail,
      password: hashedPassword,
      role: "SUPERADMIN",
      companyName: "Alita Praya Mitra",
      isActive: 1,
      createdAt: new Date(),
    });

    console.log(`
╔════════════════════════════════════════════════════════╗
║    ✓ SUPERADMIN USER CREATED SUCCESSFULLY             ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║  📧 Email:    superadmin@alita.id           ║
║  🔐 Password: password123!                          ║
║  👤 Name:     Super Administrator                     ║
║                                                        ║
╠════════════════════════════════════════════════════════╣
║  ⚠️  IMPORTANT:                                       ║
║  Change password immediately after first login!      ║
╚════════════════════════════════════════════════════════╝
    `);

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

seedSuperAdmin();
