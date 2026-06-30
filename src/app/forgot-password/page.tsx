"use client";

import React, { useState } from "react";
import { Mail, ArrowRight, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
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
              <Mail className="h-6 w-6 text-[#00c6ff]" strokeWidth={2} />
            </div>

            <h1 className="font-display text-2xl font-bold text-foreground dark:text-white mb-2 tracking-tight">
              Forgot Password
            </h1>
            <p className="text-sm text-muted-foreground mb-8">
              {isSubmitted
                ? "If an account exists with that email, we've sent a link to reset your password."
                : "Enter your email address and we'll send you a link to reset your password."}
            </p>

            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="w-full space-y-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="email">
                    Email
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-muted-foreground/60" />
                    </span>
                    <input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-border dark:border-white/10 bg-background dark:bg-white/5 pl-9 pr-4 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="group mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 py-3 text-sm font-semibold text-white transition hover:opacity-90 active:scale-98 disabled:cursor-not-allowed disabled:opacity-50"
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
              <button
                onClick={() => setIsSubmitted(false)}
                className="text-sm text-cyan-500 hover:underline"
              >
                Try another email
              </button>
            )}

            <div className="mt-8">
              <Link href="/?auth=signin" className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="mr-1 h-3 w-3" />
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
