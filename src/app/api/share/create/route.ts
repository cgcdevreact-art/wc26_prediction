import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id || null;
    const { slotId, predictions, modelUsed, title } = await request.json();

    let finalSnapshot = [];
    let championCode = null;
    let finalist1Code = null;
    let finalist2Code = null;

    if (userId && slotId !== undefined && slotId !== null) {
      // 1. Logged in user: Fetch prediction rows from the selected slot
      const matchType = slotId > 0 ? `MATCH_SCORE_SLOT_${slotId}` : "MATCH_SCORE";
      const koType = slotId > 0 ? `KNOCKOUT_WINNER_SLOT_${slotId}` : "KNOCKOUT_WINNER";

      const dbPredictions = await prisma.prediction.findMany({
        where: {
          userId,
          type: { in: [matchType, koType, "SLOT_METADATA"] },
        },
      });

      if (dbPredictions.length === 0) {
        return NextResponse.json(
          { error: "No predictions found in this slot. Please run some simulations or save first." },
          { status: 400 }
        );
      }

      // Map DB predictions to clean snapshot format
      finalSnapshot = dbPredictions.map((p) => ({
        matchId: p.matchId,
        type: p.type,
        predictedHomeScore: p.predictedHomeScore,
        predictedAwayScore: p.predictedAwayScore,
        predictedWinner: p.predictedWinner,
        predictedTeamId: p.predictedTeamId,
        predictedPayload: p.predictedPayload,
      }));
    } else if (predictions && Array.isArray(predictions)) {
      // 2. Guest user: Use payload uploaded directly from local storage
      finalSnapshot = predictions;
    } else {
      return NextResponse.json({ error: "Invalid sharing payload" }, { status: 400 });
    }

    // Extract finalists & champion from the snapshot to cache in index columns
    // 500 represents the World Cup Final Match, and 501 is the 3rd Place Match
    // We also check matching KO_WINNER type
    const finalWinnerPred = finalSnapshot.find(
      (p) => p.matchId === 500 && (p.type === "KNOCKOUT_WINNER" || p.type.startsWith("KNOCKOUT_WINNER_SLOT_"))
    );

    if (finalWinnerPred) {
      // Check predicted winner details
      if (finalWinnerPred.predictedTeamId) {
        // We need to map team ID back to team code (e.g. 3-letter acronym)
        // Let's lookup team code from the teamId or get it from payload if serialized
        try {
          const parsedPayload = typeof finalWinnerPred.predictedWinner === "string"
            ? JSON.parse(finalWinnerPred.predictedWinner)
            : finalWinnerPred.predictedWinner;
          championCode = parsedPayload?.winnerCode || null;
          finalist1Code = parsedPayload?.homeCode || null;
          finalist2Code = parsedPayload?.awayCode || null;
        } catch (e) {
          // If JSON parse fails, we can leave them null
        }
      }
    }

    // If championCode is still null, look for type "SLOT_METADATA" or search predictions
    if (!championCode) {
      const metaPred = finalSnapshot.find((p) => p.type === "SLOT_METADATA" || p.type.startsWith("SLOT_METADATA"));
      if (metaPred && metaPred.predictedWinner) {
        try {
          const parsed = JSON.parse(metaPred.predictedWinner);
          championCode = parsed?.summary?.championCode || null;
        } catch (e) {}
      }
    }

    // Insert sharing snapshot into the database
    const share = await prisma.shareLink.create({
      data: {
        userId,
        title: title || (session?.user?.name ? `${session.user.name}'s World Cup Bracket` : "My WC26 Predictions"),
        snapshot: finalSnapshot,
        championCode: championCode ? String(championCode) : null,
        finalist1Code: finalist1Code ? String(finalist1Code) : null,
        finalist2Code: finalist2Code ? String(finalist2Code) : null,
        modelUsed: modelUsed || "base",
      },
    });

    return NextResponse.json({
      success: true,
      shareId: share.id,
      url: `/predictions/shared/${share.id}`,
    });
  } catch (error: any) {
    console.error("Error inside share create API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
