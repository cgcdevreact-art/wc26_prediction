import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  try {
    const [
      predictionCount,
      predictionsToday,
      userCount,
      newUsersToday,
    ] = await Promise.all([
      prisma.prediction.count(),
      prisma.prediction.count({
        where: {
          createdAt: {
            gte: todayStart,
          },
        },
      }),
      prisma.user.count(),
      prisma.user.count({
        where: {
          createdAt: {
            gte: todayStart,
          },
        },
      }),
    ]);

    return NextResponse.json({
      predictionCount,
      predictionsToday,
      activePredictorCount: userCount,
      newUsersToday,
    });
  } catch (error) {
    console.error("Failed to load live stats:", error);

    return NextResponse.json(
      {
        error: "Failed to load live stats",
      },
      { status: 500 },
    );
  }
}
