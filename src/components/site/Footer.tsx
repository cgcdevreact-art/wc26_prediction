"use client";

import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/5 mt-5">
      <div className="container mx-auto px-4 pt-10 pb-4">
        <Link
          href="/predictions/country"
          className="block overflow-hidden rounded-2xl border border-black/8 shadow-lg transition-opacity duration-300 hover:opacity-95 dark:border-white/10"
        >
          <Image
            src="/footerbanner100k.png"
            alt="FIFA World Cup 2026 Banner"
            width={1600}
            height={500}
            className="h-auto w-full"
          />
        </Link>
      </div>
      <div className="container mx-auto grid gap-6 px-4 py-10 sm:grid-cols-2 lg:grid-cols-5">
        <div className="sm:col-span-2 lg:col-span-2 xl:col-span-1">
          <div className="flex items-center gap-2">
            <span className="flex h-8 items-center">
              <Image
                src="/26wc-logo.png"
                alt="WC26 Predict"
                width={58}
                height={32}
                className="h-8 w-auto"
              />
            </span>
            <div className="font-semibold">2026 World Cup <span className="text-gradient">PREDICTION</span></div>
          </div>
          <p className="mt-3 max-w-md text-xs text-muted-foreground">The most intelligent way to predict World Cup 2026. <br /> Picks. Probabilities. Glory.</p>
        </div>
        <FooterCol
          title="Predict"
          items={[
            { label: "Simulator", href: "/simulator" },
            { label: "Compare", href: "/teams/compare" },
            { label: "Bracket", href: "/bracket" },
            { label: "Home", href: "/" }
          ]}
        />
        <FooterCol
          title="Compete"
          items={[
            { label: "My Predictions", href: "/predictions" },
            { label: "Pricing", href: "/subscription" }
          ]}
        />
        <FooterCol
          title="Data"
          items={[
            { label: "Rankings", href: "/teams" },
            { label: "Elo Ratings", href: "/teams" },
            { label: "Country Predict", href: "/predictions/country" },
            { label: "Teams Info", href: "/teams" }
          ]}
        />
        <FooterCol
          title="Legal"
          items={[
            { label: "Terms & Conditions", href: "/terms" },
            { label: "Disclaimer", href: "/disclaimer" },
            { label: "Privacy Policy", href: "/privacy" },
            // { label: "Data Deletion", href: "/data-deletion" }
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
            <Link className="text-muted-foreground hover:text-foreground transition-colors" href={i.href}>
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
