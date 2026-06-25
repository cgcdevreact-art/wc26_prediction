"use client";

import { useTeams } from "@/components/TeamsProvider";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { Flame, TrendingUp, Zap, Users, Activity } from "lucide-react";
import { startTransition, useEffect, useState } from "react";

const PREDICTIONS_FLOOR = 100_000;
const ACTIVE_PREDICTORS_FLOOR = 10_000;
const POLL_INTERVAL_MS = 15_000;
const PREDICTIONS_TICK_MS = 4_500;
const USERS_TICK_MS = 5_500;

type LiveStatsResponse = {
  predictionCount: number;
  predictionsToday: number;
  activePredictorCount: number;
  newUsersToday: number;
};

type PersistedLiveCounters = {
  dayKey: string;
  predictionCount: number;
  predictionsToday: number;
  activePredictorCount: number;
  newUsersToday: number;
};

const LIVE_STATS_STORAGE_KEY = "wc26_live_stats_counters";

const getDayKey = () => new Date().toISOString().slice(0, 10);

const readPersistedCounters = (): PersistedLiveCounters | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(LIVE_STATS_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedLiveCounters;
  } catch {
    return null;
  }
};

const writePersistedCounters = (value: PersistedLiveCounters) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(LIVE_STATS_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Ignore storage failures.
  }
};

export function LiveStats() {
  const teams = useTeams();
  const sorted = [...teams].sort((a, b) => b.prob.champion - a.prob.champion);
  const top = sorted[0] || teams[0];
  const fav = sorted[1] || sorted[0] || teams[0];
  const dh = teams.find((t) => t.code === "MAR") || teams[12] || teams[0];

  const [stats, setStats] = useState<LiveStatsResponse>({
    predictionCount: PREDICTIONS_FLOOR,
    predictionsToday: 0,
    activePredictorCount: ACTIVE_PREDICTORS_FLOOR,
    newUsersToday: 0,
  });
  const [displayPredictionCount, setDisplayPredictionCount] = useState(PREDICTIONS_FLOOR);
  const [displayActivePredictors, setDisplayActivePredictors] = useState(ACTIVE_PREDICTORS_FLOOR);
  const [displayPredictionsToday, setDisplayPredictionsToday] = useState(0);
  const [displayNewUsersToday, setDisplayNewUsersToday] = useState(0);

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

        startTransition(() => {
          setStats(nextStats);
          const dayKey = getDayKey();
          const persisted = readPersistedCounters();
          const isSameDay = persisted?.dayKey === dayKey;

          const nextPredictionCount = Math.max(
            PREDICTIONS_FLOOR,
            nextStats.predictionCount,
            isSameDay ? persisted?.predictionCount ?? 0 : 0,
          );
          const nextPredictionsToday = Math.max(
            nextStats.predictionsToday,
            isSameDay ? persisted?.predictionsToday ?? 0 : 0,
          );
          const nextActivePredictorCount = Math.max(
            ACTIVE_PREDICTORS_FLOOR,
            nextStats.activePredictorCount,
            isSameDay ? persisted?.activePredictorCount ?? 0 : 0,
          );
          const nextNewUsersToday = Math.max(
            nextStats.newUsersToday,
            isSameDay ? persisted?.newUsersToday ?? 0 : 0,
          );

          setDisplayPredictionCount(nextPredictionCount);
          setDisplayPredictionsToday(nextPredictionsToday);
          setDisplayActivePredictors(nextActivePredictorCount);
          setDisplayNewUsersToday(nextNewUsersToday);

          writePersistedCounters({
            dayKey,
            predictionCount: nextPredictionCount,
            predictionsToday: nextPredictionsToday,
            activePredictorCount: nextActivePredictorCount,
            newUsersToday: nextNewUsersToday,
          });
        });
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

  useEffect(() => {
    const interval = window.setInterval(() => {
      const nextIncrement = Math.random() < 0.5 ? 1 : 2;

      setDisplayPredictionCount((currentCount) => {
        const nextCount = Math.max(currentCount + nextIncrement, PREDICTIONS_FLOOR, stats.predictionCount);

        setDisplayPredictionsToday((currentToday) => {
          const nextToday = Math.max(currentToday + nextIncrement, stats.predictionsToday);
          writePersistedCounters({
            dayKey: getDayKey(),
            predictionCount: nextCount,
            predictionsToday: nextToday,
            activePredictorCount: displayActivePredictors,
            newUsersToday: displayNewUsersToday,
          });
          return nextToday;
        });

        return nextCount;
      });
    }, PREDICTIONS_TICK_MS);

    return () => window.clearInterval(interval);
  }, [displayActivePredictors, displayNewUsersToday, stats.predictionCount, stats.predictionsToday]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const nextIncrement = Math.random() < 0.65 ? 1 : 0;
      if (nextIncrement === 0) return;

      setDisplayActivePredictors((currentCount) => {
        const nextCount = Math.max(currentCount + nextIncrement, ACTIVE_PREDICTORS_FLOOR, stats.activePredictorCount);

        setDisplayNewUsersToday((currentToday) => {
          const nextToday = Math.max(currentToday + nextIncrement, stats.newUsersToday);
          writePersistedCounters({
            dayKey: getDayKey(),
            predictionCount: displayPredictionCount,
            predictionsToday: displayPredictionsToday,
            activePredictorCount: nextCount,
            newUsersToday: nextToday,
          });
          return nextToday;
        });

        return nextCount;
      });
    }, USERS_TICK_MS);

    return () => window.clearInterval(interval);
  }, [displayPredictionCount, displayPredictionsToday, stats.activePredictorCount, stats.newUsersToday]);

  const formatNumber = (value: number) => new Intl.NumberFormat("en-US").format(value);

  const items = [
    { icon: Flame, label: "Most Predicted Champion", team: top, sub: top ? `${top.prob.champion.toFixed(1)}% chance` : "Live model signal" },
    { icon: TrendingUp, label: "Current Favorite", team: fav, sub: fav ? `Elo ${fav.elo}` : "Live Elo signal" },
    { icon: Zap, label: "Dark Horse", team: dh, sub: `Rising fast · +12% this week` },
    {
      icon: Activity,
      label: "Predictions Submitted",
      value: formatNumber(displayPredictionCount),
      sub: displayPredictionsToday > 0 ? `+${formatNumber(displayPredictionsToday)} today` : "Updating live",
    },
    {
      icon: Users,
      label: "Active Predictors",
      value: formatNumber(displayActivePredictors),
      sub: displayNewUsersToday > 0 ? `+${formatNumber(displayNewUsersToday)} new users today` : "Growing live",
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
