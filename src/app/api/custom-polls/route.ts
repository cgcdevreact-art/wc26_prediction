import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deriveCustomPollStatus } from "@/lib/custom-polls";

export async function GET() {
  try {
    const [session, cookieStore] = await Promise.all([auth(), cookies()]);
    const deviceId = cookieStore.get("device_id")?.value || null;

    const polls = await prisma.customVotePoll.findMany({
      where: {
        status: {
          not: "ARCHIVED",
        },
      },
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
      orderBy: [{ opensAt: "asc" }, { createdAt: "desc" }],
    });

    const pollIds = polls.map((poll) => poll.id);
    const identityFilters = [];

    if (session?.user?.id) {
      identityFilters.push({ userId: session.user.id });
    }

    if (deviceId) {
      identityFilters.push({ deviceId });
    }

    const existingVotes =
      pollIds.length > 0 && identityFilters.length > 0
        ? await prisma.customVoteResponse.findMany({
            where: {
              pollId: { in: pollIds },
              OR: identityFilters,
            },
            select: {
              pollId: true,
              optionId: true,
            },
          })
        : [];

    const voteMap = new Map(existingVotes.map((vote) => [vote.pollId, vote.optionId]));

    const serializedPolls = polls.map((poll) => {
      const totalVotes = poll.options.reduce((sum, option) => sum + option._count.responses, 0);
      const status = deriveCustomPollStatus(poll);

      return {
        id: poll.id,
        question: poll.question,
        description: poll.description,
        status,
        opensAt: poll.opensAt?.toISOString() || null,
        closesAt: poll.closesAt?.toISOString() || null,
        totalVotes,
        userOptionId: voteMap.get(poll.id) || null,
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
    });

    return NextResponse.json({ polls: serializedPolls });
  } catch (error) {
    console.error("Custom polls GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
