import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deriveCustomPollStatus } from "@/lib/custom-polls";

async function serializePoll(pollId: string, userId?: string | null, deviceId?: string | null) {
  const poll = await prisma.customVotePoll.findUnique({
    where: { id: pollId },
    include: {
      options: {
        include: {
          _count: {
            select: { responses: true },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!poll) {
    return null;
  }

  const existingVote =
    userId || deviceId
      ? await prisma.customVoteResponse.findFirst({
          where: {
            pollId,
            ...(userId ? { userId } : { deviceId }),
          },
          select: {
            optionId: true,
          },
        })
      : null;

  const totalVotes = poll.options.reduce((sum, option) => sum + option._count.responses, 0);

  return {
    id: poll.id,
    question: poll.question,
    description: poll.description,
    status: deriveCustomPollStatus(poll),
    opensAt: poll.opensAt?.toISOString() || null,
    closesAt: poll.closesAt?.toISOString() || null,
    totalVotes,
    userOptionId: existingVote?.optionId || null,
    options: poll.options.map((option) => {
      const votes = option._count.responses;
      return {
        id: option.id,
        label: option.label,
        shortLabel: option.shortLabel,
        imageUrl: option.imageUrl,
        accentColor: option.accentColor,
        votes,
        percentage: totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0,
      };
    }),
  };
}

export async function POST(
  request: Request,
  context: RouteContext<"/api/custom-polls/[id]/vote">
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const optionId = body.optionId as string | undefined;

    if (!optionId) {
      return NextResponse.json({ error: "optionId is required" }, { status: 400 });
    }

    const [session, cookieStore] = await Promise.all([auth(), cookies()]);
    const existingDeviceId = cookieStore.get("device_id")?.value || null;
    const deviceId = existingDeviceId || crypto.randomUUID();
    const userId = session?.user?.id || null;

    const poll = await prisma.customVotePoll.findUnique({
      where: { id },
      include: {
        options: true,
      },
    });

    if (!poll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    const status = deriveCustomPollStatus(poll);
    if (status !== "LIVE") {
      return NextResponse.json(
        { error: status === "UPCOMING" ? "Voting has not opened yet." : "Voting is closed for this poll." },
        { status: 400 }
      );
    }

    if (!poll.options.some((option) => option.id === optionId)) {
      return NextResponse.json({ error: "Invalid option selected" }, { status: 400 });
    }

    const existingVote = await prisma.customVoteResponse.findFirst({
      where: {
        pollId: id,
        ...(userId ? { userId } : { deviceId }),
      },
    });

    if (existingVote) {
      const serializedPoll = await serializePoll(id, userId, deviceId);
      return NextResponse.json(
        {
          error: "You already voted on this poll.",
          poll: serializedPoll,
        },
        { status: 409 }
      );
    }

    await prisma.customVoteResponse.create({
      data: {
        pollId: id,
        optionId,
        userId,
        deviceId: userId ? null : deviceId,
      },
    });

    const response = NextResponse.json({
      success: true,
      poll: await serializePoll(id, userId, userId ? existingDeviceId : deviceId),
    });

    if (!userId && !existingDeviceId) {
      response.cookies.set("device_id", deviceId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
      });
    }

    return response;
  } catch (error) {
    console.error("Custom poll vote POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
