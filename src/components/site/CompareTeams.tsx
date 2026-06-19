"use client";

import { useMemo, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { useTeams } from "@/components/TeamsProvider";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Legend } from "recharts";
import { SectionHeader } from "./ProbabilityExplorer";
import { ArrowLeftRight } from "lucide-react";
import { CountryFlag } from "@/components/ui/CountryFlag";

export function CompareTeams({ standalone = false }: { standalone?: boolean }) {
  const teams = useTeams();
  const { theme } = useTheme();
  const [a, setA] = useState("ARG");
  const [b, setB] = useState("BRA");
  const tA = teams.find(t => t.code === a) || teams[0];
  const tB = teams.find(t => t.code === b) || teams[0];

  const activeTheme = useMemo(() => {
    if (theme === "system") {
      if (typeof window !== "undefined") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }
      return "dark";
    }
    return theme;
  }, [theme]);

  const radarGridStroke = activeTheme === "light" ? "rgba(71,85,105,0.28)" : "rgba(255,255,255,0.18)";
  const radarAxisFill = activeTheme === "light" ? "rgba(15,23,42,0.78)" : "rgba(255,255,255,0.72)";
  const radarLegendColor = activeTheme === "light" ? "rgba(51,65,85,0.9)" : "rgba(226,232,240,0.9)";

  const data = [
    { axis: "Attack", a: tA.attack, b: tB.attack },
    { axis: "Defense", a: tA.defense, b: tB.defense },
    { axis: "Power", a: tA.power, b: tB.power },
    { axis: "GPM", a: tA.goalsPerMatch * 30, b: tB.goalsPerMatch * 30 },
    { axis: "Squad", a: Math.min(99, tA.squadValueM / 15), b: Math.min(99, tB.squadValueM / 15) },
    { axis: "Elo", a: (tA.elo - 1500) / 7, b: (tB.elo - 1500) / 7 },
  ];

  const rows: [string, string | number, string | number, "higher" | "lower"][] = [
    ["Win Probability", `${tA.prob.champion.toFixed(1)}%`, `${tB.prob.champion.toFixed(1)}%`, "higher"],
    ["FIFA Ranking", `#${tA.rank}`, `#${tB.rank}`, "lower"],
    ["Elo Rating", tA.elo, tB.elo, "higher"],
    ["Attack Rating", tA.attack, tB.attack, "higher"],
    ["Defense Rating", tA.defense, tB.defense, "higher"],
    ["Squad Value", `€${tA.squadValueM}M`, `€${tB.squadValueM}M`, "higher"],
    ["Average Age", tA.avgAge.toFixed(1), tB.avgAge.toFixed(1), "lower"],
    ["Goals / Match", tA.goalsPerMatch.toFixed(2), tB.goalsPerMatch.toFixed(2), "higher"],
  ];

  return (
    <section className={standalone ? "mx-auto max-w-7xl px-4 py-10 md:px-6" : "mx-auto max-w-7xl px-4 py-16 md:px-6"}>
      {!standalone && (
        <SectionHeader eyebrow="Compare Teams" title="Head-to-head, every metric." sub="Stack two nations side by side across the metrics that actually predict tournaments." />
      )}
      <div className="mt-8 grid gap-5 lg:grid-cols-2 min-w-0">
        <div className="glass-strong rounded-2xl p-5 min-w-0 overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <TeamPicker value={a} onChange={setA} accent="neon" />
            <button onClick={() => { setA(b); setB(a); }} className="grid h-10 w-10 place-items-center rounded-full bg-white/5 hover:bg-white/10" aria-label="swap">
              <ArrowLeftRight className="h-4 w-4" />
            </button>
            <TeamPicker value={b} onChange={setB} accent="neon-2" />
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <RadarChart data={data} outerRadius={80}>
                <PolarGrid stroke={radarGridStroke} />
                <PolarAngleAxis dataKey="axis" tick={{ fill: radarAxisFill, fontSize: 11, fontWeight: 600 }} />
                <Radar name={tA.code} dataKey="a" stroke="var(--color-neon)" fill="var(--color-neon)" fillOpacity={0.3} />
                <Radar name={tB.code} dataKey="b" stroke="var(--color-neon-2)" fill="var(--color-neon-2)" fillOpacity={0.3} />
                <Legend wrapperStyle={{ fontSize: 12, color: radarLegendColor }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="grid grid-cols-[1fr_90px_90px] gap-2 border-b border-white/5 pb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            <div>Metric</div>
            <div className="flex items-center justify-end gap-2 text-right">
              <CountryFlag code={tA.code} flag={tA.flag} name={tA.name} className="h-4 w-6 rounded-[2px] object-cover" emojiClassName="text-base leading-none" />
              <span>{tA.code}</span>
            </div>
            <div className="flex items-center justify-end gap-2 text-right">
              <CountryFlag code={tB.code} flag={tB.flag} name={tB.name} className="h-4 w-6 rounded-[2px] object-cover" emojiClassName="text-base leading-none" />
              <span>{tB.code}</span>
            </div>
          </div>
          {rows.map(([label, va, vb, dir]) => {
            const na = parseFloat(String(va).replace(/[^\d.-]/g, ""));
            const nb = parseFloat(String(vb).replace(/[^\d.-]/g, ""));
            const aBetter = dir === "higher" ? na > nb : na < nb;
            return (
              <div key={label} className="grid grid-cols-[1fr_90px_90px] items-center gap-2 border-b border-white/5 py-2 text-sm">
                <div className="text-muted-foreground">{label}</div>
                <div className={`text-right font-semibold ${aBetter ? "text-neon" : ""}`}>{va}</div>
                <div className={`text-right font-semibold ${!aBetter ? "text-[var(--color-neon-2)]" : ""}`}>{vb}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TeamPicker({ value, onChange, accent }: { value: string; onChange: (v: string) => void; accent: "neon" | "neon-2" }) {
  const teams = useTeams();
  const t = teams.find(team => team.code === value) || teams[0];
  const ring = accent === "neon" ? "ring-neon/40" : "ring-[var(--color-neon-2)]/40";
  return (
      <div className={`rounded-2xl bg-white/5 p-3 ring-1 ${ring}`}>
      <div className="flex items-center gap-3">
        <CountryFlag
          code={t.code}
          flag={t.flag}
          name={t.name}
          className="h-8 w-10 shrink-0 rounded object-cover"
          emojiClassName="text-3xl leading-none"
        />
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">#{t.rank}</div>
          <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent text-base font-semibold outline-none">
            {teams.map((tt) => (
              <option key={tt.code} value={tt.code} className="bg-popover text-foreground">{tt.name}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
