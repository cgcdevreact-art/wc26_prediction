import fs from "fs";
import path from "path";
import { prisma } from "./prisma";
import { TEAM_INFO } from "./team-mapping";
import { auth } from "@/lib/auth";

// Load cup.json on the server side
function getCupData() {
  const filePath = path.join(process.cwd(), "public", "cup.json");
  const fileData = fs.readFileSync(filePath, "utf8");
  return JSON.parse(fileData);
}

// Generate the full teams list from cup.json
export function getStaticTeamsFromCup() {
  const cupData = getCupData();
  const rawTeams = cupData.teams;

  // Load teams_live.json to get the official team IDs
  const liveTeamsMap = new Map<string, number>();
  try {
    const filePath = path.join(process.cwd(), "public", "teams_live.json");
    const fileData = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(fileData);
    (parsed.teams || []).forEach((t: any) => {
      if (t.fifa_code && t.id) {
        liveTeamsMap.set(t.fifa_code, parseInt(t.id, 10));
      }
    });
  } catch (e) {
    console.error("Failed to read teams_live.json in getStaticTeamsFromCup:", e);
  }

  // Sort by ELO descending to determine ranks dynamically
  const sortedRaw = [...rawTeams].sort((a: any, b: any) => b.elo - a.elo);

  const minElo = 1276.66;
  const maxElo = 1874.81;

  return sortedRaw.map((team: any, index: number) => {
    const info = TEAM_INFO[team.name] || { code: team.name.slice(0, 3).toUpperCase(), flag: "🏳️", confederation: "UEFA" };
    const apiId = liveTeamsMap.get(info.code) || (index + 1);
    
    // Scale power between 15 and 99 based on ELO
    const power = Math.max(15, Math.min(99, Math.round(((team.elo - minElo) / (maxElo - minElo)) * 80 + 15)));
    const powerNormalized = power / 100;

    // progression probabilities (sum doesn't need to equal anything; bounded)
    const prob = {
      qualify: Math.round(Math.pow(powerNormalized, 0.4) * 97 * 10) / 10,
      r32: Math.round(Math.pow(powerNormalized, 0.7) * 93 * 10) / 10,
      r16: Math.round(Math.pow(powerNormalized, 1.2) * 85 * 10) / 10,
      qf: Math.round(Math.pow(powerNormalized, 1.8) * 70 * 10) / 10,
      sf: Math.round(Math.pow(powerNormalized, 2.5) * 50 * 10) / 10,
      final: Math.round(Math.pow(powerNormalized, 3.5) * 30 * 10) / 10,
      champion: Math.round(Math.pow(powerNormalized, 4.5) * 15 * 10) / 10,
    };

    return {
      id: apiId,
      code: info.code,
      name: team.name,
      flag: info.flag,
      confederation: info.confederation,
      rank: index + 1,
      elo: team.elo,
      power,
      attack: team.attack,
      defense: team.defense,
      squadValueM: Math.round(Math.pow(powerNormalized, 2) * 1000),
      avgAge: 26.5,
      goalsPerMatch: Math.round((0.5 + team.attack * 1.2) * 10) / 10,
      prob,
    };
  });
}

export const GROUPS_CONFIG: Record<string, string[]> = {
  A: [ 'MEX', 'RSA', 'KOR', 'CZE' ],
  B: [ 'CAN', 'BIH', 'QAT', 'SUI' ],
  C: [ 'BRA', 'MAR', 'HAI', 'SCO' ],
  D: [ 'USA', 'PAR', 'AUS', 'TUR' ],
  E: [ 'GER', 'CUW', 'CIV', 'ECU' ],
  F: [ 'NED', 'JPN', 'SWE', 'TUN' ],
  G: [ 'BEL', 'EGY', 'IRN', 'NZL' ],
  H: [ 'ESP', 'CPV', 'KSA', 'URU' ],
  I: [ 'FRA', 'SEN', 'IRQ', 'NOR' ],
  J: [ 'ARG', 'ALG', 'AUT', 'JOR' ],
  K: [ 'POR', 'COD', 'UZB', 'COL' ],
  L: [ 'ENG', 'CRO', 'GHA', 'PAN' ]
};

