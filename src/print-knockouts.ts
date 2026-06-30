import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const matches = await prisma.fixtureCache.findMany({
    orderBy: { matchNo: "asc" }
  });
  const knockouts = matches.filter(m => m.isKnockout);
  console.log(`Total fixtures: ${matches.length}`);
  console.log(`Total knockouts: ${knockouts.length}`);
  console.log("Knockouts sample:");
  console.log(JSON.stringify(knockouts, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
