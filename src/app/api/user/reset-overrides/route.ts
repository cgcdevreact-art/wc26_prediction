import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Delete all team and player overrides for this user
    await prisma.$transaction([
      prisma.userTeamOverride.deleteMany({
        where: { userId },
      }),
      prisma.userPlayerOverride.deleteMany({
        where: { userId },
      }),
    ]);

    return NextResponse.json({ success: true, message: "All player and team overrides have been reset." });
  } catch (error: any) {
    console.error("Failed to reset overrides:", error);
    return NextResponse.json({ error: error.message || "Failed to reset overrides" }, { status: 500 });
  }
}
