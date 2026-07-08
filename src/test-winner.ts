import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function test() {
  try {
    const votes = await prisma.prediction.findMany({
      where: {
        type: "VOTE_CHAMPION"
      }
    });

    const totalVotes = votes.length;
    const teamCounts: Record<number, number> = {};

    votes.forEach((v) => {
      if (v.predictedTeamId) {
        teamCounts[v.predictedTeamId] = (teamCounts[v.predictedTeamId] || 0) + 1;
      }
    });

    let dbTeams = await prisma.team.findMany({
      take: 4,
      orderBy: {
        teamStrength: {
          overallRating: "desc"
        }
      },
      include: {
        teamStrength: true
      }
    });

    console.log("DB Teams Count:", dbTeams.length);

    if (!dbTeams || dbTeams.length < 4) {
      dbTeams = [
        { id: 1, name: "France", tla: "FRA", crest: "", teamStrength: { overallRating: 88 } },
        { id: 2, name: "Argentina", tla: "ARG", crest: "", teamStrength: { overallRating: 87 } },
        { id: 3, name: "England", tla: "ENG", crest: "", teamStrength: { overallRating: 86 } },
        { id: 4, name: "Spain", tla: "ESP", crest: "", teamStrength: { overallRating: 85 } }
      ] as any;
    }

    const emojis: Record<string, string> = {
      FRA: "🇫🇷", ARG: "🇦🇷", ENG: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", ESP: "🇪🇸",
      BRA: "🇧🇷", POR: "🇵🇹", GER: "🇩🇪", BEL: "🇧🇪",
      ITA: "🇮🇹", CRO: "🇭🇷", NED: "🇳🇱", URU: "🇺🇾",
      USA: "🇺🇸", MEX: "🇲🇽", CAN: "🇨🇦", JPN: "🇯🇵"
    };

    const colors = ["#3b82f6", "#06b6d4", "#f59e0b", "#ef4444"];

    const teams = dbTeams.map((team, idx) => {
      const code = team.tla || "TBD";
      const flag = emojis[code] || "⚽";
      const votesForTeam = teamCounts[team.id] || 0;
      const prob = totalVotes > 0 
        ? Math.round((votesForTeam / totalVotes) * 100) 
        : Math.round((team.teamStrength?.overallRating || 80) / 4);

      return {
        id: team.id,
        name: team.name,
        code,
        flag,
        prob: Math.max(1, prob),
        color: colors[idx] || "#64748b"
      };
    });

    console.log("Teams mapped:", JSON.stringify(teams, null, 2));

  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
