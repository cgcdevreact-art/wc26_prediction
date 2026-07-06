import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const matches = await prisma.marketMatch.findMany({
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

    // Calculate probabilities dynamically based on votes
    const enrichedMatches = matches.map((match) => {
      const totalVotes = match.votes.length;
      let homeProb = 0;
      let drawProb = 0;
      let awayProb = 0;

      if (totalVotes > 0) {
        const homeVotes = match.votes.filter(v => v.vote === "HOME").length;
        const drawVotes = match.votes.filter(v => v.vote === "DRAW").length;
        const awayVotes = match.votes.filter(v => v.vote === "AWAY").length;

        homeProb = Math.round((homeVotes / totalVotes) * 100);
        drawProb = Math.round((drawVotes / totalVotes) * 100);
        awayProb = 100 - homeProb - drawProb; // Ensure it sums to 100
      } else {
        // Default equal probability if no votes
        homeProb = 33;
        drawProb = 34;
        awayProb = 33;
      }

      // We omit the full votes array to save payload size, unless needed for the graph later.
      const { votes, ...matchData } = match;

      // Generate dynamic news headlines based on the teams
      const headlines = [
        {
          source: "BBC Sport",
          time: "2h ago",
          title: `Will ${match.homeTeamName} hold off ${match.awayTeamName}? Dynamic simulation details internal squad changes.`,
        },
        {
          source: "Reuters",
          time: "1d ago",
          title: `${match.homeTeamName} vs ${match.awayTeamName}: Key players key stats and simulated match predictions.`,
        },
      ];

      return {
        ...matchData,
        homeProb,
        drawProb,
        awayProb,
        totalVotes,
        headlines,
      };
    });

    return NextResponse.json(enrichedMatches);
  } catch (error) {
    console.error("Failed to fetch market matches:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
