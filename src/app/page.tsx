import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Hero } from "@/components/site/Hero";
import { LiveStats } from "@/components/site/LiveStats";
import { ProbabilityExplorer } from "@/components/site/ProbabilityExplorer";
import { FixturesExplorer } from "@/components/site/FixturesExplorer";
import { GroupPredictor } from "@/components/site/GroupPredictor";
import { MatchCenter } from "@/components/site/MatchCenter";
import { CompareTeams } from "@/components/site/CompareTeams";
import { BracketPreview } from "@/components/site/BracketPreview";
import { Engagement } from "@/components/site/Engagement";

export const metadata = {
  title: "WC26 Predict — Who Will Win the FIFA World Cup 2026?",
  description: "Predict every match, simulate the tournament, build your bracket and compete globally for World Cup 2026 glory.",
};

export default function Page() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <LiveStats />
        <ProbabilityExplorer />
        <FixturesExplorer />
        {/* <GroupPredictor /> */}
        {/* <MatchCenter /> */}
        {/* <CompareTeams />
        <BracketPreview /> */}
        {/* <Engagement /> */}
      </main>
      <Footer />
    </div>
  );
}
