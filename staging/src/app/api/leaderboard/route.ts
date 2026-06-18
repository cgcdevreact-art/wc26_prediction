import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "global"; // global, country, weekly
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 50;
  const skip = (page - 1) * limit;

  try {
    let orderBy: any = { totalPoints: "desc" };
    if (type === "weekly") {
      orderBy = { weeklyPoints: "desc" };
    }

    const leaderboard = await prisma.leaderboard.findMany({
      skip,
      take: limit,
      orderBy,
      include: {
        user: {
          select: { name: true, image: true }
        }
      }
    });

    return NextResponse.json(leaderboard);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
