import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const probabilities = await prisma.countryProbability.findMany({
      include: {
        team: true,
      },
      orderBy: {
        champion: "desc",
      },
      take: 4, // Top 4 teams
    });

    const colors = ["#3b82f6", "#06b6d4", "#f59e0b", "#ef4444"];
    const teams = probabilities.map((p, idx) => {
      const emojis: Record<string, string> = {
        FRA: "🇫🇷", ARG: "🇦🇷", ENG: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", ESP: "🇪🇸",
        BRA: "🇧🇷", POR: "🇵🇹", GER: "🇩🇪", BEL: "🇧🇪",
        ITA: "🇮🇹", CRO: "🇭🇷", NED: "🇳🇱", URU: "🇺🇾",
        USA: "🇺🇸", MEX: "🇲🇽", CAN: "🇨🇦", JPN: "🇯🇵"
      };

      const code = p.team.tla || "TBD";
      const flag = emojis[code] || "⚽";

      return {
        name: p.team.name,
        code,
        flag,
        prob: Math.max(1, Math.round(p.champion * 100)),
        color: colors[idx] || "#64748b",
      };
    });

    // Fallback if no probabilities are seeded yet
    if (teams.length === 0) {
      return NextResponse.json({
        teams: [
          { name: "France", code: "FRA", flag: "🇫🇷", prob: 33, color: "#3b82f6" },
          { name: "Argentina", code: "ARG", flag: "🇦🇷", prob: 17, color: "#06b6d4" },
          { name: "England", code: "ENG", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", prob: 14, color: "#f59e0b" },
          { name: "Spain", code: "ESP", flag: "🇪🇸", prob: 13, color: "#ef4444" },
        ],
        chartData: [
          { date: "Jun 14", France: 18, Argentina: 9, England: 11, Spain: 14 },
          { date: "Jun 21", France: 20, Argentina: 10, England: 12, Spain: 15 },
          { date: "Jun 28", France: 24, Argentina: 12, England: 10, Spain: 13 },
          { date: "Jul 5", France: 33, Argentina: 17, England: 14, Spain: 13 },
        ],
        comments: [
          { username: "cfvfsd99", comment: "Cristiano Ronaldo's last World Cup! Hoping Portugal wins." },
          { username: "junipero", comment: "Ole, Ole, Ole, Ole, Spain is playing beautiful soccer! 💙" },
        ],
        totalVotes: 12500,
      });
    }

    // Generate historical chart data ending at current probabilities
    const chartData = [];
    const now = new Date();
    const days = 7;

    for (let i = days; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      const point: Record<string, any> = { date: dateStr };
      teams.forEach((t) => {
        if (i === 0) {
          point[t.name] = t.prob;
        } else {
          // Variance scales down as we reach today (i -> 0)
          const variance = Math.round((Math.random() - 0.5) * 4 * i);
          point[t.name] = Math.max(1, t.prob + variance);
        }
      });
      chartData.push(point);
    }

    // Dynamic comments mentioning the teams
    const comments = [
      { 
        username: "cfvfsd99", 
        comment: `Hoping for a miracle! Can ${teams[1]?.name || "anyone"} beat ${teams[0]?.name || "France"}?` 
      },
      { 
        username: "junipero", 
        comment: `${teams[0]?.name || "France"} vs ${teams[1]?.name || "Argentina"} final would be absolutely legendary! 💙` 
      },
    ];

    const totalVotes = teams.reduce((acc, curr) => acc + curr.prob, 0) * 185;

    return NextResponse.json({
      teams,
      chartData,
      comments,
      totalVotes,
    });
  } catch (error) {
    console.error("Failed to fetch winner API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
