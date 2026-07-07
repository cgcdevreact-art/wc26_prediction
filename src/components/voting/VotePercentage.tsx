"use client";

import { useEffect, useState } from "react";

interface VotePercentageProps {
  homeProb: number;
  awayProb: number;
  homeCode: string;
  awayCode: string;
  isAuthenticated?: boolean;
}

export function VotePercentage({ homeProb, awayProb, homeCode, awayCode, isAuthenticated = true }: VotePercentageProps) {
  const [animatedHome, setAnimatedHome] = useState(50);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedHome(isAuthenticated ? homeProb : 50);
    }, 100);
    return () => clearTimeout(timer);
  }, [homeProb, isAuthenticated]);

  const animatedAway = 100 - animatedHome;

  return (
    <div className="w-full space-y-1.5">
      {/* Percentage Numbers */}
      <div className="flex justify-between text-[11px] font-black tracking-wider text-slate-400">
        <span className="text-green-500 font-mono">
          {homeCode} {isAuthenticated ? `${Math.round(animatedHome)}%` : "-%"}
        </span>
        <span className="text-red-500 font-mono">
          {isAuthenticated ? `${Math.round(animatedAway)}%` : "-%"} {awayCode}
        </span>
      </div>

      {/* Progress Bar Track */}
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
    </div>
  );
}
