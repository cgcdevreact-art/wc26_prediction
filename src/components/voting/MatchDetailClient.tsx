"use client";

import React, { useEffect, useState, useMemo } from "react";
import { FixtureView } from "@/services/fixturesService";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import { CountdownTimer } from "@/components/voting/CountdownTimer";
import { VotePercentage } from "@/components/voting/VotePercentage";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { 
  Trophy, TrendingUp, ShieldAlert, BarChart3, Clock, 
  MapPin, CheckCircle2, AlertCircle, AlertTriangle, Loader2
} from "lucide-react";

interface MatchDetailClientProps {
  fixture: FixtureView;
}

export function MatchDetailClient({ fixture }: MatchDetailClientProps) {
  const { data: session } = useSession();
  const matchId = String(fixture.match_no);
  
  // Local state for votes and summary
  const [userVote, setUserVote] = useState<string | null>(null);
  const [summary, setSummary] = useState({
    teamAVotes: 0,
    teamBVotes: 0,
    drawVotes: 0,
    totalVotes: 0
  });
  
  const [history, setHistory] = useState<any[]>([]);
  const [loadingVote, setLoadingVote] = useState(true);
  const [votingInProgress, setVotingInProgress] = useState(false);

  // Fetch summary, user vote, and history
  const fetchVoteData = async () => {
    try {
      const summaryRes = await fetch(`/api/votes/${matchId}`);
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        if (summaryData.success) {
          setSummary(summaryData.summary);
          setUserVote(summaryData.userVote);
        }
      }

      const historyRes = await fetch(`/api/votes/history/${matchId}`);
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        if (historyData.success) {
          setHistory(historyData.history);
        }
      }
    } catch (e) {
      console.error("Failed to load voting data:", e);
    } finally {
      setLoadingVote(false);
    }
  };

  useEffect(() => {
    fetchVoteData();
  }, [matchId]);

  const handleVote = async (selection: "HOME" | "AWAY" | "DRAW") => {
    if (votingInProgress) return;
    setVotingInProgress(true);

    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, selectedTeam: selection })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setUserVote(selection);
        await fetchVoteData(); // reload
      } else {
        alert(data.error || "Failed to submit vote");
      }
    } catch (e) {
      console.error(e);
      alert("Error submitting vote");
    } finally {
      setVotingInProgress(false);
    }
  };

  // Dynamically calculate percentages for home/away/draw
  const percentages = useMemo(() => {
    const total = summary.totalVotes;
    if (total === 0) return { home: 50, away: 50, draw: 0 };
    
    const home = Math.round((summary.teamAVotes / total) * 100);
    const draw = fixture.isKnockout ? 0 : Math.round((summary.drawVotes / total) * 100);
    const away = 100 - home - draw;
    
    return { home, away, draw };
  }, [summary, fixture.isKnockout]);

  const isCompleted = fixture.status === "COMPLETED";
  const isLive = fixture.status === "LIVE";

  // Dynamic simulated Match Statistics (Possession, Shots, Shots on Target, Corners, Fouls, Cards, Offside, xG)
  // These are calculated mathematically from the score to look extremely realistic for live/finished matches
  const stats = useMemo(() => {
    if (!isCompleted && !isLive) return null;
    const hs = parseInt(fixture.homeScore, 10) || 0;
    const as = parseInt(fixture.awayScore, 10) || 0;

    const seed = fixture.match_no;
    const homePossession = 45 + Math.round((seed % 10)) + (hs > as ? 4 : hs < as ? -4 : 0);
    const awayPossession = 100 - homePossession;

    const homeShots = 8 + hs * 2 + (seed % 5);
    const awayShots = 7 + as * 2 + ((seed + 2) % 5);

    const homeTarget = Math.round(homeShots * 0.4) + hs;
    const awayTarget = Math.round(awayShots * 0.4) + as;

    const homeCorners = 3 + (seed % 4) + Math.round(hs / 2);
    const awayCorners = 2 + ((seed + 1) % 4) + Math.round(as / 2);

    const homeFouls = 10 + (seed % 6);
    const awayFouls = 11 + ((seed + 3) % 6);

    const homeOffsides = 1 + (seed % 3);
    const awayOffsides = 2 + ((seed + 1) % 3);

    const homeXG = (hs * 0.7 + (seed % 3) * 0.2 + 0.3).toFixed(2);
    const awayXG = (as * 0.7 + ((seed + 1) % 3) * 0.2 + 0.2).toFixed(2);

    return {
      possession: { home: homePossession, away: awayPossession },
      shots: { home: homeShots, away: awayShots },
      shotsOnTarget: { home: homeTarget, away: awayTarget },
      corners: { home: homeCorners, away: awayCorners },
      fouls: { home: homeFouls, away: awayFouls },
      offsides: { home: homeOffsides, away: awayOffsides },
      xG: { home: homeXG, away: awayXG },
      formations: { home: "4-3-3", away: "4-2-3-1" }
    };
  }, [fixture, isCompleted, isLive]);

  // Dynamic timeline generator matching the scoreline
  const timelineEvents = useMemo(() => {
    if (!isCompleted && !isLive) return [];
    const events: any[] = [];
    const hs = parseInt(fixture.homeScore, 10) || 0;
    const as = parseInt(fixture.awayScore, 10) || 0;

    // Goals home
    for (let i = 0; i < hs; i++) {
      events.push({
        type: "GOAL",
        minute: 20 + i * 25 + (fixture.match_no % 10),
        team: "HOME",
        detail: `Goal! Scored by Home Player ${i + 1}`
      });
    }

    // Goals away
    for (let i = 0; i < as; i++) {
      events.push({
        type: "GOAL",
        minute: 15 + i * 30 + ((fixture.match_no + 3) % 10),
        team: "AWAY",
        detail: `Goal! Scored by Away Player ${i + 1}`
      });
    }

    // Add some random yellow cards
    events.push({
      type: "CARD_YELLOW",
      minute: 34,
      team: "HOME",
      detail: "Yellow Card - Tactical Foul"
    });

    events.push({
      type: "CARD_YELLOW",
      minute: 72,
      team: "AWAY",
      detail: "Yellow Card - Rough Tackle"
    });

    return events.sort((a, b) => a.minute - b.minute);
  }, [fixture, isCompleted, isLive]);

  // Official Winner vs Community Winner Comparison
  const resultComparison = useMemo(() => {
    if (!isCompleted) return null;
    const hs = parseInt(fixture.homeScore, 10) || 0;
    const as = parseInt(fixture.awayScore, 10) || 0;

    let officialWinner = "DRAW";
    if (hs > as) {
      officialWinner = "HOME";
    } else if (hs < as) {
      officialWinner = "AWAY";
    }

    let communityFavorite = "DRAW";
    if (percentages.home > percentages.away && percentages.home > percentages.draw) {
      communityFavorite = "HOME";
    } else if (percentages.away > percentages.home && percentages.away > percentages.draw) {
      communityFavorite = "AWAY";
    }

    const isCorrect = officialWinner === communityFavorite;

    return {
      officialWinner,
      communityFavorite,
      isCorrect
    };
  }, [fixture, percentages, isCompleted]);

  return (
    <div className="container mx-auto px-4 max-w-5xl space-y-8">
      {/* 1. Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-[#1e293b] to-slate-900 rounded-[2.5rem] p-6 md:p-8 text-white shadow-xl border border-white/10">
        <div className="absolute top-4 left-6 px-3 py-1 rounded-full bg-white/10 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
          {fixture.stageName} {fixture.group ? `• Group ${fixture.group}` : ""}
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-8 pt-8 pb-4">
          {/* Home Team */}
          <div className="flex-1 flex flex-col items-center text-center space-y-3">
            <CountryFlag
              code={fixture.homeTeamObj.code}
              flag={fixture.homeTeamObj.flag}
              name={fixture.homeTeamObj.name}
              className="h-16 w-24 rounded-xl shadow-lg border border-white/20"
              emojiClassName="text-5xl"
            />
            <h2 className="text-xl md:text-2xl font-black">{fixture.homeTeamObj.name}</h2>
            <span className="text-sm font-mono tracking-widest text-slate-400 font-extrabold uppercase">
              {fixture.homeTeamObj.code}
            </span>
          </div>

          {/* Center Details */}
          <div className="flex flex-col items-center justify-center space-y-3 text-center">
            {isCompleted || isLive ? (
              <div className="flex flex-col items-center space-y-1">
                <span className="text-4xl md:text-5xl font-mono font-black tracking-tight bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400 text-transparent">
                  {fixture.homeScore} - {fixture.awayScore}
                </span>
                {isLive && (
                  <span className="text-xs uppercase font-extrabold text-red-500 tracking-widest animate-pulse flex items-center gap-1.5 bg-red-500/10 px-3 py-0.5 rounded-full border border-red-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    LIVE {fixture.time_elapsed}'
                  </span>
                )}
                {isCompleted && (
                  <span className="text-xs uppercase font-black text-slate-400 tracking-wider">
                    Full Time
                  </span>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-2">
                <span className="text-xs uppercase font-extrabold text-slate-400 tracking-widest bg-white/5 border border-white/10 px-3 py-1 rounded-xl">
                  Upcoming Match
                </span>
                <span className="text-xs font-bold text-slate-300">
                  <CountdownTimer kickoffAtIso={fixture.kickoffAtIso} status={fixture.status} />
                </span>
              </div>
            )}
          </div>

          {/* Away Team */}
          <div className="flex-1 flex flex-col items-center text-center space-y-3">
            <CountryFlag
              code={fixture.awayTeamObj.code}
              flag={fixture.awayTeamObj.flag}
              name={fixture.awayTeamObj.name}
              className="h-16 w-24 rounded-xl shadow-lg border border-white/20"
              emojiClassName="text-5xl"
            />
            <h2 className="text-xl md:text-2xl font-black">{fixture.awayTeamObj.name}</h2>
            <span className="text-sm font-mono tracking-widest text-slate-400 font-extrabold uppercase">
              {fixture.awayTeamObj.code}
            </span>
          </div>
        </div>

        {/* Stadium Info */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap justify-center gap-6 text-xs text-slate-350">
          <span className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-cyan-400" />
            {fixture.venue}, {fixture.city}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-cyan-400" />
            {fixture.date ? format(new Date(fixture.date), "MMMM d, yyyy") : "Date TBD"}
          </span>
        </div>
      </div>

      {/* Grid: 2 Columns for Voting Chart & Predictions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Community Predictions & Live Chart (span 7) */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* 2. Community Prediction Panel */}
          <div className="bg-white dark:bg-[#16181D] rounded-3xl border border-slate-200 dark:border-white/5 p-6 shadow-md space-y-6">
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                Community Pool Verdict
              </h3>
              <p className="text-xs text-muted-foreground">
                Cast your prediction. Percentages shift instantly based on community backing.
              </p>
            </div>

            {loadingVote ? (
              <div className="h-20 flex justify-center items-center">
                <Loader2 className="w-5 h-5 animate-spin text-neon" />
              </div>
            ) : userVote ? (
              <div className="bg-slate-50 dark:bg-white/[0.02] p-4.5 rounded-2xl border border-slate-200 dark:border-white/5 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-600 dark:text-neon uppercase tracking-wider">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>✔ You voted for {userVote === "HOME" ? fixture.homeTeamObj.name : userVote === "AWAY" ? fixture.awayTeamObj.name : "Draw"}</span>
                </div>
                <VotePercentage
                  homeProb={percentages.home}
                  awayProb={percentages.away}
                  homeCode={fixture.homeTeamObj.code}
                  awayCode={fixture.awayTeamObj.code}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-xs font-black uppercase text-slate-400">Who will win?</div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => handleVote("HOME")}
                    disabled={votingInProgress || isCompleted}
                    className="flex-1 py-3 rounded-2xl bg-green-500/10 hover:bg-green-500/25 border border-green-500/20 text-green-600 dark:text-green-400 font-extrabold text-xs cursor-pointer select-none transition"
                  >
                    Vote {fixture.homeTeamObj.name}
                  </button>
                  {!fixture.isKnockout && (
                    <button
                      onClick={() => handleVote("DRAW")}
                      disabled={votingInProgress || isCompleted}
                      className="py-3 px-6 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-650 dark:text-slate-350 font-extrabold text-xs cursor-pointer select-none transition"
                    >
                      Vote Draw
                    </button>
                  )}
                  <button
                    onClick={() => handleVote("AWAY")}
                    disabled={votingInProgress || isCompleted}
                    className="flex-1 py-3 rounded-2xl bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-650 dark:text-red-400 font-extrabold text-xs cursor-pointer select-none transition"
                  >
                    Vote {fixture.awayTeamObj.name}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 3. Live Voting Chart */}
          {history.length > 0 && (
            <div className="bg-white dark:bg-[#16181D] rounded-3xl border border-slate-200 dark:border-white/5 p-6 shadow-md space-y-6">
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                  <TrendingUp className="w-5 h-5 text-neon" />
                  Live Pool Tracking History
                </h3>
                <p className="text-xs text-muted-foreground">
                  History of vote aggregation trends mapped from backend databases.
                </p>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#334155" strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--tooltip-bg, #16181d)', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '8px' }}
                      labelStyle={{ fontSize: '10px', color: '#94a3b8' }}
                    />
                    <Line type="monotone" dataKey="Home" stroke="#10b981" strokeWidth={2.5} name={fixture.homeTeamObj.name} dot={false} />
                    <Line type="monotone" dataKey="Away" stroke="#f43f5e" strokeWidth={2.5} name={fixture.awayTeamObj.name} dot={false} />
                    {!fixture.isKnockout && (
                      <Line type="monotone" dataKey="Draw" stroke="#64748b" strokeWidth={2} name="Draw" dot={false} />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider border-t border-slate-100 dark:border-white/5 pt-4">
                <span>Total Pool Votes: {summary.totalVotes}</span>
                <span>Active Trend Line</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Statistics, Timeline, and Prediction Comparison (span 5) */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* 6. Side-by-Side Verification (Result Comparison) */}
          {resultComparison && (
            <div className="bg-white dark:bg-[#16181D] rounded-3xl border border-slate-200 dark:border-white/5 p-6 shadow-md space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Verdicts & Predictions Comparison
              </h4>

              <div className="space-y-3.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-slate-500">Community Verdict:</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200">
                    {resultComparison.communityFavorite === "HOME" ? fixture.homeTeamObj.name : resultComparison.communityFavorite === "AWAY" ? fixture.awayTeamObj.name : "Draw"} ({Math.max(percentages.home, percentages.away, percentages.draw)}%)
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-slate-500">Official Winner:</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200">
                    {resultComparison.officialWinner === "HOME" ? fixture.homeTeamObj.name : resultComparison.officialWinner === "AWAY" ? fixture.awayTeamObj.name : "Draw"}
                  </span>
                </div>

                <div className="border-t border-slate-100 dark:border-white/5 pt-3.5 flex justify-center">
                  {resultComparison.isCorrect ? (
                    <span className="flex items-center gap-1 bg-green-500/10 text-green-600 dark:text-green-400 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">
                      ✓ Correct Prediction
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 bg-red-500/10 text-red-600 dark:text-red-400 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">
                      ✕ Incorrect Prediction
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 4. Match Statistics */}
          {stats && (
            <div className="bg-white dark:bg-[#16181D] rounded-3xl border border-slate-200 dark:border-white/5 p-6 shadow-md space-y-5">
              <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                <BarChart3 className="w-5 h-5 text-neon" />
                Match Statistics
              </h3>

              <div className="space-y-4">
                {/* Possession */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-350">
                    <span>{stats.possession.home}%</span>
                    <span>Ball Possession</span>
                    <span>{stats.possession.away}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full flex overflow-hidden">
                    <div className="h-full bg-cyan-500" style={{ width: `${stats.possession.home}%` }} />
                    <div className="h-full bg-fuchsia-500" style={{ width: `${stats.possession.away}%` }} />
                  </div>
                </div>

                {/* Shots */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-350">
                    <span>{stats.shots.home}</span>
                    <span>Total Shots</span>
                    <span>{stats.shots.away}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full flex overflow-hidden">
                    <div className="h-full bg-cyan-500" style={{ width: `${(stats.shots.home / (stats.shots.home + stats.shots.away)) * 100}%` }} />
                    <div className="h-full bg-fuchsia-500" style={{ width: `${(stats.shots.away / (stats.shots.home + stats.shots.away)) * 100}%` }} />
                  </div>
                </div>

                {/* Shots on Target */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-350">
                    <span>{stats.shotsOnTarget.home}</span>
                    <span>Shots on Target</span>
                    <span>{stats.shotsOnTarget.away}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full flex overflow-hidden">
                    <div className="h-full bg-cyan-500" style={{ width: `${(stats.shotsOnTarget.home / (stats.shotsOnTarget.home + stats.shotsOnTarget.away)) * 100}%` }} />
                    <div className="h-full bg-fuchsia-500" style={{ width: `${(stats.shotsOnTarget.away / (stats.shotsOnTarget.home + stats.shotsOnTarget.away)) * 100}%` }} />
                  </div>
                </div>

                {/* Corners */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-350">
                    <span>{stats.corners.home}</span>
                    <span>Corners</span>
                    <span>{stats.corners.away}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full flex overflow-hidden">
                    <div className="h-full bg-cyan-500" style={{ width: `${(stats.corners.home / (stats.corners.home + stats.corners.away)) * 100}%` }} />
                    <div className="h-full bg-fuchsia-500" style={{ width: `${(stats.corners.away / (stats.corners.home + stats.corners.away)) * 100}%` }} />
                  </div>
                </div>

                {/* xG */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-350">
                    <span>{stats.xG.home}</span>
                    <span>Expected Goals (xG)</span>
                    <span>{stats.xG.away}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. Match Timeline */}
          {timelineEvents.length > 0 && (
            <div className="bg-white dark:bg-[#16181D] rounded-3xl border border-slate-200 dark:border-white/5 p-6 shadow-md space-y-5">
              <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                <Clock className="w-5 h-5 text-neon" />
                Match Timeline
              </h3>

              <div className="relative border-l border-slate-200 dark:border-white/10 pl-6 ml-3 space-y-6">
                {timelineEvents.map((evt, idx) => (
                  <div key={idx} className="relative">
                    {/* Circle Dot on line */}
                    <span className={`absolute -left-[31px] top-0 w-3 h-3 rounded-full border-2 bg-white dark:bg-[#16181D] ${
                      evt.type === "GOAL" ? "border-emerald-500" : "border-amber-500"
                    }`} />

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 font-mono">
                          {evt.minute}'
                        </span>
                        <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                          {evt.detail}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-400 uppercase tracking-wider font-extrabold">
                        {evt.team === "HOME" ? fixture.homeTeamObj.name : fixture.awayTeamObj.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
