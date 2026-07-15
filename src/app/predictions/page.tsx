import fs from "fs";
import path from "path";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { redirect } from "next/navigation";
import { Trophy, Sparkles, User, SlidersHorizontal } from "lucide-react";
import { getStaticTeamsFromCup, getTeams } from "@/lib/data";
import SavedPredictionsClient from "./SavedPredictionsClient";
import CustomizationsClient from "./CustomizationsClient";
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
import { CountryFlag } from "@/components/ui/CountryFlag";
import { readPredictionPayload } from "@/lib/predictionWinner";

function intToTeamCode(val: number): string {
  if (val <= 0) return "";
  const c3 = val % 100;
  const c2 = Math.floor((val % 10000) / 100);
  const c1 = Math.floor(val / 10000);
  return String.fromCharCode(c1) + String.fromCharCode(c2) + String.fromCharCode(c3);
}

function loadRawPlayers() {
  try {
    const playersPath = path.join(process.cwd(), "public", "players.json");
    return JSON.parse(fs.readFileSync(playersPath, "utf8")) as Array<Record<string, string>>;
  } catch {
    return [] as Array<Record<string, string>>;
  }
}

function formatTeamRating(val: number | undefined | null) {
  if (val === undefined || val === null) return "-";
  if (val < 10) {
    const minM = 0.75;
    const maxM = 1.10;
    const minR = 50;
    const maxR = 95;
    const rating = ((val - minM) / (maxM - minM)) * (maxR - minR) + minR;
    return Math.max(15, Math.min(99, Math.round(rating)));
  }
  return Math.round(val);
}

export const metadata = {
  title: "My Predictions — WC26 Predict",
  description: "Track your World Cup 2026 predictions and leaderboard status.",
};

