"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Shield, Sparkles, Trophy, Lock } from "lucide-react";
import { buildAuthModalHref } from "@/lib/auth-modal";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason: "plus" | "pro" | "credits" | "guest";
}

export function UpgradeModal({ isOpen, onClose, reason }: UpgradeModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();


  const getModalDetails = () => {
    switch (reason) {
      case "guest":
        return {
          title: "Sign Up Required",
          description: "You've used your 3 guest simulation credits. Sign up for a free account to get 5 more credits, or subscribe for unlimited simulations!",
          highlightText: "Continue Simulating",
          icon: <Shield className="h-6 w-6 text-neon" />,
        };
      case "credits":
        return {
          title: "Simulation Limit Reached",
          description: "You have used all 5 of your free simulations. Upgrade to Advanced or Expert Predictor for unlimited simulation capability!",
          highlightText: "Unlock Unlimited Simulations",
          icon: <Trophy className="h-6 w-6 text-amber-500" />,
        };
      case "plus":
        return {
          title: "Unlock Advanced Model",
          description: "The Advanced Model scales the base predictions by incorporating squad quality metrics and average player overall ratings. Upgrade to Advanced or Expert Predictor to unlock!",
          highlightText: "Get Advanced Model",
          icon: <Sparkles className="h-6 w-6 text-blue-400" />,
        };
      case "pro":
        return {
          title: "Unlock Pro Model",
          description: "The Pro Model integrates detailed individual player stats, form, fitness, and discipline risk for the deepest, most realistic match simulations. Upgrade to Expert Predictor to unlock!",
          highlightText: "Get Pro Model",
          icon: <Lock className="h-6 w-6 text-purple-400" />,
        };
    }
  };

  const details = getModalDetails();
  const openAuthModal = () => {
    onClose();
    router.push(buildAuthModalHref({
      pathname,
      search: searchParams.toString(),
      mode: "signup",
      callbackUrl: pathname,
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg overflow-hidden rounded-[2rem] border border-border dark:border-white/10 bg-card/95 dark:bg-[#0f172a]/95 p-6 shadow-2xl md:p-8 text-foreground">
        {/* Glow Effects */}
        <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-neon/15 blur-2xl" />
        <div className="pointer-events-none absolute -right-16 -bottom-16 h-48 w-48 rounded-full bg-neon-2/15 blur-2xl" />

        <div className="flex flex-col items-center text-center">
          {/* Header Icon */}
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted dark:bg-white/5 border border-border dark:border-white/10 shadow-inner">
            {details.icon}
          </div>

          {/* Title */}
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground dark:text-white mb-2">
            {details.title}
          </h2>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-sm">
            {details.description}
          </p>

          {/* Pricing Quick Summary */}
          <div className="w-full grid grid-cols-3 gap-2.5 mb-8 text-left text-xs">
            <div className="rounded-xl bg-muted dark:bg-white/5 border border-border dark:border-white/5 p-3">
              <div className="font-semibold text-foreground dark:text-white mb-1">Free</div>
              <div className="text-muted-foreground">Base Model</div>
              <div className="text-[10px] text-neon/80 font-bold mt-1.5">5 Simulations</div>
            </div>
            <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 relative overflow-hidden">
              <div className="font-semibold text-blue-600 dark:text-blue-400 mb-1">Advanced</div>
              <div className="text-muted-foreground">Advanced Model</div>
              <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold mt-1.5">Unlimited</div>
            </div>
            <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-3 relative overflow-hidden">
              <div className="font-semibold text-purple-600 dark:text-purple-400 mb-1">Expert</div>
              <div className="text-muted-foreground">Pro Model</div>
              <div className="text-[10px] text-purple-600 dark:text-purple-400 font-bold mt-1.5">Unlimited</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full flex flex-col gap-2.5">
            {reason === "guest" ? (
              <button
                onClick={openAuthModal}
                className="w-full rounded-xl bg-gradient-to-r from-neon to-neon-2 py-3 text-sm font-bold text-background text-center shadow-lg transition duration-200 hover:opacity-90 active:scale-95 border border-neon/30"
              >
                Create Free Account
              </button>
            ) : (
              <Link
                href="/subscription"
                onClick={onClose}
                className="w-full rounded-xl bg-gradient-to-r from-neon to-neon-2 py-3 text-sm font-bold text-background text-center shadow-lg transition duration-200 hover:opacity-90 active:scale-95 border border-neon/30"
              >
                {details.highlightText}
              </Link>
            )}

            <button
              onClick={onClose}
              className="w-full rounded-xl bg-muted hover:bg-muted/80 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition duration-200"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
