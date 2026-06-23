"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Check, Sparkles, Trophy, Shield, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { buildAuthModalHref } from "@/lib/auth-modal";

export default function SubscriptionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const currentTier = session?.user?.subscriptionTier || "free";
  const tierLabels = {
    free: "Free Predictor",
    plus: "Advanced Predictor",
    pro: "Expert Predictor",
  } as const;

  const handleSubscribe = async (tier: "plus" | "pro") => {
    if (!session) {
      toast.error("Please sign in to choose a subscription plan");
      router.push(buildAuthModalHref({
        pathname,
        search: searchParams.toString(),
        mode: "signin",
        callbackUrl: pathname,
      }));
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
      name: "Free Predictor",
      id: "free",
      price: "$0",
      description: "Basic tournament simulation and predictions.",
      icon: <Shield className="h-6 w-6 text-muted-foreground" />,
      features: [
        "Base simulation model",
        "5 free simulation credits",
        "Country probability explorer",
        "Match and bracket predictions",
        "Saved predictions and leaderboard access",
      ],
      cta: "Current Plan",
      gradient: "from-white to-slate-50 border-border dark:from-zinc-800 dark:to-zinc-900 dark:border-white/5 shadow-sm dark:shadow-none",
    },
    {
      name: "Advanced Predictor",
      id: "plus",
      price: "$4.99",
      period: "/month",
      description: "Unlock advanced squad metrics and unlimited simulations.",
      icon: <Sparkles className="h-6 w-6 text-blue-500 dark:text-blue-400 animate-pulse" />,
      features: [
        "Core predictor tools included",
        "Advanced simulation model",
        "Unlimited simulations",
        "Player rating adjustment slider",
        "Saved projection comparison tools",
      ],
      cta: "Upgrade to Advanced",
      gradient: "from-blue-50/40 via-blue-50/20 to-transparent dark:from-blue-950/40 dark:via-[#0f1d3a] dark:to-[#071329] border-blue-200 dark:border-blue-500/20 shadow-[0_0_25px_rgba(59,130,246,0.05)] dark:shadow-[0_0_25px_rgba(59,130,246,0.15)]",
    },
    {
      name: "Expert Predictor",
      id: "pro",
      price: "$9.99",
      period: "/month",
      description: "Ultimate simulation engine with tactical variables.",
      icon: <Trophy className="h-6 w-6 text-amber-500" />,
      features: [
        "Everything in Plus",
        "Pro simulation model",
        "Players in / players out controls",
        "Full squad availability customization",
        "Advanced scenario testing",
      ],
      cta: "Upgrade to Expert",
      gradient: "from-purple-50/40 via-purple-50/20 to-transparent dark:from-purple-950/40 dark:via-[#1b1236] dark:to-[#0d071e] border-purple-200 dark:border-purple-500/20 shadow-[0_0_25px_rgba(168,85,247,0.05)] dark:shadow-[0_0_25px_rgba(168,85,247,0.15)]",
    },
  ];

  const comparisonRows = [
    { feature: "Base simulation model", free: true, plus: true, pro: true },
    { feature: "Advanced simulation model", free: false, plus: true, pro: true },
    { feature: "Pro simulation model", free: false, plus: false, pro: true },
    { feature: "Free simulation credits", free: "5 credits", plus: "Unlimited", pro: "Unlimited" },
    { feature: "Country probability explorer", free: true, plus: true, pro: true },
    { feature: "Match and bracket predictions", free: true, plus: true, pro: true },
    { feature: "Saved predictions library", free: true, plus: true, pro: true },
    { feature: "Saved projection comparison", free: true, plus: true, pro: true },
    { feature: "Custom country builder", free: true, plus: true, pro: true },
    { feature: "Player rating adjustments", free: false, plus: true, pro: true },
    { feature: "Players in / players out controls", free: false, plus: false, pro: true },
  ] as const;

  const renderComparisonCell = (value: boolean | string) => {
    if (typeof value === "string") {
      return <span className="text-sm font-semibold text-foreground dark:text-white">{value}</span>;
    }

    if (value) {
      return <Check className="h-4.5 w-4.5 text-neon" />;
    }

    return <X className="h-4.5 w-4.5 text-rose-500" />;
  };

  return (
    <div className="min-h-screen bg-hero text-foreground">
      <Header />
      
      <main className="container mx-auto px-4 py-16  md:py-24">
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 rounded-full glass px-3.5 py-1 text-xs uppercase tracking-[0.25em] text-neon mb-4">
            Subscription Pricing
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground dark:text-white sm:text-5xl">
            Choose Your <span className="text-gradient">Predictor Plan</span>
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
                {tierLabels[currentTier as keyof typeof tierLabels] || currentTier}
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

        <section className="mx-auto mt-16 max-w-6xl">
          <div className="mb-6 text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground dark:text-white sm:text-4xl">
              Compare Plans
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Every row below maps to functionality that already exists in the app today.
            </p>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.88))] shadow-[0_20px_60px_-40px_rgba(15,23,42,0.35)] backdrop-blur dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))]">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="border-b border-slate-200/80 px-6 py-5 text-left text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:border-white/10 dark:text-white/55">
                    Feature
                  </th>
                  <th className="border-b border-slate-200/80 bg-slate-50/80 px-6 py-5 text-center text-[11px] font-bold uppercase tracking-[0.24em] text-slate-600 dark:border-white/10 dark:bg-white/[0.02] dark:text-white/70">
                    Free Predictor
                  </th>
                  <th className="border-b border-slate-200/80 bg-blue-50/70 px-6 py-5 text-center text-[11px] font-bold uppercase tracking-[0.24em] text-blue-700 dark:border-white/10 dark:bg-blue-500/[0.08] dark:text-blue-300">
                    Advanced Predictor
                  </th>
                  <th className="border-b border-slate-200/80 bg-purple-50/70 px-6 py-5 text-center text-[11px] font-bold uppercase tracking-[0.24em] text-purple-700 dark:border-white/10 dark:bg-purple-500/[0.08] dark:text-purple-300">
                    Expert Predictor
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, idx) => (
                  <tr
                    key={row.feature}
                    className="group"
                  >
                    <td className={`px-6 py-4 text-sm font-medium text-slate-900 dark:text-white ${idx !== comparisonRows.length - 1 ? "border-b border-slate-200/70 dark:border-white/8" : ""}`}>
                      {row.feature}
                    </td>
                    <td className={`bg-slate-50/80 px-6 py-4 dark:bg-white/[0.02] ${idx !== comparisonRows.length - 1 ? "border-b border-slate-200/70 dark:border-white/8" : ""}`}>
                      <div className="flex justify-center">
                        {renderComparisonCell(row.free)}
                      </div>
                    </td>
                    <td className={`bg-blue-50/60 px-6 py-4 dark:bg-blue-500/[0.05] ${idx !== comparisonRows.length - 1 ? "border-b border-slate-200/70 dark:border-white/8" : ""}`}>
                      <div className="flex justify-center">
                        {renderComparisonCell(row.plus)}
                      </div>
                    </td>
                    <td className={`bg-purple-50/60 px-6 py-4 dark:bg-purple-500/[0.05] ${idx !== comparisonRows.length - 1 ? "border-b border-slate-200/70 dark:border-white/8" : ""}`}>
                      <div className="flex justify-center">
                        {renderComparisonCell(row.pro)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
