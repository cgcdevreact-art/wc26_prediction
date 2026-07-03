"use client";

import React, { useState } from "react";
import { Lock, ArrowRight, Loader2, CheckCircle2, Eye, EyeOff, Trophy, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { MinimalHeader } from "@/components/site/MinimalHeader";
import { MinimalFooter } from "@/components/site/MinimalFooter";

export default function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const getPasswordStrength = (pass: string) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return score;
  };

  const strength = getPasswordStrength(password);
  
  const getStrengthColor = (score: number) => {
    if (score === 0) return "bg-border";
    if (score === 1) return "bg-red-500";
    if (score === 2) return "bg-amber-500";
    if (score === 3) return "bg-blue-500";
    return "bg-neon";
  };

  const getStrengthLabel = (score: number) => {
    if (score === 0) return "None";
    if (score === 1) return "Weak";
    if (score === 2) return "Medium";
    if (score === 3) return "Good";
    return "Strong";
  };

  // Requirements checks
  const checks = {
    length: password.length >= 6,
    number: /[0-9]/.test(password),
    uppercase: /[A-Z]/.test(password),
    match: password && password === confirmPassword,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error("Invalid or missing reset token.");
      return;
    }

    if (!checks.length) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    if (!checks.match) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      setIsSuccess(true);
      toast.success("Password reset successfully!");
    } catch (error: any) {
      toast.error(error.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-hero">
      <MinimalHeader />
      <main className="flex-1 flex flex-col items-center justify-center p-4 relative">
        <div className="w-full max-w-md bg-card/90 dark:bg-[#070b19]/90 backdrop-blur-md rounded-3xl border border-border dark:border-white/10 p-8 shadow-2xl relative overflow-hidden">
          {/* Glow effects */}
          <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-neon/15 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 -bottom-16 h-48 w-48 rounded-full bg-neon-2/15 blur-3xl" />

          <div className="relative z-10 flex flex-col">
            {/* Branding Logo */}
            <div className="mb-8 flex flex-col items-center select-none">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-neon/20 to-neon-2/20 border border-neon/30 shadow-inner">
                {isSuccess ? (
                  <CheckCircle2 className="h-7 w-7 text-neon animate-[bounce_1s_infinite_alternate]" strokeWidth={2.4} />
                ) : (
                  <Trophy className="h-7 w-7 text-neon" strokeWidth={2.4} />
                )}
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
                {isSuccess ? "Password Reset" : "Create New Password"}
              </h1>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto font-sans">
                {isSuccess
                  ? "Your password has been successfully reset. You can now login with your new password."
                  : "Please enter a strong new password below."}
              </p>
            </div>

            {!isSuccess ? (
              <form onSubmit={handleSubmit} className="w-full space-y-4">
                {!token && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl text-xs text-center font-semibold mb-4">
                    Missing reset token. Please use the link sent to your email.
                  </div>
                )}
                
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="password">
                    New Password
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-muted-foreground/60" />
                    </span>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-border dark:border-white/10 bg-background dark:bg-white/5 pl-10 pr-10 py-3 text-sm text-foreground placeholder-muted-foreground outline-none transition focus:border-neon focus:bg-card dark:focus:bg-[#0f172a] focus:ring-1 focus:ring-neon"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground/60 hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Password Strength Meter */}
                {password && (
                  <div className="space-y-1.5 text-left">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-muted-foreground font-semibold">Password Strength:</span>
                      <span className={`font-bold ${
                        strength <= 1 ? "text-red-500" :
                        strength === 2 ? "text-amber-500" :
                        strength === 3 ? "text-blue-500" : "text-neon"
                      }`}>{getStrengthLabel(strength)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-border dark:bg-white/5 rounded-full overflow-hidden flex gap-0.5">
                      <div className={`h-full flex-1 transition-colors ${strength >= 1 ? getStrengthColor(strength) : "bg-transparent"}`} />
                      <div className={`h-full flex-1 transition-colors ${strength >= 2 ? getStrengthColor(strength) : "bg-transparent"}`} />
                      <div className={`h-full flex-1 transition-colors ${strength >= 3 ? getStrengthColor(strength) : "bg-transparent"}`} />
                      <div className={`h-full flex-1 transition-colors ${strength >= 4 ? getStrengthColor(strength) : "bg-transparent"}`} />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="confirmPassword">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-muted-foreground/60" />
                    </span>
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-xl border border-border dark:border-white/10 bg-background dark:bg-white/5 pl-10 pr-10 py-3 text-sm text-foreground placeholder-muted-foreground outline-none transition focus:border-neon focus:bg-card dark:focus:bg-[#0f172a] focus:ring-1 focus:ring-neon"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground/60 hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Password Requirements Checklist */}
                {password && (
                  <div className="p-3 bg-muted dark:bg-white/5 rounded-xl text-[10px] space-y-1.5 text-left">
                    <div className="flex items-center gap-1.5">
                      {checks.length ? (
                        <Check className="h-3.5 w-3.5 text-neon" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-red-500" />
                      )}
                      <span className={checks.length ? "text-foreground font-semibold" : "text-muted-foreground"}>
                        At least 6 characters
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {checks.number ? (
                        <Check className="h-3.5 w-3.5 text-neon" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-red-500" />
                      )}
                      <span className={checks.number ? "text-foreground font-semibold" : "text-muted-foreground"}>
                        At least 1 number
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {checks.uppercase ? (
                        <Check className="h-3.5 w-3.5 text-neon" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-red-500" />
                      )}
                      <span className={checks.uppercase ? "text-foreground font-semibold" : "text-muted-foreground"}>
                        At least 1 uppercase letter
                      </span>
                    </div>
                    {confirmPassword && (
                      <div className="flex items-center gap-1.5">
                        {checks.match ? (
                          <Check className="h-3.5 w-3.5 text-neon" />
                        ) : (
                          <X className="h-3.5 w-3.5 text-red-500" />
                        )}
                        <span className={checks.match ? "text-foreground font-semibold" : "text-muted-foreground"}>
                          Passwords match
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !token}
                  className="group mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-neon to-neon-2 py-3 text-sm font-semibold text-background neon-border transition hover:opacity-95 active:scale-98 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer shadow-lg shadow-neon/15"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Reset Password
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="mt-4 text-center">
                <Link
                  href="/?auth=signin"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-neon to-neon-2 px-6 py-3 text-sm font-semibold text-background neon-border transition hover:opacity-95 active:scale-98 shadow-lg shadow-neon/15 w-full cursor-pointer"
                >
                  Sign In Now
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
      <MinimalFooter />
    </div>
  );
}
