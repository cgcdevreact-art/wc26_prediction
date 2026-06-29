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
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const userId = url.searchParams.get("userId") || undefined;
    const search = url.searchParams.get("search") || "";
    const type = url.searchParams.get("type") || "";
    const skip = (page - 1) * limit;

    const where: any = {};
    if (userId) {
      where.userId = userId;
    }
    if (type) {
      where.type = type;
    }
    if (search) {
      where.OR = [
        {
          user: {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } },
            ]
          }
        },
        {
          match: {
            OR: [
              { homeTeam: { name: { contains: search } } },
              { homeTeam: { shortName: { contains: search } } },
              { homeTeam: { tla: { contains: search } } },
              { awayTeam: { name: { contains: search } } },
              { awayTeam: { shortName: { contains: search } } },
              { awayTeam: { tla: { contains: search } } },
            ]
          }
        }
      ];
    }

    const [predictions, total] = await Promise.all([
      prisma.prediction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true, email: true } },
          match: {
            select: {
              homeTeam: { select: { shortName: true, tla: true } },
              awayTeam: { select: { shortName: true, tla: true } },
              utcDate: true,
            },
          },
          points: { select: { points: true } },
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

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Prediction ID is required" }, { status: 400 });
    }

    await prisma.prediction.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Admin predictions DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
