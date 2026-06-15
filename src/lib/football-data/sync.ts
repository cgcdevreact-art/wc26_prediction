import { prisma } from "@/lib/prisma";
import { fetchFootballData } from "./client";

export async function syncCompetitions(competitionCode = "WC") {
  console.log(`Syncing competition ${competitionCode}...`);
  // Fetch competition
  const compData: any = await fetchFootballData(`/competitions/${competitionCode}`);
  
  await prisma.competition.upsert({
    where: { id: compData.id },
    update: {
      name: compData.name,
      code: compData.code,
      type: compData.type,
      emblem: compData.emblem,
    },
    create: {
      id: compData.id,
      name: compData.name,
      code: compData.code,
      type: compData.type,
      emblem: compData.emblem,
    },
  });
  
  return { success: true, compData };
}

export async function syncTeams(competitionCode = "WC") {
  console.log(`Syncing teams for ${competitionCode}...`);
  const data: any = await fetchFootballData(`/competitions/${competitionCode}/teams`);
  const compData: any = await fetchFootballData(`/competitions/${competitionCode}`);
  
  for (const team of data.teams) {
    await prisma.team.upsert({
      where: { id: team.id },
      update: {
        name: team.name,
        shortName: team.shortName,
        tla: team.tla,
        crest: team.crest,
      },
      create: {
        id: team.id,
        name: team.name,
        shortName: team.shortName,
        tla: team.tla,
        crest: team.crest,
      },
    });

    // Link team to competition
    await prisma.teamCompetition.upsert({
      where: {
        teamId_competitionId: {
          teamId: team.id,
          competitionId: compData.id,
        },
      },
      update: {},
      create: {
        teamId: team.id,
        competitionId: compData.id,
      },
    });
  }

  return { success: true, count: data.teams.length };
}

export async function syncMatches(competitionCode = "WC") {
  console.log(`Syncing matches for ${competitionCode}...`);
  const data: any = await fetchFootballData(`/competitions/${competitionCode}/matches`);
  const compData: any = await fetchFootballData(`/competitions/${competitionCode}`);
  
  for (const match of data.matches) {
    await prisma.match.upsert({
      where: { id: match.id },
      update: {
        homeTeamId: match.homeTeam?.id || null,
        awayTeamId: match.awayTeam?.id || null,
        utcDate: new Date(match.utcDate),
        status: match.status,
        matchday: match.matchday,
        stage: match.stage,
        group: match.group,
        lastUpdated: new Date(match.lastUpdated),
        scoreHomeFullTime: match.score?.fullTime?.home ?? null,
        scoreAwayFullTime: match.score?.fullTime?.away ?? null,
        scoreHomeHalfTime: match.score?.halfTime?.home ?? null,
        scoreAwayHalfTime: match.score?.halfTime?.away ?? null,
        scoreHomeRegular: match.score?.regularTime?.home ?? null,
        scoreAwayRegular: match.score?.regularTime?.away ?? null,
        scoreHomePenalties: match.score?.penalties?.home ?? null,
        scoreAwayPenalties: match.score?.penalties?.away ?? null,
        winner: match.score?.winner ?? null,
      },
      create: {
        id: match.id,
        competitionId: compData.id,
        homeTeamId: match.homeTeam?.id || null,
        awayTeamId: match.awayTeam?.id || null,
        utcDate: new Date(match.utcDate),
        status: match.status,
        matchday: match.matchday,
        stage: match.stage,
        group: match.group,
        lastUpdated: new Date(match.lastUpdated),
        scoreHomeFullTime: match.score?.fullTime?.home ?? null,
        scoreAwayFullTime: match.score?.fullTime?.away ?? null,
        scoreHomeHalfTime: match.score?.halfTime?.home ?? null,
        scoreAwayHalfTime: match.score?.halfTime?.away ?? null,
        scoreHomeRegular: match.score?.regularTime?.home ?? null,
        scoreAwayRegular: match.score?.regularTime?.away ?? null,
        scoreHomePenalties: match.score?.penalties?.home ?? null,
        scoreAwayPenalties: match.score?.penalties?.away ?? null,
        winner: match.score?.winner ?? null,
      },
    });
  }

  return { success: true, count: data.matches.length };
}

export async function syncStandings(competitionCode = "WC") {
  console.log(`Syncing standings for ${competitionCode}...`);
  const data: any = await fetchFootballData(`/competitions/${competitionCode}/standings`);
  const compData: any = await fetchFootballData(`/competitions/${competitionCode}`);
  
  let count = 0;
  for (const standing of data.standings) {
    const stage = standing.stage;
    const type = standing.type;
    const group = standing.group;

    for (const row of standing.table) {
      await prisma.standing.upsert({
        where: {
          competitionId_teamId_stage_type: {
            competitionId: compData.id,
            teamId: row.team.id,
            stage: stage,
            type: type,
          },
        },
        update: {
          group: group,
          position: row.position,
          playedGames: row.playedGames,
          form: row.form,
          won: row.won,
          draw: row.draw,
          lost: row.lost,
          points: row.points,
          goalsFor: row.goalsFor,
          goalsAgainst: row.goalsAgainst,
          goalDifference: row.goalDifference,
        },
        create: {
          competitionId: compData.id,
          teamId: row.team.id,
          stage: stage,
          type: type,
          group: group,
          position: row.position,
          playedGames: row.playedGames,
          form: row.form,
          won: row.won,
          draw: row.draw,
          lost: row.lost,
          points: row.points,
          goalsFor: row.goalsFor,
          goalsAgainst: row.goalsAgainst,
          goalDifference: row.goalDifference,
        },
      });
      count++;
    }
  }

  return { success: true, count };
}

export async function syncScorers(competitionCode = "WC") {
  console.log(`Syncing scorers for ${competitionCode}...`);
  const data: any = await fetchFootballData(`/competitions/${competitionCode}/scorers`);
  
  for (const scorer of data.scorers) {
    const player = scorer.player;
    const team = scorer.team;

    await prisma.player.upsert({
      where: { id: player.id },
      update: {
        name: player.name,
        firstName: player.firstName,
        lastName: player.lastName,
        dateOfBirth: player.dateOfBirth ? new Date(player.dateOfBirth) : null,
        nationality: player.nationality,
        position: player.position,
        shirtNumber: player.shirtNumber,
        teamId: team.id,
        goals: scorer.goals ?? 0,
        assists: scorer.assists ?? 0,
        penalties: scorer.penalties ?? 0,
      },
      create: {
        id: player.id,
        name: player.name,
        firstName: player.firstName,
        lastName: player.lastName,
        dateOfBirth: player.dateOfBirth ? new Date(player.dateOfBirth) : null,
        nationality: player.nationality,
        position: player.position,
        shirtNumber: player.shirtNumber,
        teamId: team.id,
        goals: scorer.goals ?? 0,
        assists: scorer.assists ?? 0,
        penalties: scorer.penalties ?? 0,
      },
    });
  }

  return { success: true, count: data.scorers.length };
}
