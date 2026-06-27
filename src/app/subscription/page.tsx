"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Check, Trophy, Shield, RefreshCw, Brain, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { buildAuthModalHref } from "@/lib/auth-modal";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ComparisonHeader {
  isHeader: true;
  title: string;
}

interface ComparisonFeature {
  isHeader?: false;
  feature: string;
  free: boolean | string;
  plus: boolean | string;
  pro: boolean | string;
}

type ComparisonRow = ComparisonHeader | ComparisonFeature;
type PaidTier = "plus" | "pro";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function SubscriptionPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [pendingTier, setPendingTier] = useState<PaidTier | null>(null);

  const currentTier = session?.user?.subscriptionTier || "free";
  const tierLabels = {
    free: "Free Predictor",
    plus: "Advanced Predictor",
    pro: "Expert Predictor",
  } as const;

  const handleSubscribe = async (tier: PaidTier) => {
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

    if (!acceptedTerms) {
      toast.error("Please agree to the Terms & Conditions before continuing to payment.");
      return;
    }

    try {
      setLoadingTier(tier);
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, agreedToTerms: true }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");

      if (data.url) {
        window.location.assign(data.url);
      } else {
        throw new Error("No checkout URL returned from server");
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to initiate Stripe Checkout"));
      setLoadingTier(null);
    }
  };

  const openUpgradePopup = (tier: PaidTier) => {
    setAcceptedTerms(false);
    setPendingTier(tier);
  };

  const closeUpgradePopup = () => {
    if (loadingTier !== null) return;
    setPendingTier(null);
    setAcceptedTerms(false);
  };

  const tiers = [
    {
      name: "Free Predictor",
      id: "free",
      price: "$0",
      description: "Basic tournament simulation and predictions.",
      icon: <Shield className="h-6 w-6 text-emerald-500" />,
      themeColor: "emerald",
      badgeText: "Free Tier",
      badgeGradient: "from-emerald-500 to-teal-600",
      gradient: "from-emerald-50/40 via-emerald-50/20 to-transparent dark:from-emerald-950/40 dark:via-[#092215] dark:to-[#040e09] border-emerald-200 dark:border-emerald-500/20 shadow-[0_0_25px_rgba(16,185,129,0.05)] dark:shadow-[0_0_25px_rgba(16,185,129,0.15)]",
      watermark: "01",
      categories: [
        {
          title: "Team Rating Edits",
          items: [
            "Edit team Elo ratings",
            "Edit Attack ratings (Att)",
            "Edit Defense ratings (Def)"
          ]
        },
        {
          title: "Standard Visibility",
          items: [
            "Access team & player rankings",
            "Detailed player profiles are blurred"
          ]
        },
        {
          title: "Base Simulation Engine",
          items: [
            "Base simulation model access",
            "Capped at 5 free runs total"
          ]
        }
      ],
      cta: "Current Plan",
    },
    {
      name: "Advanced Predictor",
      id: "plus",
      price: "$0.99",
      period: "/day",
      description: "Unlock advanced squad metrics and unlimited simulations.",
      icon: <Brain className="h-6 w-6 text-blue-500 dark:text-blue-400" />,
      themeColor: "blue",
      badgeText: "Most Popular",
      badgeGradient: "from-blue-500 to-indigo-600",
      gradient: "from-blue-50/40 via-blue-50/20 to-transparent dark:from-blue-950/40 dark:via-[#0f1d3a] dark:to-[#071329] border-blue-200 dark:border-blue-500/20 shadow-[0_0_25px_rgba(59,130,246,0.05)] dark:shadow-[0_0_25px_rgba(59,130,246,0.15)]",
      watermark: "02",
      categories: [
        {
          title: "Top Player Overrides",
          items: [
            "Edit overall rating",
            "Edit form shifts",
            "Edit player stats"
          ]
        },
        {
          title: "Full Data Visibility",
          items: [
            "Unblurred player profile stats",
            "Detailed player rating summaries",
            "Unrestricted team/player lists"
          ]
        },
        {
          title: "Advanced Engine",
          items: [
            "Squad analytics integration",
            "Unlimited bracket simulations"
          ]
        }
      ],
      cta: "Upgrade to Advanced",
    },
    {
      name: "Expert Predictor",
      id: "pro",
      price: "$4.99",
      period: "/day",
      description: "Ultimate simulation engine with tactical variables.",
      icon: <Trophy className="h-6 w-6 text-purple-500" />,
      themeColor: "purple",
      badgeText: "Highest Accuracy",
      badgeGradient: "from-purple-500 to-pink-600",
      gradient: "from-purple-50/40 via-purple-50/20 to-transparent dark:from-purple-950/40 dark:via-[#1b1236] dark:to-[#0d071e] border-purple-200 dark:border-purple-500/20 shadow-[0_0_25px_rgba(168,85,247,0.05)] dark:shadow-[0_0_25px_rgba(168,85,247,0.15)]",
      watermark: "03",
      categories: [
        {
          title: "Full Roster Control",
          items: [
            "Edit ratings for all roster players",
            "Edit form shifts for all players",
            "Edit profile images for all players"
          ]
        },
        {
          title: "Full Parameter Control",
          items: [
            "Edit overall rating, base quality, form, and intl experience",
            "Customize attacking/defending impact, passing, and discipline risk",
            "Modify match importance, rating tier, and active roster selections (in/out)"
          ]
        },
        {
          title: "Pro Simulation Engine",
          items: [
            "Pro simulation model access",
            "Factor in tactical changes & fitness",
            "Unlimited bracket simulations"
          ]
        }
      ],
      cta: "Upgrade to Expert",
    },
  ];

  const comparisonRows: ComparisonRow[] = [
    // Simulation Engine Delineation
    { isHeader: true, title: "Simulation Engine" },
    { feature: "Base simulation model", free: true, plus: true, pro: true },
    { feature: "Advanced simulation model", free: false, plus: true, pro: true },
    { feature: "Pro simulation model", free: false, plus: false, pro: true },
    { feature: "Bracket simulation limit", free: "5 credits", plus: "Unlimited", pro: "Unlimited" },
    { feature: "Country probability explorer", free: true, plus: true, pro: true },
    { feature: "Match and bracket predictions", free: true, plus: true, pro: true },
    { feature: "Saved predictions library", free: true, plus: true, pro: true },

    // Customization Delineation
    { isHeader: true, title: "Team & Roster Customizations" },
    { feature: "Customize team ELO, Attack, & Defense", free: true, plus: true, pro: true },
    { feature: "Edit Top Player (Overall, Form, Stats)", free: false, plus: true, pro: true },
    { feature: "Edit All Roster Players (Ratings & Form)", free: false, plus: false, pro: true },
    { feature: "Edit Player Profile Images", free: false, plus: false, pro: true },
    { feature: "Active roster controls (players in/out)", free: false, plus: false, pro: true },
    { feature: "Player fitness tracking", free: false, plus: false, pro: true },

    // Visibility Delineation
    { isHeader: true, title: "Data & Visibility" },
    { feature: "Access team & player rankings", free: true, plus: true, pro: true },
    { feature: "Player profile stats & metrics", free: "Blurred", plus: "Unblurred", pro: "Unblurred" },
    { feature: "Detailed player rating summaries", free: false, plus: true, pro: true },
    { feature: "Squad analytics integration", free: false, plus: true, pro: true },
    { feature: "Compare advanced team metrics", free: false, plus: true, pro: true },
  ];

  const renderComparisonCell = (value: boolean | string, tierId: "free" | "plus" | "pro") => {
    if (typeof value === "string") {
      return (
        <span className={`text-xs md:text-sm font-semibold ${tierId === "pro"
          ? "text-purple-600 dark:text-purple-400"
          : tierId === "plus"
            ? "text-blue-600 dark:text-blue-400"
            : "text-slate-600 dark:text-slate-400"
          }`}>
          {value}
        </span>
      );
    }

    if (value) {
      if (tierId === "pro") {
        return <Check className="h-4.5 w-4.5 text-purple-500 dark:text-purple-400 mx-auto" />;
      }
      if (tierId === "plus") {
        return <Check className="h-4.5 w-4.5 text-blue-500 dark:text-blue-400 mx-auto" />;
      }
      return <Check className="h-4.5 w-4.5 text-emerald-500 dark:text-emerald-400 mx-auto" />;
    }

    return <span className="text-slate-300 dark:text-white/10 font-medium text-sm">—</span>;
  };

  return (
    <div className="min-h-screen bg-hero text-foreground">
      <Header />

      <main className="container mx-auto px-4 py-16 md:py-24">
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
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
          <div className="max-w-md mx-auto mb-16 rounded-2xl glass-strong border border-border dark:border-white/10 p-5 text-center flex flex-col items-center justify-center animate-fade-in">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Logged in as {session.user.name}</span>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm font-semibold">Your current tier:</span>
              <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full uppercase tracking-wider ${currentTier === "pro"
                ? "bg-purple-500/10 dark:bg-purple-500/20 border border-purple-500/20 dark:border-purple-500/40 text-purple-600 dark:text-purple-400"
                : currentTier === "plus"
                  ? "bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 dark:border-blue-500/40 text-blue-600 dark:text-blue-400"
                  : "bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 dark:border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
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
        <div className="mx-auto mb-24 grid max-w-6xl items-stretch gap-8 pt-4 md:grid-cols-2 xl:grid-cols-3">
          {tiers.map((tier) => {
            const isCurrent = currentTier === tier.id;
            const isUpgraded =
              (currentTier === "plus" && tier.id === "free") ||
              (currentTier === "pro" && (tier.id === "free" || tier.id === "plus"));

            return (
              <div
                key={tier.id}
                className={`relative flex flex-col justify-between rounded-3xl border p-6 md:p-8 bg-gradient-to-b transition-all duration-300 hover:scale-[1.02] ${tier.gradient}`}
              >
                {/* Theme Badge */}
                {tier.badgeText && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r ${tier.badgeGradient} px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md z-20`}>
                    {tier.badgeText}
                  </div>
                )}

                {/* Background Watermark Clipping Container */}
                <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none z-0">
                  <span className="absolute -right-4 -bottom-6 font-display text-9xl font-black text-slate-500/[0.03] dark:text-white/[0.015] select-none pointer-events-none leading-none">
                    {tier.watermark}
                  </span>
                </div>

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display text-xl font-bold text-foreground dark:text-white">{tier.name}</h3>
                    <div className="rounded-xl bg-muted dark:bg-white/5 border border-border dark:border-white/10 p-2 shadow-inner">
                      {tier.icon}
                    </div>
                  </div>

                  <div className="flex items-baseline mb-2">
                    <span className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">{tier.price}</span>
                    {tier.period && (
                      <span className="text-sm font-semibold text-muted-foreground ml-1">{tier.period}</span>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                    {tier.description}
                  </p>

                  <div className="h-px bg-border dark:bg-white/10 my-6" />

                  {/* Category structured list */}
                  <div className="space-y-4 mb-8">
                    {tier.categories.map((cat, catIdx) => {
                      const colorMap = {
                        emerald: {
                          bg: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/25",
                          bullet: "text-emerald-500/70 dark:text-emerald-400/85"
                        },
                        blue: {
                          bg: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-500/25",
                          bullet: "text-blue-500/70 dark:text-blue-400/85"
                        },
                        purple: {
                          bg: "bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 border-purple-500/25",
                          bullet: "text-purple-500/70 dark:text-purple-400/85"
                        }
                      };

                      const theme = colorMap[tier.themeColor as keyof typeof colorMap] || colorMap.blue;

                      return (
                        <div key={catIdx} className="flex flex-col gap-2 p-2.5 rounded-xl bg-slate-500/[0.015] dark:bg-white/[0.01] border border-slate-200/20 dark:border-white/5">
                          <div className="flex items-center gap-3">
                            <span className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border ${theme.bg}`}>
                              <Check className="h-2.5 w-2.5" />
                            </span>
                            <strong className="text-xs font-bold text-slate-800 dark:text-slate-200">{cat.title}</strong>
                          </div>
                          <ul className="pl-5.5 space-y-1 text-slate-500 dark:text-slate-400 text-[11px] list-none leading-relaxed">
                            {cat.items.map((item, itemIdx) => (
                              <li key={itemIdx} className="flex items-start gap-1.5">
                                <ChevronRight className={`h-3 w-3 shrink-0 mt-0.5 ${theme.bullet}`} />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Call to Action button */}
                <div className="relative z-10 mt-auto">
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
                      onClick={() => {
                        if (tier.id === "plus" || tier.id === "pro") {
                          openUpgradePopup(tier.id);
                        }
                      }}
                      className={`w-full rounded-xl py-3 text-sm font-bold text-center transition duration-200 active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${tier.id === "plus"
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

        <Dialog open={pendingTier !== null} onOpenChange={(open) => { if (!open) closeUpgradePopup(); }}>
          <DialogContent className="overflow-hidden rounded-[2rem] border border-border bg-card/95 p-0 shadow-2xl dark:border-white/10 dark:bg-[#0f172a]/95">
            <div className="relative">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-r from-blue-500/12 via-emerald-500/10 to-purple-500/12" />
              <div className="pointer-events-none absolute -left-10 top-6 h-28 w-28 rounded-full bg-blue-500/12 blur-2xl" />
              <div className="pointer-events-none absolute -right-10 bottom-6 h-28 w-28 rounded-full bg-emerald-500/12 blur-2xl" />

              <div className="relative p-6 md:p-8">
                <DialogHeader className="space-y-3 text-left">
                  <div className="inline-flex w-fit items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                    Checkout Confirmation
                  </div>
                  <DialogTitle className="font-display text-2xl font-bold tracking-tight text-foreground dark:text-white">
                    Confirm your {pendingTier === "pro" ? "Expert" : "Advanced"} upgrade
                  </DialogTitle>
                  <DialogDescription className="max-w-md text-sm leading-relaxed text-muted-foreground">
                    Before we send you to payment, please confirm that you agree to the plan terms and recurring billing details.
                  </DialogDescription>
                </DialogHeader>

                <div className="mt-6 rounded-2xl border border-slate-200/60 bg-white/70 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] backdrop-blur-sm dark:border-white/5 dark:bg-slate-900/20">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="accept-terms-modal"
                      checked={acceptedTerms}
                      onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                      className="mt-1"
                    />
                    <div className="space-y-1">
                      <Label
                        htmlFor="accept-terms-modal"
                        className="cursor-pointer text-sm leading-relaxed text-slate-700 dark:text-slate-200"
                      >
                        I agree to the{" "}
                        <Link href="/terms" className="font-semibold text-primary hover:underline">
                          Terms & Conditions
                        </Link>{" "}
                        and understand that subscription payments may be recurring and subject to the plan terms.
                      </Label>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        This confirmation is required before checkout for Advanced or Expert plans.
                      </p>
                    </div>
                  </div>
                </div>

                <DialogFooter className="mt-6 gap-3 sm:justify-start sm:space-x-0">
                  <button
                    type="button"
                    disabled={pendingTier === null || loadingTier !== null || !acceptedTerms}
                    onClick={() => {
                      if (pendingTier) {
                        void handleSubscribe(pendingTier);
                      }
                    }}
                    className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    {loadingTier === pendingTier ? "Processing..." : "Agree & Continue to Payment"}
                  </button>
                  <button
                    type="button"
                    onClick={closeUpgradePopup}
                    disabled={loadingTier !== null}
                    className="w-full rounded-xl bg-muted px-5 py-3 text-sm font-medium text-muted-foreground transition duration-200 hover:bg-muted/80 hover:text-foreground disabled:opacity-50 sm:w-auto"
                  >
                    Cancel
                  </button>
                </DialogFooter>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Compare Plans Section */}
        <section id="compare-plans" className="mx-auto max-w-6xl scroll-mt-28">
          <div className="mb-8 text-center">
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground dark:text-white sm:text-3xl">
              Compare Predictor Plans
            </h2>
            <p className="mt-2 text-xs md:text-sm text-muted-foreground">
              A comprehensive feature breakdown and comparison of capabilities across all subscription tiers.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200/60 bg-white/70 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:border-white/5 dark:bg-slate-900/20 backdrop-blur-sm">
            <table className="min-w-[760px] border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="border-b border-slate-200/80 px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:border-white/10 dark:text-white/40">
                    Capabilities
                  </th>
                  <th className="border-b border-slate-200/80 px-6 py-4 text-center text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:border-white/10 dark:text-emerald-450 w-1/4">
                    Free
                  </th>
                  <th className="border-b border-slate-200/80 px-6 py-4 text-center text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:border-white/10 dark:text-blue-450 w-1/4">
                    Advanced
                  </th>
                  <th className="border-b border-slate-200/80 px-6 py-4 text-center text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:border-white/10 dark:text-purple-450 w-1/4">
                    Expert
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, idx) => {
                  if (row.isHeader) {
                    return (
                      <tr key={row.title} className="bg-slate-500/[0.015] dark:bg-white/[0.005]">
                        <td
                          colSpan={4}
                          className="px-6 py-2.5 font-bold text-[9px] tracking-wider uppercase text-slate-400 dark:text-white/20 border-b border-slate-200/50 dark:border-white/5"
                        >
                          {row.title}
                        </td>
                      </tr>
                    );
                  }

                  const isLastRow = idx === comparisonRows.length - 1;
                  const borderClass = isLastRow ? "" : "border-b border-slate-200/50 dark:border-white/5";

                  return (
                    <tr
                      key={row.feature}
                      className="hover:bg-slate-500/[0.008] dark:hover:bg-white/[0.005] transition-colors duration-100"
                    >
                      <td className={`px-6 py-3.5 text-xs font-medium text-slate-600 dark:text-slate-300 ${borderClass}`}>
                        {row.feature}
                      </td>
                      <td className={`px-6 py-3.5 text-center ${borderClass}`}>
                        {renderComparisonCell(row.free, "free")}
                      </td>
                      <td className={`px-6 py-3.5 text-center ${borderClass}`}>
                        {renderComparisonCell(row.plus, "plus")}
                      </td>
                      <td className={`px-6 py-3.5 text-center ${borderClass}`}>
                        {renderComparisonCell(row.pro, "pro")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
