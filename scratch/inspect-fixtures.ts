import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const matches = await prisma.fixtureCache.findMany({
    where: {
      status: "COMPLETED",
      isKnockout: true,
    },
    orderBy: {
      matchNo: "asc"
    }
  });

  console.log(`Found ${matches.length} completed knockout matches:`);
  matches.forEach(m => {
    console.log(`Match #${m.matchNo} [${m.stageName}]: ${m.homeTeamName} (${m.homeTeamCode}) ${m.homeScore} - ${m.awayScore} ${m.awayTeamName} (${m.awayTeamCode})`);
  });
}

main().catch(console.error);