const TEAM_CODE_ALIASES: Record<string, string> = {
  SAU: "KSA",
  URY: "URU",
  DEU: "GER",
  HRV: "CRO",
  CHE: "SUI",
  PRY: "PAR",
  ZAF: "RSA",
  NLD: "NED",
  PRT: "POR",
  DZA: "ALG",
};

export async function getTeams() {
  const staticTeams = getStaticTeamsFromCup();
  const resolveStaticTeam = (teamCode?: string | null, teamName?: string | null, shortName?: string | null) => {
    const normalizedCode = teamCode ? TEAM_CODE_ALIASES[teamCode] ?? teamCode : null;

    return staticTeams.find((team) => team.code === normalizedCode) ??
    staticTeams.find((team) => team.name === shortName) ??
    staticTeams.find((team) => team.name === teamName) ??
    null;
  };

  try {
    const session = await auth();
    const userId = session?.user?.id;
    
    let overrides: any[] = [];
    if (userId) {
      overrides = await prisma.userTeamOverride.findMany({
        where: { userId },
      });
    }
    const overridesMap = new Map(overrides.map(o => [o.teamCode, o]));

    const dbTeams = await prisma.team.findMany({
      include: {
        teamStrength: true,
        countryProb: true,
      },
    });

    if (!dbTeams || dbTeams.length === 0) {
      if (overridesMap.size > 0) {
        return staticTeams.map((t) => {
          const override = overridesMap.get(t.code);
          if (override) {
            return {
              ...t,
              elo: override.elo,
              power: override.elo / 20,
              attack: override.attack,
              defense: override.defense,
              isCustom: true,
            };
          }
          return t;
        });
      }
      return staticTeams;
    }

    return dbTeams.map((dbTeam) => {
      const staticData = resolveStaticTeam(dbTeam.tla, dbTeam.name, dbTeam.shortName) || staticTeams[0];
      const rawCode = dbTeam.tla || staticData.code;
      const teamCode = TEAM_CODE_ALIASES[rawCode] ?? rawCode;
      const override = overridesMap.get(teamCode);
      
      const eloVal = override ? override.elo : (dbTeam.teamStrength?.overallRating ? (dbTeam.teamStrength.overallRating * 20) : staticData.elo);
      const attackVal = override ? override.attack : (dbTeam.teamStrength?.attackRating || staticData.attack);
      const defenseVal = override ? override.defense : (dbTeam.teamStrength?.defenseRating || staticData.defense);
      const powerVal = override ? (override.elo / 20) : (dbTeam.teamStrength?.overallRating || staticData.power);

      return {
        id: dbTeam.id,
        code: teamCode,
        name: dbTeam.shortName || dbTeam.name,
        crest: dbTeam.crest,
        flag: staticData.flag,
        confederation: staticData.confederation,
        rank: staticData.rank,
        elo: eloVal,
        squadValueM: staticData.squadValueM,
        avgAge: staticData.avgAge,
        goalsPerMatch: staticData.goalsPerMatch,
        isCustom: !!override,
        
        // Dynamic Strengths
        power: powerVal,
        attack: attackVal,
        defense: defenseVal,
        
        // Dynamic Probabilities
        prob: dbTeam.countryProb ? {
          qualify: dbTeam.countryProb.groupStage,
          r32: dbTeam.countryProb.round32 ?? 0,
          r16: dbTeam.countryProb.round16,
          qf: dbTeam.countryProb.quarterFinal,
          sf: dbTeam.countryProb.semiFinal,
          final: dbTeam.countryProb.final,
          champion: dbTeam.countryProb.champion,
        } : staticData.prob,
      };
    });
  } catch (error) {
    console.warn("Failed to fetch teams from DB, falling back to cup.json static data. Database might not be running.");
    try {
      const session = await auth();
      const userId = session?.user?.id;
      if (userId) {
        const overrides = await prisma.userTeamOverride.findMany({
          where: { userId },
        });
        if (overrides.length > 0) {
          const overridesMap = new Map(overrides.map(o => [o.teamCode, o]));
          return staticTeams.map((t) => {
            const override = overridesMap.get(t.code);
            if (override) {
              return {
                ...t,
                elo: override.elo,
                power: override.elo / 20,
                attack: override.attack,
                defense: override.defense,
                isCustom: true,
              };
            }
            return t;
          });
        }
      }
    } catch (_) {}
    return staticTeams;
  }
}

