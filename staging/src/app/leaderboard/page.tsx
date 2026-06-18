import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Leaderboard — WC26 Predict",
  description: "Global rankings for World Cup 2026 predictions.",
};

export default async function LeaderboardPage() {
  let leaderboard: any[] = [];
  try {
    leaderboard = await prisma.leaderboard.findMany({
      take: 100,
      orderBy: { totalPoints: "desc" },
      include: {
        user: { select: { name: true, image: true } }
      }
    });
  } catch (error) {
    console.warn("Failed to fetch leaderboard from DB, falling back to empty list. Database might not be running.");
  }

  return (
    <div className="min-h-screen bg-hero">
      <Header />
      <main className="pt-6">
        <div className="mx-auto max-w-4xl px-4 md:px-6">
          <div className="text-xs uppercase tracking-[0.25em] text-neon">Rankings</div>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-5xl">Global Leaderboard</h1>
          
          <div className="mt-8 glass rounded-xl border overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-black/20">
                  <th className="p-4 font-medium text-muted-foreground">Rank</th>
                  <th className="p-4 font-medium text-muted-foreground">User</th>
                  <th className="p-4 font-medium text-muted-foreground text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, index) => (
                  <tr key={entry.userId} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                    <td className="p-4 font-bold">{index + 1}</td>
                    <td className="p-4 flex items-center gap-3">
                      {entry.user?.image ? (
                        <img src={entry.user.image} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          {entry.user?.name?.charAt(0) || "?"}
                        </div>
                      )}
                      <span>{entry.user?.name || "Anonymous"}</span>
                    </td>
                    <td className="p-4 text-right font-display font-bold text-neon">
                      {entry.totalPoints}
                    </td>
                  </tr>
                ))}
                {leaderboard.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-muted-foreground">
                      No data available yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
