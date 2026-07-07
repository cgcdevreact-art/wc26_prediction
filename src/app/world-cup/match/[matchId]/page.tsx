import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MatchDetailClient } from "./MatchDetailClient";
import { fetchLiveSource, mapFixtures } from "@/lib/fixtures/source";

export const metadata = {
  title: "Match Center — World Cup 2026",
  description: "View match predictions, live statistics, lineups, and community voting details.",
};

export default async function Page({ params }: { params: Promise<{ matchId: string }> }) {
  const resolvedParams = await params;
  const matchId = resolvedParams.matchId;
  const matchNo = parseInt(matchId, 10);

  // Find match in FixtureCache by matchNo
  const match = await prisma.fixtureCache.findUnique({
    where: { matchNo },
  });

  if (!match) {
    notFound();
  }

  // Try to load from mapped live source first to get accurate kickoff details
  let liveFixture: any = null;
  try {
    const liveSource = await fetchLiveSource();
    const fixtures = mapFixtures(liveSource);
    liveFixture = fixtures.find((f) => f.match_no === matchNo);
  } catch (e) {
    console.warn("Failed to read live fixtures inside match detail SSR page:", e);
  }

  // Map to the common fixture structure
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
    status: match.status, // "UPCOMING", "LIVE", "COMPLETED"
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    time_elapsed: match.timeElapsed,
    isKnockout: match.isKnockout,
    stageName: match.stageName,
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <Header />
      <main className="flex-grow pt-24 pb-12">
        <MatchDetailClient fixture={fixture} />
      </main>
      <Footer />
    </div>
  );
}
