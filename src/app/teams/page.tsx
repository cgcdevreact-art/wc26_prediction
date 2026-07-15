import { getStaticTeamsFromCup, getPlayers } from "@/lib/data";
import fs from "fs";
import path from "path";
import Link from "next/link";
import TeamsClient from "./TeamsClient";
import { TeamStats, PlayerStats } from "@/lib/store/simulationStore";

// Server Component
export default async function TeamsPage() {
  // Read JSON files directly from public directory
  const teamsPath = path.join(process.cwd(), "public", "teams.json");
  
  let defaultTeams: TeamStats[] = [];
  
  try {
    const teamsData = fs.readFileSync(teamsPath, "utf8");
    defaultTeams = JSON.parse(teamsData);
  } catch (e) {
    console.error("Failed to load teams.json", e);
  }

  const defaultPlayers = await getPlayers();

  // Grab the static cup teams to pass flags down
  const cupTeams = getStaticTeamsFromCup();
  const flagMap: Record<string, string> = {};
  cupTeams.forEach((t) => {
    flagMap[t.code] = t.flag;
  });

  return (
    <div className="container mx-auto px-4 py-8 sm:py-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="mb-2 font-display text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
            Teams
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Explore and customize team attributes for your simulation
          </p>
        </div>
        
        {/* Sub-category selector navigation */}
        <div 
          className="flex flex-col w-full gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_12px_30px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_16px_40px_rgba(0,0,0,0.22)] min-[500px]:inline-flex min-[500px]:flex-row min-[500px]:w-auto min-[500px]:gap-0 min-[500px]:rounded-full min-[500px]:p-1.5"
        >
          <Link
            href="/teams"
            className="w-full text-center text-sm font-semibold px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0a8a45] via-[#2c7c87] to-[#af3fd1] text-white shadow-[0_12px_30px_rgba(44,124,135,0.24)] min-[500px]:w-auto min-[500px]:rounded-full min-[500px]:px-5 min-[500px]:shadow-none"
          >
            Teams List
          </Link>
          <Link
            href="/teams/compare"
            className="w-full text-center text-sm font-semibold px-4 py-2.5 rounded-xl text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white hover:bg-slate-500/[0.03] min-[500px]:w-auto min-[500px]:rounded-full min-[500px]:px-5 min-[500px]:hover:bg-transparent"
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
      
      <TeamsClient 
        initialTeams={defaultTeams} 
        initialPlayers={defaultPlayers} 
        flagMap={flagMap} 
      />
    </div>
  );
}
