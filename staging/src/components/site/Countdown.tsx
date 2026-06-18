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
        <div key={label} className="glass rounded-xl px-3 py-3 text-center">
          <div
            suppressHydrationWarning
            className="font-display text-2xl sm:text-3xl font-black tabular-nums leading-none text-foreground"
            style={{
              textShadow: "0 0 16px rgba(255,255,255,0.15), 0 2px 6px rgba(0,0,0,0.2)",
            }}
          >
            {String(v).padStart(2, "0")}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
        </div>
      ))}
    </div>
  );
}