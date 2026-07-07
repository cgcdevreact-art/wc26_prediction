"use client";

import { FixtureView } from "@/services/fixturesService";
import { useVotingStore } from "@/stores/useVotingStore";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { VotePercentage } from "./VotePercentage";
import { format } from "date-fns";
import { Trophy, TrendingUp, Info } from "lucide-react";

interface MatchResultProps {
  fixture: FixtureView;
}

export function MatchResult({ fixture }: MatchResultProps) {
  const matchId = String(fixture.match_no);
  const stats = useVotingStore((state) => state.matchStats[matchId]) || {
    homeProb: 50,
    awayProb: 50,
    totalVotes: 0
  };

  const isCompleted = fixture.status === "COMPLETED";
  const hs = parseInt(fixture.homeScore, 10);
  const as = parseInt(fixture.awayScore, 10);

  // Determine official winner
  let officialWinnerCode = "";
  if (isCompleted && !isNaN(hs) && !isNaN(as)) {
    if (hs > as) {
      officialWinnerCode = fixture.homeTeamObj.code;
    } else if (hs < as) {
      officialWinnerCode = fixture.awayTeamObj.code;
    }
  }

  // Determine community voted favorite
  const communityWinnerCode = stats.homeProb > stats.awayProb 
    ? fixture.homeTeamObj.code 
    : stats.homeProb < stats.awayProb 
      ? fixture.awayTeamObj.code 
      : "";

  const isCommunityCorrect = officialWinnerCode && communityWinnerCode && officialWinnerCode === communityWinnerCode;

  return (
    <div className="bg-white dark:bg-[#16181D] rounded-3xl border border-slate-200 dark:border-white/5 p-6 shadow-md space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-4">
        <div>
          <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-widest">
            {fixture.stageName} Result & Community Verdict
          </h4>
          <p className="text-[10px] text-slate-500 font-medium">
            {fixture.date ? format(new Date(fixture.date), "MMMM d, yyyy") : "Date TBD"} • {fixture.venue}
          </p>
        </div>
        <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-xl">
          <Trophy className="w-3.5 h-3.5" />
          <span>Completed</span>
        </span>
      </div>

      {/* Side-by-Side Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* Left Box: Official Scoreline */}
        <div className="bg-slate-50 dark:bg-white/[0.01] border border-slate-250/20 dark:border-white/5 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Info className="w-3.5 h-3.5" /> Official Result
          </span>

          <div className="flex justify-center items-center gap-4 py-2">
            {/* Team A */}
            <div className="flex-1 flex flex-col items-center text-center space-y-1">
              <CountryFlag code={fixture.homeTeamObj.code} flag={fixture.homeTeamObj.flag} name={fixture.homeTeamObj.name} className="h-8 w-11 rounded" />
              <span className="text-xs font-bold truncate max-w-[80px]">{fixture.homeTeamObj.name}</span>
            </div>

            {/* Score box */}
            <div className="text-2xl font-black font-mono tracking-tight text-slate-800 dark:text-white px-4 py-1.5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 shadow-sm">
              {fixture.homeScore} - {fixture.awayScore}
            </div>

            {/* Team B */}
            <div className="flex-1 flex flex-col items-center text-center space-y-1">
              <CountryFlag code={fixture.awayTeamObj.code} flag={fixture.awayTeamObj.flag} name={fixture.awayTeamObj.name} className="h-8 w-11 rounded" />
              <span className="text-xs font-bold truncate max-w-[80px]">{fixture.awayTeamObj.name}</span>
            </div>
          </div>

          <div className="text-center text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase">
            {officialWinnerCode ? `${officialWinnerCode} Won` : "Draw"}
          </div>
        </div>

        {/* Right Box: Community Poll Verdict */}
        <div className="bg-slate-50 dark:bg-white/[0.01] border border-slate-250/20 dark:border-white/5 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Community Sentiment
          </span>

          <VotePercentage
            homeProb={stats.homeProb}
            awayProb={stats.awayProb}
            homeCode={fixture.homeTeamObj.code}
            awayCode={fixture.awayTeamObj.code}
          />

          <div className="flex justify-between items-center text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase pt-2">
            <span>{stats.totalVotes} votes cast</span>
            {isCommunityCorrect ? (
              <span className="text-green-500 font-extrabold animate-pulse">Community Predicted Correctly!</span>
            ) : (
              <span className="text-rose-500 font-extrabold">Upsets / Predicted Wrong</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
