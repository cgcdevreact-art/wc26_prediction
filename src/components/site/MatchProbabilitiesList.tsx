"use client";

import { useEffect, useState } from "react";
import { useFixturesStore } from "@/stores/useFixturesStore";
import { useVotingStore } from "@/stores/useVotingStore";
import { VotingCard } from "@/components/voting/VotingCard";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { useSession } from "next-auth/react";
import { Trophy, Vote } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export function MatchProbabilitiesList() {
  const { data: session } = useSession();
  const { fixtures, loading, loadFixtures } = useFixturesStore();
  const {
    tournamentWinnerPolls,
    userVotes,
    voteTournamentWinner,
    loadTournamentWinnerPolls,
    initializeMatchVotes
  } = useVotingStore();

  const [isMobile, setIsMobile] = useState(false);

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

  const handleWinnerVoteClick = async (teamId: number, teamCode: string) => {
    if (!session) {
      alert("Please sign in to cast your vote!");
      return;
    }
    await voteTournamentWinner(teamId, teamCode);
  };

  // Load all upcoming matches dynamically (no limit)
  const upcomingFixtures = fixtures.filter((f) => f.status === "UPCOMING");
  const userHasVotedWinner = !!userVotes["tournament-winner"];

  // Skeleton Loader for premium visual look on initial load
  if (loading && fixtures.length === 0) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch animate-pulse">
        <div className="lg:col-span-7 bg-slate-100 dark:bg-white/5 rounded-3xl h-[320px] border border-slate-200 dark:border-white/5" />
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="h-4 w-32 bg-slate-200 dark:bg-white/10 rounded-md" />
            <div className="h-3 w-48 bg-slate-100 dark:bg-white/5 rounded-md" />
          </div>
          <div className="flex gap-4 overflow-hidden">
            {[1, 2].map((i) => (
              <div key={i} className="min-w-[280px] bg-slate-100 dark:bg-white/5 rounded-2xl h-[220px] border border-slate-200 dark:border-white/5" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-slate-900 dark:text-white w-full space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

        {/* Left Column: Overall World Cup Winner Market (55% width - span 7) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#16181D] rounded-3xl border border-slate-200 dark:border-white/5 p-6 shadow-md flex flex-col justify-between space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Sports • Soccer • Community Verdict
              </span>
              <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2 font-display">
                <Trophy className="w-5 h-5 text-amber-500" />
                World Cup Winner Poll
              </h3>
            </div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-lg">
              Dynamic Chart
            </span>
          </div>

          {/* Grid: Winner listing + Historical Odds Chart */}
          {tournamentWinnerPolls && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Probability listing (span 5) */}
              <div className="md:col-span-5 space-y-3.5">
                {tournamentWinnerPolls.teams.map((t) => (
                  <div key={t.code} className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2.5 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <CountryFlag code={t.code} flag={t.flag} name={t.name} className="h-5 w-7 rounded-sm shadow-sm" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{t.name}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-black text-slate-900 dark:text-white">
                        {t.prob}%
                      </span>
                      <button
                        onClick={() => handleWinnerVoteClick((t as any).id || 0, t.code)}
                        disabled={userHasVotedWinner}
                        className={`p-1.5 rounded-lg border cursor-pointer transition ${userVotes["tournament-winner"] === t.code
                          ? "bg-amber-500/10 border-amber-500/20 text-amber-500 font-extrabold"
                          : "bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 border-slate-200 dark:border-white/10 text-slate-400 hover:text-slate-650"
                          }`}
                        title="Vote as tournament champion"
                      >
                        <Vote className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Historical probability chart (span 7) */}
              <div className="md:col-span-7 h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={tournamentWinnerPolls.chartData} margin={{ top: 10, right: isMobile ? 10 : 100, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#334155" strokeDasharray="3 3" opacity={0.4} />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} tickMargin={10} />
                    <YAxis
                      orientation="right"
                      stroke="#64748b"
                      fontSize={9}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `${val}%`}
                      tickMargin={10}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${Number(value).toFixed(1)}%`]}
                      contentStyle={{ backgroundColor: 'var(--tooltip-bg, #16181d)', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '8px' }}
                      labelStyle={{ fontSize: '10px', color: '#94a3b8' }}
                    />
                    {tournamentWinnerPolls.teams.map((t) => (
                      <Line
                        key={t.code}
                        type="monotone"
                        dataKey={t.name}
                        stroke={t.color}
                        strokeWidth={2}
                        name={t.name}
                        isAnimationActive={false}
                        dot={(props: any) => {
                          if (props.index !== tournamentWinnerPolls.chartData.length - 1) return <g key={`dot-${t.name}-${props.index}`}></g>;
                          const val = props.payload[t.name];
                          if (val === undefined) return <g key={`dot-${t.name}-${props.index}`}></g>;
                          return (
                            <g key={`dot-${t.name}-${props.index}`}>
                              <circle cx={props.cx} cy={props.cy} r={4} fill={t.color} />
                              {!isMobile && (
                                <>
                                  <text x={props.cx + 8} y={props.cy - 6} fill={t.color} fontSize={9} fontWeight="600">{t.name}</text>
                                  <text x={props.cx + 8} y={props.cy + 10} fill={t.color} fontSize={14} fontWeight="900">{Math.round(Number(val))}%</text>
                                </>
                              )}
                            </g>
                          );
                        }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Footer stats */}
          {tournamentWinnerPolls && (
            <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase border-t border-slate-100 dark:border-white/5 pt-4">
              <span>{tournamentWinnerPolls.totalVotes.toLocaleString()} Votes Cast</span>
              <span>Ends Jul 20, 2026</span>
            </div>
          )}
        </div>

        {/* Right Column: Dynamic Horizontal Scroll carousel (45% width - span 5) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4 min-w-0">
          <div className="px-1">
            <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
              Active Match Prediction Pools
            </h4>
            <p className="text-[10px] text-muted-foreground">
              Vote on upcoming match winners.
            </p>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 scrollbar-custom select-none">
            {upcomingFixtures.length > 0 ? (
              upcomingFixtures.map((f) => (
                <VotingCard key={f.match_no} fixture={f} />
              ))
            ) : (
              <div className="w-full py-12 text-center text-xs text-muted-foreground border border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50/50 dark:bg-white/[0.01]">
                No upcoming matches left to vote on!
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
