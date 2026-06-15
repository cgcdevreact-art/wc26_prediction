import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getTeams } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function TeamProbabilityPage({ params }: { params: { slug: string } }) {
  let team: any = null;
  let countryProb: any = null;

  try {
    team = await prisma.team.findFirst({
      where: { tla: params.slug.toUpperCase() },
      include: { countryProb: true }
    });
    if (team) {
      countryProb = team.countryProb;
    }
  } catch (error) {
    console.warn("Failed to fetch team from database, falling back to static data. Database might not be running.");
  }

  // Fallback to static data
  if (!team) {
    const teams = await getTeams();
    const staticTeam = teams.find(t => t.code === params.slug.toUpperCase());
    if (!staticTeam) {
      return notFound();
    }
    team = {
      name: staticTeam.name,
      tla: staticTeam.code,
    };
    countryProb = {
      groupStage: staticTeam.prob.qualify,
      round16: staticTeam.prob.r16,
      quarterFinal: staticTeam.prob.qf,
      semiFinal: staticTeam.prob.sf,
      final: staticTeam.prob.final,
      champion: staticTeam.prob.champion,
      mostLikelyPath: JSON.stringify(["Switzerland", "Germany", "Argentina"])
    };
  }

  if (!countryProb) {
    return notFound();
  }

  const prob = countryProb;
  const path = prob.mostLikelyPath ? JSON.parse(prob.mostLikelyPath) : [];

  return (
    <div className="min-h-screen bg-hero">
      <Header />
      <main className="pt-6">
        <div className="mx-auto max-w-4xl px-4 md:px-6">
          <div className="text-xs uppercase tracking-[0.25em] text-neon">{team.name}</div>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-5xl">World Cup Probabilities</h1>
          
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard title="Group Qualification" value={prob.groupStage} />
            <StatCard title="Round of 16" value={prob.round16} />
            <StatCard title="Quarter Final" value={prob.quarterFinal} />
            <StatCard title="Semi Final" value={prob.semiFinal} />
            <StatCard title="Final" value={prob.final} />
            <StatCard title="Champion" value={prob.champion} highlight />
          </div>

          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-4">Most Likely Path</h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-lg">{team.name}</span>
              {path.map((opponent: string, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-muted-foreground">→</span>
                  <span className="px-3 py-1 bg-card rounded-md border text-sm">{opponent}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function StatCard({ title, value, highlight = false }: { title: string; value: number; highlight?: boolean }) {
  return (
    <div className={`p-6 rounded-xl border glass ${highlight ? "border-neon shadow-neon" : ""}`}>
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className={`mt-2 text-4xl font-display font-bold ${highlight ? "text-neon" : "text-foreground"}`}>
        {value.toFixed(1)}%
      </div>
    </div>
  );
}
