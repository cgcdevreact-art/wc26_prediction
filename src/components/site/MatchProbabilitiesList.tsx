"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { useFixturesStore } from "@/stores/useFixturesStore";
import { useVotingStore } from "@/stores/useVotingStore";
import { VotingCard } from "@/components/voting/VotingCard";
import { CustomPollCardData, CustomVotingCard } from "@/components/voting/CustomVotingCard";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSession } from "next-auth/react";
import { Trophy, Vote, X, Code, Link2, Bookmark, Gift, Settings, ListFilter, Maximize2 } from "lucide-react";
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
  const [customPolls, setCustomPolls] = useState<CustomPollCardData[]>([]);

  const [timeframe, setTimeframe] = useState<"1H" | "6H" | "1D" | "1W" | "1M" | "ALL">("ALL");
  const [visibleTeams, setVisibleTeams] = useState<Record<string, boolean>>({});
  const [showSettings, setShowSettings] = useState(false);
  const [sortAsc, setSortAsc] = useState(false);
  const [isChartExpanded, setIsChartExpanded] = useState(false);

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

  useEffect(() => {
    if (tournamentWinnerPolls?.teams) {
      const initial: Record<string, boolean> = {};
      tournamentWinnerPolls.teams.forEach((t, idx) => {
        initial[t.name] = idx < 4;
      });
      setVisibleTeams(initial);
    }
  }, [tournamentWinnerPolls]);

  const loadCustomPolls = async () => {
    try {
      const res = await fetch("/api/custom-polls");
      const data = await res.json();
      if (res.ok) {
        setCustomPolls(data.polls || []);
      }
    } catch (error) {
      console.error("Failed to load custom polls:", error);
    }
  };

  const filteredChartData = useMemo(() => {
    if (!tournamentWinnerPolls?.chartData) return [];
    if (timeframe === "ALL") return tournamentWinnerPolls.chartData;

    const now = new Date();
    let cutoff = new Date();

    if (timeframe === "1H") cutoff.setHours(now.getHours() - 1);
    else if (timeframe === "6H") cutoff.setHours(now.getHours() - 6);
    else if (timeframe === "1D") cutoff.setDate(now.getDate() - 1);
    else if (timeframe === "1W") cutoff.setDate(now.getDate() - 7);
    else if (timeframe === "1M") cutoff.setMonth(now.getMonth() - 1);

    return tournamentWinnerPolls.chartData.filter((pt: any) => {
      if (!pt.fullDate) return true;
      const ptDate = new Date(pt.fullDate);
      return ptDate >= cutoff;
    });
  }, [tournamentWinnerPolls?.chartData, timeframe]);

  const sortedStandings = useMemo(() => {
    if (!tournamentWinnerPolls?.allTeams) return [];
    const list = [...tournamentWinnerPolls.allTeams];
    return list.sort((a, b) => {
      return sortAsc ? a.prob - b.prob : b.prob - a.prob;
    });
  }, [tournamentWinnerPolls?.allTeams, sortAsc]);

  // Load fixtures and initial voting state
  useEffect(() => {
    loadFixtures();
    loadTournamentWinnerPolls();
    loadCustomPolls();

    // Auto-refresh every 2 minutes
    const interval = setInterval(() => {
      loadFixtures();
      loadTournamentWinnerPolls();
      loadCustomPolls();
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

    const votedWinnerCode = userVotes["tournament-winner"];
    if (votedWinnerCode) {
      const list = tournamentWinnerPolls?.allTeams || tournamentWinnerPolls?.teams || [];
      const votedTeam = list.find((t) => t.code === votedWinnerCode);
      const votedTeamName = votedTeam ? votedTeam.name : votedWinnerCode;
      toast.error(`You already voted for ${votedTeamName}!`);
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
  const filteredCustomPolls = customPolls.filter((poll) => {
    if (statusFilter === "ALL") return true;
    return poll.status === statusFilter;
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

  const renderWinnerChart = (heightClassName: string) => (
    <div className={`${heightClassName} min-w-0 w-full`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={filteredChartData} margin={{ top: 10, right: 5, left: 0, bottom: 0 }}>
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
            contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: "12px" }}
            labelStyle={{ fontSize: "10px", color: axisStroke, fontWeight: "bold" }}
            itemStyle={{ fontSize: "11px", fontWeight: "bold" }}
          />
          {tournamentWinnerPolls?.teams.filter((t) => visibleTeams[t.name]).map((t) => (
            <Line
              key={t.code}
              type="stepAfter"
              dataKey={t.name}
              stroke={t.color}
              strokeWidth={["FRA", "ESP", "ARG", "ENG"].includes(t.code) ? 2.5 : 1.5}
              name={t.name}
              isAnimationActive={false}
              dot={(props: any) => {
                if (props.index !== filteredChartData.length - 1) return <g key={`dot-${t.name}-${props.index}`}></g>;
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
  );

  return (
    <div className="text-slate-900 dark:text-white w-full space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

        {/* Left Column: Overall World Cup Winner Market (span 7) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#16181D] rounded-3xl border border-slate-200 dark:border-white/5 p-6 shadow-md flex flex-col gap-6">

          {/* Header Row */}
          <div className="flex justify-between items-start">
            {/* Avatar & Title */}
            <div className="flex items-center">
              <div className="w-10 h-10 overflow-hidden rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/10 border border-amber-500/20 flex items-center justify-center mr-3 shrink-0 shadow-xs">
                <Trophy className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1.5">
                  Sports • Soccer • Fans Verdict
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
            <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[minmax(240px,0.9fr)_minmax(0,1.6fr)] xl:grid-cols-[minmax(260px,0.95fr)_minmax(0,1.55fr)] flex-1">

              {/* Left Column (span 4): Standings List & Comments */}
              <div className="flex h-full min-w-0 flex-col justify-between space-y-6">

                {/* Standings List (Top teams only, sorted) */}
                <div className="flex-1 flex flex-col justify-between">
                  {sortedStandings.map((t) => (
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
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer group ${userVotes["tournament-winner"] === t.code
                              ? "bg-[#fffbeb] dark:bg-[#f59e0b]/10 border-2 border-[#f59e0b] text-[#d97706] dark:text-[#f59e0b]"
                              : "bg-[#f8fafc] dark:bg-[#1e2025]/50 border border-[#e2e8f0] dark:border-white/5 text-[#64748b] dark:text-slate-400 hover:bg-[#f1f5f9] hover:border-[#cbd5e1] hover:text-[#475569] dark:hover:bg-white/10 dark:hover:text-white"
                            }`}
                          title="Vote as tournament champion"
                        >
                          {userVotes["tournament-winner"] === t.code ? (
                            <img
                              src="/voting.svg"
                              alt="Voted"
                              className="block w-5.5 h-5.5 object-contain transition-all duration-200 scale-110 group-hover:scale-120 active:scale-95"
                            />
                          ) : (
                            <img
                              src="/voting.svg"
                              alt="Vote"
                              className="block w-5.5 h-5.5 object-contain opacity-55 dark:opacity-40 grayscale group-hover:opacity-100 group-hover:grayscale-0 group-hover:scale-110 transition-all duration-200 active:scale-95"
                            />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

              </div>

              {/* Right Column (span 8): Legend & Stepped Chart */}
              <div className="relative flex min-w-0 flex-col space-y-4 flex-grow">

                {/* Legend & Controls Toolbar */}
                <div className="relative flex flex-wrap items-center gap-4 border-b border-slate-100 pb-2 dark:border-white/5 xl:flex-nowrap">
                  {/* Left: Legend */}
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] font-bold text-slate-500 dark:text-[#6c7a89]">
                    {tournamentWinnerPolls.teams.filter(t => visibleTeams[t.name]).map((t) => (
                      <div key={t.code} className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: t.color }} />
                        <span className="text-slate-700 dark:text-slate-300">{t.name}</span>
                        <span className="text-slate-900 dark:text-white font-mono">{t.exactProbability}%</span>
                      </div>
                    ))}
                  </div>

                  {/* Right: Filters & Settings */}
                  <div className="ml-auto flex shrink-0 items-center gap-4 text-xs font-bold text-slate-400 select-none dark:text-[#6c7a89]">
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#1e2025]/80 p-0.5 rounded-lg border border-slate-200/50 dark:border-white/5">
                      {(["1H", "6H", "1D", "1W", "1M", "ALL"] as const).map((tf) => (
                        <button
                          key={tf}
                          onClick={() => setTimeframe(tf)}
                          className={`cursor-pointer px-1.5 py-0.5 rounded-md text-[10px] uppercase transition-all ${timeframe === tf ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white font-black shadow-xs" : "hover:text-slate-650 dark:hover:text-slate-350"}`}
                        >
                          {tf}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setSortAsc(!sortAsc)}
                      title={sortAsc ? "Sort Descending" : "Sort Ascending"}
                      className={`hover:text-slate-900 dark:hover:text-white transition cursor-pointer p-1 rounded-md ${sortAsc ? "text-cyan-500" : ""}`}
                    >
                      <ListFilter className="w-4 h-4" />
                    </button>

                    <div className="relative">
                      <button
                        onClick={() => setIsChartExpanded(true)}
                        title="Expand chart"
                        className="hover:text-slate-900 dark:hover:text-white transition cursor-pointer p-1 rounded-md"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setShowSettings(!showSettings)}
                        title="Show on chart"
                        className={`hover:text-slate-900 dark:hover:text-white transition cursor-pointer p-1 rounded-md ${showSettings ? "bg-slate-100 dark:bg-white/10 text-cyan-500 dark:text-neon" : ""}`}
                      >
                        <Settings className="w-4 h-4" />
                      </button>

                      {/* Dropdown Popover */}
                      {showSettings && (
                        <div className="absolute right-0 top-full mt-2 w-60 bg-white dark:bg-[#16181d] border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-xl z-50 space-y-3">
                          <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-2">
                            <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                              Show on chart
                            </h4>
                            <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                            {tournamentWinnerPolls.teams.map((t) => {
                              const isVisible = !!visibleTeams[t.name];
                              return (
                                <div key={t.code} className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: t.color }} />
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{t.name}</span>
                                  </div>
                                  <button
                                    onClick={() => {
                                      setVisibleTeams(prev => ({
                                        ...prev,
                                        [t.name]: !prev[t.name]
                                      }));
                                    }}
                                    className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isVisible ? "bg-cyan-500" : "bg-slate-200 dark:bg-slate-800"
                                      }`}
                                  >
                                    <span
                                      className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${isVisible ? "translate-x-3" : "translate-x-0"
                                        }`}
                                    />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stepped Line Chart */}
                {renderWinnerChart("flex-grow min-h-[240px]")}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Dynamic Horizontal Scroll carousel (45% width - span 5) */}
        <div className="lg:col-span-5 flex h-full min-w-0 flex-col justify-start space-y-4">
          <div className="px-1 flex flex-wrap justify-between items-start gap-3">
            <div>
              <h4 className="text-xs font-black text-slate-700 dark:text-slate-350 uppercase tracking-widest mb-1">
                Active Prediction Pools
              </h4>
              <p className="text-[10px] text-muted-foreground transition-all duration-300">
                {statusFilter === "ALL" && "Vote in match and custom prediction pools, then view the results."}
                {statusFilter === "LIVE" && "Predict outcomes for active live matches and custom questions in real-time."}
                {statusFilter === "UPCOMING" && "Vote on upcoming match winners and scheduled custom polls."}
                {statusFilter === "COMPLETED" && "View completed match and custom poll results."}
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

          <div className="flex flex-1 items-stretch gap-4 overflow-x-auto px-1 pb-4 pt-1 scrollbar-custom select-none">
            {filteredCustomPolls.length > 0 || filteredFixtures.length > 0 ? (
              <>
                {filteredCustomPolls.map((poll) => (
                  <CustomVotingCard key={poll.id} poll={poll} />
                ))}
                {filteredFixtures.map((f) => (
                  <VotingCard key={f.match_no} fixture={f} />
                ))}
              </>
            ) : (
              <div className="w-full py-10 text-center text-xs text-muted-foreground border border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50/50 dark:bg-white/[0.01] flex flex-col items-center justify-center gap-3">
                {statusFilter === "LIVE" ? (
                  <>
                    <img
                      src="/lottie/Soccer_empty_state.svg"
                      className="w-20 h-20 opacity-75 dark:opacity-60"
                      alt="No live matches"
                    />
                    <span className="font-bold text-slate-500 dark:text-slate-450">
                      No live pools at the moment.
                    </span>
                  </>
                ) : (
                  <span>No prediction pools left to show!</span>
                )}
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

      <Dialog open={isChartExpanded} onOpenChange={setIsChartExpanded}>
        <DialogContent className="max-w-6xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl dark:border-white/10 dark:bg-[#16181D] dark:text-white">
          <DialogHeader className="pr-8">
            <DialogTitle className="font-display text-xl font-black tracking-tight">
              World Cup Winner Aggregated Prediction
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold text-slate-500 dark:text-slate-400">
              {tournamentWinnerPolls?.teams.filter((t) => visibleTeams[t.name]).map((t) => (
                <div key={t.code} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                  <span className="text-slate-700 dark:text-slate-200">{t.name}</span>
                  <span className="font-mono text-slate-900 dark:text-white">{t.exactProbability}%</span>
                </div>
              ))}
            </div>
            {renderWinnerChart("h-[70vh] min-h-[420px]")}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
