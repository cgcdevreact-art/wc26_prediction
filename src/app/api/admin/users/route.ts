import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const sort = url.searchParams.get("sort") || "createdAt";
    const order = url.searchParams.get("order") || "desc";
    const role = url.searchParams.get("role") || "";
    const tier = url.searchParams.get("tier") || "";
    const status = url.searchParams.get("status") || "";
    const dateFilter = url.searchParams.get("dateFilter") || "";
    
    const skip = (page - 1) * limit;

    const where: any = search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {};
      
    if (role) where.role = role;
    if (tier) where.subscriptionTier = tier;
    if (status) {
      where.isBlocked = status === "blocked";
    }

    if (dateFilter) {
      const now = new Date();
      let dateLimit = new Date();
      
      switch (dateFilter) {
        case "1d":
          dateLimit.setDate(now.getDate() - 1);
          break;
        case "1w":
          dateLimit.setDate(now.getDate() - 7);
          break;
        case "1m":
          dateLimit.setMonth(now.getMonth() - 1);
          break;
        case "3m":
          dateLimit.setMonth(now.getMonth() - 3);
          break;
      }
      
      if (dateFilter !== "all") {
        where.createdAt = { gte: dateLimit };
      }
    }

    let orderBy: any = {};
    if (sort === 'predictions') {
      orderBy = { predictions: { _count: order } };
    } else {
      orderBy = { [sort]: order };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          _count: {
            select: { predictions: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({ users, total, page, limit });
  } catch (error: any) {
    console.error("Admin users GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, role, subscriptionTier, isBlocked } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (role !== undefined) updateData.role = role;
    if (subscriptionTier !== undefined) updateData.subscriptionTier = subscriptionTier;
    if (isBlocked !== undefined) updateData.isBlocked = isBlocked;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error: any) {
    console.error("Admin users PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, email, password, role, subscriptionTier } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || "user",
        subscriptionTier: subscriptionTier || "free",
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error: any) {
    console.error("Admin users POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
