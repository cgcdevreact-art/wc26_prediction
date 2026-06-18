import { prisma } from "@/lib/prisma";

export async function calculateTeamStrength(teamId: number) {
  const standings = await prisma.standing.findMany({
    where: { teamId }
  });

  let attackRating = 50;
  let defenseRating = 50;
  let formRating = 50;
  let matchesPlayed = 0;

  for (const s of standings) {
    attackRating += s.goalsFor * 1.5;
    defenseRating += s.goalsAgainst * -1.5;
    formRating += s.won * 3 + s.draw * 1;
    matchesPlayed += s.playedGames;
  }

  if (matchesPlayed > 0) {
    attackRating = Math.min(100, Math.max(10, attackRating / (matchesPlayed * 0.1)));
    defenseRating = Math.min(100, Math.max(10, defenseRating / (matchesPlayed * 0.1)));
    formRating = Math.min(100, Math.max(10, formRating / (matchesPlayed * 0.1)));
  }

  const overallRating = (attackRating * 0.4) + (defenseRating * 0.4) + (formRating * 0.2);

  await prisma.teamStrength.upsert({
    where: { teamId },
    update: {
      attackRating,
      defenseRating,
      formRating,
      overallRating,
    },
    create: {
      teamId,
      attackRating,
      defenseRating,
      formRating,
      overallRating,
    }
  });

  return { attackRating, defenseRating, formRating, overallRating };
}

function poisson(k: number, lambda: number) {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

function factorial(n: number): number {
  if (n === 0 || n === 1) return 1;
  return n * factorial(n - 1);
}

export async function calculateMatchProbability(homeTeamId: number, awayTeamId: number, matchId: number) {
  const homeStrength = await prisma.teamStrength.findUnique({ where: { teamId: homeTeamId } });
  const awayStrength = await prisma.teamStrength.findUnique({ where: { teamId: awayTeamId } });

  if (!homeStrength || !awayStrength) {
    return { homeWin: 33.3, draw: 33.3, awayWin: 33.3 }; // Fallback
  }

  const homeLambda = Math.max(0.1, (homeStrength.attackRating / 50) * (50 / awayStrength.defenseRating) * 1.2); 
  const awayLambda = Math.max(0.1, (awayStrength.attackRating / 50) * (50 / homeStrength.defenseRating));

  let homeWin = 0;
  let draw = 0;
  let awayWin = 0;

  for (let h = 0; h <= 5; h++) {
    for (let a = 0; a <= 5; a++) {
      const prob = poisson(h, homeLambda) * poisson(a, awayLambda);
      if (h > a) homeWin += prob;
      else if (h === a) draw += prob;
      else awayWin += prob;
    }
  }

  const total = homeWin + draw + awayWin;
  homeWin = (homeWin / total) * 100;
  draw = (draw / total) * 100;
  awayWin = (awayWin / total) * 100;

  await prisma.matchProbability.upsert({
    where: { matchId },
    update: { homeWin, draw, awayWin },
    create: { matchId, homeWin, draw, awayWin }
  });

  return { homeWin, draw, awayWin };
}

export async function simulateTournament(iterations: number) {
  const teams = await prisma.team.findMany({ include: { teamStrength: true } });
  
  const sim = await prisma.tournamentSimulation.create({
    data: {
      iterations,
      completedAt: new Date()
    }
  });

  for (const team of teams) {
    const strength = team.teamStrength?.overallRating || 50;
    
    let championProb = Math.pow(strength / 100, 4) * 100;
    let finalProb = Math.pow(strength / 100, 3) * 100;
    
    await prisma.simulationResult.create({
      data: {
        simulationId: sim.id,
        teamId: team.id,
        championProb,
        finalProb,
        semiFinalProb: Math.min(100, finalProb * 1.5),
        quarterFinalProb: Math.min(100, finalProb * 2),
        roundOf16Prob: Math.min(100, finalProb * 3),
        groupExitProb: Math.max(0, 100 - (finalProb * 3)),
        mostLikelyPath: JSON.stringify(["USA", "Spain", "France", "Argentina"])
      }
    });
    
    // Also update country probability overview
    await prisma.countryProbability.upsert({
      where: { teamId: team.id },
      update: {
        groupStage: Math.max(0, 100 - (finalProb * 3)),
        round16: Math.min(100, finalProb * 3),
        quarterFinal: Math.min(100, finalProb * 2),
        semiFinal: Math.min(100, finalProb * 1.5),
        final: finalProb,
        champion: championProb,
      },
      create: {
        teamId: team.id,
        groupStage: Math.max(0, 100 - (finalProb * 3)),
        round16: Math.min(100, finalProb * 3),
        quarterFinal: Math.min(100, finalProb * 2),
        semiFinal: Math.min(100, finalProb * 1.5),
        final: finalProb,
        champion: championProb,
      }
    });
  }

  return sim.id;
}
