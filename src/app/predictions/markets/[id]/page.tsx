import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MarketDetailClient } from "./MarketDetailClient";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const matchId = resolvedParams.id;

  const match = await prisma.marketMatch.findUnique({
    where: { id: matchId },
    include: {
      votes: true,
    },
  });

  if (!match) {
    notFound();
  }

  // Calculate probabilities dynamically
  const totalVotes = match.votes.length;
  let homeProb = 33;
  let drawProb = 34;
  let awayProb = 33;

  if (totalVotes > 0) {
    const homeVotes = match.votes.filter((v) => v.vote === "HOME").length;
    const drawVotes = match.votes.filter((v) => v.vote === "DRAW").length;
    const awayVotes = match.votes.filter((v) => v.vote === "AWAY").length;

    homeProb = Math.round((homeVotes / totalVotes) * 100);
    drawProb = Math.round((drawVotes / totalVotes) * 100);
    awayProb = 100 - homeProb - drawProb;
  }

  // Define some dynamic headlines based on teams
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

  const serializedMatch = {
    ...match,
    homeProb,
    drawProb,
    awayProb,
    totalVotes,
    headlines,
  };

  return <MarketDetailClient initialMatch={serializedMatch} />;
}
