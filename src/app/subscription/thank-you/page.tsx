"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import {
  Check, X, Sparkles, Trophy, Cpu, Sliders, FolderKanban, Users, Lock, Unlock, RefreshCw, AlertCircle, ArrowRight
} from "lucide-react";

export default function SubscriptionThankYouPage() {
  const { data: session, update: updateSession } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  const tierParam = searchParams.get("tier") || "plus"; // default to plus if unspecified
  const isPro = tierParam === "pro";

  const [isSyncing, setIsSyncing] = useState(true);
  const [syncAttempts, setSyncAttempts] = useState(0);

  // Poll user session in background to confirm DB tier has updated
  useEffect(() => {
    const currentSessionTier = session?.user?.subscriptionTier;

    if (currentSessionTier === tierParam) {
      setIsSyncing(false);
      return;
    }

    if (syncAttempts >= 5) {
      setIsSyncing(false);
      return;
    }

    const timer = setTimeout(async () => {
      await updateSession();
      setSyncAttempts((prev) => prev + 1);
    }, 2000);

    return () => clearTimeout(timer);
  }, [session, tierParam, syncAttempts, updateSession]);

  const targetPlanName = isPro ? "Expert Predictor" : "Advanced Predictor";

  // Comparison configurations
  const comparisonData = {
    free: [
      { text: "Limited to 5 simulations", allowed: false, icon: <Cpu className="w-4 h-4" /> },
      { text: "Base simulation model only", allowed: false, icon: <Sparkles className="w-4 h-4" /> },
      { text: "Locked player sliders", allowed: false, icon: <Sliders className="w-4 h-4" /> },
      { text: "Locked custom squads", allowed: false, icon: <Users className="w-4 h-4" /> },
      { text: "Basic predictions list view", allowed: false, icon: <FolderKanban className="w-4 h-4" /> },
    ],
    upgraded: isPro
      ? [
          { text: "Unlimited tournament simulations", allowed: true, icon: <Cpu className="w-4 h-4" /> },
          { text: "Pro simulation engine (pitch & tactics)", allowed: true, icon: <Sparkles className="w-4 h-4" /> },
          { text: "Unlocked player rating adjustment sliders", allowed: true, icon: <Sliders className="w-4 h-4" /> },
          { text: "Unlocked squad rosters (Players In/Out)", allowed: true, icon: <Users className="w-4 h-4" /> },
          { text: "Visual line charts comparison dashboard", allowed: true, icon: <FolderKanban className="w-4 h-4" /> },
        ]
      : [
          { text: "Unlimited tournament simulations", allowed: true, icon: <Cpu className="w-4 h-4" /> },
          { text: "Advanced simulation model (squad & form)", allowed: true, icon: <Sparkles className="w-4 h-4" /> },
          { text: "Unlocked player rating adjustment sliders", allowed: true, icon: <Sliders className="w-4 h-4" /> },
          { text: "Locked custom squads", allowed: false, icon: <Users className="w-4 h-4" /> },
          { text: "Visual line charts comparison dashboard", allowed: true, icon: <FolderKanban className="w-4 h-4" /> },
        ],
  };

  return (
    <div className="min-h-screen bg-hero text-foreground flex flex-col justify-between">
      <Header />

      <main className="container mx-auto px-4 py-16 flex-grow flex flex-col items-center justify-center">
        <div className="max-w-4xl w-full text-center">
          
          <div className="inline-flex items-center gap-1.5 rounded-full glass px-3.5 py-1 text-[10px] uppercase tracking-[0.2em] text-neon mb-4">
            Subscription Activated
          </div>
          
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground dark:text-white sm:text-4xl mb-2">
            Welcome to <span className="text-gradient">{targetPlanName}</span>!
          </h1>

          <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-12 leading-relaxed">
            Your billing is configured. Experience the difference as your account transitions from free to premium.
          </p>

          {/* Syncing Status Indicator */}
          {isSyncing && (
            <div className="max-w-xs mx-auto mb-8 p-2.5 rounded-xl glass border border-border/50 flex items-center justify-center gap-2 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 text-neon animate-spin" />
              <span className="text-[10px] font-semibold text-muted-foreground">
                Syncing premium permissions...
              </span>
            </div>
          )}

          {!isSyncing && session?.user?.subscriptionTier !== tierParam && (
            <div className="max-w-xs mx-auto mb-8 p-3 rounded-xl glass border border-amber-500/20 flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="text-left flex-grow">
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block">
                  Sync Pending
                </span>
              </div>
              <button
                onClick={async () => {
                  setIsSyncing(true);
                  await updateSession();
                  setIsSyncing(false);
                }}
                className="px-2.5 py-0.5 bg-amber-500 hover:bg-amber-600 text-white rounded text-[9px] font-bold transition"
              >
                Sync
              </button>
            </div>
          )}

          {/* Visual Transition Layout Bridge */}
          <div className="flex flex-col md:flex-row items-stretch gap-6 justify-center w-full mb-12 text-left">
            
            {/* Free Plan Block (Restricted State) */}
            <div className="w-full md:w-5/12 glass p-6 rounded-3xl border border-slate-250/50 dark:border-white/5 opacity-40 bg-white/20 dark:bg-transparent flex flex-col justify-between transition-all duration-500 hover:opacity-60">
              <div>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/50">
                  <div>
                    <h3 className="font-display font-bold text-xs text-muted-foreground">Free Predictor</h3>
                    <p className="text-[9px] text-muted-foreground">Legacy limitations</p>
                  </div>
                  <div className="p-1.5 rounded-lg bg-muted border border-border">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>

                <ul className="space-y-4">
                  {comparisonData.free.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-3">
                      <div className="text-slate-400 shrink-0">
                        {item.icon}
                      </div>
                      <span className="text-xs text-muted-foreground flex-grow line-through decoration-slate-400/50">
                        {item.text}
                      </span>
                      <X className="w-3.5 h-3.5 text-rose-500/50 shrink-0" />
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Transition Arrow Bridge */}
            <div className="flex flex-row md:flex-col items-center justify-center shrink-0 gap-2 self-center my-4 md:my-0">
              <div className="h-0.5 w-6 md:w-0.5 md:h-12 bg-gradient-to-r md:bg-gradient-to-b from-slate-400 to-neon opacity-20" />
              <div className="w-9 h-9 rounded-full glass border border-neon/30 flex items-center justify-center shadow-lg transition-transform duration-500 hover:rotate-180 cursor-pointer">
                <ArrowRight className="w-4 h-4 text-neon rotate-90 md:rotate-0" />
              </div>
              <div className="h-0.5 w-6 md:w-0.5 md:h-12 bg-gradient-to-r md:bg-gradient-to-b from-neon to-neon-2 opacity-30" />
            </div>

            {/* Upgraded Plan Block (Unlocked State) */}
            <div className={`w-full md:w-6/12 glass p-6 rounded-3xl border relative flex flex-col justify-between transition-all duration-500 hover:scale-[1.02] bg-gradient-to-b ${
              isPro 
                ? "from-purple-500/[0.04] to-transparent border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.08)] hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]"
                : "from-blue-500/[0.04] to-transparent border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.08)] hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]"
            }`}>
              <div className="absolute -top-3 right-6 rounded-full bg-gradient-to-r from-neon to-neon-2 px-3 py-0.5 text-[9px] font-black uppercase tracking-wider text-background shadow-md neon-border select-none">
                Active Now
              </div>

              <div>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/50">
                  <div>
                    <h3 className="font-display font-bold text-xs text-foreground">{targetPlanName}</h3>
                    <p className="text-[9px] text-neon font-semibold uppercase tracking-wider">Plan Activated</p>
                  </div>
                  <div className={`p-1.5 rounded-lg border ${
                    isPro ? "bg-purple-500/10 border-purple-500/20" : "bg-blue-500/10 border-blue-500/20"
                  }`}>
                    <Unlock className={`w-3.5 h-3.5 ${isPro ? "text-purple-500" : "text-blue-500"}`} />
                  </div>
                </div>

                <ul className="space-y-4">
                  {comparisonData.upgraded.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-3">
                      <div className={`shrink-0 ${item.allowed ? "text-neon" : "text-slate-400"}`}>
                        {item.icon}
                      </div>
                      <span className={`text-xs flex-grow font-semibold ${
                        item.allowed ? "text-foreground" : "text-muted-foreground/50 line-through decoration-slate-400/50"
                      }`}>
                        {item.text}
                      </span>
                      {item.allowed ? (
                        <Check className="w-4 h-4 text-neon shrink-0 font-bold animate-pulse" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-rose-500/50 shrink-0" />
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={() => router.push("/simulator")}
              className="px-6 py-3 rounded-xl text-xs font-bold text-background bg-gradient-to-r from-neon to-neon-2 neon-border hover:opacity-90 transition duration-200 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Cpu className="w-4 h-4" />
              <span>Go to Simulator</span>
            </button>
            <button
              onClick={() => router.push("/predictions")}
              className="px-6 py-3 rounded-xl text-xs font-bold glass hover:bg-black/5 dark:hover:bg-white/5 text-foreground transition duration-200 active:scale-95"
            >
              Go to Compare Dashboard
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
