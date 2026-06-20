import Link from "next/link";
import { CompareTeams } from "@/components/site/CompareTeams";

export const metadata = {
  title: "Compare Teams — WC26 Predict",
  description: "Compare any two World Cup 2026 teams across every metric.",
};

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="mb-2 font-display text-5xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            Compare Teams
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Compare any two World Cup 2026 teams across every metric
          </p>
        </div>
        
        {/* Sub-category selector navigation */}
        <div className="inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-white p-1.5 shadow-[0_12px_30px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
          <Link
            href="/teams"
            className="rounded-full px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
          >
            Teams List
          </Link>
          <Link
            href="/teams/compare"
            className="rounded-full bg-gradient-to-r from-[#0a8a45] via-[#2c7c87] to-[#af3fd1] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(44,124,135,0.24)]"
          >
            Compare Teams
          </Link>
        </div>
      </div>

      <CompareTeams standalone />
    </div>
  );
}
