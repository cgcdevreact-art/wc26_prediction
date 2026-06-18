import { NextResponse } from "next/server";
import { syncCompetitions, syncTeams, syncMatches, syncStandings } from "@/lib/football-data/sync";

async function performSync() {
  const competitionCode = "WC";

  const compResult = await syncCompetitions(competitionCode);
  const teamsResult = await syncTeams(competitionCode);
  const matchesResult = await syncMatches(competitionCode);
  
  let standingsResult = null;
  try {
    standingsResult = await syncStandings(competitionCode);
  } catch (e) {
    console.log("Standings sync failed (may not be available yet)", e);
  }

  const { seedProbabilities } = await import("@/lib/seed-probabilities");
  const seededCount = await seedProbabilities();

  return {
    success: true,
    competition: compResult,
    teams: teamsResult,
    matches: matchesResult,
    standings: standingsResult,
    seeded: seededCount,
  };
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.AUTH_SECRET}` && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await performSync();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Sync Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && authHeader !== `Bearer ${process.env.AUTH_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await performSync();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Sync Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

