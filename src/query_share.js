const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const share = await prisma.shareLink.findUnique({
    where: { id: "cmr903wz50005u7kl45ar8php" }
  });
  console.log("SHARE RECORD:", JSON.stringify(share, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
