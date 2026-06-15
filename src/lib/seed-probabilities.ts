import { prisma } from "./prisma";
import { getStaticTeamsFromCup } from "./data";

export async function seedProbabilities() {
  console.log("Seeding probabilities and team strengths...");
  const dbTeams = await prisma.team.findMany();
  const staticTeams = getStaticTeamsFromCup();

  let count = 0;
  for (const dbTeam of dbTeams) {
    if (!dbTeam.tla) continue;

    const staticData = staticTeams.find((t) => t.code === dbTeam.tla);
    if (!staticData) {
      console.log(`No static data found for team TLA: ${dbTeam.tla}`);
      continue;
    }

    // Upsert TeamStrength
    await prisma.teamStrength.upsert({
      where: { teamId: dbTeam.id },
      update: {
        attackRating: staticData.attack,
        defenseRating: staticData.defense,
        overallRating: staticData.power,
        formRating: staticData.power, // approximation
      },
      create: {
        teamId: dbTeam.id,
        attackRating: staticData.attack,
        defenseRating: staticData.defense,
        overallRating: staticData.power,
        formRating: staticData.power,
      },
    });

    // Upsert CountryProbability
    await prisma.countryProbability.upsert({
      where: { teamId: dbTeam.id },
      update: {
        groupStage: staticData.prob.qualify,
        round32: staticData.prob.r32,
        round16: staticData.prob.r16,
        quarterFinal: staticData.prob.qf,
        semiFinal: staticData.prob.sf,
        final: staticData.prob.final,
        champion: staticData.prob.champion,
      },
      create: {
        teamId: dbTeam.id,
        groupStage: staticData.prob.qualify,
        round32: staticData.prob.r32,
        round16: staticData.prob.r16,
        quarterFinal: staticData.prob.qf,
        semiFinal: staticData.prob.sf,
        final: staticData.prob.final,
        champion: staticData.prob.champion,
      },
    });
    
    count++;
  }
  console.log(`Successfully seeded probabilities for ${count} teams.`);
  return count;
}
