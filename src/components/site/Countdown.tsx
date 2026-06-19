"use client";

import { useEffect, useState } from "react";
const WORLD_CUP_FINAL = new Date("2026-07-19T16:00:00-04:00");

function diff(target: Date) {
  const ms = Math.max(0, target.getTime() - Date.now());
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms / 3600000) % 24);
  const m = Math.floor((ms / 60000) % 60);
  const s = Math.floor((ms / 1000) % 60);
  return { d, h, m, s };
}

export function Countdown() {
  const [t, setT] = useState(() => diff(WORLD_CUP_FINAL));
  useEffect(() => {
    const i = setInterval(() => setT(diff(WORLD_CUP_FINAL)), 1000);
    return () => clearInterval(i);
  }, []);
  const items: [string, number][] = [["Days", t.d], ["Hours", t.h], ["Minutes", t.m], ["Seconds", t.s]];
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      {items.map(([label, v]) => (
        <div
          key={label}
          className="rounded-xl border border-slate-200/80 bg-white/85 px-3 py-3 text-center shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_12px_28px_rgba(0,0,0,0.22)]"
        >
          <div
            suppressHydrationWarning
            className="font-display text-2xl sm:text-3xl font-black tabular-nums leading-none text-rose-700 dark:text-rose-500"
            style={{
              textShadow: "0 0 14px rgba(190,24,93,0.12), 0 2px 8px rgba(15,23,42,0.12)",
            }}
          >
            {String(v).padStart(2, "0")}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300">{label}</div>
        </div>
      ))}
    </div>
  );
}
