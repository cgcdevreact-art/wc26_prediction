import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

const rawData = [
  { "date": "2025-09-01", "FRA": 14.0, "ESP": 18.5, "ARG": 11.0, "ENG": 12.0, "NOR": 4.5, "MAR": 2.1, "BEL": 3.4, "SUI": 2.5 },
  { "date": "2025-09-10", "FRA": 16.5, "ESP": 22.0, "ARG": 10.5, "ENG": 13.5, "NOR": 5.0, "MAR": 2.0, "BEL": 3.2, "SUI": 2.3 },
  { "date": "2025-09-20", "FRA": 15.0, "ESP": 19.5, "ARG": 11.2, "ENG": 12.8, "NOR": 4.2, "MAR": 2.2, "BEL": 3.0, "SUI": 2.4 },
  { "date": "2025-10-01", "FRA": 13.5, "ESP": 18.0, "ARG": 10.8, "ENG": 12.2, "NOR": 4.0, "MAR": 2.4, "BEL": 2.9, "SUI": 2.2 },
  { "date": "2025-10-15", "FRA": 13.0, "ESP": 17.2, "ARG": 10.2, "ENG": 12.0, "NOR": 3.5, "MAR": 2.5, "BEL": 2.8, "SUI": 2.0 },
  { "date": "2025-11-01", "FRA": 13.8, "ESP": 17.5, "ARG": 10.5, "ENG": 12.5, "NOR": 3.2, "MAR": 2.3, "BEL": 2.7, "SUI": 2.1 },
  { "date": "2025-11-15", "FRA": 14.2, "ESP": 18.8, "ARG": 11.0, "ENG": 13.0, "NOR": 3.0, "MAR": 2.2, "BEL": 2.5, "SUI": 1.9 },
  { "date": "2025-12-01", "FRA": 13.5, "ESP": 17.0, "ARG": 10.8, "ENG": 12.5, "NOR": 4.8, "MAR": 2.4, "BEL": 2.6, "SUI": 1.8 },
  { "date": "2025-12-15", "FRA": 13.0, "ESP": 16.5, "ARG": 10.0, "ENG": 11.8, "NOR": 5.5, "MAR": 2.6, "BEL": 2.4, "SUI": 1.7 },
  { "date": "2025-12-28", "FRA": 12.8, "ESP": 15.2, "ARG": 10.4, "ENG": 11.5, "NOR": 4.2, "MAR": 3.0, "BEL": 2.2, "SUI": 1.9 },
  { "date": "2026-01-01", "FRA": 12.5, "ESP": 14.5, "ARG": 10.5, "ENG": 11.5, "NOR": 3.8, "MAR": 3.0, "BEL": 2.0, "SUI": 2.0 },
  { "date": "2026-01-15", "FRA": 12.8, "ESP": 14.8, "ARG": 11.0, "ENG": 11.2, "NOR": 4.0, "MAR": 2.8, "BEL": 2.1, "SUI": 1.8 },
  { "date": "2026-02-01", "FRA": 13.0, "ESP": 15.0, "ARG": 11.5, "ENG": 11.0, "NOR": 4.2, "MAR": 2.7, "BEL": 2.3, "SUI": 1.9 },
  { "date": "2026-02-15", "FRA": 12.6, "ESP": 14.6, "ARG": 11.0, "ENG": 10.8, "NOR": 4.0, "MAR": 2.9, "BEL": 2.2, "SUI": 2.1 },
  { "date": "2026-03-01", "FRA": 12.4, "ESP": 15.2, "ARG": 10.8, "ENG": 11.4, "NOR": 4.5, "MAR": 3.1, "BEL": 2.0, "SUI": 2.0 },
  { "date": "2026-03-15", "FRA": 12.0, "ESP": 15.8, "ARG": 10.5, "ENG": 11.0, "NOR": 4.3, "MAR": 3.0, "BEL": 1.9, "SUI": 1.8 },
  { "date": "2026-04-01", "FRA": 13.2, "ESP": 16.2, "ARG": 11.2, "ENG": 11.5, "NOR": 4.0, "MAR": 2.8, "BEL": 2.1, "SUI": 1.9 },
  { "date": "2026-04-15", "FRA": 14.8, "ESP": 15.8, "ARG": 12.5, "ENG": 11.2, "NOR": 4.6, "MAR": 2.9, "BEL": 2.2, "SUI": 2.2 },
  { "date": "2026-05-01", "FRA": 16.0, "ESP": 15.2, "ARG": 14.0, "ENG": 11.0, "NOR": 4.2, "MAR": 3.2, "BEL": 2.0, "SUI": 2.0 },
  { "date": "2026-05-15", "FRA": 16.8, "ESP": 15.0, "ARG": 15.5, "ENG": 10.8, "NOR": 4.0, "MAR": 3.0, "BEL": 2.4, "SUI": 1.9 },
  { "date": "2026-06-01", "FRA": 18.2, "ESP": 14.6, "ARG": 14.2, "ENG": 11.2, "NOR": 4.5, "MAR": 3.3, "BEL": 2.3, "SUI": 2.1 },
  { "date": "2026-06-10", "FRA": 19.0, "ESP": 16.8, "ARG": 14.2, "ENG": 11.5, "NOR": 4.1, "MAR": 2.5, "BEL": 3.0, "SUI": 2.2 },
  { "date": "2026-06-15", "FRA": 20.5, "ESP": 17.2, "ARG": 14.1, "ENG": 12.4, "NOR": 3.9, "MAR": 2.3, "BEL": 2.6, "SUI": 1.9 },
  { "date": "2026-06-20", "FRA": 20.0, "ESP": 16.9, "ARG": 13.8, "ENG": 11.9, "NOR": 4.2, "MAR": 2.5, "BEL": 2.5, "SUI": 1.8 },
  { "date": "2026-06-25", "FRA": 19.1, "ESP": 16.6, "ARG": 14.0, "ENG": 12.1, "NOR": 4.4, "MAR": 3.1, "BEL": 2.2, "SUI": 2.1 },
  { "date": "2026-06-30", "FRA": 21.2, "ESP": 15.8, "ARG": 14.3, "ENG": 12.2, "NOR": 4.5, "MAR": 3.2, "BEL": 2.1, "SUI": 1.8 },
  { "date": "2026-07-02", "FRA": 23.9, "ESP": 17.0, "ARG": 15.1, "ENG": 12.5, "NOR": 5.2, "MAR": 2.8, "BEL": 2.0, "SUI": 2.2 },
  { "date": "2026-07-04", "FRA": 25.1, "ESP": 16.7, "ARG": 16.8, "ENG": 13.2, "NOR": 5.0, "MAR": 3.3, "BEL": 2.2, "SUI": 1.9 },
  { "date": "2026-07-05", "FRA": 31.8, "ESP": 17.9, "ARG": 17.2, "ENG": 14.1, "NOR": 5.6, "MAR": 3.1, "BEL": 2.1, "SUI": 2.0 },
  { "date": "2026-07-06", "FRA": 34.5, "ESP": 18.3, "ARG": 18.1, "ENG": 15.0, "NOR": 5.9, "MAR": 2.9, "BEL": 2.0, "SUI": 2.0 },
  { "date": "2026-07-07", "FRA": 35.0, "ESP": 18.5, "ARG": 18.5, "ENG": 15.4, "NOR": 5.9, "MAR": 3.0, "BEL": 2.0, "SUI": 2.0 },
  { "date": "2026-07-08", "FRA": 32.6, "ESP": 18.6, "ARG": 18.6, "ENG": 15.6, "NOR": 6.0, "MAR": 3.0, "BEL": 2.0, "SUI": 2.0 }
];