export function getGroupsConfig() {
  return GROUPS_CONFIG;
}

export async function getCupResults() {
  try {
    const cupData = getCupData();
    const results = { ...(cupData.results || {}) };

    let dbMatches = await prisma.fixtureCache.findMany({
      orderBy: { matchNo: "asc" }
    });

    const isStale = dbMatches.length === 0 || 
      !dbMatches[0].updatedAt || 
      (Date.now() - new Date(dbMatches[0].updatedAt).getTime() > 120 * 1000);

    if (isStale) {
      try {
        const { syncFixturesToDb } = await import("./fixtures/sync");
        await syncFixturesToDb();
        dbMatches = await prisma.fixtureCache.findMany({
          orderBy: { matchNo: "asc" }
        });
      } catch (syncError) {
        console.error("Failed to sync fixtures on layout getCupResults call:", syncError);
      }
    }

    const groupMatches = dbMatches.filter(m => !m.isKnockout);

    if (groupMatches.length > 0) {
      // Group by group
      const groups: Record<string, typeof dbMatches> = {};
      groupMatches.forEach(m => {
        if (!groups[m.group]) groups[m.group] = [];
        groups[m.group].push(m);
      });

      Object.entries(groups).forEach(([groupName, matches]) => {
        // Sort matches by matchNo ascending
        matches.sort((a, b) => a.matchNo - b.matchNo);
        matches.forEach((m, idx) => {
          const finished = m.status === "COMPLETED";
          if (finished) {
            const hScore = parseInt(m.homeScore, 10);
            const aScore = parseInt(m.awayScore, 10);
            if (!isNaN(hScore) && !isNaN(aScore)) {
              const key = `${groupName}-${String(idx + 1).padStart(2, "0")}`;
              results[key] = { homeGoals: hScore, awayGoals: aScore };
            }
          }
        });
      });
    }

    return results;
  } catch (error) {
    console.error("Failed to read results from cup.json or DB:", error);
    try {
      const cupData = getCupData();
      return cupData.results || {};
    } catch (_) {
      return {};
    }
  }
}

export async function getMatches() {
  try {
    return await prisma.match.findMany({
      include: {
        homeTeam: true,
        awayTeam: true,
      },
      orderBy: {
        utcDate: 'asc'
      }
    });
  } catch (error) {
    console.warn("Failed to fetch matches from DB, falling back to empty list. Database might not be running.");
    return [];
  }
}

export async function getPlayers() {
  const playersPath = path.join(process.cwd(), "public", "players.json");
  let defaultPlayers: any[] = [];
  try {
    const playersData = fs.readFileSync(playersPath, "utf8");
    defaultPlayers = JSON.parse(playersData).map((p: any) => {
      if (p["Team Code"] && TEAM_CODE_ALIASES[p["Team Code"]]) {
        p["Team Code"] = TEAM_CODE_ALIASES[p["Team Code"]];
      }
      return p;
    });
  } catch (e) {
    console.error("Failed to load players.json", e);
    return [];
  }

  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (userId) {
      const overrides = await prisma.userPlayerOverride.findMany({
        where: { userId },
      });

      if (overrides && overrides.length > 0) {
        const overridesMap = new Map(overrides.map(o => [o.playerKey, o]));
        return defaultPlayers.map((p) => {
          const key = `${p["Team Code"]}-${p["Player Name"]}`;
          const override = overridesMap.get(key);
          if (override) {
            return {
              ...p,
              "Overall Rating": override.overallRating,
              "Base Quality": override.baseQuality,
              "Recent Form": override.recentForm,
              "International Experience": override.intlExperience,
              "Attacking Impact": override.attackingImpact,
              "Defensive Impact": override.defensiveImpact,
              "Passing / Creativity": override.passingCreativity,
              "Fitness / Availability": override.fitnessAvailability,
              "Discipline Risk": override.disciplineRisk,
              "Match Importance": override.matchImportance,
              "Rating Tier": override.ratingTier,
              "ImageUrl": override.imageUrl || undefined,
              isCustom: true,
            };
          }
          return p;
        });
      }
    }
  } catch (error) {
    console.error("Failed to fetch player overrides:", error);
  }

  return defaultPlayers;
}
