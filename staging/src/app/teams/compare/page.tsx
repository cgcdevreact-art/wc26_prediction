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
          <h1 className="text-5xl font-display font-extrabold tracking-tight text-gradient mb-2">
            Compare Teams
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Compare any two World Cup 2026 teams across every metric
          </p>
        </div>
        
        {/* Sub-category selector navigation */}
        <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl shrink-0">
          <Link
            href="/teams"
            className="px-4 py-2 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground transition"
          >
            Teams List
          </Link>
          <Link
            href="/teams/compare"
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-white/10 text-foreground"
          >
            Compare Teams
          </Link>
        </div>
      </div>

      <CompareTeams standalone />
    </div>
  );
}
