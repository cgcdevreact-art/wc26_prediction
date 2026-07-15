import Link from "next/link";
import { CompareTeams } from "@/components/site/CompareTeams";

export const metadata = {
  title: "Compare Teams — WC26 Predict",
  description: "Compare any two World Cup 2026 teams across every metric.",
};

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-6 sm:py-6">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="mb-2 font-display text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
            Compare Teams
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Compare any two World Cup 2026 teams across every metric
          </p>
        </div>
        
        {/* Sub-category selector navigation */}
        <div 
          className="flex flex-col w-full gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_12px_30px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_16px_40px_rgba(0,0,0,0.22)] min-[500px]:inline-flex min-[500px]:flex-row min-[500px]:w-auto min-[500px]:gap-0 min-[500px]:rounded-full min-[500px]:p-1.5"
        >
          <Link
            href="/teams"
            className="w-full text-center text-sm font-semibold px-4 py-2.5 rounded-xl text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white hover:bg-slate-500/[0.03] min-[500px]:w-auto min-[500px]:rounded-full min-[500px]:px-5 min-[500px]:hover:bg-transparent"
          >
            Teams List
          </Link>
          <Link
            href="/teams/compare"
            className="w-full text-center text-sm font-semibold px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0a8a45] via-[#2c7c87] to-[#af3fd1] text-white shadow-[0_12px_30px_rgba(44,124,135,0.24)] min-[500px]:w-auto min-[500px]:rounded-full min-[500px]:px-5 min-[500px]:shadow-none"
          >
            Compare Teams
          </Link>
          <Link
            href="/teams/clubs"
            className="w-full text-center text-sm font-semibold px-4 py-2.5 rounded-xl text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white hover:bg-slate-500/[0.03] min-[500px]:w-auto min-[500px]:rounded-full min-[500px]:px-5 min-[500px]:hover:bg-transparent"
          >
            Club Rankings
          </Link>
        </div>
      </div>

      <CompareTeams standalone />
    </div>
  );
}
