"use client";

import React, { useState, useMemo } from "react";
import { useTournamentStore } from "@/stores/useTournamentStore";
import { useFixturesStore } from "@/stores/useFixturesStore";
import { useTeams } from "@/components/TeamsProvider";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { CheckCircle2, XCircle, HelpCircle } from "lucide-react";

export function QualificationProgress() {
  const teams = useTeams();
  const qualifications = useTournamentStore((state) => state.qualifications);
  const { fixtures } = useFixturesStore();
  const [selectedCode, setSelectedCode] = useState("ARG");

  const stages = [
    { key: "Group Stage", label: "Group Stage" },
    { key: "Round of 32", label: "Round of 32" },
    { key: "Round of 16", label: "Round of 16" },
    { key: "Quarter-Finals", label: "Quarter Final" },
    { key: "Semi-Finals", label: "Semi Final" },
    { key: "Final", label: "Final" }
  ];

  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => a.name.localeCompare(b.name));
  }, [teams]);

  const team = useMemo(() => {
    return teams.find((t) => t.code === selectedCode) || teams[0];
  }, [teams, selectedCode]);

  // Calculate final champion if match 104 is completed
  const championCode = useMemo(() => {
    const finalMatch = fixtures.find((f) => f.match_no === 104 || (f.stageName === "Final" && f.status === "COMPLETED"));
    if (finalMatch && finalMatch.status === "COMPLETED") {
      const hs = parseInt(finalMatch.homeScore, 10);
      const as = parseInt(finalMatch.awayScore, 10);
      if (!isNaN(hs) && !isNaN(as)) {
        return hs > as ? finalMatch.homeTeamObj.code : finalMatch.awayTeamObj.code;
      }
    }
    return "";
  }, [fixtures]);

  // Evaluate the status of each stage for the selected team
  const stageStatuses = useMemo(() => {
    const statuses: Record<string, "QUALIFIED" | "ELIMINATED" | "ACTIVE" | "PENDING"> = {};
    const teamStages = qualifications[team.code] || [];
    
    // Group stage is always active/completed
    statuses["Group Stage"] = "QUALIFIED";

    // Round of 32
    if (teamStages.includes("Round of 32")) {
      statuses["Round of 32"] = "QUALIFIED";
    } else if (teamStages.includes("Round of 16") || teamStages.includes("Quarter-Finals") || teamStages.includes("Semi-Finals") || teamStages.includes("Final")) {
      statuses["Round of 32"] = "QUALIFIED";
    } else {
      // If group stage is completed and they didn't make R32, they are eliminated
      const groupMatches = fixtures.filter((f) => !f.isKnockout && (f.homeTeamObj.code === team.code || f.awayTeamObj.code === team.code));
      const groupCompleted = groupMatches.length > 0 && groupMatches.every((f) => f.status === "COMPLETED");
      statuses["Round of 32"] = groupCompleted ? "ELIMINATED" : "PENDING";
    }

    // Round of 16
    if (teamStages.includes("Round of 16")) {
      statuses["Round of 16"] = "QUALIFIED";
    } else if (teamStages.includes("Quarter-Finals") || teamStages.includes("Semi-Finals") || teamStages.includes("Final")) {
      statuses["Round of 16"] = "QUALIFIED";
    } else {
      // If they were eliminated in R32
      const r32Matches = fixtures.filter((f) => f.stageName.includes("32") && (f.homeTeamObj.code === team.code || f.awayTeamObj.code === team.code));
      const r32Finished = r32Matches.length > 0 && r32Matches.every((f) => f.status === "COMPLETED");
      if (r32Finished) {
        statuses["Round of 16"] = "ELIMINATED";
      } else {
        statuses["Round of 16"] = statuses["Round of 32"] === "QUALIFIED" ? "ACTIVE" : "PENDING";
      }
    }

    // Quarter-Finals
    if (teamStages.includes("Quarter-Finals")) {
      statuses["Quarter-Finals"] = "QUALIFIED";
    } else if (teamStages.includes("Semi-Finals") || teamStages.includes("Final")) {
      statuses["Quarter-Finals"] = "QUALIFIED";
    } else {
      const r16Matches = fixtures.filter((f) => f.stageName.includes("16") && (f.homeTeamObj.code === team.code || f.awayTeamObj.code === team.code));
      const r16Finished = r16Matches.length > 0 && r16Matches.every((f) => f.status === "COMPLETED");
      if (r16Finished) {
        statuses["Quarter-Finals"] = "ELIMINATED";
      } else {
        statuses["Quarter-Finals"] = statuses["Round of 16"] === "QUALIFIED" ? "ACTIVE" : "PENDING";
      }
    }

    // Semi-Finals
    if (teamStages.includes("Semi-Finals")) {
      statuses["Semi-Finals"] = "QUALIFIED";
    } else if (teamStages.includes("Final")) {
      statuses["Semi-Finals"] = "QUALIFIED";
    } else {
      const qfMatches = fixtures.filter((f) => f.stageName.includes("Quarter") && (f.homeTeamObj.code === team.code || f.awayTeamObj.code === team.code));
      const qfFinished = qfMatches.length > 0 && qfMatches.every((f) => f.status === "COMPLETED");
      if (qfFinished) {
        statuses["Semi-Finals"] = "ELIMINATED";
      } else {
        statuses["Semi-Finals"] = statuses["Quarter-Finals"] === "QUALIFIED" ? "ACTIVE" : "PENDING";
      }
    }

    // Final
    if (teamStages.includes("Final")) {
      statuses["Final"] = "QUALIFIED";
    } else {
      const sfMatches = fixtures.filter((f) => f.stageName.includes("Semi") && (f.homeTeamObj.code === team.code || f.awayTeamObj.code === team.code));
      const sfFinished = sfMatches.length > 0 && sfMatches.every((f) => f.status === "COMPLETED");
      if (sfFinished) {
        statuses["Final"] = "ELIMINATED";
      } else {
        statuses["Final"] = statuses["Semi-Finals"] === "QUALIFIED" ? "ACTIVE" : "PENDING";
      }
    }

    // Champion
    if (team.code === championCode) {
      statuses["Champion"] = "QUALIFIED";
    } else {
      const finalMatches = fixtures.filter((f) => f.stageName === "Final" && (f.homeTeamObj.code === team.code || f.awayTeamObj.code === team.code));
      const finalFinished = finalMatches.length > 0 && finalMatches.every((f) => f.status === "COMPLETED");
      if (finalFinished) {
        statuses["Champion"] = "ELIMINATED";
      } else {
        statuses["Champion"] = statuses["Final"] === "QUALIFIED" ? "ACTIVE" : "PENDING";
      }
    }

    return statuses;
  }, [team.code, qualifications, fixtures, championCode]);

  return (
    <div className="bg-white dark:bg-[#16181D] rounded-3xl border border-slate-200 dark:border-white/5 p-6 shadow-md space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-white/5 pb-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-widest">
            Qualification Progress Tracker
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select a nation to follow their dynamic path from groups to champion.
          </p>
        </div>

        {/* Team Selector Dropdown */}
        <select
          value={selectedCode}
          onChange={(e) => setSelectedCode(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs font-bold outline-none transition focus:border-neon cursor-pointer"
        >
          {sortedTeams.map((t) => (
            <option key={t.code} value={t.code} className="bg-popover text-foreground">
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Selected Team Profile */}
      <div className="flex items-center gap-3">
        <CountryFlag
          code={team.code}
          flag={team.flag}
          name={team.name}
          className="h-7 w-10 rounded shadow-sm border border-slate-100 dark:border-white/10"
          emojiClassName="text-2xl"
        />
        <div>
          <h4 className="text-sm font-black text-slate-900 dark:text-white">{team.name}</h4>
          <span className="text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider">
            FIFA CODE: {team.code} • Confederation: {team.confederation}
          </span>
        </div>
      </div>

      {/* Timeline Steps */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
        {[...stages, { key: "Champion", label: "Champion 🏆" }].map((stage) => {
          const status = stageStatuses[stage.key];

          return (
            <div
              key={stage.key}
              className={`p-3 rounded-2xl border flex flex-col items-center justify-between text-center min-h-[90px] transition-all duration-300 ${
                status === "QUALIFIED"
                  ? "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400"
                  : status === "ELIMINATED"
                    ? "bg-red-500/10 border-red-500/20 text-red-650 dark:text-red-400"
                    : status === "ACTIVE"
                      ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-600 dark:text-neon shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                      : "bg-slate-50/50 dark:bg-white/[0.01] border-slate-200 dark:border-white/5 opacity-55 text-slate-400"
              }`}
            >
              <span className="text-[9px] font-black uppercase tracking-wider">{stage.label}</span>
              
              <div className="my-1.5">
                {status === "QUALIFIED" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : status === "ELIMINATED" ? (
                  <XCircle className="w-5 h-5 text-rose-500" />
                ) : status === "ACTIVE" ? (
                  <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                ) : (
                  <HelpCircle className="w-5 h-5 text-slate-350 dark:text-slate-650" />
                )}
              </div>

              <span className="text-[8px] font-extrabold uppercase tracking-widest font-mono">
                {status === "QUALIFIED" 
                  ? "✓ Qualified" 
                  : status === "ELIMINATED" 
                    ? "✕ Eliminated" 
                    : status === "ACTIVE" 
                      ? "Active Now" 
                      : "Pending"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
