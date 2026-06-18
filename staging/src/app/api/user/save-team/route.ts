import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { teamCode, elo, attack, defense } = await req.json();

    if (!teamCode || elo === undefined || attack === undefined || defense === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const parsedElo = parseFloat(elo);
    const parsedAttack = parseFloat(attack);
    const parsedDefense = parseFloat(defense);

    if (isNaN(parsedElo) || isNaN(parsedAttack) || isNaN(parsedDefense)) {
      return NextResponse.json({ error: "Invalid numbers" }, { status: 400 });
    }

    const override = await prisma.userTeamOverride.upsert({
      where: {
        userId_teamCode: {
          userId: session.user.id,
          teamCode,
        },
      },
      update: {
        elo: parsedElo,
        attack: parsedAttack,
        defense: parsedDefense,
      },
      create: {
        userId: session.user.id,
        teamCode,
        elo: parsedElo,
        attack: parsedAttack,
        defense: parsedDefense,
      },
    });

    return NextResponse.json({ success: true, override });
  } catch (error) {
    console.error("Error saving team override:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
