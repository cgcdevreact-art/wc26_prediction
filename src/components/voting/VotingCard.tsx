"use client";

import { useVotingStore } from "@/stores/useVotingStore";
import { FixtureView } from "@/services/fixturesService";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { CountdownTimer } from "./CountdownTimer";
import { VotePercentage } from "./VotePercentage";
import { format } from "date-fns";
import { CheckCircle2, Loader2 } from "lucide-react";
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

  const isCompleted = fixture.status === "COMPLETED";

  return (
    <div 
      onClick={handleCardClick}
      className="min-w-[280px] md:min-w-[320px] bg-white dark:bg-[#16181D] rounded-2xl border border-slate-200 dark:border-white/5 p-5 shadow-lg space-y-4 hover:shadow-xl hover:border-slate-300/80 dark:hover:border-white/10 transition-all duration-300 cursor-pointer select-none"
    >
      {/* Top stage info */}
      <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
        <span>{fixture.stageName}</span>
        <CountdownTimer kickoffAtIso={fixture.kickoffAtIso} status={fixture.status} />
      </div>

      {/* Matchup row */}
      <div className="flex justify-between items-center gap-3">
        {/* Home Team */}
        <div className="flex-1 flex flex-col items-center text-center space-y-1.5">
          <CountryFlag
            code={fixture.homeTeamObj.code}
            flag={fixture.homeTeamObj.flag}
            name={fixture.homeTeamObj.name}
            className="h-10 w-14 rounded shadow-md border border-slate-100 dark:border-white/10"
            emojiClassName="text-3xl"
          />
          <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 line-clamp-1">
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
        <div className="flex-1 flex flex-col items-center text-center space-y-1.5">
          <CountryFlag
            code={fixture.awayTeamObj.code}
            flag={fixture.awayTeamObj.flag}
            name={fixture.awayTeamObj.name}
            className="h-10 w-14 rounded shadow-md border border-slate-100 dark:border-white/10"
            emojiClassName="text-3xl"
          />
          <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 line-clamp-1">
            {fixture.awayTeamObj.name}
          </span>
        </div>
      </div>

      {/* Date and Location */}
      <div className="text-[10px] text-slate-450 dark:text-slate-500 font-medium text-center">
        {fixture.date ? format(new Date(fixture.date), "MMM d, yyyy") : "Date TBD"} • {fixture.venue}
      </div>

      {/* Voting Controls */}
      {loading ? (
        <div className="h-10 flex justify-center items-center">
          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
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
                  className="flex-1 py-1.5 rounded-xl border border-slate-200 dark:border-white/5 text-[10px] font-extrabold cursor-pointer transition bg-green-500/10 hover:bg-green-500/20 border-green-500/20 text-green-600 dark:text-green-400 flex items-center justify-center gap-1.5"
                >
                  <span>Yes</span>
                  <CountryFlag
                    code={fixture.homeTeamObj.code}
                    flag={fixture.homeTeamObj.flag}
                    name={fixture.homeTeamObj.name}
                    className="h-3 w-4 rounded-sm object-cover border border-emerald-500/10"
                    emojiClassName="text-[10px]"
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
                  className="flex-1 py-1.5 rounded-xl border border-slate-200 dark:border-white/5 text-[10px] font-extrabold cursor-pointer transition bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-650 dark:text-red-400 flex items-center justify-center gap-1.5"
                >
                  <span>No</span>
                  <CountryFlag
                    code={fixture.awayTeamObj.code}
                    flag={fixture.awayTeamObj.flag}
                    name={fixture.awayTeamObj.name}
                    className="h-3 w-4 rounded-sm object-cover border border-rose-500/10"
                    emojiClassName="text-[10px]"
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
          />
          <div className="text-[9px] font-bold text-slate-400 uppercase text-center">
            {stats.totalVotes} Votes Cast
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 dark:bg-white/[0.02] p-2.5 rounded-xl border border-slate-100 dark:border-white/5 space-y-1.5">
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            <span>Official Result</span>
            <span className="font-mono text-emerald-500 font-black">Final Score</span>
          </div>
          <VotePercentage
            homeProb={stats.homeProb}
            awayProb={stats.awayProb}
            homeCode={fixture.homeTeamObj.code}
            awayCode={fixture.awayTeamObj.code}
            isAuthenticated={!!session}
          />
          <div className="text-[9px] font-bold text-slate-400 uppercase text-center">
            {stats.totalVotes} Votes Cast
          </div>
        </div>
      )}
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
