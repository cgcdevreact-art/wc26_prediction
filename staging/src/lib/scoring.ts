import { prisma } from "./prisma";

export async function calculatePredictionPoints(matchId: number) {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || match.status !== "FINISHED") return;

  const predictions = await prisma.prediction.findMany({
    where: { matchId, type: "MATCH_SCORE" }
  });

  for (const p of predictions) {
    let points = 0;
    const breakdown = [];

    // Exact score
    if (p.predictedHomeScore === match.scoreHomeFullTime && p.predictedAwayScore === match.scoreAwayFullTime) {
      points += 5;
      breakdown.push("Exact Score (+5)");
    } 
    // Correct Winner
    else if (p.predictedWinner === match.winner) {
      if (match.winner === "DRAW") {
        points += 2;
        breakdown.push("Correct Draw (+2)");
      } else {
        points += 3;
        breakdown.push("Correct Winner (+3)");
      }
    }

    if (points > 0) {
      await prisma.predictionPoint.upsert({
        where: { predictionId: p.id },
        update: { points, breakdown: JSON.stringify(breakdown) },
        create: {
          userId: p.userId,
          predictionId: p.id,
          points,
          breakdown: JSON.stringify(breakdown)
        }
      });

      // Update User Leaderboard
      await prisma.leaderboard.upsert({
        where: { userId: p.userId },
        update: {
          totalPoints: { increment: points },
          weeklyPoints: { increment: points }
        },
        create: {
          userId: p.userId,
          totalPoints: points,
          weeklyPoints: points
        }
      });
    }
  }
}
