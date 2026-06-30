import { PlayerStats } from "@/lib/store/simulationStore";

export type SimulationModel = "base" | "advanced" | "pro";

export interface SimTeam {
  code: string;
  name: string;
  flag: string;
  elo: number;
  attack: number;
  defense: number;
  power?: number;
  baselineCode?: string;
}

// Calculate the expected goals (Lambda) for a match based on the selected model
export function getMatchExpectedGoals(
  homeTeam: SimTeam,
  awayTeam: SimTeam,
  players: Record<string, PlayerStats>,
  model: SimulationModel
) {
  // Safe Elo retrieval
  const homeElo = homeTeam.elo || 1500;
  const awayElo = awayTeam.elo || 1500;

  // Normalize Attack & Defense values.
  // Standard teams in cup.json have modifier ratings around 1.0 (e.g. 1.09).
  // Database teams might have scaled values from 10 to 100.
  const getNormalizedAtt = (t: SimTeam) => {
    const val = t.attack;
    if (val === undefined || val === null) return 1.0;
    if (val > 10) return val / 80; // normalize scaled values to around 1.0
    return val;
  };

  const getNormalizedDef = (t: SimTeam) => {
    const val = t.defense;
    if (val === undefined || val === null) return 1.0;
    if (val > 10) return val / 80; // normalize scaled values to around 1.0
    return val;
  };

  const homeAtt = getNormalizedAtt(homeTeam);
  const homeDef = getNormalizedDef(homeTeam);
  const awayAtt = getNormalizedAtt(awayTeam);
  const awayDef = getNormalizedDef(awayTeam);

  // 1. Basic Model: Elo + Attack Modifier / Defense Modifier
  let homeLambda = 1.35 * (homeElo * homeAtt) / (awayElo * awayDef);
  let awayLambda = 1.15 * (awayElo * awayAtt) / (homeElo * homeDef);

  // Bound Lambda values to reasonable goals expected (0.1 to 10)
  homeLambda = Math.max(0.1, Math.min(10, homeLambda));
  awayLambda = Math.max(0.1, Math.min(10, awayLambda));

  if (model === "base") {
    return { homeLambda, awayLambda };
  }

  const homeCode = homeTeam.baselineCode || homeTeam.code;
  const awayCode = awayTeam.baselineCode || awayTeam.code;

  // Helper to calculate average squad player rating
  const getAvgPlayerRating = (teamCode: string) => {
    const teamPlayers = Object.values(players).filter(p => p["Team Code"] === teamCode);
    if (teamPlayers.length === 0) return 75;
    const sum = teamPlayers.reduce((acc, p) => {
      const rating = parseInt(p["Overall Rating"]?.replace("%", "") || "75", 10);
      return acc + (isNaN(rating) ? 75 : rating);
    }, 0);
    return sum / teamPlayers.length;
  };

  const homeAvgRating = getAvgPlayerRating(homeCode);
  const awayAvgRating = getAvgPlayerRating(awayCode);

  // 2. Advanced Model: Base + Overall Player Rating ratio
  homeLambda = homeLambda * (homeAvgRating / awayAvgRating);
  awayLambda = awayLambda * (awayAvgRating / homeAvgRating);

  homeLambda = Math.max(0.1, Math.min(10, homeLambda));
  awayLambda = Math.max(0.1, Math.min(10, awayLambda));

  if (model === "advanced") {
    return { homeLambda, awayLambda };
  }

  // Helper to extract player stats aspects (Attacking, Passing, Form, Defending, Experience, Fitness, Discipline)
  const getTeamAspects = (teamCode: string) => {
    const teamPlayers = Object.values(players).filter(p => p["Team Code"] === teamCode);
    if (teamPlayers.length === 0) return { attackMod: 1.0, defenseMod: 1.0 };
    
    let totalAttImpact = 0;
    let totalPassing = 0;
    let totalForm = 0;
    let totalDefImpact = 0;
    let totalFitness = 0;
    let totalIntlExp = 0;
    let totalDiscipline = 0;
    
    teamPlayers.forEach(p => {
      totalAttImpact += parseInt(p["Attacking Impact"]?.replace("%", "") || "70", 10);
      totalPassing += parseInt(p["Passing / Creativity"]?.replace("%", "") || "70", 10);
      totalForm += parseInt(p["Recent Form"]?.replace("%", "") || "70", 10);
      totalDefImpact += parseInt(p["Defensive Impact"]?.replace("%", "") || "70", 10);
      totalFitness += parseInt(p["Fitness / Availability"]?.replace("%", "") || "80", 10);
      totalIntlExp += parseInt(p["International Experience"]?.replace("%", "") || "70", 10);
      totalDiscipline += parseInt(p["Discipline Risk"]?.replace("%", "") || "10", 10);
    });
    
    const n = teamPlayers.length;
    const avgAttImpact = totalAttImpact / n;
    const avgPassing = totalPassing / n;
    const avgForm = totalForm / n;
    const avgDefImpact = totalDefImpact / n;
    const avgFitness = totalFitness / n;
    const avgIntlExp = totalIntlExp / n;
    const avgDiscipline = totalDiscipline / n;
    
    // Attacking aspect modifier (~1.0 baseline)
    const attackMod = (avgAttImpact * 0.4 + avgPassing * 0.3 + avgForm * 0.3) / 75;
    // Defensive aspect modifier (~1.0 baseline), slightly reduced by average Discipline Risk
    const defenseMod = (avgDefImpact * 0.4 + avgIntlExp * 0.3 + avgFitness * 0.3 - avgDiscipline * 0.1) / 75;
    
    return { attackMod, defenseMod };
  };

  const homeAspects = getTeamAspects(homeCode);
  const awayAspects = getTeamAspects(awayCode);

  // 3. Pro Model: Advanced + All player aspects ratio
  homeLambda = homeLambda * (homeAspects.attackMod / awayAspects.defenseMod);
  awayLambda = awayLambda * (awayAspects.attackMod / homeAspects.defenseMod);

  homeLambda = Math.max(0.1, Math.min(10, homeLambda));
  awayLambda = Math.max(0.1, Math.min(10, awayLambda));

  return { homeLambda, awayLambda };
}
