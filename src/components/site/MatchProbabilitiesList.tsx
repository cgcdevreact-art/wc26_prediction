"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useFixturesStore } from "@/stores/useFixturesStore";
import { useVotingStore } from "@/stores/useVotingStore";
import { VotingCard } from "@/components/voting/VotingCard";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { useSession } from "next-auth/react";
import { Trophy, Vote, X, Code, Link2, Bookmark, Gift } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export function MatchProbabilitiesList() {
  const { data: session } = useSession();
  const { fixtures, loading, loadFixtures } = useFixturesStore();
  const {
    tournamentWinnerPolls,
    userVotes,
    voteTournamentWinner,
    loadTournamentWinnerPolls,
    initializeMatchVotes,
    isLoadingTournamentWinnerPolls
  } = useVotingStore();

  const [isMobile, setIsMobile] = useState(false);
  const [confirmWinnerTeam, setConfirmWinnerTeam] = useState<{ id: number; code: string; name: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "LIVE" | "UPCOMING" | "COMPLETED">("ALL");

  // Detect dark mode change to update chart colors dynamically
  const [isDarkMode, setIsDarkMode] = useState(false);
  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains("dark"));
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setIsMobile(window.innerWidth < 640);
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Load fixtures and initial voting state
  useEffect(() => {
    loadFixtures();
    loadTournamentWinnerPolls();

    // Auto-refresh every 2 minutes
    const interval = setInterval(() => {
      loadFixtures();
      loadTournamentWinnerPolls();
    }, 120000);

    return () => clearInterval(interval);
  }, []);

  // Initialize voting stores when fixtures load
  useEffect(() => {
    if (fixtures.length > 0) {
      // Map fixtures to matchStats format for Zustand
      const matchesData = fixtures.map((f) => {
        const total = (f as any).totalVotes || 0;
        return {
          id: String(f.match_no),
          homeProb: parseInt((f as any).homeProb) || 50,
          awayProb: parseInt((f as any).awayProb) || 50,
          totalVotes: total
        };
      });
      initializeMatchVotes(matchesData);
    }
  }, [fixtures]);

  const handleWinnerVoteClick = (teamId: number, teamCode: string) => {
    if (!session) {
      toast.error("Please sign in to cast your vote!");
      return;
    }

    const list = tournamentWinnerPolls?.allTeams || tournamentWinnerPolls?.teams || [];
    const team = list.find((t) => t.code === teamCode);
    const teamName = team ? team.name : teamCode;

    setConfirmWinnerTeam({ id: teamId, code: teamCode, name: teamName });
  };

  const handleConfirmWinnerVote = async () => {
    if (!confirmWinnerTeam) return;
    const { id, code } = confirmWinnerTeam;
    setConfirmWinnerTeam(null);

    try {
      await voteTournamentWinner(id, code);
    } catch (err) {
      toast.error("Failed to register your vote. The database tables might not be migrated on this server. Please contact the administrator.");
    }
  };

  // Calculate dynamic label positions on right-end line chart to prevent text overlap
  const yOffsets: Record<string, number> = {};
  if (tournamentWinnerPolls?.teams && tournamentWinnerPolls?.chartData?.length > 0) {
    const lastIdx = tournamentWinnerPolls.chartData.length - 1;
    const values = tournamentWinnerPolls.teams.map((team) => ({
      code: team.code,
      name: team.name,
      val: tournamentWinnerPolls.chartData[lastIdx][team.name] || 0
    })).sort((a, b) => a.val - b.val); // Ascending order

    let currentShift = 0;
    for (let i = 0; i < values.length; i++) {
      if (i > 0 && (values[i].val - values[i - 1].val) < 8) {
        currentShift -= 18; // Shift UPWARDS into the empty middle of the chart
      } else {
        currentShift = 0;
      }
      yOffsets[values[i].code] = currentShift;
    }
  }

  // Load all upcoming matches dynamically (no limit)
  const carouselFixtures = [...fixtures].sort((a, b) => {
    const aActive = a.status === "UPCOMING" || a.status === "LIVE" || a.status === "IN_PROGRESS";
    const bActive = b.status === "UPCOMING" || b.status === "LIVE" || b.status === "IN_PROGRESS";

    // Sort active matches before completed matches
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;

    // If both are active, sort chronologically (earlier match first)
    if (aActive && bActive) {
      return a.match_no - b.match_no;
    }

    // If both are completed, sort reverse chronologically (latest match first)
    return b.match_no - a.match_no;
  });

  const filteredFixtures = carouselFixtures.filter((f) => {
    if (statusFilter === "ALL") return true;
    if (statusFilter === "LIVE") return f.status === "LIVE" || f.status === "IN_PROGRESS";
    if (statusFilter === "UPCOMING") return f.status === "UPCOMING";
    if (statusFilter === "COMPLETED") return f.status === "COMPLETED";
    return true;
  });
  const userHasVotedWinner = !!userVotes["tournament-winner"];

  // Skeleton Loader for premium visual look on initial load
  if (loading && fixtures.length === 0) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch animate-pulse">
        <div className="lg:col-span-7 bg-slate-100 dark:bg-white/5 rounded-3xl h-[320px] border border-slate-200 dark:border-white/5" />
        <div className="lg:col-span-5 flex flex-col justify-start space-y-4 h-full">
          <div className="space-y-2">
            <div className="h-4 w-32 bg-slate-200 dark:bg-white/10 rounded-md" />
            <div className="h-3 w-48 bg-slate-100 dark:bg-white/5 rounded-md" />
          </div>
          <div className="flex gap-4 overflow-hidden flex-grow">
            {[1, 2].map((i) => (
              <div key={i} className="min-w-[280px] bg-slate-100 dark:bg-white/5 rounded-2xl h-full border border-slate-200 dark:border-white/5" />
            ))}
          </div>
        </div>
      </div>
    );
  }



  const gridStroke = isDarkMode ? "#1f2937" : "#e2e8f0";
  const axisStroke = isDarkMode ? "#6c7a89" : "#94a3b8";
  const tooltipBg = isDarkMode ? "#16181d" : "#ffffff";
  const tooltipBorder = isDarkMode ? "rgba(255,255,255,0.08)" : "#e2e8f0";

  return (
    <div className="text-slate-900 dark:text-white w-full space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Left Column: Overall World Cup Winner Market (span 7) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#16181D] rounded-3xl border border-slate-200 dark:border-white/5 p-6 shadow-md flex flex-col justify-between space-y-6">

          {/* Header Row */}
          <div className="flex justify-between items-start">
            {/* Avatar & Title */}
            <div className="flex items-center">
              <div className="w-10 h-10 overflow-hidden rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/10 border border-amber-500/20 flex items-center justify-center mr-3 shrink-0 shadow-xs">
                <Trophy className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1.5">
                  Sports • Soccer • Community Verdict
                </span>
                <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white font-display">
                  World Cup Winner Aggregated Prediction
                </h3>
              </div>
            </div>

            {/* Actions (Link & Bookmark) */}
            <div className="flex items-center gap-3 text-slate-400 dark:text-[#6c7a89]">
              {/* <button title="Copy Link" className="hover:text-slate-650 dark:hover:text-white transition">
                <Link2 className="w-4 h-4 cursor-pointer" />
              </button>
              <button title="Watch Bookmark" className="hover:text-slate-650 dark:hover:text-white transition">
                <Bookmark className="w-4 h-4 cursor-pointer" />
              </button> */}
            </div>
          </div>

          {/* Grid Layout: Standings (left) & Chart (right) */}
          {isLoadingTournamentWinnerPolls && !tournamentWinnerPolls ? (
            <div className="flex justify-center items-center h-[320px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
            </div>
          ) : tournamentWinnerPolls && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">

              {/* Left Column (span 4): Standings List & Comments */}
              <div className="md:col-span-4 flex flex-col justify-between h-full space-y-6">

                {/* Standings List (Top 4 teams only) */}
                <div className="space-y-4">
                  {tournamentWinnerPolls.allTeams?.map((t) => (
                    <div key={t.code} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-5 overflow-hidden rounded-md border border-slate-200 dark:border-[#1f2937] bg-slate-100 dark:bg-slate-900 flex items-center justify-center shrink-0">
                          <CountryFlag code={t.code} flag={t.flag} name={t.name} className="h-full w-full object-cover scale-110" />
                        </div>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-500 transition">
                          {t.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-base font-black text-slate-900 dark:text-white">
                          {t.prob}%
                        </span>
                        <button
                          onClick={() => handleWinnerVoteClick((t as any).id || 0, t.code)}
                          disabled={userHasVotedWinner}
                          className={`p-1.5 rounded-lg border cursor-pointer transition ${userVotes["tournament-winner"] === t.code
                            ? "bg-amber-500/20 border-amber-500/40 text-amber-500"
                            : "bg-slate-50 hover:bg-slate-100 dark:bg-[#1f2937]/30 hover:dark:bg-[#1f2937] border-slate-200 dark:border-[#1f2937] text-slate-400 dark:text-[#6c7a89] hover:text-slate-650 dark:hover:text-white"
                            }`}
                          title="Vote as tournament champion"
                        >
                          <Vote className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

              </div>

              {/* Right Column (span 8): Legend & Stepped Chart */}
              <div className="md:col-span-8 flex flex-col space-y-4">

                {/* Horizontal Inline Legend */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-white/5 pb-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] font-bold text-slate-500 dark:text-[#6c7a89]">
                    {tournamentWinnerPolls.teams.map((t) => (
                      <div key={t.code} className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: t.color }} />
                        <span className="text-slate-700 dark:text-slate-300">{t.name}</span>
                        <span className="text-slate-900 dark:text-white font-mono">{t.exactProbability}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stepped Line Chart */}
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={tournamentWinnerPolls.chartData} margin={{ top: 10, right: 5, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke={gridStroke} strokeDasharray="3 3" opacity={0.6} />
                      <XAxis dataKey="date" stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} tickMargin={10} />
                      <YAxis
                        orientation="right"
                        stroke={axisStroke}
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `${val}%`}
                        tickMargin={8}
                        ticks={[0, 10, 20, 30, 40]}
                        domain={[0, 45]}
                      />
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          `${Number(value).toFixed(1)}%`,
                          name
                        ]}
                        contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '12px' }}
                        labelStyle={{ fontSize: '10px', color: axisStroke, fontWeight: 'bold' }}
                        itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                      />
                      {tournamentWinnerPolls.teams.map((t) => (
                        <Line
                          key={t.code}
                          type="stepAfter"
                          dataKey={t.name}
                          stroke={t.color}
                          strokeWidth={2.2}
                          name={t.name}
                          isAnimationActive={false}
                          dot={(props: any) => {
                            if (props.index !== tournamentWinnerPolls.chartData.length - 1) return <g key={`dot-${t.name}-${props.index}`}></g>;
                            return (
                              <circle
                                key={`dot-${t.name}-${props.index}`}
                                cx={props.cx}
                                cy={props.cy}
                                r={4}
                                fill={t.color}
                                stroke={tooltipBg}
                                strokeWidth={1.5}
                              />
                            );
                          }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Dynamic Horizontal Scroll carousel (45% width - span 5) */}
        <div className="lg:col-span-5 flex flex-col justify-start space-y-4 min-w-0">
          <div className="px-1 flex flex-wrap justify-between items-start gap-3">
            <div>
              <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                Active Match Prediction Pools
              </h4>
              <p className="text-[10px] text-muted-foreground">
                Vote on upcoming match winners.
              </p>
            </div>
            {/* Pill Tabs Filter in Top-Right Corner */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl text-[9px] font-extrabold uppercase shrink-0">
              {(["ALL", "LIVE", "UPCOMING", "COMPLETED"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-2 py-0.5 rounded-lg transition cursor-pointer select-none ${statusFilter === filter
                    ? "bg-white dark:bg-[#16181D] text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-450 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                    }`}
                >
                  {filter === "ALL" ? "All" : filter.charAt(0) + filter.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 scrollbar-custom select-none">
            {filteredFixtures.length > 0 ? (
              filteredFixtures.map((f) => (
                <VotingCard key={f.match_no} fixture={f} />
              ))
            ) : (
              <div className="w-full py-12 text-center text-xs text-muted-foreground border border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50/50 dark:bg-white/[0.01]">
                No matches left to show!
              </div>
            )}
          </div>
        </div>
      </div>

      {confirmWinnerTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#16181d] rounded-2xl border border-slate-200 dark:border-white/10 p-5.5 w-full max-w-sm shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setConfirmWinnerTeam(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-500 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-display font-black text-base text-slate-800 dark:text-white">Confirm Prediction</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 leading-relaxed">
              Are you sure you want to predict that <strong>{confirmWinnerTeam.name}</strong> will win the overall World Cup? This action cannot be undone.
            </p>
            <div className="flex gap-2.5 mt-5.5">
              <button
                onClick={() => setConfirmWinnerTeam(null)}
                className="flex-1 py-2 px-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmWinnerVote}
                className="flex-1 py-2 px-3 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 transition cursor-pointer shadow-lg shadow-amber-500/20"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
