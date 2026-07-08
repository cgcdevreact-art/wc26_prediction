import { getStaticTeamsFromCup, getPlayers } from "@/lib/data";
import Link from "next/link";
import ClubsClient from "./ClubsClient";

export const metadata = {
  title: "Club Rankings — WC26 Predict",
  description: "See which football clubs have the most players participating in the FIFA World Cup 2026.",
};

export default async function ClubsPage() {
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

        <div className="flex w-full md:w-auto overflow-x-auto scrollbar-none whitespace-nowrap items-center rounded-full border border-slate-200 bg-white p-1.5 shadow-[0_12px_30px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_16px_40px_rgba(0,0,0,0.22)] sm:w-auto">
          <Link
            href="/teams"
            className="shrink-0 flex-none rounded-full px-5 py-2.5 text-center text-sm font-semibold text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white whitespace-nowrap"
          >
            Teams List
          </Link>
          <Link
            href="/teams/compare"
            className="shrink-0 flex-none rounded-full px-5 py-2.5 text-center text-sm font-semibold text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white whitespace-nowrap"
          >
            Compare Teams
          </Link>
          <Link
            href="/teams/clubs"
            className="shrink-0 flex-none rounded-full bg-gradient-to-r from-[#0a8a45] via-[#2c7c87] to-[#af3fd1] px-5 py-2.5 text-center text-sm font-semibold text-white shadow-[0_12px_30px_rgba(44,124,135,0.24)] whitespace-nowrap"
          >
            Club Rankings
          </Link>
        </div>
      </div>

      <ClubsClient players={defaultPlayers} flagMap={flagMap} />
    </div>
  );
}
