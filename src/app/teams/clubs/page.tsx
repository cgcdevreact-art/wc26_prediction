import { getStaticTeamsFromCup, getPlayers } from "@/lib/data";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { Lock, Shield, Sparkles } from "lucide-react";
import ClubsClient from "./ClubsClient";

export const metadata = {
  title: "Club Rankings — WC26 Predict",
  description: "See which football clubs have the most players participating in the FIFA World Cup 2026.",
};

export default async function ClubsPage() {
  const session = await auth();
  const subscriptionTier = session?.user?.subscriptionTier?.toLowerCase() || "free";
  const hasAccess = Boolean(session?.user) && subscriptionTier !== "free";

  if (!hasAccess) {
    const isGuest = !session?.user;

    return (
      <div className="container mx-auto px-4 py-10 sm:py-12">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="mb-2 font-display text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
              Club Rankings
            </h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Explore which football clubs have the most players participating in the World Cup
            </p>
          </div>

          <div className="inline-flex w-full flex-wrap items-center rounded-full border border-slate-200 bg-white p-1.5 shadow-[0_12px_30px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_16px_40px_rgba(0,0,0,0.22)] sm:w-auto">
            <Link
              href="/teams"
              className="flex-1 rounded-full px-5 py-2.5 text-center text-sm font-semibold text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white sm:flex-none"
            >
              Teams List
            </Link>
            <Link
              href="/teams/compare"
              className="flex-1 rounded-full px-5 py-2.5 text-center text-sm font-semibold text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white sm:flex-none"
            >
              Compare Teams
            </Link>
            <Link
              href="/teams/clubs"
              className="flex-1 rounded-full bg-gradient-to-r from-[#0a8a45] via-[#2c7c87] to-[#af3fd1] px-5 py-2.5 text-center text-sm font-semibold text-white shadow-[0_12px_30px_rgba(44,124,135,0.24)] sm:flex-none"
            >
              Club Rankings
            </Link>
          </div>
        </div>

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-950">
          <div className="relative px-6 py-12 sm:px-10 sm:py-16">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(10,138,69,0.16),transparent_36%),radial-gradient(circle_at_center,rgba(44,124,135,0.14),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(175,63,209,0.14),transparent_34%)]" />

            <div className="relative mx-auto max-w-2xl text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-gradient-to-br from-[#0a8a45]/10 via-[#2c7c87]/10 to-[#af3fd1]/10 text-slate-800 dark:border-white/10 dark:from-[#0a8a45]/20 dark:via-[#2c7c87]/20 dark:to-[#af3fd1]/20 dark:text-white">
                {isGuest ? <Shield className="h-7 w-7" /> : <Lock className="h-7 w-7" />}
              </div>

              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200">
                <Sparkles className="h-3.5 w-3.5 text-[#2c7c87]" />
                Premium Access
              </span>

              <h2 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                {isGuest ? "Sign in to unlock Club Rankings" : "Upgrade your plan to access Club Rankings"}
              </h2>

              <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
                {isGuest
                  ? "Club Rankings are available to subscribed members only. Sign in first, then upgrade your plan to explore every club represented at the World Cup."
                  : "Your current plan does not include Club Rankings. Upgrade to a paid plan to unlock the full club table, filters, and player breakdowns."}
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                {isGuest ? (
                  <Link
                    href="/signin?callbackUrl=%2Fteams%2Fclubs"
                    className="inline-flex min-w-[180px] items-center justify-center rounded-2xl bg-gradient-to-r from-[#0a8a45] via-[#2c7c87] to-[#af3fd1] px-6 py-3 text-sm font-bold text-white shadow-[0_16px_40px_rgba(44,124,135,0.28)] transition hover:opacity-95"
                  >
                    Sign In
                  </Link>
                ) : (
                  <Link
                    href="/subscription"
                    className="inline-flex min-w-[180px] items-center justify-center rounded-2xl bg-gradient-to-r from-[#0a8a45] via-[#2c7c87] to-[#af3fd1] px-6 py-3 text-sm font-bold text-white shadow-[0_16px_40px_rgba(44,124,135,0.28)] transition hover:opacity-95"
                  >
                    Upgrade Plan
                  </Link>
                )}

                <Link
                  href="/teams"
                  className="inline-flex min-w-[180px] items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200 dark:hover:bg-white/[0.06]"
                >
                  Back to Teams
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const defaultPlayers = await getPlayers();
  const cupTeams = getStaticTeamsFromCup();
  const flagMap: Record<string, string> = {};
  cupTeams.forEach((t) => {
    flagMap[t.code] = t.flag;
  });

  return (
    <div className="container mx-auto px-4 py-10 sm:py-12">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="mb-2 font-display text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
            Club Rankings
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Explore which football clubs have the most players participating in the World Cup
          </p>
        </div>

        {/* Sub-category selector navigation */}
        <div className="inline-flex w-full flex-wrap items-center rounded-full border border-slate-200 bg-white p-1.5 shadow-[0_12px_30px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_16px_40px_rgba(0,0,0,0.22)] sm:w-auto">
          <Link
            href="/teams"
            className="flex-1 rounded-full px-5 py-2.5 text-center text-sm font-semibold text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white sm:flex-none"
          >
            Teams List
          </Link>
          <Link
            href="/teams/compare"
            className="flex-1 rounded-full px-5 py-2.5 text-center text-sm font-semibold text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white sm:flex-none"
          >
            Compare Teams
          </Link>
          <Link
            href="/teams/clubs"
            className="flex-1 rounded-full bg-gradient-to-r from-[#0a8a45] via-[#2c7c87] to-[#af3fd1] px-5 py-2.5 text-center text-sm font-semibold text-white shadow-[0_12px_30px_rgba(44,124,135,0.24)] sm:flex-none"
          >
            Club Rankings
          </Link>
        </div>
      </div>

      <ClubsClient players={defaultPlayers} flagMap={flagMap} />
    </div>
  );
}
