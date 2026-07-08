import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const marketMatchId = resolvedParams.id;
    const body = await request.json();
    const { vote } = body;

    if (!["HOME", "DRAW", "AWAY"].includes(vote)) {
      return NextResponse.json({ error: "Invalid vote" }, { status: 400 });
    }

    // Check if match exists
    const match = await prisma.marketMatch.findUnique({
      where: { id: marketMatchId }
    });

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    // Upsert the user's vote
    const updatedVote = await prisma.marketVote.upsert({
      where: {
        userId_marketMatchId: {
          userId: session.user.id,
          marketMatchId,
        }
      },
      update: {
        vote,
      },
      create: {
        userId: session.user.id,
        marketMatchId,
        vote,
      }
    });

    return NextResponse.json({ success: true, vote: updatedVote });
  } catch (error) {
    console.error("Failed to submit vote:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
