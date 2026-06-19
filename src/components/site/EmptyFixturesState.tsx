"use client";

import React from "react";
import { RefreshCw } from "lucide-react";

interface EmptyFixturesStateProps {
  onReset: () => void;
}

export function EmptyFixturesState({ onReset }: EmptyFixturesStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center select-none">
      {/* SVG Container holding the user-provided Footballer SVG */}
      <div className="relative w-full max-w-md h-56 flex items-center justify-center mb-6 px-4">
        <img
          src="/lottie/Footballer.svg"
          alt="Footballer"
          className="w-full h-full object-contain select-none pointer-events-none drop-shadow-[0_8px_16px_rgba(139,92,246,0.06)] dark:drop-shadow-[0_8px_24px_rgba(139,92,246,0.12)]"
        />
      </div>

      {/* Title */}
      <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white mb-2">
        No Matchups Found
      </h3>

      {/* Description */}
      <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mb-6 leading-relaxed">
        We couldn't find any fixtures matching your current filters. Try adjusting your selections or reset filters to browse the schedule.
      </p>

      {/* Reset Button */}
      <button
        onClick={onReset}
        className="inline-flex items-center gap-2 px-4.5 py-2 text-xs font-semibold rounded-xl text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 shadow-md shadow-violet-500/25 dark:shadow-none hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        <span>Reset All Filters</span>
      </button>
    </div>
  );
}
