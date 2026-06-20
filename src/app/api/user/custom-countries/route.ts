import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/user/custom-countries - Fetch all custom countries for the user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customCountries = await prisma.userCustomCountry.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ success: true, customCountries });
  } catch (error) {
    console.error("Error fetching custom countries:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/user/custom-countries - Upsert a custom country
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { code, name, flag, baselineCode, elo, attack, defense, replacedCode } = body;

    if (!code || !name || !flag || !baselineCode || elo === undefined || attack === undefined || defense === undefined || !replacedCode) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const parsedElo = parseFloat(elo);
    const parsedAttack = parseFloat(attack);
    const parsedDefense = parseFloat(defense);

    if (isNaN(parsedElo) || isNaN(parsedAttack) || isNaN(parsedDefense)) {
      return NextResponse.json({ error: "Invalid stats numbers" }, { status: 400 });
    }

    const customCountry = await prisma.userCustomCountry.upsert({
      where: {
        userId_code: {
          userId: session.user.id,
          code,
        },
      },
      update: {
        name,
        flag,
        baselineCode,
        elo: parsedElo,
        attack: parsedAttack,
        defense: parsedDefense,
        replacedCode,
      },
      create: {
        userId: session.user.id,
        code,
        name,
        flag,
        baselineCode,
        elo: parsedElo,
        attack: parsedAttack,
        defense: parsedDefense,
        replacedCode,
      },
    });

    return NextResponse.json({ success: true, customCountry });
  } catch (error) {
    console.error("Error saving custom country:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/user/custom-countries - Delete a custom country
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await req.json();

    if (!code) {
      return NextResponse.json({ error: "Missing required field 'code'" }, { status: 400 });
    }

    await prisma.userCustomCountry.delete({
      where: {
        userId_code: {
          userId: session.user.id,
          code,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting custom country:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
