import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  return new PrismaClient({
    log: [],
  });
}

function hasExpectedDelegates(client: PrismaClient) {
  return "customVotePoll" in client && "customVoteOption" in client && "customVoteResponse" in client;
}

const existingPrisma = globalForPrisma.prisma;

export const prisma =
  existingPrisma && hasExpectedDelegates(existingPrisma)
    ? existingPrisma
    : createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
