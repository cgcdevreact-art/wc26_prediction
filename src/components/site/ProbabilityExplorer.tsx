"use client";

import { useMemo, useState, useEffect } from "react";
import { useTeams, useGroupsConfig } from "@/components/TeamsProvider";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AuthModal } from "./AuthModal";
import { CountryFlag } from "@/components/ui/CountryFlag";

const PATH_TO_FINAL = [
  { stage: "Group Stage", opp: "Switzerland", winPct: 78 },
  { stage: "Round of 32", opp: "Senegal", winPct: 70 },
  { stage: "Round of 16", opp: "Mexico", winPct: 66 },
  { stage: "Quarter Final", opp: "England", winPct: 54 },
  { stage: "Semi Final", opp: "France", winPct: 47 },
  { stage: "Final", opp: "Argentina", winPct: 44 },
];
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { ChevronRight, Trophy, Sparkles } from "lucide-react";

type PlayerRecord = {
  "Team Code"?: string;
  "Player Name"?: string;
  "Name on Shirt"?: string;
  "Overall Rating"?: string;
};

const stages = [
  { key: "qualify", label: "Group Stage", icon: "G" },
  { key: "r32", label: "Round of 32", icon: "32" },
  { key: "r16", label: "Round of 16", icon: "16" },
  { key: "qf", label: "Quarter Final", icon: "QF" },
  { key: "sf", label: "Semi Final", icon: "SF" },
  { key: "final", label: "Final", icon: "F" },
  { key: "champion", label: "Champion", icon: "🏆" },
] as const;

