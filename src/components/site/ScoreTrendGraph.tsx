"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Plus, X, Search, TrendingUp, Maximize2, Minimize2, Crown } from "lucide-react";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { UpgradeModal } from "@/components/site/UpgradeModal";

interface PredictorMatch {
  id: string;
  group: string;
  homeCode: string;
  awayCode: string;
  homeScore: number | "";
  awayScore: number | "";
}

interface Team {
  code: string;
  name: string;
  flag: string;
  rank?: number;
  elo?: number;
}

interface ScoreTrendGraphProps {
  matches: PredictorMatch[];
  predictionMatches: PredictorMatch[];
  teams: Team[];
  liveGames: any[];
  liveStadiums: any[];
  getGroupMatchDetails: (
    group: string,
    suffix: number,
    allGames: any[],
    allStadiums: any[],
    homeCode: string,
    awayCode: string,
    teams: any[]
  ) => any;
}

const PILL_STYLES = [
  "bg-cyan-500/12 text-cyan-700 border-cyan-500/35 dark:bg-cyan-500/18 dark:text-cyan-300 dark:border-cyan-400/30",
  "bg-fuchsia-500/12 text-fuchsia-700 border-fuchsia-500/35 dark:bg-fuchsia-500/18 dark:text-fuchsia-300 dark:border-fuchsia-400/30",
  "bg-emerald-500/12 text-emerald-700 border-emerald-500/35 dark:bg-emerald-500/18 dark:text-emerald-300 dark:border-emerald-400/30",
  "bg-amber-500/12 text-amber-700 border-amber-500/35 dark:bg-amber-500/18 dark:text-amber-300 dark:border-amber-400/30",
  "bg-blue-500/12 text-blue-700 border-blue-500/35 dark:bg-blue-500/18 dark:text-blue-300 dark:border-blue-400/30",
  "bg-rose-500/12 text-rose-700 border-rose-500/35 dark:bg-rose-500/18 dark:text-rose-300 dark:border-rose-400/30",
  "bg-violet-500/12 text-violet-700 border-violet-500/35 dark:bg-violet-500/18 dark:text-violet-300 dark:border-violet-400/30",
  "bg-orange-500/12 text-orange-700 border-orange-500/35 dark:bg-orange-500/18 dark:text-orange-300 dark:border-orange-400/30",
  "bg-lime-500/12 text-lime-700 border-lime-500/35 dark:bg-lime-500/18 dark:text-lime-300 dark:border-lime-400/30",
  "bg-pink-500/12 text-pink-700 border-pink-500/35 dark:bg-pink-500/18 dark:text-pink-300 dark:border-pink-400/30",
];

function hasStartedLiveGame(game: any): boolean {
  const progress = String(game?.time_elapsed ?? game?.status ?? "").toLowerCase().trim();
  if (!progress) return false;
  if (progress.includes("notstarted")) return false;
  if (/^\d+$/.test(progress)) return true;

  return [
    "live",
    "finished",
    "ft",
    "fulltime",
    "halftime",
    "half-time",
    "1h",
    "2h",
    "extra",
    "pen",
    "playing",
    "inprogress",
  ].some((keyword) => progress.includes(keyword));
}

function getMatchPoints(match: PredictorMatch, code: string) {
  if (match.homeScore === "" || match.awayScore === "") return 0;

  const hs = Number(match.homeScore);
  const as = Number(match.awayScore);
  const isHome = match.homeCode === code;

  if (hs === as) return 1;
  if ((hs > as && isHome) || (as > hs && !isHome)) return 3;
  return 0;
}

