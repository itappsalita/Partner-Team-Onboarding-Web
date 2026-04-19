import { NextResponse } from "next/server";
import { db } from "../../../db";
import { users } from "../../../db/schema";
import bcrypt from "bcrypt";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { eq } from "drizzle-orm";
import { generateUuid } from "../../../lib/uuid";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const roleFilter = searchParams.get("role") as any;
    const currentUserRole = (session.user as any).role;

    // Only Superadmin can see ALL users. 
    // Procurement can see PARTNERs.
    if (currentUserRole !== "SUPERADMIN" && currentUserRole !== "PROCUREMENT") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    let baseQuery = db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      companyName: users.companyName,
      displayId: users.displayId,
      isActive: users.isActive,
      createdAt: users.createdAt,
    }).from(users);

    let allUsers;
    if (roleFilter) {
      // @ts-ignore
      allUsers = await baseQuery.where(eq(users.role, roleFilter));
    } else {
      allUsers = await baseQuery;
    }

    return NextResponse.json(allUsers);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    // Allow initial user creation if DB is empty, otherwise require Superadmin
    const userCount = await db.select().from(users).limit(1);
    
    if (userCount.length > 0 && (!session || (session.user as any).role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Unauthorized. Superadmin only." }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, password, role, companyName } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = generateUuid();

    // 1. Insert the user
    await db.insert(users).values({
      id: userId,
      name,
      email,
      password: hashedPassword,
      role,
      companyName: role === 'PARTNER' ? companyName : null,
      isActive: 1, // Default to active on creation
    });

    // 2. Fetch the generated seq_number to create display_id
    const [newUser] = await db.select({ seqNumber: users.seqNumber })
      .from(users)
      .where(eq(users.id, userId));
    
    const seq = newUser?.seqNumber || 0;
    const displayId = `USR-${seq.toString().padStart(5, '0')}`;
    
    // 3. Update with displayId
    await db.update(users)
      .set({ displayId })
      .where(eq(users.id, userId));

    return NextResponse.json({ message: "User registered successfully", id: userId, displayId }, { status: 201 });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
       return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to register user" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Unauthorized. Superadmin only." }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, email, role, password, isActive, companyName } = body;

    const userId = id;
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (companyName !== undefined) updateData.companyName = companyName;
    if (isActive !== undefined) updateData.isActive = Number(isActive);
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    await db.update(users)
      .set(updateData)
      .where(eq(users.id, userId));

    return NextResponse.json({ message: "User updated successfully" });
  } catch (error: any) {
    console.error("PUT /api/users error:", error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to update user: " + error.message }, { status: 500 });
  }
}
