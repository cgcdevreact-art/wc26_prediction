"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { Loader2, MessageSquare, ArrowRight, ExternalLink } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export type MarketMatch = {
  id: string;
  homeTeamName: string;
  homeTeamCode: string;
  homeTeamFlag: string;
  awayTeamName: string;
  awayTeamCode: string;
  awayTeamFlag: string;
  matchDate: string;
  stage: string;
  status: string;
  homeProb: number;
  drawProb: number;
  awayProb: number;
  totalVotes: number;
};

export function MatchProbabilitiesList() {
  const [matches, setMatches] = useState<MarketMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Dynamic World Cup Winner State
  const [winnerTeams, setWinnerTeams] = useState<any[]>([]);
  const [winnerChartData, setWinnerChartData] = useState<any[]>([]);
  const [winnerComments, setWinnerComments] = useState<any[]>([]);
  const [winnerVotes, setWinnerVotes] = useState<number>(0);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await fetch(`/api/markets?search=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setMatches(data);
        }
      } catch (error) {
        console.error("Failed to load markets", error);
      } finally {
        setLoading(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchMatches();
    }, 200);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    const fetchWinnerOdds = async () => {
      try {
        const res = await fetch("/api/markets/winner");
        if (res.ok) {
          const data = await res.json();
          setWinnerTeams(data.teams);
          setWinnerChartData(data.chartData);
          setWinnerComments(data.comments);
          setWinnerVotes(data.totalVotes);
        }
      } catch (e) {
        console.error("Failed to fetch winner odds:", e);
      }
    };
    fetchWinnerOdds();
  }, []);

  if (loading && matches.length === 0) {
    return (
      <div className="py-12 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-neon" />
      </div>
    );
  }

  return (
    <div className="text-slate-900 dark:text-white w-full space-y-8">

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Left Column: Overall World Cup Winner Market (60% width - span 7) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#16181D] rounded-2xl border border-slate-200 dark:border-white/5 p-6 shadow-sm space-y-6">

          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Sports • Soccer
              </span>
              <h3 className="text-xl font-black tracking-tight text-slate-955 dark:text-white">
                World Cup Winner
              </h3>
            </div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-lg">
              Outcomes
            </span>
          </div>

          {/* Grid: Winner listing + Historical Odds Chart */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">

            {/* Probability listing (span 5) */}
            <div className="md:col-span-5 space-y-4">
              {winnerTeams.map((t, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2.5 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <CountryFlag code={t.code} flag={t.flag} name={t.name} className="h-5 w-7 rounded-sm shadow-sm" />
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{t.name}</span>
                  </div>
                  <span className="font-mono text-base font-black text-slate-900 dark:text-white">
                    {t.prob}%
                  </span>
                </div>
              ))}
            </div>

            {/* Historical probability chart (span 7) */}
            <div className="md:col-span-7 h-48 w-full">
              {winnerTeams.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={winnerChartData} margin={{ top: 10, right: 110, left: 0, bottom: 0 }}>
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
                    {winnerTeams.map((t, index) => (
                      <Line
                        key={index}
                        type="monotone"
                        dataKey={t.name}
                        stroke={t.color}
                        strokeWidth={index === 0 ? 3 : 2}
                        name={t.name}
                        dot={(props: any) => {
                          if (props.index !== winnerChartData.length - 1) return <g key={`dot-${t.name}-${props.index}`}></g>;
                          const val = props.payload[t.name];
                          if (val === undefined) return <g key={`dot-${t.name}-${props.index}`}></g>;
                          return (
                            <g key={`dot-${t.name}-${props.index}`}>
                              <circle cx={props.cx} cy={props.cy} r={4} fill={t.color} />
                              <text x={props.cx + 10} y={props.cy - 10} fill={t.color} fontSize={10} fontWeight="600">{t.name}</text>
                              <text x={props.cx + 10} y={props.cy + 12} fill={t.color} fontSize={18} fontWeight="900" style={{ letterSpacing: '-0.05em' }}>{Math.round(Number(val))}%</text>
                            </g>
                          );
                        }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

          </div>

          {/* Comments Snippet */}
          {/* <div className="border-t border-slate-100 dark:border-white/5 pt-4 space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">
              Community Comments
            </span>
            <div className="space-y-2">
              {winnerComments.map((c, idx) => (
                <div key={idx} className="flex gap-2.5 text-xs items-start">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-white uppercase">
                    {c.username.charAt(0)}
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 mr-2">{c.username}</span>
                    <span className="text-slate-650 dark:text-slate-400">{c.comment}</span>
                  </div>
                </div>
              ))}
            </div>
          </div> */}

          {/* Footer stats */}
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase border-t border-slate-100 dark:border-white/5 pt-4">
            <span>{winnerVotes.toLocaleString()} Votes Cast</span>
            <span>Ends Jul 20, 2026</span>
          </div>

        </div>

        {/* Right Column: Individual Match pools (40% width - span 5) */}
        <div className="lg:col-span-5 space-y-4">
          {/* <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">
            Match Predictions Pools
          </h3> */}

          <div className="space-y-3">
            {matches.map((match) => (
              <div
                key={match.id}
                className="bg-white dark:bg-[#16181D] rounded-xl border border-slate-200 dark:border-white/5 p-4 shadow-sm hover:border-slate-350 dark:hover:border-white/10 transition-colors"
              >
                {/* Top Row: Date & stage */}
                <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-450 font-bold uppercase tracking-wider mb-3">
                  <span>{match.stage}</span>
                  <span>{format(new Date(match.matchDate), "h:mm a • MMM d")}</span>
                </div>

                {/* Match layout: Teams left, Win buttons right */}
                <div className="flex justify-between items-center gap-4">
                  {/* Teams */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5">
                      <CountryFlag code={match.homeTeamCode} flag={match.homeTeamFlag} name={match.homeTeamName} className="h-4.5 w-6 rounded shadow-sm" />
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{match.homeTeamName}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <CountryFlag code={match.awayTeamCode} flag={match.awayTeamFlag} name={match.awayTeamName} className="h-4.5 w-6 rounded shadow-sm" />
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{match.awayTeamName}</span>
                    </div>
                  </div>

                  {/* Red/Green styled buttons */}
                  <div className="flex flex-col gap-1 w-28">
                    {/* Home team Win (Green status) */}
                    <Link
                      href={`/predictions/markets/${match.id}`}
                      className="px-2.5 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/25 border border-green-500/20 text-green-600 dark:text-green-400 font-bold text-xs flex justify-between items-center transition-all"
                    >
                      <span className="uppercase">{match.homeTeamCode}</span>
                      <span className="font-mono text-[11px]">{match.homeProb}%</span>
                    </Link>

                    {/* Draw outcome (Slate status) */}
                    <Link
                      href={`/predictions/markets/${match.id}`}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/30 hover:bg-slate-200 dark:hover:bg-slate-800/60 border border-slate-300 dark:border-slate-600/20 text-slate-600 dark:text-slate-350 font-bold text-xs flex justify-between items-center transition-all"
                    >
                      <span>DRAW</span>
                      <span className="font-mono text-[11px]">{match.drawProb}%</span>
                    </Link>

                    {/* Away team Win (Red status) */}
                    <Link
                      href={`/predictions/markets/${match.id}`}
                      className="px-2.5 py-1.5 rounded-lg bg-red-50/70 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 font-bold text-xs flex justify-between items-center transition-all"
                    >
                      <span className="uppercase">{match.awayTeamCode}</span>
                      <span className="font-mono text-[11px]">{match.awayProb}%</span>
                    </Link>
                  </div>
                </div>

                {/* Footer link */}
                <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5">
                  <span>{match.totalVotes} Votes cast</span>
                  <Link href={`/predictions/markets/${match.id}`} className="hover:text-neon text-[10px] flex items-center gap-1 font-bold text-slate-500">
                    Predict & Discuss <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
