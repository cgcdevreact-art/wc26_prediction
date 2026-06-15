import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { redirect } from "next/navigation";
import { Trophy, Calendar, CheckCircle, Sparkles } from "lucide-react";
import { getTeams } from "@/lib/data";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function intToTeamCode(val: number): string {
  if (val <= 0) return "";
  const c3 = val % 100;
  const c2 = Math.floor((val % 10000) / 100);
  const c1 = Math.floor(val / 10000);
  return String.fromCharCode(c1) + String.fromCharCode(c2) + String.fromCharCode(c3);
}

export const metadata = {
  title: "My Predictions — WC26 Predict",
  description: "Track your World Cup 2026 predictions and leaderboard status.",
};

export default async function PredictionsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  let predictions: any[] = [];
  try {
    predictions = await prisma.prediction.findMany({
      where: { userId: session.user.id },
      include: {
        match: {
          include: {
            homeTeam: true,
            awayTeam: true,
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  } catch (error) {
    console.warn("Failed to fetch user predictions, falling back to empty list. Database might not be running.");
  }

  let teams: any[] = [];
  try {
    teams = await getTeams();
  } catch (e) {
    console.warn("Failed to fetch teams info");
  }
  const teamsMap = new Map(teams.map(t => [t.code, t]));

  const matchesPreds = predictions.filter(p => p.type === "MATCH_SCORE");
  const knockoutPreds = predictions.filter(p => p.type === "KNOCKOUT_WINNER");
  const countryPreds = predictions.filter(p => p.type === "COUNTRY_PROJECTION");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-24 md:px-6">
        <div className="mb-12">
          <h1 className="font-display text-4xl font-bold tracking-tight text-gradient sm:text-5xl">
            My Predictions
          </h1>
          <p className="mt-2 text-muted-foreground">
            View all your saved match scores and tournament bracket picks.
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-6">
          {/* Match Scores */}
          <AccordionItem value="group-matches" className="glass-strong rounded-2xl border-none px-6 py-2">
            <AccordionTrigger className="hover:no-underline [&[data-state=open]>svg]:rotate-180 text-left">
              <div className="flex items-center gap-2 font-display text-2xl font-bold">
                <Calendar className="text-neon" /> Group Matches
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="mt-4 overflow-x-auto">
                {matchesPreds.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No match predictions yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-transparent">
                        <TableHead className="w-[100px] text-muted-foreground">Match ID</TableHead>
                        <TableHead className="text-right text-muted-foreground">Home</TableHead>
                        <TableHead className="text-center text-muted-foreground">Score</TableHead>
                        <TableHead className="text-muted-foreground">Away</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {matchesPreds.map(p => (
                        <TableRow key={p.id} className="border-white/10 hover:bg-white/5 transition-colors">
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {p.matchId}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {p.match?.homeTeam?.name || "Home"}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="bg-black/40 px-3 py-1 rounded-md text-neon border border-white/10 shadow-glass font-bold whitespace-nowrap inline-block">
                              {p.predictedHomeScore ?? "-"} : {p.predictedAwayScore ?? "-"}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium">
                            {p.match?.awayTeam?.name || "Away"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Knockout Bracket */}
          <AccordionItem value="knockout-stage" className="glass-strong rounded-2xl border-none px-6 py-2">
            <AccordionTrigger className="hover:no-underline [&[data-state=open]>svg]:rotate-180 text-left">
              <div className="flex items-center gap-2 font-display text-2xl font-bold">
                <Trophy className="text-gold" /> Knockout Stage
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="mt-4 overflow-x-auto">
                {knockoutPreds.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No knockout predictions yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-transparent">
                        <TableHead className="w-[160px] text-muted-foreground text-xs">Stage</TableHead>
                        <TableHead className="text-right text-muted-foreground text-xs">Home</TableHead>
                        <TableHead className="text-center text-muted-foreground text-xs">Score</TableHead>
                        <TableHead className="text-muted-foreground text-xs">Away</TableHead>
                        <TableHead className="text-muted-foreground text-xs">Winner Pick</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {knockoutPreds.map(p => {
                        let homeCode = "";
                        let awayCode = "";
                        let winnerCode = p.predictedTeamId ? intToTeamCode(p.predictedTeamId) : "";

                        if (p.predictedWinner) {
                          try {
                            const parsed = JSON.parse(p.predictedWinner);
                            if (parsed && typeof parsed === "object") {
                              homeCode = parsed.homeCode || "";
                              awayCode = parsed.awayCode || "";
                              if (parsed.winnerCode) winnerCode = parsed.winnerCode;
                            }
                          } catch (e) {
                            // backward compatibility
                          }
                        }

                        const homeTeam = homeCode ? teamsMap.get(homeCode) : null;
                        const awayTeam = awayCode ? teamsMap.get(awayCode) : null;
                        const winnerTeam = winnerCode ? teamsMap.get(winnerCode) : null;

                        let stageName = `Match ${p.matchId}`;
                        const id = p.matchId;
                        if (id >= 100 && id < 116) stageName = `Round of 32 (M${id - 100 + 1})`;
                        else if (id >= 200 && id < 208) stageName = `Round of 16 (M${id - 200 + 1})`;
                        else if (id >= 300 && id < 304) stageName = `Quarter Final (M${id - 300 + 1})`;
                        else if (id >= 400 && id < 402) stageName = `Semi Final (M${id - 400 + 1})`;
                        else if (id === 500) stageName = "Final";
                        else if (id === 501) stageName = "Third Place Match";

                        return (
                          <TableRow key={p.id} className="border-white/10 hover:bg-white/5 transition-colors">
                            <TableCell className="font-medium text-muted-foreground text-xs whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <CheckCircle className="h-3.5 w-3.5 text-neon shrink-0" />
                                <span>{stageName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium text-xs">
                              {homeTeam ? (
                                <div className="flex items-center gap-1.5 justify-end">
                                  <span>{homeTeam.name}</span>
                                  <span className="text-lg shrink-0 leading-none">{homeTeam.flag}</span>
                                </div>
                              ) : (
                                homeCode || "-"
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="bg-black/40 px-2.5 py-0.5 rounded text-neon border border-white/10 font-bold font-mono whitespace-nowrap inline-block text-xs">
                                {p.predictedHomeScore ?? "-"} : {p.predictedAwayScore ?? "-"}
                              </span>
                            </TableCell>
                            <TableCell className="font-medium text-xs">
                              {awayTeam ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-lg shrink-0 leading-none">{awayTeam.flag}</span>
                                  <span>{awayTeam.name}</span>
                                </div>
                              ) : (
                                awayCode || "-"
                              )}
                            </TableCell>
                            <TableCell className="text-xs">
                              {winnerTeam ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-lg shrink-0 leading-none">{winnerTeam.flag}</span>
                                  <span className="font-display font-extrabold text-gradient">{winnerTeam.name}</span>
                                </div>
                              ) : (
                                <span className="font-display font-semibold text-gradient">{winnerCode || "-"}</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Country Projections */}
          <AccordionItem value="country-projections" className="glass-strong rounded-2xl border-none px-6 py-2">
            <AccordionTrigger className="hover:no-underline [&[data-state=open]>svg]:rotate-180 text-left">
              <div className="flex items-center gap-2 font-display text-2xl font-bold">
                <Sparkles className="text-neon" /> Country Projections
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="mt-4 overflow-x-auto">
                {countryPreds.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No country projections saved yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-transparent">
                        <TableHead className="w-[200px] text-muted-foreground">Country</TableHead>
                        <TableHead className="text-muted-foreground">Elo</TableHead>
                        <TableHead className="text-muted-foreground whitespace-nowrap">Champ Prob.</TableHead>
                        <TableHead className="min-w-[300px] text-muted-foreground">Simulated Path Summary</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {countryPreds.map((p) => {
                        let data: any = null;
                        try {
                          data = p.predictedWinner ? JSON.parse(p.predictedWinner) : null;
                        } catch (e) {
                          console.error("Failed to parse country projection details", e);
                        }

                        if (!data) return null;

                        const pathSummary = data.path
                          ?.filter((s: any) => s.winPct !== undefined)
                          .map((s: any) => `${s.stage} (${s.winPct}%)`)
                          .join(" ➔ ");

                        return (
                          <TableRow key={p.id} className="border-white/10 hover:bg-white/5 transition-colors">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">{data.flag}</span>
                                <span className="font-display font-bold text-gradient">{data.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {data.elo}
                            </TableCell>
                            <TableCell className="font-display font-bold text-white">
                              {data.championProb}%
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground leading-relaxed">
                              {pathSummary || <span className="italic opacity-50">No path data</span>}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </main>
      <Footer />
    </div>
  );
}
