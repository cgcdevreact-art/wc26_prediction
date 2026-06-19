"use client";

import { useTeams } from "@/components/TeamsProvider";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { Brain, MapPin, Calendar } from "lucide-react";
import { SectionHeader } from "./ProbabilityExplorer";
import { useState } from "react";

const SAMPLE_FIXTURES = [
  { id: 1, date: "Jun 11", venue: "Mexico City", home: "MEX", away: "USA", homeWin: 32, draw: 28, awayWin: 40 },
  { id: 2, date: "Jun 12", venue: "Toronto", home: "CAN", away: "MAR", homeWin: 36, draw: 30, awayWin: 34 },
  { id: 3, date: "Jun 13", venue: "Los Angeles", home: "BRA", away: "ESP", homeWin: 42, draw: 26, awayWin: 32 },
  { id: 4, date: "Jun 14", venue: "New York", home: "ARG", away: "FRA", homeWin: 38, draw: 27, awayWin: 35 },
  { id: 5, date: "Jun 15", venue: "Dallas", home: "ENG", away: "GER", homeWin: 45, draw: 28, awayWin: 27 },
  { id: 6, date: "Jun 16", venue: "Atlanta", home: "POR", away: "NED", homeWin: 41, draw: 30, awayWin: 29 },
];

export function MatchCenter() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <SectionHeader eyebrow="Match Prediction Center" title="Predict every match. Earn every point." sub="Win % splits, AI analysis and head-to-head — all in one place." />
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {SAMPLE_FIXTURES.map((f) => <MatchCard key={f.id} fixture={f} />)}
      </div>
    </section>
  );
}

function MatchCard({ fixture }: { fixture: typeof SAMPLE_FIXTURES[number] }) {
  const teams = useTeams();
  const home = teams.find(t => t.code === fixture.home) || teams[0];
  const away = teams.find(t => t.code === fixture.away) || teams[0];
  const [pick, setPick] = useState<"H" | "D" | "A" | null>(null);
  const [hg, setHg] = useState(2);
  const [ag, setAg] = useState(1);

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> {fixture.date}</div>
        <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {fixture.venue}</div>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <TeamSide team={home} align="left" />
        <div className="grid place-items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1 font-mono text-xl font-bold">
            <input type="number" min={0} value={hg} onChange={e => setHg(Number(e.target.value))} className="w-6 bg-transparent text-center outline-none" />
            <span className="text-muted-foreground">-</span>
            <input type="number" min={0} value={ag} onChange={e => setAg(Number(e.target.value))} className="w-6 bg-transparent text-center outline-none" />
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Your Pick</div>
        </div>
        <TeamSide team={away} align="right" />
      </div>

      <div className="mt-6 flex items-center justify-between gap-2">
        <button onClick={() => setPick("H")} className={`flex-1 rounded-xl py-2 flex flex-col items-center justify-center transition ${pick === "H" ? "bg-gradient-to-br from-neon/20 to-neon/5 text-neon neon-border" : "bg-white/5 hover:bg-white/10 text-muted-foreground"}`}><span className="text-lg font-bold">{fixture.homeWin}%</span><span className="text-[10px] uppercase">{home.code} Win</span></button>
        <button onClick={() => setPick("D")} className={`flex-1 rounded-xl py-2 flex flex-col items-center justify-center transition ${pick === "D" ? "bg-white/20 text-foreground" : "bg-white/5 hover:bg-white/10 text-muted-foreground"}`}><span className="text-lg font-bold">{fixture.draw}%</span><span className="text-[10px] uppercase">Draw</span></button>
        <button onClick={() => setPick("A")} className={`flex-1 rounded-xl py-2 flex flex-col items-center justify-center transition ${pick === "A" ? "bg-gradient-to-bl from-neon-2/20 to-neon-2/5 text-[var(--color-neon-2)] ring-1 ring-[var(--color-neon-2)]/50" : "bg-white/5 hover:bg-white/10 text-muted-foreground"}`}><span className="text-lg font-bold">{fixture.awayWin}%</span><span className="text-[10px] uppercase">{away.code} Win</span></button>
      </div>
    </div>
  );
}

function TeamSide({ team, align }: { team: any; align: "left" | "right" }) {
  return (
      <div className={`flex items-center gap-3 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/5">
        <CountryFlag code={team.code} flag={team.flag} name={team.name} className="h-7 w-9" emojiClassName="text-2xl" />
      </div>
      <div>
        <div className="font-display font-semibold sm:text-lg">{team.code}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Elo {team.elo} · #{team.rank}</div>
      </div>
    </div>
  );
}

function ProbBtn({ label, pct, active, onClick }: { label: string; pct: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`relative overflow-hidden rounded-lg border px-2 py-2 text-left transition ${active ? "border-neon/60 bg-gradient-to-br from-neon/20 to-neon-2/10" : "border-white/10 hover:bg-white/5"}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{pct}%</div>
      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-neon to-neon-2" style={{ width: `${pct}%` }} />
    </button>
  );
}
