"use client";

import { useVotingStore } from "@/stores/useVotingStore";
import { useFixturesStore } from "@/stores/useFixturesStore";
import { FixtureView } from "@/services/fixturesService";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { CountdownTimer } from "./CountdownTimer";
import { VotePercentage } from "./VotePercentage";
import { format } from "date-fns";
import { Check, CheckCircle2, Loader2, Trophy } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";

interface VotingCardProps {
  fixture: FixtureView;
}

export function VotingCard({ fixture }: VotingCardProps) {
  const router = useRouter();
  const matchId = String(fixture.match_no);
  const { data: session } = useSession();

  // Real stats from the unified predictions system
  const [stats, setStats] = useState({
    homeProb: fixture.predictions?.homePercent || 50,
    awayProb: fixture.predictions?.awayPercent || 50,
    drawProb: 0,
    totalVotes: fixture.predictions?.totalVotes || 0
  });
  const [userVote, setUserVote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [confirmChoice, setConfirmChoice] = useState<"HOME" | "AWAY" | null>(null);

  const fetchUserPrediction = async () => {
    try {
      const res = await fetch(`/api/matches/${matchId}/predict`);
      const data = await res.json();
      if (data.success) {
        if (data.prediction) {
          setUserVote(data.prediction.predictedOutcome);
        }
        if (data.predictionsSummary) {
          setStats({
            homeProb: data.predictionsSummary.homePercent,
            awayProb: data.predictionsSummary.awayPercent,
            drawProb: 0,
            totalVotes: data.predictionsSummary.totalVotes
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserPrediction();
  }, [matchId]);

  const handleVoteClick = async (e: React.MouseEvent, selection: "HOME" | "AWAY") => {
    e.stopPropagation(); // Prevent navigating to detail page
    if (!session) {
      toast.error("Please sign in to cast your prediction!");
      return;
    }
    if (voting || userVote) return;
    setVoting(true);

    // Optimistic UI updates
    const prevStats = { ...stats };
    const newTotal = stats.totalVotes + 1;
    let newHome = stats.homeProb;
    let newAway = stats.awayProb;

    if (selection === "HOME") {
      newHome = Math.round((stats.homeProb * stats.totalVotes + 100) / newTotal);
      newAway = 100 - newHome;
    } else if (selection === "AWAY") {
      newAway = Math.round((stats.awayProb * stats.totalVotes + 100) / newTotal);
      newHome = 100 - newAway;
    }

    setStats({
      homeProb: newHome,
      awayProb: newAway,
      drawProb: 0,
      totalVotes: newTotal
    });
    setUserVote(selection);

    try {
      const res = await fetch(`/api/matches/${matchId}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prediction: selection })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed");
      }

      // Update with exact server values if provided
      if (data.predictionsSummary) {
        setStats({
          homeProb: data.predictionsSummary.homePercent,
          awayProb: data.predictionsSummary.awayPercent,
          drawProb: 0,
          totalVotes: data.predictionsSummary.totalVotes
        });
      }

      // Redirect to the detail page immediately after successful vote!
      router.push(`/world-cup/match/${matchId}`);
    } catch (err) {
      console.error(err);
      // rollback
      setStats(prevStats);
      setUserVote(null);
    } finally {
      setVoting(false);
    }
  };

  const handleCardClick = () => {
    router.push(`/world-cup/match/${matchId}`);
  };

  const allFixtures = useFixturesStore((state) => state.fixtures);
  const isCompleted = fixture.status === "COMPLETED";
  const homeScoreVal = parseInt(fixture.homeScore, 10);
  const awayScoreVal = parseInt(fixture.awayScore, 10);

  const homeWonReal = isCompleted && !isNaN(homeScoreVal) && !isNaN(awayScoreVal) && homeScoreVal > awayScoreVal;
  const awayWonReal = isCompleted && !isNaN(homeScoreVal) && !isNaN(awayScoreVal) && awayScoreVal > homeScoreVal;
  const isDrawScore = isCompleted && !isNaN(homeScoreVal) && !isNaN(awayScoreVal) && homeScoreVal === awayScoreVal;

  let homeWon = homeWonReal;
  let awayWon = awayWonReal;
  let isDraw = isDrawScore;

  if (isDrawScore && fixture.isKnockout && allFixtures.length > 0) {
    const homeCode = fixture.homeTeamObj.code;
    const awayCode = fixture.awayTeamObj.code;
    const homeQualified = allFixtures.some(f => 
      f.match_no > fixture.match_no && 
      (f.homeTeamObj.code === homeCode || f.awayTeamObj.code === homeCode)
    );
    const awayQualified = allFixtures.some(f => 
      f.match_no > fixture.match_no && 
      (f.homeTeamObj.code === awayCode || f.awayTeamObj.code === awayCode)
    );

    if (homeQualified && !awayQualified) {
      homeWon = true;
      isDraw = false;
    } else if (awayQualified && !homeQualified) {
      awayWon = true;
      isDraw = false;
    }
  }

  const winnerName = homeWon ? fixture.homeTeamObj.name : awayWon ? fixture.awayTeamObj.name : "Draw";
  const winnerFlag = homeWon ? fixture.homeTeamObj.flag : awayWon ? fixture.awayTeamObj.flag : null;
  const winnerCode = homeWon ? fixture.homeTeamObj.code : awayWon ? fixture.awayTeamObj.code : null;

  const isPlaceholderHome = !fixture.homeTeamObj.code || fixture.homeTeamObj.code === "TBD" || fixture.homeTeamObj.name.toLowerCase().includes("winner") || fixture.homeTeamObj.name.toLowerCase().includes("runner");
  const isPlaceholderAway = !fixture.awayTeamObj.code || fixture.awayTeamObj.code === "TBD" || fixture.awayTeamObj.name.toLowerCase().includes("winner") || fixture.awayTeamObj.name.toLowerCase().includes("runner");
  const teamsNotAssigned = isPlaceholderHome || isPlaceholderAway;

  return (
    <div
      onClick={handleCardClick}
      className="min-w-[280px] self-stretch md:min-w-[320px] bg-white dark:bg-[#16181D] rounded-2xl border border-slate-200 dark:border-white/5 p-5 shadow-lg flex h-full min-h-[360px] flex-col justify-between hover:shadow-xl hover:border-slate-300/80 dark:hover:border-white/10 transition-all duration-300 cursor-pointer select-none"
    >
      <div className="space-y-4 flex-grow flex flex-col justify-between">
        {/* Top stage info */}
        <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          <span>{fixture.stageName}</span>
          {isCompleted ? (
            <span className="bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
              Determined
            </span>
          ) : (
            <CountdownTimer kickoffAtIso={fixture.kickoffAtIso} status={fixture.status} />
          )}
        </div>

        {/* Matchup row */}
        <div className="flex justify-between items-center gap-3">
          {/* Home Team */}
          <div className={`flex-1 flex flex-col items-center text-center space-y-1.5 transition-opacity ${isCompleted && !homeWon && !isDraw ? "opacity-40" : ""
            }`}>
            <div className="relative">
              <CountryFlag
                code={fixture.homeTeamObj.code}
                flag={fixture.homeTeamObj.flag}
                name={fixture.homeTeamObj.name}
                className="h-10 w-14 rounded shadow-md border border-slate-100 dark:border-white/10"
                emojiClassName="text-3xl"
              />
              {homeWon && (
                <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white rounded-full p-0.5 border border-white dark:border-[#16181D]">
                  <Check className="w-2.5 h-2.5 stroke-[4]" />
                </span>
              )}
            </div>
            <span className={`text-xs font-extrabold text-slate-800 dark:text-slate-200 line-clamp-1 ${homeWon ? "text-emerald-500 dark:text-emerald-400" : ""
              }`}>
              {fixture.homeTeamObj.name}
            </span>
          </div>

          {/* VS Indicator */}
          <div className="flex flex-col items-center px-2">
            {isCompleted ? (
              <span className="font-mono text-sm font-black text-slate-500 dark:text-slate-400">
                {fixture.homeScore} - {fixture.awayScore}
              </span>
            ) : (
              <span className="text-xs uppercase font-extrabold text-slate-350 dark:text-slate-650 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 px-2 py-0.5 rounded-lg">
                VS
              </span>
            )}
          </div>

          {/* Away Team */}
          <div className={`flex-1 flex flex-col items-center text-center space-y-1.5 transition-opacity ${isCompleted && !awayWon && !isDraw ? "opacity-40" : ""
            }`}>
            <div className="relative">
              <CountryFlag
                code={fixture.awayTeamObj.code}
                flag={fixture.awayTeamObj.flag}
                name={fixture.awayTeamObj.name}
                className="h-10 w-14 rounded shadow-md border border-slate-100 dark:border-white/10"
                emojiClassName="text-3xl"
              />
              {awayWon && (
                <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white rounded-full p-0.5 border border-white dark:border-[#16181D]">
                  <Check className="w-2.5 h-2.5 stroke-[4]" />
                </span>
              )}
            </div>
            <span className={`text-xs font-extrabold text-slate-800 dark:text-slate-200 line-clamp-1 ${awayWon ? "text-emerald-500 dark:text-emerald-400" : ""
              }`}>
              {fixture.awayTeamObj.name}
            </span>
          </div>
        </div>

        {userVote && !isCompleted && (
          <div className="bg-slate-50 dark:bg-white/[0.02] p-4 rounded-2xl border border-slate-200 dark:border-white/5 space-y-4 w-full">
            <div className="flex items-center gap-2 text-[10px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">
              <CheckCircle2 className="w-4.5 h-4.5" />
              <span>✔ Predicted {userVote === "HOME" ? fixture.homeTeamObj.name : fixture.awayTeamObj.name}</span>
            </div>

            <div className="space-y-3 text-[11px] font-bold">
              {/* Home Team Row */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-800 dark:text-slate-300">
                  <span>{fixture.homeTeamObj.name}</span>
                  <span className="font-mono">{stats.homeProb}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${stats.homeProb}%` }}
                  />
                </div>
              </div>

              {/* Away Team Row */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-800 dark:text-slate-300">
                  <span>{fixture.awayTeamObj.name}</span>
                  <span className="font-mono">{stats.awayProb}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 transition-all duration-500"
                    style={{ width: `${stats.awayProb}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase tracking-wider">
              <span>Confidence: {Math.abs(stats.homeProb - stats.awayProb)}%</span>
              <span>Total Votes: {stats.totalVotes}</span>
            </div>
          </div>
        )}

        {/* Date and Location */}
        <div className="text-[10px] text-slate-450 dark:text-slate-500 font-medium text-center">
          {fixture.date ? format(new Date(fixture.date), "MMM d, yyyy") : "Date TBD"} • {fixture.venue}
        </div>
      </div>

      {/* Voting Controls */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 w-full">
        {loading ? (
          <div className="h-10 flex justify-center items-center">
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          </div>
        ) : teamsNotAssigned ? (
          <div className="bg-slate-50 dark:bg-white/[0.02] p-3 rounded-xl border border-slate-100 dark:border-white/5 text-center flex flex-col justify-center items-center h-[142px] space-y-1">
            <div className="text-[10px] font-black text-slate-500 dark:text-slate-450 uppercase tracking-widest">
              Voting Not Yet Started
            </div>
            <div className="text-[9px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed max-w-[200px]">
              Competing teams are not yet determined. Voting opens once participants are locked.
            </div>
          </div>
        ) : !isCompleted ? (
          <div className="space-y-3">
            {userVote ? (
              <div className="flex items-center gap-1.5 text-[10px] font-black text-green-500 uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" />
                <span>✔ You voted for {userVote === "HOME" ? fixture.homeTeamObj.name : fixture.awayTeamObj.name}</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-[10px] font-black uppercase text-slate-400 text-center tracking-wider">
                  Will {fixture.homeTeamObj.code} win?
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!session) {
                        toast.error("Please sign in to cast your prediction!");
                        return;
                      }
                      setConfirmChoice("HOME");
                    }}
                    className="flex-1 py-2 px-4 rounded-full border border-emerald-500/25 dark:border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 dark:hover:bg-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-black cursor-pointer transition select-none flex items-center justify-center gap-1.5"
                  >
                    <span>Yes</span>
                    <CountryFlag
                      code={fixture.homeTeamObj.code}
                      flag={fixture.homeTeamObj.flag}
                      name={fixture.homeTeamObj.name}
                      className="h-3.5 w-5 rounded-sm object-cover"
                      emojiClassName="text-[11px]"
                    />
                    <span>({fixture.homeTeamObj.code})</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!session) {
                        toast.error("Please sign in to cast your prediction!");
                        return;
                      }
                      setConfirmChoice("AWAY");
                    }}
                    className="flex-1 py-2 px-4 rounded-full border border-rose-500/25 dark:border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 dark:hover:bg-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-black cursor-pointer transition select-none flex items-center justify-center gap-1.5"
                  >
                    <span>No</span>
                    <CountryFlag
                      code={fixture.awayTeamObj.code}
                      flag={fixture.awayTeamObj.flag}
                      name={fixture.awayTeamObj.name}
                      className="h-3.5 w-5 rounded-sm object-cover"
                      emojiClassName="text-[11px]"
                    />
                    <span>({fixture.awayTeamObj.code})</span>
                  </button>
                </div>
              </div>
            )}

            <VotePercentage
              homeProb={stats.homeProb}
              awayProb={stats.awayProb}
              homeCode={fixture.homeTeamObj.code}
              awayCode={fixture.awayTeamObj.code}
              isAuthenticated={!!session}
              hasVoted={!!userVote}
            />
            <div className={`text-[9px] font-bold text-slate-400 uppercase text-center transition-opacity duration-300 ${!userVote ? "opacity-45" : ""}`}>
              {userVote ? `${stats.totalVotes} Votes Cast` : "- Votes Cast"}
            </div>
          </div>
        ) : (
          <div className="bg-emerald-500/5 dark:bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20 text-center flex flex-col justify-center items-center h-[90px] space-y-1">
            <div className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1 justify-center">
              <Trophy className="w-3 h-3 text-amber-500" /> Winner
            </div>
            {isDraw ? (
              <span className="text-xs font-black text-slate-800 dark:text-white">Draw</span>
            ) : (
              <div className="flex items-center gap-2 justify-center">
                <CountryFlag
                  code={winnerCode || ""}
                  flag={winnerFlag || ""}
                  name={winnerName || ""}
                  className="h-4 w-6 rounded shadow-xs"
                  emojiClassName="text-sm"
                />
                <span className="text-xs font-black text-slate-800 dark:text-white">
                  {winnerName}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
      {confirmChoice && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setConfirmChoice(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 cursor-default"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#16181D] rounded-3xl border border-slate-200 dark:border-white/5 p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 cursor-default"
          >
            <h3 className="font-display font-black text-base text-slate-800 dark:text-white">Confirm Prediction</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium text-left">
              Are you sure you want to predict that <strong>{confirmChoice === "HOME" ? fixture.homeTeamObj.name : fixture.awayTeamObj.name}</strong> will win? This action cannot be undone.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmChoice(null);
                }}
                className="flex-1 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-500 dark:text-slate-450 cursor-pointer transition select-none"
              >
                Cancel
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleVoteClick(e, confirmChoice);
                  setConfirmChoice(null);
                }}
                className="flex-1 py-2 text-xs font-black rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-950 cursor-pointer transition shadow-md select-none"
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
