import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { marketMatchId, vote } = body;

    if (!marketMatchId || !vote) {
      return NextResponse.json({ error: "Missing match ID or vote" }, { status: 400 });
    }

    if (vote !== "HOME" && vote !== "AWAY") {
      return NextResponse.json({ error: "Invalid vote option. Only HOME or AWAY allowed." }, { status: 400 });
    }

    // Upsert the vote to enforce 1 vote per match
    await prisma.marketVote.upsert({
      where: {
        userId_marketMatchId: {
          userId: session.user.id,
          marketMatchId: marketMatchId,
        }
      },
      update: {
        vote: vote,
      },
      create: {
        userId: session.user.id,
        marketMatchId: marketMatchId,
        vote: vote,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to cast vote:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
