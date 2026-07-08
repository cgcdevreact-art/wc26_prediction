import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureTablesExist } from "../../votes/route";
import { getPlayers } from "@/lib/data";
import { fetchLiveSource, mapFixtures } from "@/lib/fixtures/source";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await ensureTablesExist();
    const resolvedParams = await props.params;
    const id = parseInt(resolvedParams.id, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid match ID" }, { status: 400 });
    }

    const match = await prisma.fixtureCache.findUnique({
      where: { matchNo: id },
    });

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    // Fetch dynamic players for both teams
    const allPlayers = await getPlayers();
    const homePlayers = allPlayers.filter(
      (p: any) => p["Team Code"] === match.homeTeamCode
    );
    const awayPlayers = allPlayers.filter(
      (p: any) => p["Team Code"] === match.awayTeamCode
    );

    const mapPlayer = (p: any) => ({
      name: p["Player Name"] || p.name,
      position: p["Position"] || p.position,
      rating: Number(p["Overall Rating"] || p.overallRating || 75),
    });

    const lineups = {
      home: homePlayers.length > 0 ? homePlayers.map(mapPlayer) : [
        { name: "Martinez", position: "Goalkeeper", rating: 84 },
        { name: "Romero", position: "Defender", rating: 83 },
        { name: "Otamendi", position: "Defender", rating: 81 },
        { name: "Tagliafico", position: "Defender", rating: 79 },
        { name: "Molina", position: "Defender", rating: 79 },
        { name: "De Paul", position: "Midfielder", rating: 82 },
        { name: "Fernandez", position: "Midfielder", rating: 81 },
        { name: "Mac Allister", position: "Midfielder", rating: 82 },
        { name: "Messi", position: "Forward", rating: 90 },
        { name: "Alvarez", position: "Forward", rating: 82 },
        { name: "Gonzalez", position: "Forward", rating: 78 }
      ],
      away: awayPlayers.length > 0 ? awayPlayers.map(mapPlayer) : [
        { name: "El Shenawy", position: "Goalkeeper", rating: 78 },
        { name: "Hegazi", position: "Defender", rating: 77 },
        { name: "Abdelmonem", position: "Defender", rating: 76 },
        { name: "Hany", position: "Defender", rating: 75 },
        { name: "Fotouh", position: "Defender", rating: 74 },
        { name: "Elneny", position: "Midfielder", rating: 76 },
        { name: "Fathi", position: "Midfielder", rating: 75 },
        { name: "Ashour", position: "Midfielder", rating: 76 },
        { name: "Salah", position: "Forward", rating: 88 },
        { name: "Marmoush", position: "Forward", rating: 79 },
        { name: "Mostafa Mohamed", position: "Forward", rating: 77 }
      ]
    };

    // Try to load from mapped live source first to get accurate kickoff time details
    let liveFixture: any = null;
    try {
      const liveSource = await fetchLiveSource();
      const fixtures = mapFixtures(liveSource);
      liveFixture = fixtures.find((f) => f.match_no === id);
    } catch (e) {
      console.warn("Failed to read live fixtures inside match detail API:", e);
    }

    // Map to a cleaner fixture structure matching what the client expects
    const fixture = {
      match_no: match.matchNo,
      date: match.date,
      kickoffTime: liveFixture?.kickoffTime || "",
      kickoffAtIso: liveFixture?.kickoffAtIso || (match.date + "T12:00:00Z"),
      timezoneLabel: liveFixture?.timezoneLabel || "EST",
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
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      time_elapsed: match.timeElapsed,
      isKnockout: match.isKnockout,
      stageName: match.stageName,
      lineups
    };

    return NextResponse.json({ success: true, match: fixture });
  } catch (error: any) {
    console.error("Failed to load match detail:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
