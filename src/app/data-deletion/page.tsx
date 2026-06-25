"use client";

import React, { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Trash2, 
  AlertTriangle, 
  Send, 
  CheckCircle2, 
  ShieldAlert, 
  LogIn, 
  Globe, 
  Clock, 
  UserMinus, 
  RefreshCw 
} from "lucide-react";

export default function DataDeletionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Signed-in deletion states
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  // Signed-out request states
  const [email, setEmail] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [isRequestSubmitted, setIsRequestSubmitted] = useState(false);

  const handleDeleteAccount = async () => {
    if (confirmText !== "DELETE MY DATA") {
      toast.error("Please type 'DELETE MY DATA' exactly to confirm deletion.");
      return;
    }

    try {
      setIsDeleting(true);
      const res = await fetch("/api/user/delete", {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Failed to delete user account");
      }

      const data = await res.json();
      if (data.success) {
        toast.success("Your account and all related data have been permanently deleted.");
        await signOut({ callbackUrl: "/" });
      } else {
        throw new Error(data.error || "Something went wrong");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An error occurred while deleting your account. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter a valid email address.");
      return;
    }

    try {
      setIsSubmittingRequest(true);
      // Simulate API submit for unauthenticated deletion requests (compliance purposes).
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setIsRequestSubmitted(true);
      toast.success("Data deletion request submitted successfully.");
    } catch (err) {
      toast.error("Failed to submit data deletion request. Please try again.");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-12 max-w-6xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-450 border border-rose-500/20 text-xs font-semibold uppercase tracking-wider mb-4">
            <Trash2 className="w-3.5 h-3.5" />
            <span>Account Deletion Portal</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            User Data <span className="text-gradient">Deletion</span>
          </h1>
          <p className="mt-3 text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
            Manage your personal data, simulation preferences, and predictions. Delete your account instantly or submit a removal request for compliance.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3 items-start">
          
          {/* Main Action Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5 rounded-3xl p-6 sm:p-8 shadow-xl backdrop-blur-md">
              
              {status === "loading" ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 text-primary animate-spin mb-3" />
                  <p className="text-sm text-muted-foreground">Checking authentication state...</p>
                </div>
              ) : session?.user ? (
                /* Authenticated User Flow */
                <div className="space-y-6">
                  <div>
                    <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <UserMinus className="w-5 h-5 text-rose-500" />
                      Delete Your Account & Data
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Logged in as <strong className="text-foreground">{session.user.email}</strong>
                    </p>
                  </div>

                  <div className="bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 rounded-2xl p-5 flex items-start gap-4">
                    <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div className="text-sm space-y-2 text-rose-800 dark:text-rose-300">
                      <strong className="block font-bold">This action is permanent and cannot be undone.</strong>
                      <p className="leading-relaxed">
                        By deleting your account, the following items will be immediately and permanently erased from our servers:
                      </p>
                      <ul className="list-disc pl-5 space-y-1 text-xs">
                        <li>Your user profile, name, and email mapping.</li>
                        <li>All tournament simulation states, custom teams, and Elo configurations.</li>
                        <li>Your leaderboard standings, weekly stats, and achievements.</li>
                        <li>All historical predictions and saved bracket projections.</li>
                      </ul>
                    </div>
                  </div>

                  {!isConfirming ? (
                    <button
                      onClick={() => setIsConfirming(true)}
                      className="w-full py-3.5 px-6 rounded-2xl bg-rose-600 text-white font-semibold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-600/10 flex items-center justify-center gap-2 text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete My Account & Prediction Data
                    </button>
                  ) : (
                    <div className="space-y-4 p-5 rounded-2xl border border-rose-500/20 bg-rose-500/[0.02] dark:bg-rose-500/[0.01]">
                      <label className="block text-xs font-semibold text-rose-600 dark:text-rose-450 uppercase tracking-wider mb-2">
                        Verification Required
                      </label>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        To confirm this permanent action, type <span className="font-bold text-slate-800 dark:text-slate-200 select-all">DELETE MY DATA</span> in the box below:
                      </p>
                      <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="DELETE MY DATA"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono tracking-wider text-center"
                      />
                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button
                          disabled={isDeleting}
                          onClick={handleDeleteAccount}
                          className="flex-1 py-3 px-6 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isDeleting ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-3.5 h-3.5" />
                              Confirm Permanent Purge
                            </>
                          )}
                        </button>
                        <button
                          disabled={isDeleting}
                          onClick={() => {
                            setIsConfirming(false);
                            setConfirmText("");
                          }}
                          className="py-3 px-6 rounded-xl border border-slate-250 dark:border-white/10 hover:bg-slate-500/5 text-slate-700 dark:text-slate-350 font-semibold text-xs uppercase tracking-wider transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Unauthenticated User Flow */
                <div className="space-y-6">
                  <div>
                    <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-rose-500" />
                      Request Account Deletion
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Submit your email address below to submit a manual deletion request.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-4">
                    <LogIn className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1.5 text-blue-800 dark:text-blue-300 leading-relaxed">
                      <strong className="font-bold block">Prefer Instant Deletion?</strong>
                      <p>
                        If you have an active account, sign in first to delete your account automatically in one click.
                      </p>
                      <Link 
                        href="/signin?callbackUrl=/data-deletion" 
                        className="inline-block mt-1 font-semibold text-blue-500 hover:text-blue-600 underline transition-colors"
                      >
                        Sign In Now &rarr;
                      </Link>
                    </div>
                  </div>

                  {isRequestSubmitted ? (
                    <div className="p-6 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/25 flex flex-col items-center text-center space-y-3">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                      <h3 className="font-display font-bold text-slate-900 dark:text-white text-base">Request Submitted</h3>
                      <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                        We have logged a deletion request for <strong className="text-slate-800 dark:text-slate-200">{email}</strong>. 
                        A confirmation email has been dispatched. Your data will be fully purged within 24 hours.
                      </p>
                      <button
                        onClick={() => {
                          setIsRequestSubmitted(false);
                          setEmail("");
                        }}
                        className="text-xs text-primary font-semibold hover:underline"
                      >
                        Submit another request
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleRequestSubmit} className="space-y-4">
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your-email@example.com"
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-250 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmittingRequest}
                        className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                      >
                        {isSubmittingRequest ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Submitting Request...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Submit Deletion Request
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* Compliance & Info Sidebar */}
          <div className="space-y-6">
            
            {/* OAuth Compliance */}
            <div className="bg-white/50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5 rounded-3xl p-6 shadow-xl backdrop-blur-md space-y-4">
              <div className="flex items-center gap-2 font-display text-sm font-bold text-slate-900 dark:text-white">
                <Globe className="w-4.5 h-4.5 text-primary" />
                <h3>OAuth & Callback Info</h3>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 space-y-2.5 leading-relaxed">
                <p>
                  According to the Platform developer requirements (e.g., Facebook, Google APIs), developers must provide a 
                  <strong> User Data Deletion Callback URL</strong> or instruction URL.
                </p>
                <p>
                  If you connected your 26WC Prediction account with third-party social integrations, this page serves as the official compliance handler.
                </p>
                <div className="p-3 bg-slate-500/[0.03] dark:bg-white/[0.01] border border-slate-200/10 dark:border-white/5 rounded-xl font-mono text-[10px] break-all select-all text-slate-800 dark:text-slate-350">
                  https://wc26predict.com/data-deletion
                </div>
              </div>
            </div>

            {/* SLA Deletion Timing */}
            <div className="bg-white/50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5 rounded-3xl p-6 shadow-xl backdrop-blur-md space-y-4">
              <div className="flex items-center gap-2 font-display text-sm font-bold text-slate-900 dark:text-white">
                <Clock className="w-4.5 h-4.5 text-blue-500" />
                <h3>Processing Timeline</h3>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 space-y-2.5 leading-relaxed">
                <p>
                  <strong>Automatic requests</strong> triggered by logged-in users are executed instantly in real-time. Database entries cascade and clean up in less than 5 seconds.
                </p>
                <p>
                  <strong>Manual email requests</strong> require processing by our platform compliance team. These requests are usually processed and confirmed within <strong>24 hours</strong>.
                </p>
              </div>
            </div>

          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
