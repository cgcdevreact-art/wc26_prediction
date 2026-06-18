import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      playerKey,
      overallRating,
      baseQuality,
      recentForm,
      intlExperience,
      attackingImpact,
      defensiveImpact,
      passingCreativity,
      fitnessAvailability,
      disciplineRisk,
      matchImportance,
      ratingTier,
      imageUrl,
    } = await req.json();

    if (!playerKey || overallRating === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const override = await prisma.userPlayerOverride.upsert({
      where: {
        userId_playerKey: {
          userId: session.user.id,
          playerKey,
        },
      },
      update: {
        overallRating: String(overallRating),
        baseQuality: String(baseQuality),
        recentForm: String(recentForm),
        intlExperience: String(intlExperience),
        attackingImpact: String(attackingImpact),
        defensiveImpact: String(defensiveImpact),
        passingCreativity: String(passingCreativity),
        fitnessAvailability: String(fitnessAvailability),
        disciplineRisk: String(disciplineRisk),
        matchImportance: String(matchImportance),
        ratingTier: String(ratingTier),
        imageUrl: imageUrl || null,
      },
      create: {
        userId: session.user.id,
        playerKey,
        overallRating: String(overallRating),
        baseQuality: String(baseQuality),
        recentForm: String(recentForm),
        intlExperience: String(intlExperience),
        attackingImpact: String(attackingImpact),
        defensiveImpact: String(defensiveImpact),
        passingCreativity: String(passingCreativity),
        fitnessAvailability: String(fitnessAvailability),
        disciplineRisk: String(disciplineRisk),
        matchImportance: String(matchImportance),
        ratingTier: String(ratingTier),
        imageUrl: imageUrl || null,
      },
    });

    return NextResponse.json({ success: true, override });
  } catch (error) {
    console.error("Error saving player override:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
