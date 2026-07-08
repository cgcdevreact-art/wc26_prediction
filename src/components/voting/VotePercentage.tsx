"use client";

import { useEffect, useState } from "react";

interface VotePercentageProps {
  homeProb: number;
  awayProb: number;
  homeCode: string;
  awayCode: string;
  isAuthenticated?: boolean;
  hasVoted?: boolean;
}

export function VotePercentage({ 
  homeProb, 
  awayProb, 
  homeCode, 
  awayCode, 
  isAuthenticated = true,
  hasVoted = true
}: VotePercentageProps) {
  const [animatedHome, setAnimatedHome] = useState(50);

  const showResults = isAuthenticated && hasVoted;

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedHome(showResults ? homeProb : 50);
    }, 100);
    return () => clearTimeout(timer);
  }, [homeProb, showResults]);

  const animatedAway = 100 - animatedHome;

  return (
    <div className="w-full space-y-1.5">
      {/* Percentage Numbers */}
      <div className="flex justify-between text-[11px] font-black tracking-wider text-slate-450 dark:text-slate-500">
        <span className={showResults ? "text-green-500 font-mono" : "font-mono opacity-80"}>
          {homeCode} {showResults ? `${Math.round(animatedHome)}%` : "?%"}
        </span>
        <span className={showResults ? "text-red-500 font-mono" : "font-mono opacity-80"}>
          {showResults ? `${Math.round(animatedAway)}%` : "?%"} {awayCode}
        </span>
      </div>

      {/* Progress Bar Track */}
      {showResults ? (
        <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-700 ease-out"
            style={{ width: `${animatedHome}%` }}
          />
          <div
            className="h-full bg-gradient-to-r from-red-400 to-rose-600 transition-all duration-700 ease-out"
            style={{ width: `${animatedAway}%` }}
          />
        </div>
      ) : (
        <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden flex">
          <div className="h-full w-full bg-slate-200 dark:bg-white/10" />
        </div>
      )}
    </div>
  );
}
