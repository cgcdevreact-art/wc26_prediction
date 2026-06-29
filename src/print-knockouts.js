const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const matches = await prisma.fixtureCache.findMany({
    orderBy: { matchNo: "asc" }
  });
  const knockouts = matches.filter(m => m.isKnockout);
  console.log("R32 matches in database:");
  knockouts.filter(m => m.stageName === "Round of 32").forEach(m => {
    console.log(`Match ${m.matchNo}: Home: "${m.homeTeamName}" (${m.homeTeamCode}), Away: "${m.awayTeamName}" (${m.awayTeamCode})`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
