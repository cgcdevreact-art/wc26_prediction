"use client";

import { Award, Crown, Flame, Share2, Star, Target, Trophy, Zap } from "lucide-react";
import { SectionHeader } from "./ProbabilityExplorer";

const BADGES = [
  { icon: Crown, name: "Champion Predictor", desc: "Called the World Cup winner" },
  { icon: Target, name: "Prediction Master", desc: "80%+ accuracy over 10 games" },
  { icon: Zap, name: "Upset Hunter", desc: "Nailed 3 underdog wins" },
  { icon: Star, name: "Perfect Round", desc: "All 8 R16 picks correct" },
  { icon: Flame, name: "Streak King", desc: "10 in a row" },
  { icon: Award, name: "World Cup Expert", desc: "Top 1% global" },
];

const LEADERBOARD = [
  { rank: 1, name: "MaradonaFan10", country: "🇦🇷", pts: 1284 },
  { rank: 2, name: "PitchPerfect", country: "🇪🇸", pts: 1241 },
  { rank: 3, name: "TikiTaka", country: "🇧🇷", pts: 1198 },
  { rank: 4, name: "OffsideTrap", country: "🇩🇪", pts: 1175 },
  { rank: 5, name: "GoalMachine", country: "🇫🇷", pts: 1142 },
];

const CHALLENGES = [
  { title: "Predict Today's Matches", reward: "+120 pts", emoji: "⚽" },
  { title: "Pick Today's Top Scorer", reward: "+80 pts", emoji: "🥇" },
  { title: "Call the Biggest Upset", reward: "+250 pts", emoji: "💥" },
];

export function Engagement() {
  return (
    <section className="container mx-auto px-4 py-16 ">
      <SectionHeader eyebrow="Compete · Earn · Share" title="Glory has a leaderboard." sub="Daily challenges, badges that show off your call, and a global ranking you can climb." />
      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <div className="glass-strong rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="font-display text-lg font-semibold flex items-center gap-2"><Trophy className="h-5 w-5 text-gold" /> Global Leaderboard</div>
            <div className="text-xs text-muted-foreground">Updated live</div>
          </div>
          <div className="mt-4 space-y-1.5">
            {LEADERBOARD.map((u) => (
              <div key={u.rank} className="grid grid-cols-[40px_1fr_auto] items-center gap-3 rounded-lg bg-white/[0.04] px-3 py-2.5">
                <div className={`text-sm font-bold ${u.rank === 1 ? "text-gold" : "text-muted-foreground"}`}>#{u.rank}</div>
                <div className="flex items-center gap-2 min-w-0">
                  <span>{u.country}</span>
                  <span className="truncate text-sm font-semibold">{u.name}</span>
                </div>
                <div className="text-sm font-semibold text-neon tabular-nums">{u.pts.toLocaleString()} pts</div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className="glass rounded-2xl p-5">
            <div className="font-display text-lg font-semibold">Daily Challenges</div>
            <div className="mt-3 space-y-2">
              {CHALLENGES.map((c) => (
                <div key={c.title} className="flex items-center justify-between rounded-lg bg-white/[0.04] p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{c.emoji}</span>
                    <div>
                      <div className="text-sm font-semibold">{c.title}</div>
                      <div className="text-xs text-neon">{c.reward}</div>
                    </div>
                  </div>
                  <button className="rounded-md bg-gradient-to-r from-neon to-neon-2 px-3 py-1.5 text-xs font-semibold text-background">Play</button>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-2xl p-5">
            <div className="font-display text-lg font-semibold flex items-center gap-2"><Share2 className="h-4 w-4 text-neon" /> Share your call</div>
            <p className="mt-1 text-xs text-muted-foreground">"Brazil has a 11.9% chance to win World Cup 2026 — here's my bracket."</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {["X", "Facebook", "Instagram", "WhatsApp"].map((p) => (
                <button key={p} className="rounded-md glass px-3 py-1.5 hover:bg-white/10">{p}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10">
        <div className="font-display text-lg font-semibold mb-3">Achievements & Badges</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {BADGES.map((b) => (
            <div key={b.name} className="glass rounded-2xl p-4 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-neon/30 to-neon-2/20 text-neon">
                <b.icon className="h-5 w-5" />
              </div>
              <div className="mt-2 text-sm font-semibold">{b.name}</div>
              <div className="text-[11px] text-muted-foreground">{b.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}