"use client";

import React, { useState } from "react";
import { Lock, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export default function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error("Invalid or missing reset token.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
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
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-card dark:bg-[#0f172a] rounded-[2rem] border border-border dark:border-white/10 p-8 shadow-2xl relative overflow-hidden">
          {/* Glow effects */}
          <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-cyan-500/10 blur-2xl" />
          <div className="pointer-events-none absolute -right-16 -bottom-16 h-48 w-48 rounded-full bg-purple-500/10 blur-2xl" />

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted dark:bg-white/5 border border-border dark:border-white/10">
              {isSuccess ? (
                <CheckCircle2 className="h-6 w-6 text-green-500" strokeWidth={2} />
              ) : (
                <Lock className="h-6 w-6 text-[#00c6ff]" strokeWidth={2} />
              )}
            </div>

            <h1 className="font-display text-2xl font-bold text-foreground dark:text-white mb-2 tracking-tight">
              {isSuccess ? "Password Reset" : "Create New Password"}
            </h1>
            <p className="text-sm text-muted-foreground mb-8">
              {isSuccess
                ? "Your password has been successfully reset. You can now login with your new password."
                : "Please enter your new password below."}
            </p>

            {!isSuccess ? (
              <form onSubmit={handleSubmit} className="w-full space-y-4 text-left">
                {!token && (
                  <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs text-center border border-red-200 dark:border-red-900/50 mb-4">
                    Missing reset token. Please use the link sent to your email.
                  </div>
                )}
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="password">
                    New Password
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-muted-foreground/60" />
                    </span>
                    <input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-border dark:border-white/10 bg-background dark:bg-white/5 pl-9 pr-4 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="confirmPassword">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-muted-foreground/60" />
                    </span>
                    <input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-xl border border-border dark:border-white/10 bg-background dark:bg-white/5 pl-9 pr-4 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !token}
                  className="group mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 py-3 text-sm font-semibold text-white transition hover:opacity-90 active:scale-98 disabled:cursor-not-allowed disabled:opacity-50"
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
              <div className="mt-4">
                <Link
                  href="/?auth=signin"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 active:scale-98"
                >
                  Sign In Now
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
