import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    let matches = await prisma.marketMatch.findMany({
      where: search ? {
        OR: [
          { homeTeamName: { contains: search } },
          { awayTeamName: { contains: search } },
          { homeTeamCode: { contains: search } },
          { awayTeamCode: { contains: search } },
        ]
      } : undefined,
      include: {
        votes: true,
      },
      orderBy: {
        matchDate: "asc",
      },
    });

    if (matches.length === 0) {
      // Seed data if empty
      const SEED_MATCHES = [
        { homeTeamName: "United States", homeTeamCode: "USA", homeTeamFlag: "us", awayTeamName: "Belgium", awayTeamCode: "BEL", awayTeamFlag: "be", matchDate: new Date("2026-07-11T12:00:00Z"), stage: "QUARTER-FINAL", status: "upcoming" },
        { homeTeamName: "Portugal", homeTeamCode: "POR", homeTeamFlag: "pt", awayTeamName: "Spain", awayTeamCode: "ESP", awayTeamFlag: "es", matchDate: new Date("2026-07-11T16:00:00Z"), stage: "ROUND OF 16", status: "upcoming" },
        { homeTeamName: "France", homeTeamCode: "FRA", homeTeamFlag: "fr", awayTeamName: "Germany", awayTeamCode: "GER", awayTeamFlag: "de", matchDate: new Date("2026-07-12T12:00:00Z"), stage: "QUARTER-FINAL", status: "upcoming" },
        { homeTeamName: "Argentina", homeTeamCode: "ARG", homeTeamFlag: "ar", awayTeamName: "Brazil", awayTeamCode: "BRA", awayTeamFlag: "br", matchDate: new Date("2026-07-12T16:00:00Z"), stage: "QUARTER-FINAL", status: "upcoming" },
      ];
      
      for (const match of SEED_MATCHES) {
        await prisma.marketMatch.create({ data: match });
      }

      // Re-fetch after seeding
      matches = await prisma.marketMatch.findMany({
        include: { votes: true },
        orderBy: { matchDate: "asc" }
      });
    }

    // Calculate probabilities dynamically based on votes (No Draw)
    const enrichedMatches = matches.map((match) => {
      const totalVotes = match.votes.length;
      let homeProb = 0;
      let awayProb = 0;

      if (totalVotes > 0) {
        const homeVotes = match.votes.filter(v => v.vote === "HOME").length;
        const awayVotes = match.votes.filter(v => v.vote === "AWAY").length;

        homeProb = Math.round((homeVotes / totalVotes) * 100);
        awayProb = 100 - homeProb;
      } else {
        // Default equal probability if no votes
        homeProb = 50;
        awayProb = 50;
      }

      const { votes, ...matchData } = match;

      return {
        ...matchData,
        homeProb,
        awayProb,
        totalVotes,
      };
    });

    return NextResponse.json(enrichedMatches);
  } catch (error) {
    console.error("Failed to fetch market matches:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
