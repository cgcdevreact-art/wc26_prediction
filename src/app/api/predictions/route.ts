import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { normalizePredictionPayload, normalizePredictionWinnerString } from "@/lib/predictionWinner";

async function ensureMatchPlaceholder(matchId: number) {
  const matchExists = await prisma.match.findUnique({ where: { id: matchId } });
  if (!matchExists) {
    let comp = await prisma.competition.findFirst();
    if (!comp) {
      comp = await prisma.competition.create({
        data: {
          id: 2000,
          name: "FIFA World Cup 2026",
          code: "WC",
          type: "CUP",
        }
      });
    }
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

        let predictedWinner = normalizePredictionWinnerString(inputWinner);
        let predictedPayload = normalizePredictionPayload(inputWinner);
        if (type.startsWith("MATCH_SCORE") && predictedHomeScore !== undefined && predictedHomeScore !== "" && predictedAwayScore !== undefined && predictedAwayScore !== "") {
          predictedWinner = normalizePredictionWinnerString(
            Number(predictedHomeScore) > Number(predictedAwayScore) ? "HOME_TEAM" : (Number(predictedHomeScore) < Number(predictedAwayScore) ? "AWAY_TEAM" : "DRAW"),
          );
          predictedPayload = Prisma.DbNull;
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
            predictedPayload,
          },
          create: {
            userId: session.user.id,
            matchId: targetMatchId,
            type: type,
            predictedHomeScore: (predictedHomeScore === "" || predictedHomeScore === undefined) ? null : Number(predictedHomeScore),
            predictedAwayScore: (predictedAwayScore === "" || predictedAwayScore === undefined) ? null : Number(predictedAwayScore),
            predictedTeamId: predictedTeamId ? Number(predictedTeamId) : null,
            predictedWinner,
            predictedPayload,
          }
        });
        results.push(prediction);
      }
      return NextResponse.json(results);
    } else {
      const { matchId, type, predictedHomeScore, predictedAwayScore, predictedTeamId, predictedWinner: inputWinner } = data;
      const targetMatchId = matchId || 0;

      await ensureMatchPlaceholder(targetMatchId);

      let predictedWinner = normalizePredictionWinnerString(inputWinner);
      let predictedPayload = normalizePredictionPayload(inputWinner);
      if (type.startsWith("MATCH_SCORE") && predictedHomeScore !== undefined && predictedHomeScore !== "" && predictedAwayScore !== undefined && predictedAwayScore !== "") {
        predictedWinner = normalizePredictionWinnerString(
          Number(predictedHomeScore) > Number(predictedAwayScore) ? "HOME_TEAM" : (Number(predictedHomeScore) < Number(predictedAwayScore) ? "AWAY_TEAM" : "DRAW"),
        );
        predictedPayload = Prisma.DbNull;
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
          predictedPayload,
        },
        create: {
          userId: session.user.id,
          matchId: targetMatchId,
          type: type,
          predictedHomeScore: (predictedHomeScore === "" || predictedHomeScore === undefined) ? null : Number(predictedHomeScore),
          predictedAwayScore: (predictedAwayScore === "" || predictedAwayScore === undefined) ? null : Number(predictedAwayScore),
          predictedTeamId: predictedTeamId ? Number(predictedTeamId) : null,
          predictedWinner,
          predictedPayload,
        }
      });
      return NextResponse.json(prediction);
    }
  } catch (error: any) {
    console.error("Error inside predictions POST API:", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2000" &&
      (error.meta?.column_name === "predictedWinner" || error.meta?.column_name === "predictedPayload")
    ) {
      return NextResponse.json(
        { error: "Prediction payload is too large for the current database schema. Sync the Prisma schema to update the prediction payload columns." },
        { status: 500 },
      );
    }

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

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const slot = searchParams.get("slot");

  try {
    if (id) {
      await prisma.prediction.delete({
        where: {
          id: id,
          userId: session.user.id,
        }
      });
      return NextResponse.json({ success: true });
    }

    if (!slot || slot === "active" || slot === "0") {
      await prisma.prediction.deleteMany({
        where: {
          userId: session.user.id,
          OR: [
            { type: { in: ["MATCH_SCORE", "KNOCKOUT_WINNER"] } },
            { type: "SLOT_METADATA", matchId: 999000 }
          ]
        }
      });
    } else {
      const slotNum = Number(slot);
      await prisma.prediction.deleteMany({
        where: {
          userId: session.user.id,
          OR: [
            { type: { in: [`MATCH_SCORE_SLOT_${slotNum}`, `KNOCKOUT_WINNER_SLOT_${slotNum}`] } },
            { type: "SLOT_METADATA", matchId: 999000 + slotNum }
          ]
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error inside predictions DELETE API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
