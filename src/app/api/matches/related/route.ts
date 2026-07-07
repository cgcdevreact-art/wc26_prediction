import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureTablesExist } from "../../votes/route";

export async function GET(request: NextRequest) {
  try {
    await ensureTablesExist();
    const url = new URL(request.url);
    const exclude = url.searchParams.get("exclude") || "";

    const excludeId = parseInt(exclude, 10);

    // Get upcoming matches sorted by kickoff date
    const matches = await prisma.fixtureCache.findMany({
      where: {
        status: "UPCOMING",
        ...(isNaN(excludeId) ? {} : { matchNo: { not: excludeId } }),
      },
      orderBy: { date: "asc" },
      take: 12,
    });

    const matchIds = matches.map((m) => String(m.matchNo));

    // Fetch predictions aggregates for these matches
    const predictionGroups = await prisma.matchPrediction.groupBy({
      by: ["matchId", "prediction"],
      _count: true,
      where: { matchId: { in: matchIds } },
    });

    // Parse aggregates
    const voteCounts: Record<string, { HOME: number; AWAY: number }> = {};
    matchIds.forEach((id) => {
      voteCounts[id] = { HOME: 0, AWAY: 0 };
    });

    predictionGroups.forEach((group) => {
      const p = group.prediction;
      if (voteCounts[group.matchId]) {
        if (p === "HOME") voteCounts[group.matchId].HOME = group._count;
        if (p === "AWAY") voteCounts[group.matchId].AWAY = group._count;
      }
    });

    const formatted = matches.map((match) => {
      const id = String(match.matchNo);
      const home = voteCounts[id]?.HOME || 0;
      const away = voteCounts[id]?.AWAY || 0;
      const total = home + away;

      const homePercent = total > 0 ? Math.round((home / total) * 100) : 50;
      const awayPercent = 100 - homePercent;

      return {
        match_no: match.matchNo,
        date: match.date,
        group: match.group,
        homeTeamObj: {
          name: match.homeTeamName,
          flag: match.homeTeamFlag,
          code: match.homeTeamCode,
        },
        awayTeamObj: {
          name: match.awayTeamName,
          flag: match.awayTeamFlag,
          code: match.awayTeamCode,
        },
        venue: match.venue,
        city: match.city,
        status: match.status,
        stageName: match.stageName,
        predictions: {
          homePercent,
          awayPercent,
          totalVotes: total,
        },
      };
    });

    return NextResponse.json({ success: true, matches: formatted });
  } catch (error: any) {
    console.error("Failed to load related matches:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
