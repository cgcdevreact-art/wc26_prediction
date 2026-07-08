import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

// Seeding new World Cup 2026 votes data (scaled down by 100 for database efficiency)
const seedData = [
  { "teamCode": "FRA", "realVotes": 1630 },
  { "teamCode": "ARG", "realVotes": 930 },
  { "teamCode": "ESP", "realVotes": 930 },
  { "teamCode": "ENG", "realVotes": 780 },
  { "teamCode": "NOR", "realVotes": 300 },
  { "teamCode": "MAR", "realVotes": 150 },
  { "teamCode": "BEL", "realVotes": 100 },
  { "teamCode": "SUI", "realVotes": 100 }
];

function getTeamIdFromCode(code: string): number {
  if (!code) return 0;
  const c = code.toUpperCase();
  return c.charCodeAt(0) * 10000 + (c.charCodeAt(1) || 65) * 100 + (c.charCodeAt(2) || 65);
}

// Generate random date between June 12, 2026 and now
function getRandomDate() {
  const start = new Date("2026-06-12T00:00:00Z").getTime();
  const end = Date.now();
  return new Date(start + Math.random() * (end - start));
}

async function main() {
  console.log("Starting to seed real-world votes into database (scaled down by 100)...");

  const BATCH_SIZE = 1000;

  for (const team of seedData) {
    const teamId = getTeamIdFromCode(team.teamCode);
    console.log(`Processing ${team.teamCode} (Team ID: ${teamId}): ${team.realVotes} votes`);

    let remaining = team.realVotes;

    while (remaining > 0) {
      const currentBatchSize = Math.min(remaining, BATCH_SIZE);
      
      const userBatch = [];
      const predictionBatch = [];

      for (let i = 0; i < currentBatchSize; i++) {
        const userId = randomUUID();
        const voteDate = getRandomDate();

        userBatch.push({
          id: userId,
          name: `Fan_${team.teamCode}_${randomUUID().substring(0, 4)}`,
          email: `${randomUUID()}@example.com`,
          createdAt: voteDate,
          updatedAt: voteDate
        });

        predictionBatch.push({
          id: randomUUID(),
          userId: userId,
          type: "VOTE_CHAMPION",
          predictedTeamId: teamId,
          createdAt: voteDate,
          updatedAt: voteDate
        });
      }

      await prisma.user.createMany({
        data: userBatch
      });

      await prisma.prediction.createMany({
        data: predictionBatch
      });

      remaining -= currentBatchSize;
      console.log(`  Inserted batch of ${currentBatchSize} votes for ${team.teamCode}. Remaining: ${remaining}`);
    }
  }

  console.log("Finished seeding database!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
