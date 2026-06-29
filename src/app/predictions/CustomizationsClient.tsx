"use client";

import React, { useState, useMemo } from "react";
import { Sparkles, User, ChevronDown, ChevronUp, Cpu } from "lucide-react";
import { CountryFlag } from "@/components/ui/CountryFlag";

interface CustomizationsClientProps {
  teamOverrides: any[];
  playerOverrides: any[];
  teams: any[];
  staticTeams: any[];
  rawPlayers: any[];
}

export default function CustomizationsClient({
  teamOverrides,
  playerOverrides,
  teams,
  staticTeams,
  rawPlayers,
}: CustomizationsClientProps) {
  const [showAllTeams, setShowAllTeams] = useState(false);


  // Re-create the maps for quick lookup in client side
  const teamsMap = useMemo(() => new Map(teams.map((t) => [t.code, t])), [teams]);
  const staticTeamsMap = useMemo(() => new Map(staticTeams.map((t) => [t.code, t])), [staticTeams]);
  const rawPlayersMap = useMemo(
    () => new Map(rawPlayers.map((p: any) => [`${p["Team Code"]}-${p["Player Name"]}`, p])),
    [rawPlayers]
  );

  const formatTeamRating = (val: number | undefined | null) => {
    if (val === undefined || val === null) return "-";
    if (val < 10) {
      const minM = 0.75;
      const maxM = 1.10;
      const minR = 50;
      const maxR = 95;
      const rating = ((val - minM) / (maxM - minM)) * (maxR - minR) + minR;
      return Math.max(15, Math.min(99, Math.round(rating)));
    }
    return Math.round(val);
  };

  const visibleTeams = showAllTeams ? teamOverrides : teamOverrides.slice(0, 3);


  // States for player expanded stats dropdowns
  const [expandedPlayerIds, setExpandedPlayerIds] = useState<Record<string, boolean>>({});

  const togglePlayerExpanded = (id: string) => {
    setExpandedPlayerIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Team Overrides */}
      <div className="rounded-[1.5rem] border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01] p-4 flex flex-col justify-between">
        <div>
          <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-white/5">
            <Sparkles className="h-4 w-4 text-cyan-500" />
            <span>Team Overrides</span>
          </div>

          {teamOverrides.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center italic">No team rating overrides saved.</p>
          ) : (
            <div className="space-y-3">
              {visibleTeams.map((override) => {
                const teamInfo = teamsMap.get(override.teamCode);
                const baselineTeam = staticTeamsMap.get(override.teamCode);
                const eloChanged = baselineTeam ? Math.round(override.elo) !== Math.round(baselineTeam.elo) : true;
                const baselineAttack = baselineTeam ? formatTeamRating(baselineTeam.attack) : null;
                const baselineDefense = baselineTeam ? formatTeamRating(baselineTeam.defense) : null;
                const attackChanged = baselineAttack !== null ? Math.round(override.attack) !== baselineAttack : true;
                const defenseChanged = baselineDefense !== null ? Math.round(override.defense) !== baselineDefense : true;

                return (
                  <div
                    key={override.id}
                    className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-white/8 dark:bg-white/[0.02] transition hover:scale-[1.01]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <CountryFlag
                          code={override.teamCode}
                          flag={teamInfo?.flag || ""}
                          name={teamInfo?.name || override.teamCode}
                          className="h-5 w-7 rounded object-cover shrink-0"
                          emojiClassName="text-lg leading-none"
                        />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-slate-900 dark:text-white">
                            {teamInfo?.name || override.teamCode}
                          </div>
                          <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {override.teamCode}
                          </div>
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {new Date(override.updatedAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div className={`rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 ${eloChanged ? "bg-cyan-100 ring-2 ring-cyan-300 dark:bg-cyan-950/70 dark:ring-cyan-500/50" : "bg-slate-100/80 dark:bg-white/[0.05]"}`}>
                        <span className="block text-[9px] uppercase tracking-wider text-slate-555 dark:text-slate-500">Elo</span>
                        <span className="font-bold">{Math.round(override.elo)}</span>
                        {eloChanged && baselineTeam && (
                          <span className="mt-0.5 block text-[9px] text-cyan-800 dark:text-cyan-400 font-bold">
                            Was {Math.round(baselineTeam.elo)}
                          </span>
                        )}
                      </div>
                      <div className={`rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 ${attackChanged ? "bg-cyan-100 ring-2 ring-cyan-300 dark:bg-cyan-950/70 dark:ring-cyan-500/50" : "bg-slate-100/80 dark:bg-white/[0.05]"}`}>
                        <span className="block text-[9px] uppercase tracking-wider text-slate-555 dark:text-slate-500">Att</span>
                        <span className="font-bold">{Math.round(override.attack)}</span>
                        {attackChanged && baselineAttack !== null && (
                          <span className="mt-0.5 block text-[9px] text-cyan-800 dark:text-cyan-400 font-bold">
                            Was {baselineAttack}
                          </span>
                        )}
                      </div>
                      <div className={`rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 ${defenseChanged ? "bg-cyan-100 ring-2 ring-cyan-300 dark:bg-cyan-950/70 dark:ring-cyan-500/50" : "bg-slate-100/80 dark:bg-white/[0.05]"}`}>
                        <span className="block text-[9px] uppercase tracking-wider text-slate-555 dark:text-slate-500">Def</span>
                        <span className="font-bold">{Math.round(override.defense)}</span>
                        {defenseChanged && baselineDefense !== null && (
                          <span className="mt-0.5 block text-[9px] text-cyan-800 dark:text-cyan-400 font-bold">
                            Was {baselineDefense}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {teamOverrides.length > 3 && (
          <button
            onClick={() => setShowAllTeams(!showAllTeams)}
            className="mt-4 w-full py-2 rounded-xl glass border border-dashed border-slate-200 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-xs font-bold text-muted-foreground hover:text-foreground transition flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>{showAllTeams ? "Show Less" : `Show More (${teamOverrides.length - 3} more)`}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-350 ${showAllTeams ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>

      {/* Player Overrides */}
      <div className="rounded-[1.5rem] border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01] p-4 flex flex-col justify-between">
        <div>
          <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-white/5">
            <User className="h-4 w-4 text-fuchsia-500" />
            <span>Player Overrides</span>
          </div>

          {playerOverrides.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center italic">No player edits saved.</p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {playerOverrides.map((override) => {
                const [teamCode, ...nameParts] = override.playerKey.split("-");
                const playerName = nameParts.join("-") || override.playerKey;
                const teamInfo = teamsMap.get(teamCode);
                const baselinePlayer = rawPlayersMap.get(override.playerKey);
                const overallChanged = baselinePlayer ? override.overallRating !== String(baselinePlayer["Overall Rating"] || "") : true;
                const baseQualityChanged = baselinePlayer ? override.baseQuality !== String(baselinePlayer["Base Quality"] || "") : true;
                const formChanged = baselinePlayer ? override.recentForm !== String(baselinePlayer["Recent Form"] || "") : true;
                const intlExpChanged = baselinePlayer ? override.intlExperience !== String(baselinePlayer["International Experience"] || "") : true;
                const attackingChanged = baselinePlayer ? override.attackingImpact !== String(baselinePlayer["Attacking Impact"] || "") : true;
                const defensiveChanged = baselinePlayer ? override.defensiveImpact !== String(baselinePlayer["Defensive Impact"] || "") : true;
                const passingChanged = baselinePlayer ? override.passingCreativity !== String(baselinePlayer["Passing / Creativity"] || "") : true;
                const fitnessChanged = baselinePlayer ? override.fitnessAvailability !== String(baselinePlayer["Fitness / Availability"] || "") : true;
                const disciplineChanged = baselinePlayer ? override.disciplineRisk !== String(baselinePlayer["Discipline Risk"] || "") : true;
                const importanceChanged = baselinePlayer ? override.matchImportance !== String(baselinePlayer["Match Importance"] || "") : true;
                const tierChanged = baselinePlayer ? override.ratingTier !== String(baselinePlayer["Rating Tier"] || "") : true;

                const isExpanded = !!expandedPlayerIds[override.id];

                return (
                  <div
                    key={override.id}
                    className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-white/8 dark:bg-white/[0.02] transition hover:scale-[1.01]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/[0.04]">
                          {override.imageUrl ? (
                            <img src={override.imageUrl} alt={playerName} className="h-full w-full object-cover" />
                          ) : (
                            <User className="h-4 w-4 text-slate-550 dark:text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-slate-900 dark:text-white">
                            {playerName}
                          </div>
                          <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            <span>{teamCode}</span>
                            {teamInfo && (
                              <>
                                <CountryFlag
                                  code={teamCode}
                                  flag={teamInfo.flag || ""}
                                  name={teamInfo.name || teamCode}
                                  className="h-3 w-4 rounded-[1px] object-cover"
                                  emojiClassName="text-xs leading-none"
                                />
                                <span className="truncate normal-case tracking-normal font-medium">{teamInfo.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {new Date(override.updatedAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                      <div className={`rounded-xl px-2.5 py-1.5 text-slate-750 dark:text-slate-300 ${overallChanged ? "bg-fuchsia-100 ring-2 ring-fuchsia-300 dark:bg-fuchsia-950/70 dark:ring-fuchsia-500/50" : "bg-slate-100/80 dark:bg-white/[0.05]"}`}>
                        <span className="block text-[9px] uppercase tracking-wider text-slate-555 dark:text-slate-500">Overall</span>
                        <span className="font-bold text-xs">{override.overallRating}</span>
                        {overallChanged && baselinePlayer && (
                          <span className="mt-0.5 block text-[9px] text-fuchsia-800 dark:text-fuchsia-300 font-bold">
                            Was {baselinePlayer["Overall Rating"]}
                          </span>
                        )}
                      </div>
                      <div className={`rounded-xl px-2.5 py-1.5 text-slate-750 dark:text-slate-300 ${baseQualityChanged ? "bg-fuchsia-100 ring-2 ring-fuchsia-300 dark:bg-fuchsia-950/70 dark:ring-fuchsia-500/50" : "bg-slate-100/80 dark:bg-white/[0.05]"}`}>
                        <span className="block text-[9px] uppercase tracking-wider text-slate-555 dark:text-slate-500">Base Qly</span>
                        <span className="font-bold text-xs">{override.baseQuality}</span>
                        {baseQualityChanged && baselinePlayer && (
                          <span className="mt-0.5 block text-[9px] text-fuchsia-800 dark:text-fuchsia-300 font-bold">
                            Was {baselinePlayer["Base Quality"]}
                          </span>
                        )}
                      </div>
                      <div className={`rounded-xl px-2.5 py-1.5 text-slate-750 dark:text-slate-300 ${formChanged ? "bg-fuchsia-100 ring-2 ring-fuchsia-300 dark:bg-fuchsia-950/70 dark:ring-fuchsia-500/50" : "bg-slate-100/80 dark:bg-white/[0.05]"}`}>
                        <span className="block text-[9px] uppercase tracking-wider text-slate-555 dark:text-slate-500">Form</span>
                        <span className="font-bold text-xs">{override.recentForm}</span>
                        {formChanged && baselinePlayer && (
                          <span className="mt-0.5 block text-[9px] text-fuchsia-800 dark:text-fuchsia-300 font-bold">
                            Was {baselinePlayer["Recent Form"]}
                          </span>
                        )}
                      </div>
                      <div className={`rounded-xl px-2.5 py-1.5 text-slate-750 dark:text-slate-300 ${intlExpChanged ? "bg-fuchsia-100 ring-2 ring-fuchsia-300 dark:bg-fuchsia-950/70 dark:ring-fuchsia-500/50" : "bg-slate-100/80 dark:bg-white/[0.05]"}`}>
                        <span className="block text-[9px] uppercase tracking-wider text-slate-555 dark:text-slate-500">Intl Exp</span>
                        <span className="font-bold text-xs">{override.intlExperience}</span>
                        {intlExpChanged && baselinePlayer && (
                          <span className="mt-0.5 block text-[9px] text-fuchsia-800 dark:text-fuchsia-300 font-bold">
                            Was {baselinePlayer["International Experience"]}
                          </span>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 border-t border-slate-100 dark:border-white/5 pt-3 animate-fade-in">
                        <div className={`rounded-xl px-2.5 py-1.5 text-slate-750 dark:text-slate-300 ${attackingChanged ? "bg-fuchsia-100 ring-2 ring-fuchsia-300 dark:bg-fuchsia-950/70 dark:ring-fuchsia-500/50" : "bg-slate-100/80 dark:bg-white/[0.05]"}`}>
                          <span className="block text-[9px] uppercase tracking-wider text-slate-550 dark:text-slate-500">Attack</span>
                          <span className="font-bold text-xs">{override.attackingImpact}</span>
                          {attackingChanged && baselinePlayer && (
                            <span className="mt-0.5 block text-[9px] text-fuchsia-800 dark:text-fuchsia-300 font-bold">
                              Was {baselinePlayer["Attacking Impact"]}
                            </span>
                          )}
                        </div>
                        <div className={`rounded-xl px-2.5 py-1.5 text-slate-755 dark:text-slate-300 ${defensiveChanged ? "bg-fuchsia-100 ring-2 ring-fuchsia-300 dark:bg-fuchsia-950/70 dark:ring-fuchsia-500/50" : "bg-slate-100/80 dark:bg-white/[0.05]"}`}>
                          <span className="block text-[9px] uppercase tracking-wider text-slate-550 dark:text-slate-500">Defense</span>
                          <span className="font-bold text-xs">{override.defensiveImpact}</span>
                          {defensiveChanged && baselinePlayer && (
                            <span className="mt-0.5 block text-[9px] text-fuchsia-800 dark:text-fuchsia-300 font-bold">
                              Was {baselinePlayer["Defensive Impact"]}
                            </span>
                          )}
                        </div>
                        <div className={`rounded-xl px-2.5 py-1.5 text-slate-750 dark:text-slate-300 ${passingChanged ? "bg-fuchsia-100 ring-2 ring-fuchsia-300 dark:bg-fuchsia-950/70 dark:ring-fuchsia-500/50" : "bg-slate-100/80 dark:bg-white/[0.05]"}`}>
                          <span className="block text-[9px] uppercase tracking-wider text-slate-550 dark:text-slate-500">Passing</span>
                          <span className="font-bold text-xs">{override.passingCreativity}</span>
                          {passingChanged && baselinePlayer && (
                            <span className="mt-0.5 block text-[9px] text-fuchsia-800 dark:text-fuchsia-300 font-bold">
                              Was {baselinePlayer["Passing / Creativity"]}
                            </span>
                          )}
                        </div>
                        <div className={`rounded-xl px-2.5 py-1.5 text-slate-750 dark:text-slate-300 ${fitnessChanged ? "bg-fuchsia-100 ring-2 ring-fuchsia-300 dark:bg-fuchsia-950/70 dark:ring-fuchsia-500/50" : "bg-slate-100/80 dark:bg-white/[0.05]"}`}>
                          <span className="block text-[9px] uppercase tracking-wider text-slate-555 dark:text-slate-500">Fitness</span>
                          <span className="font-bold text-xs">{override.fitnessAvailability}</span>
                          {fitnessChanged && baselinePlayer && (
                            <span className="mt-0.5 block text-[9px] text-fuchsia-800 dark:text-fuchsia-300 font-bold">
                              Was {baselinePlayer["Fitness / Availability"]}
                            </span>
                          )}
                        </div>
                        <div className={`rounded-xl px-2.5 py-1.5 text-slate-750 dark:text-slate-300 ${disciplineChanged ? "bg-fuchsia-100 ring-2 ring-fuchsia-300 dark:bg-fuchsia-950/70 dark:ring-fuchsia-500/50" : "bg-slate-100/80 dark:bg-white/[0.05]"}`}>
                          <span className="block text-[9px] uppercase tracking-wider text-slate-555 dark:text-slate-500">Discipline</span>
                          <span className="font-bold text-xs">{override.disciplineRisk}</span>
                          {disciplineChanged && baselinePlayer && (
                            <span className="mt-0.5 block text-[9px] text-fuchsia-800 dark:text-fuchsia-300 font-bold">
                              Was {baselinePlayer["Discipline Risk"]}
                            </span>
                          )}
                        </div>
                        <div className={`rounded-xl px-2.5 py-1.5 text-slate-750 dark:text-slate-300 ${importanceChanged ? "bg-fuchsia-100 ring-2 ring-fuchsia-300 dark:bg-fuchsia-950/70 dark:ring-fuchsia-500/50" : "bg-slate-100/80 dark:bg-white/[0.05]"}`}>
                          <span className="block text-[9px] uppercase tracking-wider text-slate-555 dark:text-slate-500">Importance</span>
                          <span className="font-bold text-xs">{override.matchImportance}</span>
                          {importanceChanged && baselinePlayer && (
                            <span className="mt-0.5 block text-[9px] text-fuchsia-800 dark:text-fuchsia-300 font-bold">
                              Was {baselinePlayer["Match Importance"]}
                            </span>
                          )}
                        </div>
                        <div className={`rounded-xl px-2.5 py-1.5 text-slate-750 dark:text-slate-300 sm:col-span-3 ${tierChanged ? "bg-fuchsia-100 ring-2 ring-fuchsia-300 dark:bg-fuchsia-950/70 dark:ring-fuchsia-500/50" : "bg-slate-100/80 dark:bg-white/[0.05]"}`}>
                          <span className="block text-[9px] uppercase tracking-wider text-slate-555 dark:text-slate-500">Rating Tier</span>
                          <span className="font-bold text-xs">{override.ratingTier}</span>
                          {tierChanged && baselinePlayer && (
                            <span className="mt-0.5 block text-[9px] text-fuchsia-800 dark:text-fuchsia-300 font-bold">
                              Was {baselinePlayer["Rating Tier"]}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => togglePlayerExpanded(override.id)}
                        className="inline-flex cursor-pointer items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-550 transition hover:border-slate-300 hover:text-slate-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400 dark:hover:bg-white/[0.05] dark:hover:text-slate-200 outline-none select-none"
                      >
                        <span>{isExpanded ? "Less stats" : "More stats"}</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
