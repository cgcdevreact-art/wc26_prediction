"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if the user has already made a choice
    const consent = localStorage.getItem("wc26-cookie-consent");
    if (!consent) {
      // Show the cookie consent banner after a short delay
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("wc26-cookie-consent", "accepted");
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem("wc26-cookie-consent", "declined");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full mx-auto px-4 sm:px-0 animate-in fade-in slide-in-from-bottom-5 duration-500">
      <div className="bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border border-slate-200/50 dark:border-white/10 shadow-2xl rounded-2xl p-5 relative overflow-hidden">
        {/* Decorative corner glow */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-full blur-xl pointer-events-none" />
        
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 p-2 shrink-0 border border-emerald-500/20">
            <Cookie className="h-5 w-5" />
          </div>
          
          <div className="space-y-2.5">
            <h4 className="font-display font-bold text-sm text-slate-900 dark:text-white">
              Cookie Preferences
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We use cookies to analyze traffic, store prediction states, and customize ads. By agreeing, you accept our cookie usage as detailed in the{" "}
              <Link href="/privacy" className="text-primary hover:underline font-semibold transition-colors">
                Privacy Policy
              </Link>
              .
            </p>
            
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleAccept}
                className="flex-grow py-2 px-3 text-center rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-md shadow-emerald-500/10 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                Accept All
              </button>
              <button
                onClick={handleDecline}
                className="flex-grow py-2 px-3 text-center rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-500/5 text-slate-700 dark:text-slate-350 text-xs font-semibold transition-colors cursor-pointer"
              >
                Decline
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsVisible(false)}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors p-1"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
