import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning old Market Matches...");
  await prisma.marketMatch.deleteMany();
  await prisma.marketVote.deleteMany();
  await prisma.marketComment.deleteMany();

  console.log("Seeding Market Matches...");

  const upcomingDate = new Date();
  upcomingDate.setDate(upcomingDate.getDate() + 5);

  const m1 = await prisma.marketMatch.create({
    data: {
      homeTeamName: "Portugal",
      homeTeamCode: "POR",
      homeTeamFlag: "🇵🇹",
      awayTeamName: "Spain",
      awayTeamCode: "ESP",
      awayTeamFlag: "🇪🇸",
      matchDate: upcomingDate,
      stage: "Round of 16",
    }
  });

  const m2 = await prisma.marketMatch.create({
    data: {
      homeTeamName: "United States",
      homeTeamCode: "USA",
      homeTeamFlag: "🇺🇸",
      awayTeamName: "Belgium",
      awayTeamCode: "BEL",
      awayTeamFlag: "🇧🇪",
      matchDate: upcomingDate,
      stage: "Quarter-Final",
    }
  });

  // Create mock users first to satisfy foreign key constraint
  const userPromises = [];
  for (let i = 0; i < 50; i++) {
    const id = "cuid-mock-user-" + i;
    userPromises.push(
      prisma.user.upsert({
        where: { id },
        update: {},
        create: {
          id,
          name: `Predictor ${i + 1}`,
          email: `predictor${i}@mock.com`,
        }
      })
    );
  }
  await Promise.all(userPromises);

  // Add some mock votes for PRT vs ESP
  // Mostly Portugal
  const votePromises = [];
  for (let i = 0; i < 20; i++) {
    votePromises.push(
      prisma.marketVote.create({
        data: {
          userId: "cuid-mock-user-" + i,
          marketMatchId: m1.id,
          vote: i < 12 ? "HOME" : i < 16 ? "DRAW" : "AWAY",
        }
      })
    );
  }

  // Add some mock votes for USA vs BEL
  // Mostly BEL
  for (let i = 0; i < 30; i++) {
    votePromises.push(
      prisma.marketVote.create({
        data: {
          userId: "cuid-mock-user-" + (i + 20),
          marketMatchId: m2.id,
          vote: i < 10 ? "HOME" : i < 15 ? "DRAW" : "AWAY",
        }
      })
    );
  }

  await Promise.all(votePromises);
  
  console.log("Market Matches seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
