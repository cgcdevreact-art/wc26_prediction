"use client";

import { useTeams } from "@/components/TeamsProvider";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { Flame, TrendingUp, Zap, Users, Activity } from "lucide-react";

export function LiveStats() {
  const teams = useTeams();
  const sorted = [...teams].sort((a, b) => b.prob.champion - a.prob.champion);
  const top = sorted[0];
  const fav = sorted[1];
  const dh = teams.find((t) => t.code === "MAR") || teams[12] || teams[0];
  const items = [
    { icon: Flame, label: "Most Predicted Champion", team: top, sub: `${top.prob.champion.toFixed(1)}% chance` },
    { icon: TrendingUp, label: "Current Favorite", team: fav, sub: `Elo ${fav.elo}` },
    { icon: Zap, label: "Dark Horse", team: dh, sub: `Rising fast · +12% this week` },
    { icon: Activity, label: "Predictions Submitted", value: "2,418,902", sub: "+18,212 today" },
    { icon: Users, label: "Active Predictors", value: "184,556", sub: "Live now" },
  ];
  return (
    <section className="border-y border-white/5 bg-gradient-to-b from-transparent to-white/[0.02]">
      <div className="container mx-auto px-4 py-6 ">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {items.map((it) => (
            <div key={it.label} className="glass rounded-xl p-3">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                <it.icon className="h-3.5 w-3.5 text-neon" />
                {it.label}
              </div>
              <div className="mt-1 text-sm font-semibold">
                {it.team ? (
                  <span className="inline-flex items-center gap-2">
                    <CountryFlag code={it.team.code} flag={it.team.flag} name={it.team.name} className="h-4 w-6" emojiClassName="text-base" />
                    <span>{it.team.name}</span>
                  </span>
                ) : (
                  it.value
                )}
              </div>
              <div className="text-[11px] text-muted-foreground">{it.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