export default async function PredictionsPage(props: {
  searchParams: Promise<{ slot?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  const { slot } = await props.searchParams;
  const currentSlotId = slot ? parseInt(slot) : 0;

  let predictions: any[] = [];
  let teamOverrides: any[] = [];
  let playerOverrides: any[] = [];
  try {
    const [predictionRows, teamOverrideRows, playerOverrideRows] = await Promise.all([
      prisma.prediction.findMany({
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
      }),
      prisma.userTeamOverride.findMany({
        where: { userId: session.user.id },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.userPlayerOverride.findMany({
        where: { userId: session.user.id },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    predictions = predictionRows;
    teamOverrides = teamOverrideRows;
    playerOverrides = playerOverrideRows;
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
  const staticTeams = getStaticTeamsFromCup();
  const staticTeamsMap = new Map(staticTeams.map((t) => [t.code, t]));
  const rawPlayers = loadRawPlayers();
  const rawPlayersMap = new Map(rawPlayers.map((p: any) => [`${p["Team Code"]}-${p["Player Name"]}`, p]));

  // Load metadata to get slot names
  const metadataRows = predictions.filter(p => p.type === "SLOT_METADATA");
  const slotNames: Record<number, string> = {
    0: "User Active Prediction",
    1: "Save 1",
    2: "Save 2",
    3: "Save 3",
    4: "Save 4",
    5: "Save 5",
  };
  metadataRows.forEach(p => {
    const slotId = p.matchId - 999000;
    if (slotId >= 1 && slotId <= 5) {
      try {
        const parsed = readPredictionPayload<{ name?: string }>(p.predictedPayload, p.predictedWinner);
        if (parsed && typeof parsed === "object" && "name" in parsed && parsed.name) {
          slotNames[slotId] = parsed.name;
        }
      } catch (e) { }
    }
  });

  const matchType = currentSlotId === 0 ? "MATCH_SCORE" : `MATCH_SCORE_SLOT_${currentSlotId}`;
  const koType = currentSlotId === 0 ? "KNOCKOUT_WINNER" : `KNOCKOUT_WINNER_SLOT_${currentSlotId}`;

  const matchesPreds = predictions.filter(p => p.type === matchType);
  const knockoutPreds = predictions.filter(p => p.type === koType);
  const countryPreds = predictions.filter(p => p.type === "COUNTRY_PROJECTION");

  const activeMetadataRow = predictions.find(p => p.type === "SLOT_METADATA" && p.matchId === 999000 + currentSlotId);
  let activeSummary: any = null;
  if (activeMetadataRow) {
    try {
      const parsed = readPredictionPayload<{ summary?: unknown }>(activeMetadataRow.predictedPayload, activeMetadataRow.predictedWinner);
      if (parsed && typeof parsed === "object" && "summary" in parsed) {
        activeSummary = parsed.summary;
      }
    } catch (e) { }
  }

  const groupPredictedCount = activeSummary?.groupPredictedCount ?? matchesPreds.filter(p => p.predictedHomeScore !== null && p.predictedAwayScore !== null).length;
  const bracketPredictedCount = activeSummary?.bracketPredictedCount ?? knockoutPreds.filter(p => p.predictedTeamId !== null || p.predictedWinner !== null || p.predictedPayload !== null).length;
  const championCode = activeSummary?.championCode ?? (() => {
    const finalPred = knockoutPreds.find(p => p.matchId === 500);
    if (finalPred) {
      if (finalPred.predictedTeamId) return intToTeamCode(finalPred.predictedTeamId);
      try {
        const parsed = readPredictionPayload<{ winnerCode?: string | null }>(finalPred.predictedPayload, finalPred.predictedWinner);
        if (parsed && typeof parsed === "object" && "winnerCode" in parsed) {
          return parsed.winnerCode || null;
        }
      } catch (e) { }
    }
    return null;
  })();
  const standingsSummary = activeSummary?.standingsSummary || null;
  const hasSavedCustomizations = teamOverrides.length > 0 || playerOverrides.length > 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="container mx-auto px-4 py-6 md:px-6">
        <div className="mb-12">
          <h1 className="font-display text-4xl font-bold tracking-tight text-gradient sm:text-5xl">
            My Predictions
          </h1>
          <p className="mt-2 text-muted-foreground">
            View all your saved match scores and tournament bracket picks.
          </p>
        </div>

        {/* Slot Selector */}
        <div className="mb-8 flex flex-wrap items-center gap-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 p-5 rounded-[2rem] shadow-sm">
          <span className="text-sm font-extrabold text-slate-800 dark:text-muted-foreground uppercase tracking-wider">
            Prediction Set:
          </span>
          <div className="flex flex-wrap gap-2.5">
            {[0, 1, 2, 3, 4, 5].map((slotId) => {
              const isActive = currentSlotId === slotId;
              const hasData = slotId === 0 || predictions.some(p => p.type === `MATCH_SCORE_SLOT_${slotId}` || p.type === `KNOCKOUT_WINNER_SLOT_${slotId}`);

              return (
                <a
                  key={slotId}
                  href={slotId === 0 ? "/predictions" : `/predictions?slot=${slotId}`}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${isActive
                      ? "bg-gradient-to-r from-cyan-600 to-fuchsia-600 border-transparent text-white shadow-md active:scale-95"
                      : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 dark:text-slate-300"
                    } ${!hasData && slotId !== 0 ? "opacity-50 hover:opacity-100" : ""}`}
                >
                  {slotNames[slotId]} {!hasData && slotId !== 0 && " (Empty)"}
                </a>
              );
            })}
          </div>
        </div>

        {/* Prediction Summary Section */}
        <div className="mb-8 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 p-6 rounded-[2rem] shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border-b border-slate-150 dark:border-white/5 pb-4">
            <div>
              <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-neon" />
                <span>{slotNames[currentSlotId]} Overview</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Simulated Summary of standings, progress, and champion picks for this slot.
              </p>
            </div>

            {/* Predicted Champion Preview */}
            {championCode && teamsMap.get(championCode) && (
              <div className="inline-flex w-fit max-w-full items-center gap-2 self-start rounded-2xl border border-amber-500/10 bg-amber-500/5 px-3 py-1.5 text-xs font-bold text-amber-800 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300 sm:self-auto">
                <Trophy className="h-4 w-4 text-gold shrink-0" />
                <span className="shrink-0 text-slate-550 dark:text-slate-450">Champion:</span>
                <CountryFlag
                  code={championCode}
                  flag={teamsMap.get(championCode)?.flag || ""}
                  name={teamsMap.get(championCode)?.name || ""}
                  className="h-3.5 w-5 rounded-[2px] object-cover"
                  emojiClassName="text-sm leading-none"
                />
                <span className="font-display font-extrabold text-gradient shrink-0">
                  {teamsMap.get(championCode)?.name}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Group Stage Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-350">
                <span>Group Stage Matches</span>
                <span className="font-mono text-cyan-600 dark:text-neon">{groupPredictedCount} / 72 Predicted</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (groupPredictedCount / 72) * 100)}%` }}
                />
              </div>
            </div>

            {/* Bracket Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-350">
                <span>Bracket Matches</span>
                <span className="font-mono text-purple-600 dark:text-purple-400">{bracketPredictedCount} / 32 Predicted</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (bracketPredictedCount / 32) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Group Standings */}
          {standingsSummary ? (
            <div className="space-y-3">
              <h3 className="text-xs font-extrabold text-slate-800 dark:text-muted-foreground uppercase tracking-wider">
                Predicted Group Stage Standings
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {Object.entries(standingsSummary).map(([group, teams]: [string, any]) => {
                  const winnerTeam = teams.winner ? teamsMap.get(teams.winner) : null;
                  const runnerUpTeam = teams.runnerUp ? teamsMap.get(teams.runnerUp) : null;

                  return (
                    <div key={group} className="bg-slate-50 dark:bg-white/[0.01] p-3 rounded-2xl border border-slate-200 dark:border-white/5 flex flex-col gap-1.5 shadow-sm">
                      <div className="text-[10px] font-black text-slate-500 dark:text-slate-400 border-b border-slate-200/50 dark:border-white/5 pb-1 mb-1 font-mono uppercase tracking-wider">
                        Group {group}
                      </div>

                      {winnerTeam ? (
                        <div className="flex items-center gap-1.5 text-xs text-slate-850 dark:text-slate-200 truncate">
                          <span className="text-amber-500 dark:text-amber-400 font-bold font-mono text-[10px] shrink-0 w-5">1st</span>
                          <CountryFlag
                            code={winnerTeam.code}
                            flag={winnerTeam.flag}
                            name={winnerTeam.name}
                            className="h-3 w-4.5 rounded-[1px] object-cover shrink-0"
                            emojiClassName="text-sm shrink-0 leading-none"
                          />
                          <span className="truncate font-semibold">{winnerTeam.name}</span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 dark:text-slate-650 italic">No winner pick</div>
                      )}

                      {runnerUpTeam ? (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-350 truncate">
                          <span className="text-slate-400 dark:text-slate-500 font-bold font-mono text-[10px] shrink-0 w-5">2nd</span>
                          <CountryFlag
                            code={runnerUpTeam.code}
                            flag={runnerUpTeam.flag}
                            name={runnerUpTeam.name}
                            className="h-3 w-4.5 rounded-[1px] object-cover shrink-0"
                            emojiClassName="text-sm shrink-0 leading-none"
                          />
                          <span className="truncate font-medium">{runnerUpTeam.name}</span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 dark:text-slate-650 italic">No runner-up</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-white/[0.01] rounded-2xl border border-slate-200 dark:border-white/5 p-4 text-center">
              <p className="text-xs text-slate-550 dark:text-slate-400">
                To view a full group standings summary, please save your predictions from the{" "}
                <a href="/simulator" className="text-cyan-600 dark:text-cyan-400 font-bold underline hover:opacity-80">
                  Tournament Simulator
                </a>
                .
              </p>
            </div>
          )}
        </div>

        <div className="mb-8 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 p-6 rounded-[2rem] shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border-b border-slate-150 dark:border-white/5 pb-4">
            <div>
              <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-neon" />
                <span>My Team & Player Customizations</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Your saved team rating overrides and player edits from the teams section.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className="rounded-full bg-cyan-50 px-3 py-1 text-cyan-700 border border-cyan-200 dark:bg-cyan-500/10 dark:border-cyan-500/20 dark:text-cyan-300">
                {teamOverrides.length} team edits
              </span>
              <span className="rounded-full bg-fuchsia-50 px-3 py-1 text-fuchsia-700 border border-fuchsia-200 dark:bg-fuchsia-500/10 dark:border-fuchsia-500/20 dark:text-fuchsia-300">
                {playerOverrides.length} player edits
              </span>
            </div>
          </div>          {!hasSavedCustomizations ? (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.01] p-5 text-center">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                No saved customizations yet.
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Save team ratings or player edits from the teams page and they&apos;ll appear here.
              </p>
            </div>
          ) : (
            <CustomizationsClient
              teamOverrides={teamOverrides}
              playerOverrides={playerOverrides}
              teams={teams}
              staticTeams={staticTeams}
              rawPlayers={rawPlayers}
            />
          )}
        </div>

        <SavedPredictionsClient />
      </main>
      <Footer />
    </div>
  );
}
