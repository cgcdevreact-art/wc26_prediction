"use client";

import { useState } from "react";
import { useTeams } from "@/components/TeamsProvider";
import { CountryFlag } from "@/components/ui/CountryFlag";

function simulateTournament(teams: any[], seed = Math.random()) {
  const total = teams.reduce((s, t) => s + (t.prob?.champion || 0), 0);
  if (total <= 0) return teams[0];
  let r = (seed * total) % total;
  let champ = teams[0];
  for (const t of teams) {
    r -= (t.prob?.champion || 0);
    if (r <= 0) { champ = t; break; }
  }
  return champ;
}

function runSimulations(teams: any[], n: number) {
  const getTeam = (teamsList: any[], code: string) => teamsList.find((t) => t.code === code) ?? teamsList[0];
  const counts = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    const c = simulateTournament(teams, Math.random());
    counts.set(c.code, (counts.get(c.code) ?? 0) + 1);
  }
  const arr = [...counts.entries()]
    .map(([code, wins]) => ({ team: getTeam(teams, code), wins, pct: (wins / n) * 100 }))
    .sort((a, b) => b.wins - a.wins);
  return arr;
}
import { Play, RefreshCw, Sparkles, Crown } from "lucide-react";
import { SectionHeader } from "./ProbabilityExplorer";

type Row = ReturnType<typeof runSimulations>[number];

export function Simulator({ compact = false }: { compact?: boolean }) {
  const teams = useTeams();
  const [results, setResults] = useState<Row[] | null>(null);
  const [count, setCount] = useState(0);
  const [running, setRunning] = useState(false);

  function run(n: number) {
    setRunning(true);
    setCount(n);
    setTimeout(() => {
      setResults(runSimulations(teams, n));
      setRunning(false);
    }, n >= 10000 ? 600 : 200);
  }

  const top = results?.slice(0, 6) ?? teams.slice(0, 6).map((t) => ({ team: t, wins: 0, pct: t.prob.champion }));
  const champ = results?.[0]?.team ?? teams[0];

  return (
    <section id="simulator" className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      {!compact && (
        <SectionHeader
          eyebrow="Tournament Simulator"
          title="Simulate every World Cup. 10,000 times."
          sub="Powered by Elo ratings, recent form and squad value. See who lifts the trophy across thousands of parallel universes."
        />
      )}
      <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="glass-strong rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Most Likely Champion</div>
              <div className="mt-1 flex items-center gap-3">
                <CountryFlag code={champ.code} flag={champ.flag} name={champ.name} className="h-10 w-14" emojiClassName="text-4xl" />
                <div>
                  <div className="font-display text-2xl font-semibold">{champ.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {results ? `${results[0].pct.toFixed(1)}% of ${count.toLocaleString()} simulations` : "Run a simulation to begin"}
                  </div>
                </div>
                <Crown className="ml-2 h-8 w-8 text-gold animate-float" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <SimBtn onClick={() => run(1)} label="Run 1" disabled={running} />
              <SimBtn onClick={() => run(100)} label="Run 100" disabled={running} />
              <SimBtn primary onClick={() => run(10000)} label="Run 10,000" disabled={running} icon={running ? RefreshCw : Play} spin={running} />
            </div>
          </div>

          <div className="mt-6 space-y-2">
            {top.map((r, i) => {
              const max = top[0].pct || 1;
              const w = (r.pct / max) * 100;
              return (
                <div key={r.team.code} className="grid grid-cols-[28px_120px_1fr_60px] items-center gap-3">
                  <div className="text-xs text-muted-foreground tabular-nums">#{i + 1}</div>
                  <div className="flex items-center gap-2">
                    <CountryFlag code={r.team.code} flag={r.team.flag} name={r.team.name} className="h-5 w-7" emojiClassName="text-lg" />
                    <span className="text-sm font-medium truncate">{r.team.name}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-neon to-neon-2 transition-[width] duration-500" style={{ width: `${w}%` }} />
                  </div>
                  <div className="text-right text-sm font-semibold tabular-nums text-neon">{r.pct.toFixed(1)}%</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3">
          <InsightCard
            label="Most Likely Final"
            value={
              results ? (
                <span className="inline-flex items-center gap-2">
                  <CountryFlag code={results[0].team.code} flag={results[0].team.flag} name={results[0].team.name} className="h-4 w-6" emojiClassName="text-base" />
                  <span>{results[0].team.code}</span>
                  <span>vs</span>
                  <CountryFlag code={results[1].team.code} flag={results[1].team.flag} name={results[1].team.name} className="h-4 w-6" emojiClassName="text-base" />
                  <span>{results[1].team.code}</span>
                </span>
              ) : "—"
            }
            sub="Based on simulated brackets"
          />
          <InsightCard label="Golden Boot" value={`🇫🇷 K. Mbappé · 7 goals`} sub="Avg leading scorer" />
          <InsightCard
            label="Surprise Team"
            value={
              <span className="inline-flex items-center gap-2">
                <CountryFlag code="MAR" flag={teams.find((t) => t.code === "MAR")?.flag} name="Morocco" className="h-4 w-6" emojiClassName="text-base" />
                <span>Morocco · SF</span>
              </span>
            }
            sub="Outperforms ranking by 12 places"
          />
          <InsightCard
            label="Dark Horse Rank"
            value={
              <span className="inline-flex items-center gap-2">
                <CountryFlag code="NOR" flag={teams.find((t) => t.code === "NOR")?.flag} name="Norway" className="h-4 w-6" emojiClassName="text-base" />
                <span>Norway · #5 rising</span>
              </span>
            }
            sub="+8 spots vs preseason"
          />
          <div className="glass rounded-2xl p-4 text-xs text-muted-foreground">
            <Sparkles className="mb-1 h-4 w-4 text-neon" />
            Simulations use weighted Elo + champion priors. Toy model for entertainment.
          </div>
        </div>
      </div>
    </section>
  );
}

function SimBtn({ label, onClick, disabled, primary, icon: Icon, spin }: { label: string; onClick: () => void; disabled?: boolean; primary?: boolean; icon?: any; spin?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${primary ? "bg-gradient-to-r from-neon to-neon-2 text-background neon-border hover:opacity-90" : "glass hover:bg-white/10"}`}
    >
      {Icon && <Icon className={`h-4 w-4 ${spin ? "animate-spin" : ""}`} />}
      {label}
    </button>
  );
}

function InsightCard({ label, value, sub }: { label: string; value: React.ReactNode; sub: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-base font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}
