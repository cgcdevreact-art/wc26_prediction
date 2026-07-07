"use client";

import { useTournamentStore } from "@/stores/useTournamentStore";
import { useFixturesStore } from "@/stores/useFixturesStore";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { useTeams } from "@/components/TeamsProvider";
import { useMemo } from "react";
import { Trophy, Award, TrendingUp, CheckCircle2 } from "lucide-react";

export function QualificationChart() {
  const teams = useTeams();
  const qualifications = useTournamentStore((state) => state.qualifications);
  const { fixtures } = useFixturesStore();

  const stages = [
    { key: "Round of 32", label: "R32" },
    { key: "Round of 16", label: "R16" },
    { key: "Quarter-Finals", label: "Quarter" },
    { key: "Semi-Finals", label: "Semi" },
    { key: "Final", label: "Final" }
  ];

  // Calculate team qualifications dynamically based on matches in fixtures
  const qualifiedTeamsByStage = useMemo(() => {
    const stageMap: Record<string, typeof teams> = {
      "Round of 32": [],
      "Round of 16": [],
      "Quarter-Finals": [],
      "Semi-Finals": [],
      "Final": [],
      "Champion": []
    };

    // Calculate final champion if match 104 is completed
    const finalMatch = fixtures.find((f) => f.match_no === 104 || (f.stageName === "Final" && f.status === "COMPLETED"));
    let championCode = "";
    if (finalMatch && finalMatch.status === "COMPLETED") {
      const hs = parseInt(finalMatch.homeScore, 10);
      const as = parseInt(finalMatch.awayScore, 10);
      if (!isNaN(hs) && !isNaN(as)) {
        championCode = hs > as ? finalMatch.homeTeamObj.code : finalMatch.awayTeamObj.code;
      }
    }

    teams.forEach((team) => {
      if (team.code === championCode) {
        stageMap["Champion"].push(team);
        return;
      }

      // Check highest qualification stage
      const teamStages = qualifications[team.code] || [];
      
      let highestStage = "";
      if (teamStages.includes("Final")) {
        highestStage = "Final";
      } else if (teamStages.includes("Semi-Finals")) {
        highestStage = "Semi-Finals";
      } else if (teamStages.includes("Quarter-Finals")) {
        highestStage = "Quarter-Finals";
      } else if (teamStages.includes("Round of 16")) {
        highestStage = "Round of 16";
      } else if (teamStages.includes("Round of 32")) {
        highestStage = "Round of 32";
      }

      if (highestStage) {
        stageMap[highestStage].push(team);
      }
    });

    return stageMap;
  }, [teams, qualifications, fixtures]);

  const totalQualifiedCount = Object.values(qualifiedTeamsByStage).reduce((acc, curr) => acc + curr.length, 0);

  return (
    <div className="bg-white dark:bg-[#16181D] rounded-3xl border border-slate-200 dark:border-white/5 p-6 shadow-md space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-neon" />
            Reactive Qualification Tracker
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time stage-by-stage progression of qualified national teams.
          </p>
        </div>
        <span className="text-[10px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-neon px-2.5 py-1 rounded-xl">
          {totalQualifiedCount} Teams Advanced
        </span>
      </div>

      {/* Columns Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Render stages including Champion */}
        {[...stages, { key: "Champion", label: "Winner 🏆" }].map((stage) => {
          const list = qualifiedTeamsByStage[stage.key] || [];

          return (
            <div key={stage.key} className="bg-slate-50 dark:bg-white/[0.01] border border-slate-200 dark:border-white/5 rounded-2xl p-3 flex flex-col gap-2 min-h-[150px]">
              <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center border-b border-slate-200/50 dark:border-white/5 pb-1.5 mb-1.5">
                {stage.key === "Champion" ? (
                  <span className="text-amber-500 flex items-center justify-center gap-1">
                    <Trophy className="w-3 h-3" /> Winner
                  </span>
                ) : (
                  stage.key
                )}
              </div>

              {list.length > 0 ? (
                <div className="space-y-1.5 overflow-y-auto max-h-[250px] scrollbar-custom pr-0.5">
                  {list.map((t) => (
                    <div
                      key={t.code}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 shadow-sm text-xs"
                    >
                      <CountryFlag
                        code={t.code}
                        flag={t.flag}
                        name={t.name}
                        className="h-3.5 w-5 rounded object-cover shadow-sm shrink-0"
                        emojiClassName="text-sm leading-none"
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate flex-1">{t.name}</span>
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-[10px] text-slate-400 italic text-center px-2">
                  No teams qualified
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
