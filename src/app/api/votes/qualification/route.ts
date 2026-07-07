import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { matchId, teamId } = body;

    if (!matchId || !teamId) {
      return NextResponse.json({ error: "Missing matchId or teamId" }, { status: 400 });
    }

    // Enforce 1 vote per user per match qualification category
    await prisma.prediction.upsert({
      where: {
        userId_matchId_type: {
          userId: session.user.id,
          matchId: parseInt(matchId, 10),
          type: "VOTE_QUALIFICATION"
        }
      },
      update: {
        predictedTeamId: parseInt(teamId, 10)
      },
      create: {
        userId: session.user.id,
        matchId: parseInt(matchId, 10),
        type: "VOTE_QUALIFICATION",
        predictedTeamId: parseInt(teamId, 10)
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to cast qualification vote:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const matchIdStr = searchParams.get("matchId");
    if (!matchIdStr) {
      return NextResponse.json({ error: "Missing matchId" }, { status: 400 });
    }

    const matchId = parseInt(matchIdStr, 10);

    // Get total votes cast
    const votes = await prisma.prediction.findMany({
      where: {
        matchId,
        type: "VOTE_QUALIFICATION"
      }
    });

    const totalVotes = votes.length;
    const teamCounts: Record<string, number> = {};

    votes.forEach((v) => {
      if (v.predictedTeamId) {
        const idStr = String(v.predictedTeamId);
        teamCounts[idStr] = (teamCounts[idStr] || 0) + 1;
      }
    });

    const percentages: Record<string, number> = {};
    if (totalVotes > 0) {
      Object.entries(teamCounts).forEach(([teamId, count]) => {
        percentages[teamId] = Math.round((count / totalVotes) * 100);
      });
    }

    return NextResponse.json({
      success: true,
      totalVotes,
      percentages
    });
  } catch (error) {
    console.error("Failed to fetch qualification votes:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
