"use client";

import { FixtureView } from "@/services/fixturesService";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { format } from "date-fns";
import { MapPin, Calendar, Clock } from "lucide-react";

interface FixtureCardProps {
  fixture: FixtureView;
}

export function FixtureCard({ fixture }: FixtureCardProps) {
  const isLive = fixture.status === "LIVE";
  const isCompleted = fixture.status === "COMPLETED";

  return (
    <div className={`bg-white dark:bg-[#16181D] rounded-2xl border p-5 shadow-sm transition-all duration-300 ${
      isLive ? "border-red-500 bg-red-500/[0.01] shadow-[0_4px_20px_rgba(239,68,68,0.08)]" : "border-slate-200 dark:border-white/5"
    }`}>
      {/* Top Details */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-[10px] bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider">
          {fixture.stageName} {fixture.group ? `• Group ${fixture.group}` : ""}
        </span>
        {isLive ? (
          <span className="text-[9px] uppercase tracking-wider font-extrabold text-red-500 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
            LIVE {fixture.time_elapsed}'
          </span>
        ) : isCompleted ? (
          <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">
            Full Time
          </span>
        ) : (
          <span className="text-[9px] uppercase tracking-wider font-extrabold text-cyan-600 dark:text-neon">
            Upcoming
          </span>
        )}
      </div>

      {/* Matchup Teams */}
      <div className="flex items-center justify-between gap-4 py-2">
        {/* Home Team */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <CountryFlag
            code={fixture.homeTeamObj.code}
            flag={fixture.homeTeamObj.flag}
            name={fixture.homeTeamObj.name}
            className="h-6 w-9 rounded object-cover shadow-sm shrink-0"
            emojiClassName="text-xl"
          />
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
            {fixture.homeTeamObj.name}
          </span>
        </div>

        {/* Score */}
        <div className="text-base font-black shrink-0 font-mono px-3 py-1 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-slate-700 dark:text-slate-300">
          {isCompleted || isLive ? `${fixture.homeScore} - ${fixture.awayScore}` : "vs"}
        </div>

        {/* Away Team */}
        <div className="flex items-center gap-3 flex-1 min-w-0 justify-end text-right">
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
            {fixture.awayTeamObj.name}
          </span>
          <CountryFlag
            code={fixture.awayTeamObj.code}
            flag={fixture.awayTeamObj.flag}
            name={fixture.awayTeamObj.name}
            className="h-6 w-9 rounded object-cover shadow-sm shrink-0"
            emojiClassName="text-xl"
          />
        </div>
      </div>

      {/* Stadium / Kickoff date details */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-white/5 grid grid-cols-2 gap-2 text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider">
        <div className="flex items-center gap-1.5 min-w-0">
          <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{fixture.venue}, {fixture.city}</span>
        </div>
        <div className="flex items-center gap-1.5 min-w-0 justify-end">
          <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          <span className="truncate">
            {fixture.date ? format(new Date(fixture.date), "MMM d, yyyy") : "Date TBD"}
          </span>
        </div>
      </div>
    </div>
  );
}
