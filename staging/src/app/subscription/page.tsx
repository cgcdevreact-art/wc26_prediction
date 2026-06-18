"use client";

import React, { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Check, Sparkles, Trophy, Shield, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function SubscriptionPage() {
  const { data: session, status } = useSession();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const currentTier = session?.user?.subscriptionTier || "free";

  const handleSubscribe = async (tier: "plus" | "pro") => {
    if (!session) {
      toast.error("Please sign in to choose a subscription plan");
      signIn();
      return;
    }

    try {
      setLoadingTier(tier);
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned from server");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to initiate Stripe Checkout");
      setLoadingTier(null);
    }
  };

  const tiers = [
    {
      name: "Free",
      id: "free",
      price: "$0",
      description: "Basic tournament simulation and predictions.",
      icon: <Shield className="h-6 w-6 text-muted-foreground" />,
      features: [
        "Access to Base Model (Elo/Att/Def)",
        "Limited to 5 simulation credits",
        "Public Leaderboard predictions entry",
        "Group stage prediction builder",
        "Teams (Players, Elo, Att, Def, Top Player only)",
      ],
      cta: "Current Plan",
      gradient: "from-white to-slate-50 border-border dark:from-zinc-800 dark:to-zinc-900 dark:border-white/5 shadow-sm dark:shadow-none",
    },
    {
      name: "Plus",
      id: "plus",
      price: "$4.99",
      period: "/month",
      description: "Unlock advanced squad metrics and unlimited simulations.",
      icon: <Sparkles className="h-6 w-6 text-blue-500 dark:text-blue-400 animate-pulse" />,
      features: [
        "Access to Advanced Model (+Squad details)",
        "Unlimited simulations & bracket runs",
        "Weighted Elo + squad quality rating prior",
        "Unlock full team-by-team comparison engine",
        "Teams (Unlock Elite, Strong, Quality, Form, Exp)",
        "No ad-like promotional overlays",
      ],
      cta: "Upgrade to Plus",
      gradient: "from-blue-50/40 via-blue-50/20 to-transparent dark:from-blue-950/40 dark:via-[#0f1d3a] dark:to-[#071329] border-blue-200 dark:border-blue-500/20 shadow-[0_0_25px_rgba(59,130,246,0.05)] dark:shadow-[0_0_25px_rgba(59,130,246,0.15)]",
    },
    {
      name: "Pro",
      id: "pro",
      price: "$9.99",
      period: "/month",
      description: "Ultimate simulation engine with tactical variables.",
      icon: <Trophy className="h-6 w-6 text-amber-500 animate-float" />,
      features: [
        "Access to Pro Model (+Aspects & Pitch details)",
        "Unlimited simulations & bracket runs",
        "Team & Player Ratings override customization",
        "Pitch parameters (weather, crowd, referee bias)",
        "Injury & squad rotation risk factors",
        "Priority simulation execution queue",
        "Exclusive Pro Member Badge on leaderboard",
      ],
      cta: "Upgrade to Pro",
      gradient: "from-purple-50/40 via-purple-50/20 to-transparent dark:from-purple-950/40 dark:via-[#1b1236] dark:to-[#0d071e] border-purple-200 dark:border-purple-500/20 shadow-[0_0_25px_rgba(168,85,247,0.05)] dark:shadow-[0_0_25px_rgba(168,85,247,0.15)]",
    },
  ];

  return (
    <div className="min-h-screen bg-hero text-foreground">
      <Header />
      
      <main className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 rounded-full glass px-3.5 py-1 text-xs uppercase tracking-[0.25em] text-neon mb-4">
            Subscription Pricing
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground dark:text-white sm:text-5xl">
            Choose Your <span className="text-gradient">Simulation Tier</span>
          </h1>
          <p className="mt-4 text-base md:text-lg text-muted-foreground">
            Power up your predictions. Access advanced squad variables, match day factors, and unlimited computational simulations.
          </p>
        </div>

        {/* Current User Tier Banner */}
        {session && (
          <div className="max-w-md mx-auto mb-12 rounded-2xl glass-strong border border-border dark:border-white/10 p-5 text-center flex flex-col items-center justify-center animate-fade-in">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Logged in as {session.user.name}</span>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm font-semibold">Your current tier:</span>
              <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full uppercase tracking-wider ${
                currentTier === "pro"
                  ? "bg-purple-500/10 dark:bg-purple-500/20 border border-purple-500/20 dark:border-purple-500/40 text-purple-600 dark:text-purple-400"
                  : currentTier === "plus"
                  ? "bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 dark:border-blue-500/40 text-blue-600 dark:text-blue-400"
                  : "bg-zinc-500/10 dark:bg-zinc-500/20 border border-zinc-500/20 dark:border-zinc-500/40 text-zinc-600 dark:text-zinc-400"
              }`}>
                {currentTier}
              </span>
            </div>
            {currentTier === "free" && (
              <span className="text-xs text-muted-foreground mt-2">
                Simulations Used: <strong className="text-neon">{session.user.freeModelUsageCount}</strong> / 5
              </span>
            )}
          </div>
        )}

        {/* Pricing Cards Grid */}
        <div className="grid gap-8 lg:grid-cols-3 max-w-6xl mx-auto items-stretch">
          {tiers.map((tier) => {
            const isCurrent = currentTier === tier.id;
            const isFree = tier.id === "free";
            const isUpgraded = 
              (currentTier === "plus" && tier.id === "free") ||
              (currentTier === "pro" && (tier.id === "free" || tier.id === "plus"));

            return (
              <div
                key={tier.id}
                className={`relative flex flex-col justify-between rounded-3xl border p-6 md:p-8 bg-gradient-to-b transition-all duration-300 hover:scale-[1.02] ${tier.gradient}`}
              >
                {/* Popular Badge */}
                {tier.id === "plus" && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
                    Most Popular
                  </div>
                )}
                {tier.id === "pro" && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
                    Highest Accuracy
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display text-xl font-bold text-foreground dark:text-white">{tier.name}</h3>
                    <div className="rounded-xl bg-muted dark:bg-white/5 border border-border dark:border-white/10 p-2 shadow-inner">
                      {tier.icon}
                    </div>
                  </div>
                  
                  <div className="flex items-baseline mb-2">
                    <span className="text-4xl font-extrabold tracking-tight text-foreground dark:text-white">{tier.price}</span>
                    {tier.period && (
                      <span className="text-sm font-semibold text-muted-foreground ml-1">{tier.period}</span>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                    {tier.description}
                  </p>

                  <div className="h-px bg-border dark:bg-white/10 my-6" />

                  <ul className="space-y-4 mb-8">
                    {tier.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Check className="h-4.5 w-4.5 text-neon shrink-0 mt-0.5" />
                        <span className="text-xs md:text-sm text-muted-foreground leading-normal">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Call to Action button */}
                <div>
                  {isCurrent ? (
                    <div className="w-full rounded-xl bg-muted dark:bg-white/5 border border-border dark:border-white/10 py-3 text-center text-sm font-semibold text-muted-foreground">
                      Current Plan
                    </div>
                  ) : isUpgraded ? (
                    <div className="w-full rounded-xl bg-muted/50 dark:bg-white/5 py-3 text-center text-sm font-semibold text-muted-foreground/50">
                      Included in Subscription
                    </div>
                  ) : (
                    <button
                      disabled={loadingTier !== null}
                      onClick={() => !isFree && handleSubscribe(tier.id as any)}
                      className={`w-full rounded-xl py-3 text-sm font-bold text-center transition duration-200 active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${
                        tier.id === "plus"
                          ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20 hover:opacity-90"
                          : tier.id === "pro"
                          ? "bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/20 hover:opacity-90"
                          : "bg-muted hover:bg-muted/80 text-foreground dark:bg-white/10 dark:hover:bg-white/20 dark:text-white"
                      } disabled:opacity-50`}
                    >
                      {loadingTier === tier.id ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        tier.cta
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <Footer />
    </div>
  );
}
