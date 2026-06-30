import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "15");
    const type = url.searchParams.get("type") || "";
    const dateFilter = url.searchParams.get("dateFilter") || "";
    const sortBy = url.searchParams.get("sortBy") || "createdAt";
    const sortOrder = url.searchParams.get("sortOrder") || "desc";
    
    const skip = (page - 1) * limit;

    const where: any = search
      ? {
          user: {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } },
            ],
          },
        }
      : {};
      
    if (type) {
      where.type = type;
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

    // Determine orderBy
    let orderBy: any = { createdAt: "desc" };
    if (sortBy === "user.name") {
      orderBy = { user: { name: sortOrder } };
    } else if (sortBy === "user.email") {
      orderBy = { user: { email: sortOrder } };
    } else if (sortBy === "type") {
      orderBy = { type: sortOrder };
    } else if (sortBy === "createdAt") {
      orderBy = { createdAt: sortOrder };
    }

    const [predictions, total] = await Promise.all([
      prisma.prediction.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: {
            select: { name: true, email: true, subscriptionTier: true },
          },
          match: {
            include: {
              homeTeam: true,
              awayTeam: true,
            },
          },
          points: true,
        },
      }),
      prisma.prediction.count({ where }),
    ]);

    return NextResponse.json({ predictions, total, page, limit });
  } catch (error: any) {
    console.error("Admin predictions GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