export function ScoreTrendGraph({
  matches,
  predictionMatches,
  teams,
  liveGames,
  liveStadiums,
  getGroupMatchDetails,
}: ScoreTrendGraphProps) {
  const { data: session } = useSession();
  const subscriptionTier = (session?.user?.subscriptionTier || "free").toLowerCase();

  const [isExpanded, setIsExpanded] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const maxSelections = isExpanded ? 10 : 4;

  const [hasManuallySelected, setHasManuallySelected] = useState(false);
  const [selectedTeamCodes, setSelectedTeamCodes] = useState<string[]>(() => {
    if (teams && teams.length > 0) {
      const shuffled = [...teams].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, 4).map((t) => t.code);
    }
    return [];
  });

  useEffect(() => {
    if (teams && teams.length > 0 && selectedTeamCodes.length === 0 && !hasManuallySelected) {
      const shuffled = [...teams].sort(() => 0.5 - Math.random());
      setSelectedTeamCodes(shuffled.slice(0, 4).map((t) => t.code));
    }
  }, [teams, selectedTeamCodes, hasManuallySelected]);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setIsSelectorOpen(false);
      }
    }
    if (isSelectorOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSelectorOpen]);
  // Helper to get team by code
  const getTeam = (code: string) => {
    return teams.find((t) => t.code === code) || { code, name: code, flag: "🏳️" };
  };

  const handleToggleTeam = (code: string) => {
    setHasManuallySelected(true);
    if (selectedTeamCodes.includes(code)) {
      setSelectedTeamCodes((prev) => prev.filter((c) => c !== code));
    } else {
      if (selectedTeamCodes.length >= maxSelections) {
        toast.warning(`You can select a maximum of ${maxSelections} countries to compare.`);
        return;
      }
      setSelectedTeamCodes((prev) => [...prev, code]);
    }
  };

  // Filtered teams list based on search query
  const filteredTeams = useMemo(() => {
    if (!searchQuery.trim()) return teams;
    const q = searchQuery.toLowerCase().trim();
    return teams.filter(
      (t) =>
        t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q)
    );
  }, [teams, searchQuery]);

  // Calculate actual vs predicted points totals for selected teams
  const chartData = useMemo(() => {
    return selectedTeamCodes.map((code) => {
      const team = teams.find((entry) => entry.code === code) || { code, name: code };

      const predictedPoints = predictionMatches
        .filter((match) => match.homeCode === code || match.awayCode === code)
        .reduce((sum, match) => sum + getMatchPoints(match, code), 0);

      const realDataPoints = matches
        .filter((match) => match.homeCode === code || match.awayCode === code)
        .reduce((sum, match) => {
          const suffix = parseInt(match.id.split("-")[1], 10);
          const details = getGroupMatchDetails(
            match.group,
            suffix,
            liveGames,
            liveStadiums,
            match.homeCode,
            match.awayCode,
            teams
          );

          if (!details || details.matchNumber <= 0) return sum;

          const game = liveGames.find((g: any) => parseInt(g.id, 10) === details.matchNumber);
          if (!game) return sum;
          if (!hasStartedLiveGame(game)) return sum;

          const homeScoreRaw = Number(game.home_score);
          const awayScoreRaw = Number(game.away_score);

          if (!Number.isFinite(homeScoreRaw) || !Number.isFinite(awayScoreRaw)) {
            return sum;
          }

          const liveBackedMatch: PredictorMatch = details.isSwapped
            ? { ...match, homeScore: awayScoreRaw, awayScore: homeScoreRaw }
            : { ...match, homeScore: homeScoreRaw, awayScore: awayScoreRaw };

          return sum + getMatchPoints(liveBackedMatch, code);
        }, 0);

      return {
        code,
        country: team.name,
        realDataPoints,
        predictedPoints,
      };
    });
  }, [
    selectedTeamCodes,
    predictionMatches,
    matches,
    liveGames,
    liveStadiums,
    getGroupMatchDetails,
    teams,
  ]);

  const content = (
    <div className={`glass-strong mb-6 border border-border/40 p-6 shadow-glass space-y-6 ${isExpanded ? "fixed inset-0 z-[100] m-0 rounded-none bg-background/95 backdrop-blur-xl overflow-y-auto" : "rounded-2xl"}`}>
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="font-display font-bold text-xl flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-neon animate-pulse" />
              Points Progression Trend
            </h3>
            {isExpanded && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center gap-1">
                <Crown className="h-3 w-3" /> PRO VIEW
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Compare real match points against simulated or predicted totals by country.
          </p>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-2 relative" ref={selectorRef}>
          {!isExpanded ? (
            <button
              onClick={() => {
                if (subscriptionTier === "free") {
                  setUpgradeModalOpen(true);
                } else {
                  setIsExpanded(true);
                }
              }}
              className="flex items-center justify-center p-2 rounded-xl border border-amber-500/30 hover:border-amber-500 bg-amber-500/5 hover:bg-amber-500/10 text-amber-500 transition group relative"
              title="Pro View (Compare up to 10 countries)"
            >
              <Maximize2 className="h-4 w-4" />
              <Crown className="absolute -top-2 -right-2 h-3.5 w-3.5 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
            </button>
          ) : (
            <button
              onClick={() => {
                setIsExpanded(false);
                // Truncate back to 4 when closing
                if (selectedTeamCodes.length > 4) {
                  setSelectedTeamCodes(prev => prev.slice(0, 4));
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-xl border border-rose-500/30 hover:border-rose-500 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 transition"
            >
              <Minimize2 className="h-3.5 w-3.5" /> Close Pro View
            </button>
          )}

          <button
            onClick={() => setIsSelectorOpen((prev) => !prev)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl border border-cyan-500/30 hover:border-cyan-500 bg-cyan-500/5 hover:bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Select Countries ({selectedTeamCodes.length}/{maxSelections})
          </button>

          {/* Search Dropdown Selector */}
          {isSelectorOpen && (
            <div className="absolute top-full right-0 mt-2 w-72 max-h-96 overflow-y-auto glass-strong border border-border/60 rounded-xl p-3 shadow-xl z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search countries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-border/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-cyan-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                {filteredTeams.map((t) => {
                  const isSelected = selectedTeamCodes.includes(t.code);
                  return (
                    <button
                      key={t.code}
                      onClick={() => handleToggleTeam(t.code)}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left text-xs transition ${
                        isSelected
                          ? "bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 font-bold"
                          : "hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <CountryFlag
                          code={t.code}
                          flag={t.flag}
                          name={t.name}
                          className="h-3 w-4.5 rounded-[1px] object-cover shrink-0"
                          emojiClassName="text-sm shrink-0"
                        />
                        <span className="truncate">{t.name}</span>
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground">{t.code}</span>
                    </button>
                  );
                })}
                {filteredTeams.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground py-4">No countries found.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Selected team badges row */}
      {selectedTeamCodes.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedTeamCodes.map((code, idx) => {
            const team = getTeam(code);
            return (
              <div
                key={code}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold ${PILL_STYLES[idx] || "bg-muted/40 border-border/80 text-foreground/90"}`}
              >
                <CountryFlag
                  code={team.code}
                  flag={team.flag}
                  name={team.name}
                  className="h-3 w-4.5 rounded-[1px] object-cover shrink-0"
                  emojiClassName="text-sm shrink-0"
                />
                <span>{team.name}</span>
                <button
                  onClick={() => {
                    setHasManuallySelected(true);
                    setSelectedTeamCodes((prev) => prev.filter((c) => c !== code));
                  }}
                  className="ml-0.5 text-current/70 transition hover:text-rose-500"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs italic text-muted-foreground">Select up to 4 countries to compare actual and predicted points.</p>
      )}

      {/* Grouped Bar Chart */}
      {selectedTeamCodes.length > 0 && (
        <div className={`${isExpanded ? "h-[60vh]" : "h-64 sm:h-80"} w-full bg-card dark:bg-black/25 border border-border/60 p-4 rounded-2xl`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 24, left: 0, bottom: 24 }}
              barCategoryGap="24%"
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="country"
                stroke="var(--muted-foreground)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                dy={10}
                interval={0}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                dx={-10}
                domain={[0, 9]}
                ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]}
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ fontSize: "11px", paddingBottom: "12px" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--popover)",
                  borderColor: "var(--border)",
                  borderRadius: "12px",
                  fontSize: "11px",
                  boxShadow: "var(--shadow-glass)",
                }}
                labelStyle={{ fontWeight: "bold", color: "var(--foreground)", marginBottom: "4px" }}
                itemStyle={{ color: "var(--foreground)" }}
                formatter={(value: any, name: any) => {
                  return [`${Math.round(Number(value))} Pts`, name];
                }}
              />
              <Bar
                dataKey="realDataPoints"
                name="Real Data Points"
                fill="#0ea5e9"
                radius={[8, 8, 0, 0]}
                maxBarSize={28}
              />
              <Bar
                dataKey="predictedPoints"
                name="Simulated/Predicted Points"
                fill="#f59e0b"
                radius={[8, 8, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );

  return (
    <>
      {isExpanded && typeof document !== "undefined" ? createPortal(content, document.body) : content}
      <UpgradeModal 
        isOpen={upgradeModalOpen} 
        onClose={() => setUpgradeModalOpen(false)} 
        reason="plus" 
      />
    </>
  );
}
