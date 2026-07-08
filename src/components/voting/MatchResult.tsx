"use client";

import { FixtureView } from "@/services/fixturesService";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { format } from "date-fns";
import { useFixturesStore } from "@/stores/useFixturesStore";
import { Trophy, Info } from "lucide-react";

interface MatchResultProps {
  fixture: FixtureView;
}

export function MatchResult({ fixture }: MatchResultProps) {
  const isCompleted = fixture.status === "COMPLETED";
  const hs = parseInt(fixture.homeScore, 10);
  const as = parseInt(fixture.awayScore, 10);
  const allFixtures = useFixturesStore((state) => state.fixtures);

  const homeWonReal = isCompleted && !isNaN(hs) && !isNaN(as) && hs > as;
  const awayWonReal = isCompleted && !isNaN(hs) && !isNaN(as) && as > hs;
  const isDrawScore = isCompleted && !isNaN(hs) && !isNaN(as) && hs === as;

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
 
  // Determine official winner
  let officialWinnerCode = "";
  let officialWinnerName = "";
  let officialWinnerFlag = "";
  if (homeWon) {
    officialWinnerCode = fixture.homeTeamObj.code;
    officialWinnerName = fixture.homeTeamObj.name;
    officialWinnerFlag = fixture.homeTeamObj.flag;
  } else if (awayWon) {
    officialWinnerCode = fixture.awayTeamObj.code;
    officialWinnerName = fixture.awayTeamObj.name;
    officialWinnerFlag = fixture.awayTeamObj.flag;
  }
 
  return (
    <div className="bg-white dark:bg-[#16181D] rounded-3xl border border-slate-200 dark:border-white/5 p-6 shadow-md space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-4">
        <div>
          <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-widest">
            {fixture.stageName} Match Result
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
 
      <div className="max-w-md mx-auto bg-slate-50 dark:bg-white/[0.01] border border-slate-250/20 dark:border-white/5 rounded-2xl p-5 flex flex-col justify-between space-y-4">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1 justify-center">
          <Info className="w-3.5 h-3.5" /> Official Scoreline
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
 
        <div className="bg-emerald-500/5 dark:bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 text-center flex flex-col justify-center items-center space-y-1">
          <div className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1 justify-center">
            <Trophy className="w-3.5 h-3.5 text-amber-500 animate-bounce" /> Winner
          </div>
          {isDraw ? (
            <span className="text-xs font-black text-slate-800 dark:text-white">Draw</span>
          ) : (
            <div className="flex items-center gap-2 justify-center">
              <CountryFlag
                code={officialWinnerCode}
                flag={officialWinnerFlag}
                name={officialWinnerName}
                className="h-4 w-6 rounded shadow-xs"
                emojiClassName="text-sm"
              />
              <span className="text-xs font-black text-slate-800 dark:text-white">
                {officialWinnerName}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
