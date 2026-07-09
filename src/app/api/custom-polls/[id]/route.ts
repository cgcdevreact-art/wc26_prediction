import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deriveCustomPollStatus } from "@/lib/custom-polls";

export async function GET(
  request: Request,
  context: RouteContext<"/api/custom-polls/[id]">
) {
  try {
    const { id } = await context.params;
    const [session, cookieStore] = await Promise.all([auth(), cookies()]);
    const deviceId = cookieStore.get("device_id")?.value || null;

    const poll = await prisma.customVotePoll.findUnique({
      where: { id },
      include: {
        options: {
          include: {
            _count: {
              select: { responses: true },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
        _count: {
          select: { responses: true },
        },
      },
    });

    if (!poll || deriveCustomPollStatus(poll) === "ARCHIVED") {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    const userId = session?.user?.id || null;

    const identityFilters = [];
    if (userId) identityFilters.push({ userId });
    if (deviceId) identityFilters.push({ deviceId });

    const existingVote =
      identityFilters.length > 0
        ? await prisma.customVoteResponse.findFirst({
            where: {
              pollId: id,
              OR: identityFilters,
            },
            select: { optionId: true },
          })
        : null;

    const totalVotes = poll.options.reduce((sum, option) => sum + option._count.responses, 0);
    const status = deriveCustomPollStatus(poll);

    const serialized = {
      id: poll.id,
      question: poll.question,
      description: poll.description,
      status,
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

    return NextResponse.json({ poll: serialized });
  } catch (error) {
    console.error("Custom poll GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
