"use client";

import Image from "next/image";
import Link from "next/link";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export function MinimalHeader() {
  const { theme, setTheme } = useTheme();
  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <header className="w-full z-40 bg-transparent border-b border-border/40 dark:border-white/5">
      <div className="container mx-auto flex px-4 items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2 shrink-0 select-none">
          <Image
            src="/26wc-logo.png"
            alt="WC26 Predict"
            width={48}
            height={26}
            className="h-7 w-auto"
            priority
          />
          <div className="leading-tight">
            <div className="text-xs font-semibold tracking-wide uppercase">
              2026 WC <span className="text-gradient">PREDICTION</span>
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition duration-200"
            aria-label="Toggle theme"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <Sun className="h-4.5 w-4.5 text-amber-400" />
            ) : (
              <Moon className="h-4.5 w-4.5 text-indigo-650" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
