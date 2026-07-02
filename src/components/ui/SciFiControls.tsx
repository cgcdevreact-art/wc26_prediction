"use client";

import React from 'react';

export function StaminaBar({ value, onChange }: { value: number, onChange: (v: number) => void }) {
  // Map 0-100 to 5 equal segments
  const segments = [20, 40, 60, 80, 100];
  
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex justify-between items-end mb-1">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Physical</span>
          <span className="text-[8px] text-muted-foreground/70 uppercase tracking-widest mt-0.5">Squad Match Fitness</span>
        </div>
        <span className="text-xs font-mono font-bold text-green-500 dark:text-green-400">{value}%</span>
      </div>
      <div className="flex gap-1 h-3 w-full">
        {segments.map((seg) => {
          const isActive = value >= seg;
          return (
            <button
              key={seg}
              type="button"
              onClick={() => onChange(seg)}
              className={`flex-1 rounded-sm transition-all duration-200 ${
                isActive 
                  ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.2)]" 
                  : "bg-zinc-800 hover:bg-zinc-700"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}

export function AlignmentGauge({ value, onChange }: { value: number, onChange: (v: number) => void }) {
  // Discipline spans from -3 to +3
  const nodes = [-3, -2, -1, 0, 1, 2, 3];
  
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex justify-between items-end mb-1">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Discipline</span>
          <span className="text-[8px] text-muted-foreground/70 uppercase tracking-widest mt-0.5">Aggression & Card Risk</span>
        </div>
        <span className={`text-xs font-mono font-bold ${value > 0 ? "text-purple-500 dark:text-purple-400" : value < 0 ? "text-red-500 dark:text-red-400" : "text-muted-foreground"}`}>
          {value > 0 ? `+${value}` : value}
        </span>
      </div>
      <div className="flex gap-1 h-3 w-full">
        {nodes.map((node) => {
          let isActive = false;
          let colorClass = "bg-zinc-800";
          let glowClass = "";
          
          if (value < 0 && node < 0 && node >= value) {
            isActive = true;
            colorClass = "bg-red-500";
            glowClass = "shadow-[0_0_8px_rgba(239,68,68,0.2)]";
          } else if (value > 0 && node > 0 && node <= value) {
            isActive = true;
            colorClass = "bg-purple-500";
            glowClass = "shadow-[0_0_8px_rgba(168,85,247,0.2)]";
          } else if (value === 0 && node === 0) {
            isActive = true;
            colorClass = "bg-zinc-400";
            glowClass = "shadow-[0_0_8px_rgba(161,161,170,0.2)]";
          }

          return (
            <button
              key={node}
              type="button"
              onClick={() => onChange(node)}
              className={`flex-1 rounded-sm transition-all duration-200 ${
                isActive ? `${colorClass} ${glowClass}` : "bg-zinc-800 hover:bg-zinc-700"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}

export function TemperatureSlider({ value, onChange }: { value: number, onChange: (v: number) => void }) {
  const getTempDetails = (temp: number) => {
    if (temp < 0) return { label: "Freezing Cold", color: "text-blue-500 dark:text-blue-400", emoji: "❄️" };
    if (temp < 12) return { label: "Cold", color: "text-cyan-500 dark:text-cyan-400", emoji: "🥶" };
    if (temp <= 22) return { label: "Mild / Optimal", color: "text-emerald-600 dark:text-emerald-400", emoji: "🌿" };
    if (temp <= 32) return { label: "Warm", color: "text-amber-600 dark:text-amber-400", emoji: "☀️" };
    return { label: "Extreme Heat", color: "text-rose-600 dark:text-rose-400", emoji: "🥵" };
  };

  const details = getTempDetails(value);

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex justify-between items-end">
        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Temperature</span>
        <span className={`text-xs font-mono font-bold flex items-center gap-1.5 ${details.color}`}>
          <span>{details.emoji}</span>
          <span>{value}°C</span>
          <span className="text-[10px] opacity-75 font-sans">({details.label})</span>
        </span>
      </div>
      <div className="space-y-1.5 bg-muted/10 dark:bg-zinc-850/40 p-3.5 rounded-xl border border-border dark:border-zinc-800/50">
        <div className="relative flex items-center select-none">
          <span className="text-xs mr-2 select-none">❄️</span>
          <input
            type="range"
            min={-5}
            max={45}
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer focus:outline-none bg-gradient-to-r from-blue-500 via-emerald-400 to-red-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(255,255,255,0.8)] [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0"
          />
          <span className="text-xs ml-2 select-none">🔥</span>
        </div>
        <div className="flex justify-between text-[8px] font-bold text-muted-foreground uppercase tracking-wider px-6">
          <span>-5°C</span>
          <span>10°C</span>
          <span className="text-emerald-600 dark:text-emerald-400">20°C (Opt)</span>
          <span>30°C</span>
          <span>45°C</span>
        </div>
      </div>
    </div>
  );
}
