import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function ensureMatchPlaceholder(matchId: number) {
  const matchExists = await prisma.match.findUnique({ where: { id: matchId } });
  if (!matchExists) {
    const comp = await prisma.competition.findFirst();
    if (comp) {
      await prisma.match.create({
        data: {
          id: matchId,
          competitionId: comp.id,
          utcDate: new Date(),
          status: "PLACEHOLDER",
          lastUpdated: new Date(),
        }
      });
    }
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await request.json();

  try {
    if (Array.isArray(data)) {
      const results = [];
      for (const item of data) {
        const { matchId, type, predictedHomeScore, predictedAwayScore, predictedTeamId, predictedWinner: inputWinner } = item;
        const targetMatchId = matchId || 0;
        
        await ensureMatchPlaceholder(targetMatchId);

        let predictedWinner = inputWinner || null;
        if (type === "MATCH_SCORE" && predictedHomeScore !== undefined && predictedHomeScore !== "" && predictedAwayScore !== undefined && predictedAwayScore !== "") {
          predictedWinner = Number(predictedHomeScore) > Number(predictedAwayScore) ? "HOME_TEAM" : (Number(predictedHomeScore) < Number(predictedAwayScore) ? "AWAY_TEAM" : "DRAW");
        }

        const prediction = await prisma.prediction.upsert({
          where: {
            userId_matchId_type: {
              userId: session.user.id,
              matchId: targetMatchId,
              type: type,
            }
          },
          update: {
            predictedHomeScore: (predictedHomeScore === "" || predictedHomeScore === undefined) ? null : Number(predictedHomeScore),
            predictedAwayScore: (predictedAwayScore === "" || predictedAwayScore === undefined) ? null : Number(predictedAwayScore),
            predictedTeamId: predictedTeamId ? Number(predictedTeamId) : null,
            predictedWinner,
          },
          create: {
            userId: session.user.id,
            matchId: targetMatchId,
            type: type,
            predictedHomeScore: (predictedHomeScore === "" || predictedHomeScore === undefined) ? null : Number(predictedHomeScore),
            predictedAwayScore: (predictedAwayScore === "" || predictedAwayScore === undefined) ? null : Number(predictedAwayScore),
            predictedTeamId: predictedTeamId ? Number(predictedTeamId) : null,
            predictedWinner,
          }
        });
        results.push(prediction);
      }
      return NextResponse.json(results);
    } else {
      const { matchId, type, predictedHomeScore, predictedAwayScore, predictedTeamId, predictedWinner: inputWinner } = data;
      const targetMatchId = matchId || 0;

      await ensureMatchPlaceholder(targetMatchId);

      let predictedWinner = inputWinner || null;
      if (type === "MATCH_SCORE" && predictedHomeScore !== undefined && predictedHomeScore !== "" && predictedAwayScore !== undefined && predictedAwayScore !== "") {
        predictedWinner = Number(predictedHomeScore) > Number(predictedAwayScore) ? "HOME_TEAM" : (Number(predictedHomeScore) < Number(predictedAwayScore) ? "AWAY_TEAM" : "DRAW");
      }

      const prediction = await prisma.prediction.upsert({
        where: {
          userId_matchId_type: {
            userId: session.user.id,
            matchId: targetMatchId,
            type: type,
          }
        },
        update: {
          predictedHomeScore: (predictedHomeScore === "" || predictedHomeScore === undefined) ? null : Number(predictedHomeScore),
          predictedAwayScore: (predictedAwayScore === "" || predictedAwayScore === undefined) ? null : Number(predictedAwayScore),
          predictedTeamId: predictedTeamId ? Number(predictedTeamId) : null,
          predictedWinner,
        },
        create: {
          userId: session.user.id,
          matchId: targetMatchId,
          type: type,
          predictedHomeScore: (predictedHomeScore === "" || predictedHomeScore === undefined) ? null : Number(predictedHomeScore),
          predictedAwayScore: (predictedAwayScore === "" || predictedAwayScore === undefined) ? null : Number(predictedAwayScore),
          predictedTeamId: predictedTeamId ? Number(predictedTeamId) : null,
          predictedWinner,
        }
      });
      return NextResponse.json(prediction);
    }
  } catch (error: any) {
    console.error("Error inside predictions POST API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const predictions = await prisma.prediction.findMany({
      where: { userId: session.user.id },
    });
    return NextResponse.json(predictions);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