export function ProbabilityExplorer() {
  const teams = useTeams();
  const groupsConfig = useGroupsConfig();
  const { data: session } = useSession();
  const router = useRouter();
  const [code, setCode] = useState("BRA");
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [players, setPlayers] = useState<PlayerRecord[]>([]);

  useEffect(() => {
    fetch("/players.json")
      .then((res) => res.json())
      .then((data) => setPlayers(data))
      .catch((err) => console.error("Error loading players.json:", err));
  }, []);

  const team = teams.find((t) => t.code === code) || teams[0];
  const teamGroup = Object.entries(groupsConfig).find((entry) => entry[1].includes(team.code))?.[0] || "-";

  const getTopPlayer = (teamCode: string) => {
    if (!players || players.length === 0) return "Loading...";
    const teamPlayers = players
      .filter((p) => p["Team Code"] === teamCode)
      .sort((a, b) => {
        const ratingA = parseInt(a["Overall Rating"]?.replace("%", "") || "0", 10);
        const ratingB = parseInt(b["Overall Rating"]?.replace("%", "") || "0", 10);
        return ratingB - ratingA;
      });
    const topPlayer = teamPlayers[0];
    const name = topPlayer ? (topPlayer["Name on Shirt"] || topPlayer["Player Name"]) : "";
    const rating = topPlayer ? (topPlayer["Overall Rating"] || "") : "";
    return name ? `${name} (${rating})` : "N/A";
  };

  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => b.elo - a.elo);
  }, [teams]);

  const radar = useMemo(() => ([
    { axis: "Attack", v: team.attack > 10 ? team.attack : Math.round(team.attack * 80) },
    { axis: "Defense", v: team.defense > 10 ? team.defense : Math.round(team.defense * 80) },
    { axis: "Power", v: team.power || 70 },
    { axis: "Form", v: Math.min(99, (team.power || 70) + 4) },
    { axis: "Squad", v: Math.min(99, 50 + (team.squadValueM || 500) / 15) },
    { axis: "Elo", v: Math.round(((team.elo || 1500) - 1300) / 6) },
  ]), [team]);

  const squadQuality = useMemo(() => {
    const teamPlayers = players
      .filter((player: PlayerRecord) => player["Team Code"] === team.code)
      .map((player: PlayerRecord) => ({
        ...player,
        rating: parseInt(player["Overall Rating"]?.replace("%", "") || "0", 10),
      }))
      .filter((player) => Number.isFinite(player.rating) && player.rating > 0);

    const tiers = [
      { label: "Elite", min: 90, max: 100, color: "from-amber-400 via-yellow-400 to-lime-300" },
      { label: "Very Strong", min: 85, max: 89, color: "from-neon to-neon-2" },
      { label: "Strong", min: 80, max: 84, color: "from-sky-500 to-cyan-400" },
      { label: "Good/Average", min: 0, max: 79, color: "from-slate-500 to-slate-400" },
    ] as const;

    const total = teamPlayers.length;
    const averageRating = total
      ? Math.round(teamPlayers.reduce((sum, player) => sum + player.rating, 0) / total)
      : 0;

    return {
      total,
      averageRating,
      tiers: tiers.map((tier) => {
        const count = teamPlayers.filter(
          (player) => player.rating >= tier.min && player.rating <= tier.max,
        ).length;

        return {
          ...tier,
          count,
          percentage: total ? Math.round((count / total) * 100) : 0,
        };
      }),
    };
  }, [players, team.code]);

  const handleSimulationClick = () => {
    if (session) {
      router.push(`/predictions/country?team=${encodeURIComponent(code)}`);
    } else {
      setAuthModalOpen(true);
    }
  };

  return (
    <div className="py-2">
      <div className="grid gap-5 lg:grid-cols-[280px_1fr] min-w-0">
        {/* Team list */}
        <div className="glass self-start h-fit rounded-2xl border border-border/70 dark:border-white/10 overflow-hidden">
          <div className="px-4 pt-4 pb-3 text-left">
            <div className="font-display text-lg font-semibold text-foreground">Country Rankings</div>
            <div className="text-xs text-muted-foreground mt-0.5">Browse every team by title probability</div>
          </div>
          <div className="px-2 pb-2">
            <div className="max-h-[320px] overflow-y-auto px-2 pb-1 lg:max-h-[960px] lg:px-0 scrollbar-custom">
              <div className="grid grid-cols-1 gap-1">
                {sortedTeams.map((t) => {
                  const active = t.code === code;
                  return (
                    <button
                      key={t.code}
                      onClick={() => setCode(t.code)}
                      className={`flex w-full min-w-0 items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-all duration-300 relative overflow-hidden group ${active
                        ? "bg-gradient-to-r from-neon/10 to-neon-2/10 border-neon/25 text-foreground font-bold shadow-[0_10px_30px_-20px_color-mix(in_oklab,var(--color-neon)_65%,transparent)]"
                        : "border-transparent bg-transparent text-muted-foreground hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5"
                        }`}
                    >
                      {active && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-neon to-neon-2" />
                      )}
                      <span className="flex items-center gap-2 truncate z-10">
                        <CountryFlag
                          code={t.code}
                          flag={t.flag}
                          name={t.name}
                          className="h-6 w-8 shrink-0 group-hover:scale-110 transition-transform duration-300"
                          emojiClassName="text-lg shrink-0 select-none group-hover:scale-110 transition-transform duration-300"
                        />
                        <span className="truncate tracking-wide">{t.name}</span>
                      </span>
                      <span className="text-xs font-mono font-bold text-neon-2 text-right z-10">{t.prob.champion.toFixed(1)}%</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="space-y-5 min-w-0">
          <div className="glass-strong self-start h-fit rounded-3xl border border-white/10 shadow-xl overflow-hidden">
            <div className="px-6 pt-6 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 text-left">
              <div>
                <div className="font-display text-xl font-extrabold text-foreground">Team Overview</div>
                <div className="text-xs text-muted-foreground mt-0.5">Profile, champion odds, and stage progression</div>
              </div>
              <button
                onClick={handleSimulationClick}
                className="shrink-0 bg-gradient-to-r from-neon to-neon-2 text-background px-5 py-2.5 rounded-xl text-xs font-bold transition hover:opacity-95 active:scale-95 flex items-center gap-1.5 shadow-lg shadow-neon/20 hover:shadow-neon/30 self-start sm:self-auto"
              >
                <Sparkles className="w-3.5 h-3.5 fill-current" />
                <span>Run Simulation</span>
              </button>
            </div>
            <div className="px-6 pb-6">
              <div className="relative overflow-hidden">
                  <div className="absolute -right-16 -top-16 w-56 h-56 bg-neon/10 rounded-full filter blur-3xl pointer-events-none" />
                  <div className="absolute -left-16 -bottom-16 w-56 h-56 bg-neon-2/10 rounded-full filter blur-3xl pointer-events-none" />
                  <div className="flex flex-col lg:flex-row justify-between items-stretch gap-6 border-b border-white/5 pb-6 mb-6">
                    {/* Team Profile Basic Details */}
                    <div className="flex flex-col justify-between flex-grow gap-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                        <div className="flex items-center gap-5">
                          <div className="filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:scale-105 transition-transform duration-300">
                            <CountryFlag
                              code={team.code}
                              flag={team.flag}
                              name={team.name}
                              className="h-16 w-20 drop-shadow-lg"
                              emojiClassName="text-7xl drop-shadow-lg leading-none select-none"
                            />
                          </div>
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-extrabold flex items-center gap-1.5">
                              <span>FIFA Rank #{team.rank}</span>
                              <span className="text-white/20">&bull;</span>
                              <span className="text-neon-2">Group {teamGroup}</span>
                            </div>
                            <h2 className="text-4xl font-extrabold font-display text-foreground mt-1 tracking-tight">
                              {team.name}
                            </h2>
                          </div>
                        </div>
                      </div>

                      {/* Core Attributes Mini Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                        <div className="bg-muted/60 dark:bg-white/[0.04] border border-border dark:border-white/8 rounded-2xl p-4 hover:border-neon/20 transition-colors">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-medium">Elo Rating</span>
                          <span className="text-xl font-bold font-mono text-foreground mt-1 block">{Math.round(team.elo)}</span>
                        </div>
                        <div className="bg-muted/60 dark:bg-white/[0.04] border border-border dark:border-white/8 rounded-2xl p-4 hover:border-neon/20 transition-colors">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-medium">Power Index</span>
                          <span className="text-xl font-bold font-mono text-foreground mt-1 block">{team.power || 70}</span>
                        </div>
                        <div className="bg-muted/60 dark:bg-white/[0.04] border border-border dark:border-white/8 rounded-2xl p-4 hover:border-neon/20 transition-colors">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-medium">Squad Value</span>
                          <span className="text-xl font-bold font-mono text-foreground mt-1 block">
                            {team.squadValueM ? `€${team.squadValueM}M` : "N/A"}
                          </span>
                        </div>
                        <div className="bg-muted/60 dark:bg-white/[0.04] border border-border dark:border-white/8 rounded-2xl p-4 hover:border-neon/20 transition-colors">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-medium">Top Player</span>
                          <span className="text-xs font-bold text-neon mt-1.5 block truncate" title={getTopPlayer(team.code)}>
                            {getTopPlayer(team.code)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Circular Gauge for Champion Probability */}
                    <div className="flex flex-col items-center justify-center bg-muted/60 dark:bg-white/[0.04] border border-border dark:border-white/10 rounded-2xl p-6 min-w-[200px] text-center shadow-glass relative group overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-neon/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-extrabold relative z-10">
                        Championship Prob
                      </span>

                      <div className="relative flex items-center justify-center my-4 z-10">
                        <svg className="w-28 h-28 transform -rotate-90">
                          <circle
                            cx="56"
                            cy="56"
                            r="46"
                            stroke="var(--color-border)"
                            strokeWidth="8"
                            fill="transparent"
                          />
                          <circle
                            cx="56"
                            cy="56"
                            r="46"
                            stroke="url(#neonGradient)"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray="289"
                            strokeDashoffset={289 - (289 * (team.prob.champion / 100))}
                            className="transition-all duration-1000 ease-out"
                            strokeLinecap="round"
                          />
                          <defs>
                            <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="var(--color-neon)" />
                              <stop offset="100%" stopColor="var(--color-neon-2)" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute text-center">
                          <div className="text-2xl font-black font-mono text-foreground leading-none">
                            {team.prob.champion.toFixed(1)}%
                          </div>
                        </div>
                      </div>

                      <span className="text-[11px] font-bold text-neon relative z-10 uppercase tracking-wider">
                        {team.prob.champion > 12 ? "Contender" :
                          team.prob.champion > 4 ? "Dark Horse" : "Underdog"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
                    {stages.map((s) => {
                      const pct = team.prob[s.key as keyof typeof team.prob] as number;
                      const active = pct > 0;
                      return (
                        <div
                          key={s.key}
                          className={`border rounded-2xl p-3.5 transition-all duration-300 relative overflow-hidden group ${active
                            ? "bg-muted/60 dark:bg-white/[0.04] border-border dark:border-white/10 hover:border-neon/30 hover:bg-muted dark:hover:bg-white/[0.06]"
                            : "bg-muted/30 dark:bg-black/[0.1] border-border/50 dark:border-white/5 opacity-40"
                            }`}
                        >
                          <div className="absolute top-0 right-0 w-8 h-8 -mr-2 -mt-2 bg-gradient-to-br from-neon/10 to-transparent rounded-full filter blur-md opacity-0 group-hover:opacity-100 transition-opacity" />

                          <div className="flex justify-between items-start gap-1">
                            <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold leading-tight">
                              {s.label}
                            </span>
                            {s.icon === "🏆" ? (
                              <Trophy className={`w-3.5 h-3.5 ${active ? "text-yellow-400" : "text-muted-foreground"}`} />
                            ) : (
                              <span className="text-[10px] font-mono font-bold text-foreground/20">{s.icon}</span>
                            )}
                          </div>
                          <div className={`mt-2 text-xl font-black font-mono tabular-nums leading-none ${active ? "text-foreground" : "text-muted-foreground"}`}>
                            {pct.toFixed(1)}%
                          </div>

                          <div className="mt-3 h-1 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-1000 ease-out"
                              style={{
                                width: `${pct}%`,
                                background: s.key === "champion"
                                  ? "linear-gradient(90deg, var(--color-gold), #fbbf24)"
                                  : "linear-gradient(90deg, var(--color-neon), var(--color-neon-2))"
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
              </div>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 md:items-start min-w-0">
            <div className="glass self-start h-fit rounded-2xl overflow-hidden">
              <div className="px-5 pt-5 pb-3">
                <div className="flex w-full items-center justify-between pr-3">
                  <div className="text-left">
                    <div className="font-display text-lg font-semibold">Strengths Radar</div>
                  </div>
                  <div className="text-xs text-muted-foreground">vs Tournament Avg</div>
                </div>
              </div>
              <div className="px-5 pb-5">
                <div className="h-60 min-w-0 overflow-hidden">
                  <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                    <RadarChart data={radar} outerRadius={75}>
                      <PolarGrid
                        stroke="color-mix(in oklab, var(--color-foreground) 20%, transparent)"
                      />
                      <PolarAngleAxis dataKey="axis" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} />
                      <Radar
                        dataKey="v"
                        stroke="var(--color-neon)"
                        fill="var(--color-neon)"
                        fillOpacity={0.28}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div className="glass self-start h-fit rounded-2xl overflow-hidden">
              <div className="px-5 pt-5 pb-3">
                <div className="flex w-full flex-col gap-3 pr-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="text-left">
                    <div className="font-display text-lg font-semibold">Squad Quality Tiers</div>
                    <div className="text-xs text-muted-foreground">Distribution of squad players across rating tiers</div>
                  </div>
                  <div className="self-start rounded-full border border-neon-2/30 bg-neon-2/8 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-neon-2">
                    Squad Profile
                  </div>
                </div>
              </div>
              <div className="px-5 pb-5">
                <div className="grid gap-6 lg:grid-cols-[180px_minmax(0,1fr)] lg:items-start">
                  <div className="flex min-h-[220px] flex-col justify-center rounded-[2rem] border border-border bg-muted/45 p-6 text-center shadow-glass">
                    <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Avg Rating</div>
                    <div className="mt-3 text-5xl font-black font-mono text-foreground">
                      {squadQuality.averageRating || "--"}
                      {squadQuality.averageRating ? <span className="text-2xl align-top">%</span> : null}
                    </div>
                    <div className="mt-4 text-sm font-semibold text-neon">
                      {squadQuality.total} Players
                    </div>
                  </div>

                  <div className="space-y-5">
                    {squadQuality.tiers.map((tier) => (
                      <div key={tier.label} className="grid grid-cols-[minmax(110px,140px)_minmax(0,1fr)_auto] items-center gap-4">
                        <div className="text-sm font-semibold text-foreground">{tier.label}</div>
                        <div className="h-4 rounded-full bg-black/6 dark:bg-white/8 overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${tier.color} transition-all duration-700`}
                            style={{ width: `${Math.max(tier.percentage, tier.count > 0 ? 4 : 0)}%` }}
                          />
                        </div>
                        <div className="min-w-[72px] text-right font-mono text-sm font-bold tabular-nums text-foreground">
                          {tier.count}
                          <span className="ml-2 text-xs text-muted-foreground">({tier.percentage}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="glass self-start h-fit rounded-2xl overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <div className="flex w-full flex-col gap-3 pr-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="text-left">
                  <div className="font-display text-lg font-semibold">Most Likely Route to the Final</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Run a simulation to unlock this team&apos;s full Path to Glory.
                  </div>
                </div>
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <button
                    onClick={handleSimulationClick}
                    className="shrink-0 rounded-xl bg-gradient-to-r from-neon to-neon-2 px-5 py-2.5 text-xs font-bold text-background shadow-lg shadow-neon/20 transition hover:opacity-95 hover:shadow-neon/30 active:scale-95 flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 fill-current" />
                    <span>Run Simulation</span>
                  </button>
                  <div className="text-xs text-muted-foreground">Win % per stage</div>
                </div>
              </div>
            </div>
            <div className="px-5 pb-5">
              <div className="overflow-x-auto overflow-y-hidden pb-1 scrollbar-x-thin">
                <div className="flex items-stretch gap-2 min-w-max">
                  <PathNode code={team.code} flag={team.flag} label={team.name} highlight />
                  {PATH_TO_FINAL.map((p, i) => (
                    <PathStep key={i} stage={p.stage} opp={p.opp} winPct={p.winPct} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}

export function SectionHeader({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="max-w-3xl">
      <div className="text-xs uppercase tracking-[0.25em] text-neon">{eyebrow}</div>
      <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{title}</h2>
      {sub && <p className="mt-3 text-muted-foreground">{sub}</p>}
    </div>
  );
}

function PathNode({ code, flag, label, highlight }: { code?: string; flag: string; label: string; highlight?: boolean }) {
  return (
    <div className={`flex min-w-[140px] flex-col items-center justify-center gap-1 rounded-xl px-4 py-3 ${highlight ? "bg-gradient-to-br from-neon/25 to-neon-2/15 neon-border" : "bg-white/5"}`}>
      <CountryFlag code={code} flag={flag} name={label} className="h-8 w-10" emojiClassName="text-2xl" />
      <span className="text-xs font-semibold">{label}</span>
    </div>
  );
}

function PathStep({ stage, opp, winPct }: { stage: string; opp: string; winPct: number }) {
  return (
    <div className="flex items-center">
      <ChevronRight className="mx-1 h-5 w-5 text-muted-foreground" />
      <div className="min-w-[150px] rounded-xl bg-white/5 p-3 text-center">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{stage}</div>
        <div className="mt-0.5 text-sm font-semibold">vs {opp}</div>
        <div className="mt-1 text-xs">
          <span className="text-neon font-semibold">{winPct}%</span>
          <span className="text-muted-foreground"> win</span>
        </div>
      </div>
    </div>
  );
}
