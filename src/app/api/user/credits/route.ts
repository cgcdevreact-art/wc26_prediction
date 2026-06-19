import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';


export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        subscriptionTier: true,
        freeModelUsageCount: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const tier = user.subscriptionTier;

    if (tier === "free") {
      const LIMIT = 5;
      if (user.freeModelUsageCount >= LIMIT) {
        return NextResponse.json(
          {
            allowed: false,
            error: "You have used all 5 of your free Base Model simulations. Please upgrade to continue.",
            tier,
            usageCount: user.freeModelUsageCount,
            limit: LIMIT,
          },
          { status: 403 }
        );
      }

      const updatedUser = await prisma.user.update({
        where: { id: session.user.id },
        data: {
          freeModelUsageCount: {
            increment: 1,
          },
        },
        select: {
          subscriptionTier: true,
          freeModelUsageCount: true,
        },
      });

      return NextResponse.json({
        allowed: true,
        tier,
        usageCount: updatedUser.freeModelUsageCount,
        limit: LIMIT,
      });
    }

    // Plus/Pro users get unlimited simulations
    return NextResponse.json({
      allowed: true,
      tier,
      usageCount: 0,
      limit: null,
    });
  } catch (error: any) {
    console.error("Error updating user credits:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Add a GET endpoint to fetch current usage
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        subscriptionTier: true,
        freeModelUsageCount: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      tier: user.subscriptionTier,
      usageCount: user.freeModelUsageCount,
      limit: user.subscriptionTier === "free" ? 5 : null,
    });
  } catch (error: any) {
    console.error("Error fetching user credits:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
