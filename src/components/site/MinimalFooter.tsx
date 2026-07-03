"use client";

import Link from "next/link";

export function MinimalFooter() {
  return (
    <footer className="w-full py-6 border-t border-border/40 dark:border-white/5">
      <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <div>© 2026 WC26 Predict · Fan Platform.</div>
        <div className="flex items-center gap-4">
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy
          </Link>
          <Link href="/disclaimer" className="hover:text-foreground transition-colors">
            Disclaimer
          </Link>
        </div>
      </div>
    </footer>
  );
}
