import { getStaticTeamsFromCup, getPlayers } from "@/lib/data";
import fs from "fs";
import path from "path";
import CountryPredictionsClient from "./CountryPredictionsClient";
import { TeamStats, PlayerStats } from "@/lib/store/simulationStore";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const metadata = {
  title: "Country Predictions — WC26 Predict",
  description: "Explore any nation's complete path to World Cup 2026 glory, calculated using advanced Poisson simulation models.",
};

export default async function CountryPredictionsPage() {
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
    <div className="min-h-screen bg-hero text-foreground flex flex-col">
      <Header />
      <main className="flex-grow">
        <CountryPredictionsClient 
          initialTeams={defaultTeams}
          initialPlayers={defaultPlayers}
          flagMap={flagMap}
        />
      </main>
      <Footer />
    </div>
  );
}
