"use client";

import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Plus, X, Search, TrendingUp } from "lucide-react";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { toast } from "sonner";

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

// 4 distinct vibrant colors for selected lines
const LINE_COLORS = ["#06b6d4", "#a855f7", "#10b981", "#f59e0b"];
const PILL_STYLES = [
  "bg-cyan-500/12 text-cyan-700 border-cyan-500/35 dark:bg-cyan-500/18 dark:text-cyan-300 dark:border-cyan-400/30",
  "bg-fuchsia-500/12 text-fuchsia-700 border-fuchsia-500/35 dark:bg-fuchsia-500/18 dark:text-fuchsia-300 dark:border-fuchsia-400/30",
  "bg-emerald-500/12 text-emerald-700 border-emerald-500/35 dark:bg-emerald-500/18 dark:text-emerald-300 dark:border-emerald-400/30",
  "bg-amber-500/12 text-amber-700 border-amber-500/35 dark:bg-amber-500/18 dark:text-amber-300 dark:border-amber-400/30",
];

export function ScoreTrendGraph({
  matches,
  teams,
  liveGames,
  liveStadiums,
  getGroupMatchDetails,
}: ScoreTrendGraphProps) {
  // Pre-select first 4 teams of Group A as defaults
  const [selectedTeamCodes, setSelectedTeamCodes] = useState<string[]>(() => {
    return ["MEX", "RSA", "KOR", "CZE"];
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  // Helper to get team by code
  const getTeam = (code: string) => {
    return teams.find((t) => t.code === code) || { code, name: code, flag: "🏳️" };
  };

  // Toggle selection
  const handleToggleTeam = (code: string) => {
    if (selectedTeamCodes.includes(code)) {
      setSelectedTeamCodes((prev) => prev.filter((c) => c !== code));
    } else {
      if (selectedTeamCodes.length >= 4) {
        toast.warning("You can select a maximum of 4 countries to compare.");
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

  // Calculate cumulative points history for selected teams
  const chartData = useMemo(() => {
    const data = [
      { name: "Start" },
      { name: "Match 1" },
      { name: "Match 2" },
      { name: "Match 3" },
    ];

    selectedTeamCodes.forEach((code, idx) => {
      // Apply a tiny offset based on team index to prevent overlapping lines
      const offset = 0.05 * (idx - (selectedTeamCodes.length - 1) / 2);

      // 1. Get the team's matches in group stage
      const teamMatches = matches
        .filter((m) => m.homeCode === code || m.awayCode === code)
        .map((m) => {
          const suffix = parseInt(m.id.split("-")[1], 10);
          const details = getGroupMatchDetails(
            m.group,
            suffix,
            liveGames,
            liveStadiums,
            m.homeCode,
            m.awayCode,
            teams
          );
          return {
            match: m,
            matchNo: details ? details.matchNumber : suffix,
          };
        })
        // Sort chronologically by actual match ID
        .sort((a, b) => a.matchNo - b.matchNo);

      // 2. Accumulate points
      let pts = 0;
      const pointsHistory = [0]; // Step 0 points is 0

      teamMatches.forEach(({ match }) => {
        if (match.homeScore !== "" && match.awayScore !== "") {
          const hs = Number(match.homeScore);
          const as = Number(match.awayScore);
          const isHome = match.homeCode === code;

          if (hs === as) {
            pts += 1;
          } else if ((hs > as && isHome) || (as > hs && !isHome)) {
            pts += 3;
          }
        }
        pointsHistory.push(pts);
      });

      const getVal = (val: number) => val + offset;

      // 3. Populate chart data steps, carrying forward if missing
      data[0] = { ...data[0], [code]: getVal(pointsHistory[0] ?? 0) };
      data[1] = { ...data[1], [code]: getVal(pointsHistory[1] ?? pointsHistory[0] ?? 0) };
      data[2] = { ...data[2], [code]: getVal(pointsHistory[2] ?? pointsHistory[1] ?? pointsHistory[0] ?? 0) };
      data[3] = { ...data[3], [code]: getVal(pointsHistory[3] ?? pointsHistory[2] ?? pointsHistory[1] ?? pointsHistory[0] ?? 0) };
    });

    return data;
  }, [matches, selectedTeamCodes, liveGames, liveStadiums, getGroupMatchDetails, teams]);

  return (
    <div className="glass-strong mb-6 rounded-2xl border border-border/40 p-6 shadow-glass space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h3 className="font-display font-bold text-xl flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-neon animate-pulse" />
            Points Progression Trend
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Compare cumulative points trajectory across group stage matchdays.
          </p>
        </div>

        {/* Action button */}
        <div className="relative">
          <button
            onClick={() => setIsSelectorOpen((prev) => !prev)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl border border-cyan-500/30 hover:border-cyan-500 bg-cyan-500/5 hover:bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Select Countries ({selectedTeamCodes.length}/4)
          </button>

          {/* Search Dropdown Selector */}
          {isSelectorOpen && (
            <div className="absolute right-0 mt-2 w-72 max-h-96 overflow-y-auto glass-strong border border-border rounded-xl p-3 shadow-glass z-50 bg-popover/95 backdrop-blur-md">
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search countries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-muted/50 dark:bg-black/40 border border-border text-foreground focus:outline-none focus:border-cyan-500"
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
                          : "hover:bg-black/5 dark:hover:bg-white/5 border border-transparent text-muted-foreground hover:text-foreground"
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
                  onClick={() => setSelectedTeamCodes((prev) => prev.filter((c) => c !== code))}
                  className="ml-0.5 text-current/70 transition hover:text-rose-500"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs italic text-muted-foreground">Select up to 4 countries to display the points trend.</p>
      )}

      {/* Line Chart */}
      {selectedTeamCodes.length > 0 && (
        <div className="h-64 sm:h-80 w-full bg-card dark:bg-black/25 border border-border/60 p-4 rounded-2xl">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                stroke="var(--muted-foreground)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                dy={10}
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
                  const team = getTeam(String(name));
                  return [`${Math.round(Number(value))} Pts`, team.name];
                }}
              />
              {selectedTeamCodes.map((code, idx) => {
                return (
                  <Line
                    key={code}
                    type="monotone"
                    dataKey={code}
                    stroke={LINE_COLORS[idx]}
                    strokeWidth={3}
                    dot={{
                      r: 5,
                      fill: LINE_COLORS[idx],
                      stroke: "#0f172a",
                      strokeWidth: 2,
                    }}
                    activeDot={{
                      r: 7,
                      fill: LINE_COLORS[idx],
                      stroke: "#fff",
                      strokeWidth: 2,
                    }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
