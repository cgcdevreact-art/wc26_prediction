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
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-5xl font-display font-extrabold tracking-tight text-gradient mb-2">
            Teams
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Explore and customize team attributes for your simulation
          </p>
        </div>
        
        {/* Sub-category selector navigation */}
        <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl shrink-0">
          <Link
            href="/teams"
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-white/10 text-foreground"
          >
            Teams List
          </Link>
          <Link
            href="/teams/compare"
            className="px-4 py-2 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground transition"
          >
            Compare Teams
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
