import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";
import { ensureTablesExist } from "../../../votes/route";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await ensureTablesExist();
    const resolvedParams = await props.params;
    const matchId = resolvedParams.id;

    const body = await request.json();
    const { prediction } = body;
    let deviceId = body.deviceId;

    if (!prediction || (prediction !== "HOME" && prediction !== "AWAY")) {
      return NextResponse.json({ error: "Invalid prediction selection (must be HOME or AWAY)" }, { status: 400 });
    }

    const session = await auth();
    const cookieDeviceId = request.cookies.get("device_id")?.value;
    if (!deviceId) {
      deviceId = cookieDeviceId || uuidv4();
    }

    const userId = session?.user?.id || null;

    // Check duplicate
    let existing = null;
    if (userId) {
      existing = await prisma.matchPrediction.findUnique({
        where: { userId_matchId: { userId, matchId } },
      });
    } else if (deviceId) {
      existing = await prisma.matchPrediction.findUnique({
        where: { deviceId_matchId: { deviceId, matchId } },
      });
    }

    if (existing) {
      return NextResponse.json({ error: "You have already cast a prediction for this match" }, { status: 400 });
    }

    // Create the prediction record
    await prisma.matchPrediction.create({
      data: {
        matchId,
        userId,
        deviceId: userId ? null : deviceId, // Use deviceId only for anonymous guests
        prediction,
      },
    });

    // Re-calculate percentages for prediction history tracking
    const homeVotes = await prisma.matchPrediction.count({
      where: { matchId, prediction: "HOME" },
    });

    const awayVotes = await prisma.matchPrediction.count({
      where: { matchId, prediction: "AWAY" },
    });

    const total = homeVotes + awayVotes;
    const homePercent = total > 0 ? Math.round((homeVotes / total) * 100) : 50;
    const awayPercent = 100 - homePercent;

    // Save history point
    await prisma.predictionHistory.create({
      data: {
        matchId,
        homePercent,
        awayPercent,
        totalVotes: total,
        timestamp: new Date(),
      },
    });

    const response = NextResponse.json({
      success: true,
      deviceId,
      summary: {
        homeVotes,
        awayVotes,
        totalVotes: total,
        homePercent,
        awayPercent,
      },
    });

    if (!cookieDeviceId && deviceId) {
      response.cookies.set("device_id", deviceId, { maxAge: 60 * 60 * 24 * 365 * 10 }); // 10 years
    }

    return response;
  } catch (error: any) {
    console.error("Failed to submit prediction:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await ensureTablesExist();
    const resolvedParams = await props.params;
    const matchId = resolvedParams.id;

    const session = await auth();
    const cookieDeviceId = request.cookies.get("device_id")?.value;
    const userId = session?.user?.id || null;

    let existing = null;
    if (userId) {
      existing = await prisma.matchPrediction.findUnique({
        where: { userId_matchId: { userId, matchId } },
      });
    } else if (cookieDeviceId) {
      existing = await prisma.matchPrediction.findUnique({
        where: { deviceId_matchId: { deviceId: cookieDeviceId, matchId } },
      });
    }

    const homeVotes = await prisma.matchPrediction.count({
      where: { matchId, prediction: "HOME" },
    });
    const awayVotes = await prisma.matchPrediction.count({
      where: { matchId, prediction: "AWAY" },
    });
    const total = homeVotes + awayVotes;
    const homePercent = total > 0 ? Math.round((homeVotes / total) * 100) : 50;
    const awayPercent = 100 - homePercent;

    return NextResponse.json({
      success: true,
      prediction: existing ? { predictedOutcome: existing.prediction } : null,
      predictionsSummary: {
        homePercent,
        awayPercent,
        totalVotes: total,
      }
    });
  } catch (error: any) {
    console.error("Failed to fetch user prediction:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
