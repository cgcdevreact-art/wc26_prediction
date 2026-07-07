import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ensureTablesExist } from "../../../votes/route";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await ensureTablesExist();
    const resolvedParams = await props.params;
    const matchId = resolvedParams.id;

    const session = await auth();
    const cookieDeviceId = request.cookies.get("device_id")?.value || null;
    const userId = session?.user?.id || null;

    // Fetch aggregates
    const homeVotes = await prisma.matchPrediction.count({
      where: { matchId, prediction: "HOME" },
    });

    const awayVotes = await prisma.matchPrediction.count({
      where: { matchId, prediction: "AWAY" },
    });

    const totalVotes = homeVotes + awayVotes;
    const homePercent = totalVotes > 0 ? Math.round((homeVotes / totalVotes) * 100) : 50;
    const awayPercent = totalVotes > 0 ? 100 - homePercent : 50;

    // Fetch user/device prediction
    let userPrediction = null;
    if (userId) {
      const pred = await prisma.matchPrediction.findUnique({
        where: { userId_matchId: { userId, matchId } },
      });
      if (pred) userPrediction = pred.prediction;
    } else if (cookieDeviceId) {
      const pred = await prisma.matchPrediction.findUnique({
        where: { deviceId_matchId: { deviceId: cookieDeviceId, matchId } },
      });
      if (pred) userPrediction = pred.prediction;
    }

    return NextResponse.json({
      success: true,
      summary: {
        homeVotes,
        awayVotes,
        totalVotes,
        homePercent,
        awayPercent,
      },
      userPrediction,
    });
  } catch (error: any) {
    console.error("Failed to load predictions summary:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
