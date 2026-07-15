"use client";

import { useTeams } from "@/components/TeamsProvider";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { Flame, TrendingUp, Zap, Users, Activity } from "lucide-react";
import { useEffect, useState } from "react";
import { useVotingStore } from "@/stores/useVotingStore";

type LiveStatsResponse = {
  predictionCount: number;
  predictionsToday: number;
  activePredictorCount: number;
  newUsersToday: number;
};

const POLL_INTERVAL_MS = 15_000;

export function LiveStats() {
  const teams = useTeams();
  const { tournamentWinnerPolls, loadTournamentWinnerPolls } = useVotingStore();

  useEffect(() => {
    loadTournamentWinnerPolls();
  }, [loadTournamentWinnerPolls]);

  // 1. Most Predicted Champion (dynamic from user votes/polls)
  const topVotedFromPolls = tournamentWinnerPolls?.teams?.[0];
  const topPredictedTeam = topVotedFromPolls
    ? (teams.find((t) => t.code === topVotedFromPolls.code) || {
        code: topVotedFromPolls.code,
        name: topVotedFromPolls.name,
        flag: topVotedFromPolls.flag,
        prob: { champion: topVotedFromPolls.exactProbability ?? topVotedFromPolls.prob ?? 0 }
      })
    : null;

  const sortedByModelProb = [...teams].sort((a, b) => b.prob.champion - a.prob.champion);
  const topPredictedFallback = sortedByModelProb[0] || teams[0];
  const topPredicted = topPredictedTeam || topPredictedFallback;

  const topPredictedChanceLabel = topVotedFromPolls
    ? `${(topVotedFromPolls.exactProbability ?? topVotedFromPolls.prob ?? 0).toFixed(1)}% of votes`
    : (topPredicted ? `${topPredicted.prob.champion.toFixed(1)}% chance` : "Live model signal");

  // 2. Current Favorite (dynamic from highest Elo in teams)
  const sortedByElo = [...teams].sort((a, b) => b.elo - a.elo);
  const currentFav = sortedByElo[0] || teams[0];

  // 3. Dark Horse (dynamic from team with champion probability between 4% and 12%)
  const darkHorses = teams.filter((t) => t.prob.champion >= 4 && t.prob.champion <= 12);
  const sortedDarkHorses = [...darkHorses].sort((a, b) => b.prob.champion - a.prob.champion);
  const darkHorseTeam = sortedDarkHorses[0] || teams.find((t) => t.code === "MAR") || teams[12] || teams[0];
  
  const darkHorseLabel = darkHorseTeam
    ? `Rising fast · ${darkHorseTeam.prob.champion.toFixed(1)}% chance`
    : "Rising fast · +12% this week";

  const [stats, setStats] = useState<LiveStatsResponse>({
    predictionCount: 0,
    predictionsToday: 0,
    activePredictorCount: 0,
    newUsersToday: 0,
  });

  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      try {
        const response = await fetch("/api/live-stats", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const nextStats = (await response.json()) as LiveStatsResponse;

        if (cancelled) {
          return;
        }

        setStats(nextStats);
      } catch (error) {
        console.error("Failed to refresh live stats", error);
      }
    };

    loadStats();
    const interval = window.setInterval(loadStats, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const formatNumber = (value: number) => new Intl.NumberFormat("en-US").format(value);

  const items = [
    { icon: Flame, label: "Most Predicted Champion", team: topPredicted, sub: topPredictedChanceLabel },
    { icon: TrendingUp, label: "Current Favorite", team: currentFav, sub: currentFav ? `Elo ${currentFav.elo.toFixed(2)}` : "Live Elo signal" },
    { icon: Zap, label: "Dark Horse", team: darkHorseTeam, sub: darkHorseLabel },
    {
      icon: Activity,
      label: "Predictions Submitted",
      value: formatNumber(stats.predictionCount),
      sub: stats.predictionsToday > 0 ? `+${formatNumber(stats.predictionsToday)} today` : "Updating live",
    },
    {
      icon: Users,
      label: "Active Predictors",
      value: formatNumber(stats.activePredictorCount),
      sub: stats.newUsersToday > 0 ? `+${formatNumber(stats.newUsersToday)} new users today` : "Growing live",
    },
  ];

  return (
    <section className="border-y border-white/5 bg-gradient-to-b from-transparent to-white/[0.02]">
      <div className="container mx-auto px-4 py-6 ">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5">
          {items.map((it) => (
            <div key={it.label} className="glass rounded-xl p-3">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                <it.icon className="h-3.5 w-3.5 text-neon" />
                {it.label}
              </div>
              <div className="mt-1 text-sm font-semibold">
                {it.team ? (
                  <span className="inline-flex items-center gap-2">
                    <CountryFlag code={it.team.code} flag={it.team.flag} name={it.team.name} className="h-4 w-6" emojiClassName="text-base" />
                    <span>{it.team.name}</span>
                  </span>
                ) : (
                  it.value
                )}
              </div>
              <div className="text-[11px] text-muted-foreground">{it.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
