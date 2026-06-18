import { getStaticTeamsFromCup, getPlayers } from "@/lib/data";
import fs from "fs";
import path from "path";
import TeamDetailsClient from "./TeamDetailsClient";
import { TeamStats, PlayerStats } from "@/lib/store/simulationStore";

export default async function TeamPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  
  // Read JSON files directly from public directory for direct navigation healing
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
  cupTeams.forEach(t => {
    flagMap[t.code] = t.flag;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <TeamDetailsClient 
        teamCode={code} 
        flagMap={flagMap}
        initialTeams={defaultTeams}
        initialPlayers={defaultPlayers}
      />
    </div>
  );
}
