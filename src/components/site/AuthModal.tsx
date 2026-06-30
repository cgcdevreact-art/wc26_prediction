"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, Trophy, ArrowRight, Loader2, Mail, Lock, User } from "lucide-react";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { loginAction } from "@/app/actions/auth";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "signin" | "signup";
  callbackUrl?: string;
}

export function AuthModal({
  isOpen,
  onClose,
  initialMode = "signin",
  callbackUrl = "/predictions/country",
}: AuthModalProps) {
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const reloadAfterAuth = () => {
    if (typeof window === "undefined") return;
    window.location.assign(callbackUrl || window.location.pathname);
  };

  if (!isOpen || typeof document === "undefined") return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === "signup") {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          toast.error(data.message || "Failed to create account.");
          setIsLoading(false);
          return;
        }

        toast.success("Account created! Signing you in...");
      }

      // Authenticate
      const signInRes = await loginAction(email, password, callbackUrl);

      if (signInRes?.error) {
        toast.error(signInRes.error || "Authentication failed. Please check your credentials.");
      } else {
        toast.success("Signed in successfully!");
        reloadAfterAuth();
        return;
      }
    } catch (error) {
      if (error instanceof Error && error.message === "NEXT_REDIRECT") {
        // Successful server-side auth can surface as NEXT_REDIRECT in client-invoked actions.
        reloadAfterAuth();
        return;
      }
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = (provider: string) => {
    setIsLoading(true);
    signIn(provider, { callbackUrl });
  };

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto flex justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative my-auto w-full max-w-md overflow-hidden rounded-3xl border border-border dark:border-white/10 bg-card/95 dark:bg-[#0f172a]/95 p-6 shadow-2xl md:p-8 animate-fade-in text-foreground">
        
        {/* Glow decoration */}
        <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-neon/15 blur-2xl" />
        <div className="pointer-events-none absolute -right-16 -bottom-16 h-48 w-48 rounded-full bg-neon-2/15 blur-2xl" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted dark:hover:bg-white/5 hover:text-foreground transition"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative z-10 flex flex-col items-center">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted dark:bg-white/5 border border-border dark:border-white/10 shadow-inner">
            <Trophy className="h-6 w-6 text-neon" strokeWidth={2.4} />
          </div>

          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground dark:text-white mb-2 text-center">
            {mode === "signin" ? "Welcome Back" : "Create an Account"}
          </h2>
          
          <p className="text-xs text-muted-foreground text-center mb-6 max-w-xs leading-relaxed">
            {mode === "signin" 
              ? "Sign in to save predictions and explore advanced analytical models."
              : "Register to unlock custom rating overrides, player stats, and track leaderboards."
            }
          </p>

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="modal-name">
                  Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-muted-foreground/60" />
                  </span>
                  <input
                    id="modal-name"
                    type="text"
                    placeholder="John Doe"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-border dark:border-white/10 bg-background dark:bg-white/5 pl-9 pr-4 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none transition focus:border-neon focus:bg-card dark:focus:bg-white/10 focus:ring-1 focus:ring-neon"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="modal-email">
                Email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-muted-foreground/60" />
                </span>
                <input
                  id="modal-email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-border dark:border-white/10 bg-background dark:bg-white/5 pl-9 pr-4 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none transition focus:border-neon focus:bg-card dark:focus:bg-white/10 focus:ring-1 focus:ring-neon"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="modal-password">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-muted-foreground/60" />
                </span>
                <input
                  id="modal-password"
                  type="password"
                  placeholder="••••••••"
                  required
                  minLength={mode === "signup" ? 6 : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-border dark:border-white/10 bg-background dark:bg-white/5 pl-9 pr-4 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none transition focus:border-neon focus:bg-card dark:focus:bg-white/10 focus:ring-1 focus:ring-neon"
                />
              </div>
              {mode === "signup" && (
                <p className="text-[10px] text-muted-foreground mt-1">Must be at least 6 characters.</p>
              )}
              {mode === "signin" && (
                <div className="flex justify-end mt-1">
                  <a href="/forgot-password" className="text-[10px] text-neon hover:underline cursor-pointer">
                    Forgot Password?
                  </a>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="group mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-neon to-neon-2 py-3 text-sm font-semibold text-background transition hover:opacity-90 active:scale-98 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {mode === "signin" ? "Sign In" : "Sign Up"}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <div className="my-5 flex w-full items-center">
            <div className="flex-1 border-t border-border dark:border-white/10"></div>
            <span className="px-3 text-[10px] text-muted-foreground uppercase tracking-wider">Or continue with</span>
            <div className="flex-1 border-t border-border dark:border-white/10"></div>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full">
            <button
              type="button"
              onClick={() => handleOAuthSignIn("github")}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 rounded-xl border border-border dark:border-white/10 bg-background dark:bg-white/5 px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted dark:hover:bg-white/10 active:scale-98"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub
            </button>
            <button
              type="button"
              onClick={() => handleOAuthSignIn("google")}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 rounded-xl border border-border dark:border-white/10 bg-background dark:bg-white/5 px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted dark:hover:bg-white/10 active:scale-98"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="font-semibold text-neon hover:underline cursor-pointer bg-transparent border-none outline-none focus:outline-none"
            >
              {mode === "signin" ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
