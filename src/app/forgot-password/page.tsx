"use client";

import React, { useState } from "react";
import { Mail, ArrowRight, Loader2, ArrowLeft, Trophy } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { MinimalHeader } from "@/components/site/MinimalHeader";
import { MinimalFooter } from "@/components/site/MinimalFooter";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const sendResetEmail = async (emailToSubmit: string) => {
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToSubmit }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Failed to send request");
      }

      setIsSubmitted(true);
      toast.success("Password reset link sent!");
    } catch (error: any) {
      toast.error(error.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendResetEmail(email);
  };

  return (
    <div className="flex flex-col min-h-screen bg-hero">
      <MinimalHeader />
      <main className="flex-1 flex flex-col items-center justify-center p-4 relative">
        <div className="w-full max-w-md bg-card/90 dark:bg-[#070b19]/90 backdrop-blur-md rounded-3xl border border-border dark:border-white/10 p-8 shadow-2xl relative overflow-hidden">
          {/* Glow decoration */}
          <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-neon/15 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 -bottom-16 h-48 w-48 rounded-full bg-neon-2/15 blur-3xl" />

          <div className="relative z-10 flex flex-col">
            {/* Branding Logo */}
            <div className="mb-8 flex flex-col items-center select-none">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-neon/20 to-neon-2/20 border border-neon/30 shadow-inner">
                <Trophy className="h-7 w-7 text-neon" strokeWidth={2.4} />
              </div>
              <div className="text-center">
                <div className="text-base font-display font-bold tracking-tight text-foreground dark:text-white">
                  2026 WC <span className="text-gradient">PREDICTION</span>
                </div>
                <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground mt-0.5">
                  Predict like an Expert
                </div>
              </div>
            </div>

            <div className="text-center mb-6">
              <h1 className="font-display text-2xl font-bold text-foreground dark:text-white mb-2 tracking-tight">
                Forgot Password
              </h1>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto font-sans">
                {isSubmitted
                  ? "We have sent you a reset link. Please check your inbox."
                  : "Enter the email associated with your account, and we'll send you a link to reset your password."}
              </p>
            </div>

            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="w-full space-y-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="email">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-muted-foreground/60" />
                    </span>
                    <input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-border dark:border-white/10 bg-background dark:bg-white/5 pl-10 pr-4 py-3 text-sm text-foreground placeholder-muted-foreground outline-none transition focus:border-neon focus:bg-card dark:focus:bg-[#0f172a] focus:ring-1 focus:ring-neon"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="group mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-neon to-neon-2 py-3 text-sm font-semibold text-background neon-border transition hover:opacity-95 active:scale-98 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer shadow-lg shadow-neon/15"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Send Reset Link
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="w-full space-y-4 text-center">
                <button
                  onClick={() => sendResetEmail(email)}
                  disabled={isLoading}
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-neon to-neon-2 py-3 text-sm font-semibold text-background neon-border transition hover:opacity-95 active:scale-98 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer shadow-lg shadow-neon/15"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Resend Link
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </>
                  )}
                </button>

                <button
                  onClick={() => setIsSubmitted(false)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 focus:outline-none"
                >
                  Try another email
                </button>
              </div>
            )}

            <div className="mt-8 border-t border-border dark:border-white/5 pt-4 text-center">
              <Link href="/?auth=signin" className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </main>
      <MinimalFooter />
    </div>
  );
}
