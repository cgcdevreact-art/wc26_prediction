"use client";

import { useTeams } from "@/components/TeamsProvider";
import { SectionHeader } from "./ProbabilityExplorer";
import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";
import { CountryFlag } from "@/components/ui/CountryFlag";

const QF = [
  ["ARG", "GER"],
  ["FRA", "POR"],
  ["ESP", "NED"],
  ["BRA", "ENG"],
] as const;

export function BracketPreview() {
  const sf = [
    [QF[0][0], QF[1][0]],
    [QF[2][0], QF[3][0]],
  ] as const;
  const finalists = [sf[0][0], sf[1][0]];
  const champ = "ARG";
  return (
    <section className="container mx-auto px-4 py-16 ">
      <SectionHeader eyebrow="Knockout Bracket" title="Build your bracket. Share your champion." sub="Drag-and-drop your way through QF, SF and Final. Lock in your winner and share a card with friends." />
      <div className="mt-8 glass-strong rounded-2xl p-6 overflow-x-auto">
        <div className="grid min-w-[820px] grid-cols-[1fr_1fr_1fr_1fr] gap-6 items-center">
          <Column title="Quarter-Finals">
            {QF.map(([h, a], i) => <Match key={i} h={h} a={a} winner={h} />)}
          </Column>
          <Column title="Semi-Finals">
            {sf.map(([h, a], i) => <Match key={i} h={h} a={a} winner={h} />)}
          </Column>
          <Column title="Final">
            <Match h={finalists[0]} a={finalists[1]} winner={champ} />
          </Column>
          <Column title="Champion">
            <div className="relative grid place-items-center rounded-2xl bg-gradient-to-br from-gold/30 to-neon/10 p-6 neon-border">
              <Trophy className="h-10 w-10 text-gold animate-float" />
              <ChampionNode code={champ} />
            </div>
          </Column>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">Sample bracket — your picks will appear here.</div>
          <Link href="/bracket" className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-neon to-neon-2 px-4 py-2 text-sm font-semibold text-background neon-border hover:opacity-90">
            Build your own <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{title}</div>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function Match({ h, a, winner }: { h: string; a: string; winner: string }) {
  const teams = useTeams();
  const home = teams.find(t => t.code === h) || teams[0];
  const away = teams.find(t => t.code === a) || teams[0];
  return (
    <div className="rounded-xl bg-white/[0.04] p-2">
      <Row team={home} winner={winner === h} />
      <div className="h-px bg-white/10 my-1" />
      <Row team={away} winner={winner === a} />
    </div>
  );
}
function Row({ team, winner }: { team: any; winner: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 ${winner ? "bg-gradient-to-r from-neon/20 to-transparent text-foreground" : "text-muted-foreground"}`}>
      <span className="flex items-center gap-2 text-sm font-medium">
        <CountryFlag code={team.code} flag={team.flag} name={team.name} className="h-4 w-6 rounded-[2px] object-cover" emojiClassName="text-sm leading-none" />
        <span className="truncate">{team.code}</span>
      </span>
      {winner && <span className="h-2 w-2 rounded-full bg-neon shadow-[0_0_8px] shadow-neon/80" />}
    </div>
  );
}

function ChampionNode({ code }: { code: string }) {
  const teams = useTeams();
  const team = teams.find(t => t.code === code) || teams[0];
  return (
    <>
      <CountryFlag code={team.code} flag={team.flag} name={team.name} className="mt-3 h-8 w-10 rounded object-cover" emojiClassName="mt-3 text-3xl leading-none" />
      <div className="mt-1 font-display text-lg font-bold">{team.name}</div>
      <div className="text-xs text-muted-foreground">World Champion 2026</div>
    </>
  );
}
