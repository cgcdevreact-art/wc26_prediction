"use client";

import { Trophy } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/5 mt-10">
      <div className="mx-auto container mx-auto px-4 py-10   grid gap-6 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-neon to-neon-2 text-background"><Trophy className="h-4 w-4" /></span>
            <div className="font-semibold">WC26 <span className="text-gradient">PREDICT</span></div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">The most engaging way to predict World Cup 2026. Probabilities. Picks. Glory.</p>
        </div>
        <FooterCol 
          title="Predict" 
          items={[
            { label: "Simulator", href: "/simulator" },
            { label: "Compare", href: "/compare" },
            { label: "Bracket", href: "/bracket" },
            { label: "Home", href: "/" }
          ]} 
        />
        <FooterCol 
          title="Compete" 
          items={[
            { label: "My Predictions", href: "/predictions" },
            { label: "Daily Challenges", href: "/predictions" },
            { label: "Badges", href: "/predictions" },
            { label: "Pricing", href: "/subscription" }
          ]} 
        />
        <FooterCol 
          title="Data" 
          items={[
            { label: "FIFA Rankings", href: "/teams" },
            { label: "Elo Ratings", href: "/teams" },
            { label: "Country Predict", href: "/predictions/country" },
            { label: "Teams Info", href: "/teams" }
          ]} 
        />
      </div>
      <div className="border-t border-white/5 py-4 text-center text-xs text-muted-foreground">© 2026 WC26 Predict · Built for fans.</div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: { label: string; href: string }[] }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{title}</div>
      <ul className="mt-3 space-y-1.5 text-sm">
        {items.map((i) => (
          <li key={i.label}>
            <a className="text-muted-foreground hover:text-foreground transition-colors" href={i.href}>
              {i.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
