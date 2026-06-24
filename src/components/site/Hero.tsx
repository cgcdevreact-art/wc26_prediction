"use client";

import { useTeams } from "@/components/TeamsProvider";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { Countdown } from "./Countdown";
import { HOME_SECTION_OPEN_EVENT } from "./HomeSectionsAccordion";
import { Trophy, Sparkles, ArrowRight } from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, XAxis, Cell, Tooltip } from "recharts";
import { useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AuthModal } from "./AuthModal";

export function Hero() {
  const teams = useTeams();
  const top = [...teams].sort((a, b) => b.prob.champion - a.prob.champion).slice(0, 8);
  const { data: session } = useSession();
  const router = useRouter();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const handleSimulationClick = () => {
    if (session) {
      router.push("/predictions/country");
    } else {
      setAuthModalOpen(true);
    }
  };

  const handleStartPredictingClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();

    window.dispatchEvent(new CustomEvent(HOME_SECTION_OPEN_EVENT, {
      detail: { section: "probability" },
    }));
    window.history.replaceState(null, "", "#predict");

    requestAnimationFrame(() => {
      document.getElementById("predict")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  return (
    <section className="relative overflow-hidden bg-hero">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-20 h-72 w-72 rounded-full bg-neon/20 blur-3xl" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-neon-2/20 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neon/60 to-transparent" />
      </div>
      <div className="relative mx-auto grid container mx-auto px-4 gap-10  py-16 md:px-6 md:py-24 lg:grid-cols-2 lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs uppercase tracking-[0.25em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-neon" /> FIFA World Cup 2026 · USA · Canada · Mexico
          </div>
          <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] sm:text-5xl md:text-6xl">
            Who Will Win the <span className="text-gradient">World Cup 2026</span>?
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            Run simulations, predict every match, build your bracket and compete with millions. Real probabilities. Real glory.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              onClick={handleSimulationClick}
              className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-neon to-neon-2 px-5 py-3 text-sm font-semibold text-background neon-border transition hover:opacity-90 cursor-pointer"
            >
              Run Simulation <ArrowRight className="h-4 w-4" />
            </button>
            <a
              href="#predict"
              onClick={handleStartPredictingClick}
              className="rounded-md glass px-5 py-3 text-sm font-semibold hover:bg-white/10"
            >
              Start Predicting
            </a>
          </div>
          <div className="mt-8">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Countdown to Final</div>
              <div className="text-xs text-muted-foreground">Jul 19, 2026 · New York New Jersey Stadium</div>
            </div>
            <Countdown />
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 rounded-3xl bg-gradient-to-tr from-neon/20 via-transparent to-neon-2/20 blur-2xl" />
          <div className="relative glass-strong rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Live Win Probability</div>
                <div className="font-display text-xl font-semibold">Top contenders</div>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-gold/80 to-gold/30 animate-float text-background neon-border">
                <Trophy className="h-6 w-6" />
              </div>
            </div>

            <div className="mt-5 h-56">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <BarChart data={top} margin={{ top: 16, right: 8, left: 0, bottom: 0 }} barCategoryGap={18}>
                  <defs>
                    <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-neon)" />
                      <stop offset="100%" stopColor="var(--color-neon-2)" />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="code" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    contentStyle={{ background: "var(--color-popover)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                    formatter={(v: any) => [`${Number(v).toFixed(1)}%`, "Win Cup"]}
                  />
                  <Bar dataKey="prob.champion" radius={[8, 8, 4, 4]}>
                    {top.map((t, i) => <Cell key={i} fill="url(#barFill)" />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2 text-center">
              {top.slice(0, 4).map((t) => (
                <div key={t.code} className="rounded-lg border border-black/8 bg-black/8 p-2 dark:border-white/8 dark:bg-white/5">
                  <div className="flex justify-center">
                    <CountryFlag code={t.code} flag={t.flag} name={t.name} className="h-6 w-8" emojiClassName="text-xl" />
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.code}</div>
                  <div className="text-sm font-semibold text-neon">{t.prob.champion.toFixed(1)}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </section>
  );
}