const teams = ["FRA", "ESP", "ARG", "ENG", "NOR", "MAR", "BEL", "SUI"];

function getTeamIdFromCode(code: string): number {
  if (code === "OTH") return 99999;
  const c = code.toUpperCase();
  return c.charCodeAt(0) * 10000 + (c.charCodeAt(1) || 65) * 100 + (c.charCodeAt(2) || 65);
}

export async function GET() {
  try {
    console.log("Starting DB seed via Dev API Route...");

    // Delete old data
    const deletePredicts = await prisma.prediction.deleteMany({
      where: { type: "VOTE_CHAMPION" }
    });

    const deleteUsers = await prisma.user.deleteMany({
      where: {
        email: { endsWith: "@example.com" },
        name: { startsWith: "Fan_" }
      }
    });

    const allTeams = [...teams, "OTH"];
    const data = rawData.map(pt => {
      let sum = 0;
      teams.forEach(t => sum += pt[t as keyof typeof pt] as number);
      const OTH = parseFloat((100 - sum).toFixed(2));
      return { ...pt, OTH };
    });

    let currentTotal = 100;
    const result: any[] = [];

    for (let j = 0; j < data.length; j++) {
      const pt = data[j];
      if (j === 0) {
        const votes: any = {};
        allTeams.forEach(t => {
          votes[t] = Math.round((pt[t as keyof typeof pt] as number) * (currentTotal / 100));
        });
        result.push({
          date: pt.date,
          total: currentTotal,
          votes: votes,
          diff: votes
        });
      } else {
        const prev = result[j - 1];
        let multiplier = 1;
        allTeams.forEach(t => {
          const prevPct = data[j - 1][t as keyof typeof pt] as number;
          const currPct = pt[t as keyof typeof pt] as number;
          if (currPct > 0) {
            const ratio = prevPct / currPct;
            if (ratio > multiplier) {
              multiplier = ratio;
            }
          }
        });

        const minTotal = prev.total * multiplier;
        currentTotal = Math.ceil(minTotal);
        
        const votes: any = {};
        const diff: any = {};
        allTeams.forEach(t => {
          votes[t] = Math.round((pt[t as keyof typeof pt] as number) * (currentTotal / 100));
          diff[t] = votes[t] - prev.votes[t];
          if (diff[t] < 0) {
            votes[t] = prev.votes[t];
            diff[t] = 0;
          }
        });
        
        let newTotal = 0;
        allTeams.forEach(t => {
          newTotal += votes[t];
        });
        currentTotal = newTotal;

        result.push({
          date: pt.date,
          total: currentTotal,
          votes: votes,
          diff: diff
        });
      }
    }

    const userBatch: any[] = [];
    const predictionBatch: any[] = [];

    result.forEach(day => {
      const voteDate = new Date(day.date);
      allTeams.forEach(teamCode => {
        const teamId = getTeamIdFromCode(teamCode);
        const countToInsert = day.diff[teamCode] || 0;

        for (let i = 0; i < countToInsert; i++) {
          const userId = randomUUID();
          userBatch.push({
            id: userId,
            name: `Fan_${teamCode}_${randomUUID().substring(0, 4)}`,
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
      });
    });

    const BATCH_SIZE = 2500;
    for (let offset = 0; offset < userBatch.length; offset += BATCH_SIZE) {
      const uBatch = userBatch.slice(offset, offset + BATCH_SIZE);
      const pBatch = predictionBatch.slice(offset, offset + BATCH_SIZE);

      await prisma.user.createMany({ data: uBatch });
      await prisma.prediction.createMany({ data: pBatch });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${userBatch.length} votes.`,
      deletedPredictions: deletePredicts.count,
      deletedUsers: deleteUsers.count
    });
  } catch (error: any) {
    console.error("Failed to seed via API Route:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
