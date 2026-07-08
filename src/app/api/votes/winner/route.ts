import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { teamId } = body;

    if (!teamId) {
      return NextResponse.json({ error: "Missing teamId" }, { status: 400 });
    }

    // Enforce 1 vote per user for tournament winner using null matchId (bypassing match foreign key)
    const existing = await prisma.prediction.findFirst({
      where: {
        userId: session.user.id,
        type: "VOTE_CHAMPION"
      }
    });

    if (existing) {
      await prisma.prediction.update({
        where: { id: existing.id },
        data: {
          predictedTeamId: parseInt(teamId, 10)
        }
      });
    } else {
      await prisma.prediction.create({
        data: {
          userId: session.user.id,
          type: "VOTE_CHAMPION",
          predictedTeamId: parseInt(teamId, 10)
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to cast winner vote:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

function getTeamIdFromCode(code: string): number {
  if (!code) return 0;
  const c = code.toUpperCase();
  return c.charCodeAt(0) * 10000 + (c.charCodeAt(1) || 65) * 100 + (c.charCodeAt(2) || 65);
}

async function getActiveTeams() {
  const matches = await prisma.fixtureCache.findMany();
  if (matches.length === 0) return [];

  // 1. Gather all unique teams in the cache
  const allTeamsMap = new Map<string, { id: number; name: string; tla: string; crest: string }>();
  matches.forEach((m) => {
    if (m.homeTeamCode && m.homeTeamName && m.homeTeamCode !== "TBD" && !m.homeTeamName.includes("Winner") && !m.homeTeamName.includes("Runner")) {
      allTeamsMap.set(m.homeTeamCode, {
        id: getTeamIdFromCode(m.homeTeamCode),
        name: m.homeTeamName,
        tla: m.homeTeamCode,
        crest: m.homeTeamFlag || ""
      });
    }
    if (m.awayTeamCode && m.awayTeamName && m.awayTeamCode !== "TBD" && !m.awayTeamName.includes("Winner") && !m.awayTeamName.includes("Runner")) {
      allTeamsMap.set(m.awayTeamCode, {
        id: getTeamIdFromCode(m.awayTeamCode),
        name: m.awayTeamName,
        tla: m.awayTeamCode,
        crest: m.awayTeamFlag || ""
      });
    }
  });

  // 2. Identify all teams that have ever been assigned to a knockout match
  const knockoutTeams = new Set<string>();
  matches.forEach((m) => {
    if (m.isKnockout) {
      if (m.homeTeamCode && m.homeTeamCode !== "TBD" && !m.homeTeamName.includes("Winner")) {
        knockoutTeams.add(m.homeTeamCode);
      }
      if (m.awayTeamCode && m.awayTeamCode !== "TBD" && !m.awayTeamName.includes("Winner")) {
        knockoutTeams.add(m.awayTeamCode);
      }
    }
  });

  const eliminated = new Set<string>();

  // 3. If knockout stage matches exist in the DB, teams that never made it to knockout are eliminated
  if (knockoutTeams.size > 0) {
    allTeamsMap.forEach((_, code) => {
      if (!knockoutTeams.has(code)) {
        eliminated.add(code);
      }
    });
  }

  // 4. Knockout match losers are eliminated
  matches.forEach((m) => {
    if (m.isKnockout && m.status === "COMPLETED") {
      const hs = parseInt(m.homeScore, 10);
      const as = parseInt(m.awayScore, 10);
      if (!isNaN(hs) && !isNaN(as)) {
        if (hs > as && m.awayTeamCode) {
          eliminated.add(m.awayTeamCode);
        } else if (as > hs && m.homeTeamCode) {
          eliminated.add(m.homeTeamCode);
        } else {
          // Draw (penalties tiebreaker). Look at subsequent stages to see who qualified.
          // If one team appears in a later match, the other is eliminated.
          const homeInSubsequent = matches.some((om) => 
            om.isKnockout && 
            om.matchNo > m.matchNo && 
            (om.homeTeamCode === m.homeTeamCode || om.awayTeamCode === m.homeTeamCode)
          );
          const awayInSubsequent = matches.some((om) => 
            om.isKnockout && 
            om.matchNo > m.matchNo && 
            (om.homeTeamCode === m.awayTeamCode || om.awayTeamCode === m.awayTeamCode)
          );

          if (homeInSubsequent && !awayInSubsequent && m.awayTeamCode) {
            eliminated.add(m.awayTeamCode);
          } else if (awayInSubsequent && !homeInSubsequent && m.homeTeamCode) {
            eliminated.add(m.homeTeamCode);
          }
        }
      }
    }
  });

  const activeTeams: any[] = [];
  allTeamsMap.forEach((team, code) => {
    if (!eliminated.has(code)) {
      activeTeams.push(team);
    }
  });

  return activeTeams;
}

export async function GET() {
  try {
    // 1. Get live votes count per team from database
    const voteGroups = await prisma.prediction.groupBy({
      by: ['predictedTeamId'],
      where: {
        type: "VOTE_CHAMPION"
      },
      _count: {
        id: true
      }
    });

    const dbTeamCounts = voteGroups.reduce((acc, curr) => {
      if (curr.predictedTeamId) {
        acc[curr.predictedTeamId] = curr._count.id;
      }
      return acc;
    }, {} as Record<number, number>);

    // 2. Define baseline teams data
    const baselineStandings = [
      { teamCode: "FRA", name: "France", volume: "$100,964,929", historicalChange: "+16%", realVotes: 163000, flag: "🇫🇷", color: "#60a5fa" }, // light blue
      { teamCode: "ARG", name: "Argentina", volume: "$116,548,173", historicalChange: "+5%", realVotes: 93000, flag: "🇦🇷", color: "#3b82f6" }, // royal blue
      { teamCode: "ESP", name: "Spain", volume: "$93,011,296", historicalChange: "+3%", realVotes: 93000, flag: "🇪🇸", color: "#eab308" }, // yellow
      { teamCode: "ENG", name: "England", volume: "$88,254,878", historicalChange: "+2%", realVotes: 78000, flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", color: "#f97316" }, // orange
      { teamCode: "NOR", name: "Norway", volume: "$117,773,640", historicalChange: "0%", realVotes: 30000, flag: "🇳🇴", color: "#10b981" },
      { teamCode: "MAR", name: "Morocco", volume: "$139,247,014", historicalChange: "0%", realVotes: 15000, flag: "🇲🇦", color: "#8b5cf6" },
      { teamCode: "BEL", name: "Belgium", volume: "$117,861,416", historicalChange: "0%", realVotes: 10000, flag: "🇧🇪", color: "#ec4899" },
      { teamCode: "SUI", name: "Switzerland", volume: "$114,465,714", historicalChange: "0%", realVotes: 10000, flag: "🇨🇭", color: "#6366f1" }
    ];

    // 3. Map votes and calculate totals
    let totalVotes = 0;
    const mappedStandings = baselineStandings.map(team => {
      const id = getTeamIdFromCode(team.teamCode);
      const extraVotes = dbTeamCounts[id] || 0;
      const finalVotes = team.realVotes + extraVotes;
      totalVotes += finalVotes;
      return {
        ...team,
        id,
        finalVotes
      };
    });

    // 4. Calculate exact probabilities
    const allMappedTeams = mappedStandings.map(team => {
      const exactProbability = totalVotes > 0 ? (team.finalVotes / totalVotes) * 100 : 0;
      const prob = Math.round(exactProbability);
      return {
        id: team.id,
        name: team.name,
        code: team.teamCode,
        flag: team.flag,
        volume: team.volume,
        historicalChange: team.historicalChange,
        prob: Math.max(0, prob),
        exactProbability: Number(exactProbability.toFixed(1)),
        probability: exactProbability.toFixed(1) + "%",
        color: team.color,
        realVotes: team.finalVotes
      };
    });

    // Top 4 plotted teams
    const teams = allMappedTeams.slice(0, 4);

    // 5. Construct the dynamic timeline (June 11 to now)
    let chartData: any[] = [];
    
    try {
      interface VoteDayRaw {
        date: string | Date;
        predictedTeamId: number;
        count: number | bigint;
      }

      // Query daily vote counts per team from database
      const rawRows = await prisma.$queryRaw<VoteDayRaw[]>`
        SELECT 
          DATE(createdAt) as date, 
          predictedTeamId, 
          COUNT(*) as count 
        FROM Prediction 
        WHERE type = 'VOTE_CHAMPION' AND predictedTeamId IS NOT NULL
        GROUP BY DATE(createdAt), predictedTeamId 
        ORDER BY date ASC
      `;

      const formattedRows = rawRows.map(r => {
        let dateStr = "";
        if (r.date instanceof Date) {
          dateStr = r.date.toISOString().split('T')[0];
        } else {
          dateStr = String(r.date).split(' ')[0];
        }
        return {
          date: dateStr,
          teamId: Number(r.predictedTeamId),
          count: Number(r.count)
        };
      });

      // Generate date range from June 11, 2026 to today
      const startDate = new Date("2026-06-11");
      const endDate = new Date();
      const dateRange: string[] = [];
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        dateRange.push(d.toISOString().split('T')[0]);
      }

      const votesMap: Record<string, Record<number, number>> = {};
      formattedRows.forEach(row => {
        if (!votesMap[row.date]) {
          votesMap[row.date] = {};
        }
        votesMap[row.date][row.teamId] = row.count;
      });

      const cumulativeCounts: Record<number, number> = {};
      // Initialize with the baseline votes so they start at correct proportions on June 11
      allMappedTeams.forEach(t => {
        const baseline = baselineStandings.find(b => b.teamCode === t.code)?.realVotes || 0;
        cumulativeCounts[t.id] = baseline;
      });

      chartData = dateRange.map(dateStr => {
        const dayVotes = votesMap[dateStr] || {};
        
        allMappedTeams.forEach(t => {
          cumulativeCounts[t.id] += (dayVotes[t.id] || 0);
        });

        const totalUpToNow = Object.values(cumulativeCounts).reduce((sum, count) => sum + count, 0);
        const dateLabel = new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const point: Record<string, any> = { date: dateLabel };

        teams.forEach(t => {
          if (totalUpToNow > 0) {
            const teamVotes = cumulativeCounts[t.id] || 0;
            const pct = (teamVotes / totalUpToNow) * 100;
            point[t.name] = Math.max(0, Math.round(pct * 10) / 10);
          } else {
            point[t.name] = 0;
          }
        });

        return point;
      });
    } catch (dbError) {
      console.error("Failed to query real trend data, falling back to mock:", dbError);
      chartData = [];
    }

    if (chartData.length === 0) {
      const startDate = new Date("2026-06-11");
      const endDate = new Date();
      const dateRange: string[] = [];
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        dateRange.push(d.toISOString().split('T')[0]);
      }
      chartData = dateRange.map((dateStr, idx) => {
        const dateLabel = new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const point: Record<string, any> = { date: dateLabel };
        const progress = idx / dateRange.length;
        
        teams.forEach(t => {
          const finalProb = t.prob;
          const startingProb = Math.max(5, finalProb - 12);
          const currentProb = startingProb + (finalProb - startingProb) * progress;
          const noise = Math.sin(idx * 0.8) * 1.5;
          point[t.name] = Math.max(0, Math.round((currentProb + noise) * 10) / 10);
        });
        return point;
      });
    }

    const comments = [
      { username: "cfvfsd99", comment: `Hoping for a miracle! Can ${teams[1]?.name || "anyone"} beat ${teams[0]?.name || "France"}?` },
      { username: "junipero", comment: `${teams[0]?.name || "France"} vs ${teams[1]?.name || "Argentina"} final would be absolutely legendary! 💙` }
    ];

    // Find if the current user has already cast a champion vote
    const session = await auth();
    let userSelection = null;
    if (session?.user?.id) {
      const userVote = await prisma.prediction.findFirst({
        where: {
          userId: session.user.id,
          type: "VOTE_CHAMPION"
        }
      });
      if (userVote && userVote.predictedTeamId) {
        const team = allMappedTeams.find((t) => t.id === userVote.predictedTeamId);
        if (team) {
          userSelection = team.code;
        }
      }
    }

    return NextResponse.json({
      marketTitle: "World Cup Winner",
      fetchedAt: new Date().toISOString(),
      totalVolumePool: "$982,118,524",
      teams,
      allTeams: allMappedTeams,
      chartData,
      comments,
      userSelection,
      totalVotes
    });
  } catch (error: any) {
    console.error("Failed to fetch winner votes:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
