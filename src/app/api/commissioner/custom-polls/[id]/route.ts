import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeCustomPollInput } from "@/lib/custom-polls";

async function requireAdminUser() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return null;
  }
  return session.user;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireAdminUser();
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const normalized = normalizeCustomPollInput(body);

    const existing = await prisma.customVotePoll.findUnique({
      where: { id },
      include: {
        options: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    const nextOptionIds = new Set(normalized.options.map((option) => option.id).filter(Boolean));
    const removableOptionIds = existing.options
      .filter((option) => !nextOptionIds.has(option.id))
      .map((option) => option.id);

    if (removableOptionIds.length > 0) {
      const existingVotes = await prisma.customVoteResponse.count({
        where: {
          optionId: { in: removableOptionIds },
        },
      });

      if (existingVotes > 0) {
        return NextResponse.json(
          { error: "You cannot remove options that already have votes." },
          { status: 400 }
        );
      }
    }

    await prisma.customVotePoll.update({
      where: { id },
      data: {
        question: normalized.question,
        description: normalized.description,
        status: normalized.status,
        opensAt: normalized.opensAt,
        closesAt: normalized.closesAt,
      },
    });

    for (const optionId of removableOptionIds) {
      await prisma.customVoteOption.delete({
        where: { id: optionId },
      });
    }

    for (const [index, option] of normalized.options.entries()) {
      if (option.id && existing.options.some((item) => item.id === option.id)) {
        await prisma.customVoteOption.update({
          where: { id: option.id },
          data: {
            label: option.label,
            shortLabel: option.shortLabel,
            imageUrl: option.imageUrl,
            accentColor: option.accentColor,
            sortOrder: option.sortOrder ?? index,
          },
        });
      } else {
        await prisma.customVoteOption.create({
          data: {
            pollId: id,
            label: option.label,
            shortLabel: option.shortLabel,
            imageUrl: option.imageUrl,
            accentColor: option.accentColor,
            sortOrder: option.sortOrder ?? index,
          },
        });
      }
    }

    const poll = await prisma.customVotePoll.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
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

    return NextResponse.json({ poll });
  } catch (error) {
    console.error("Commissioner custom polls PATCH error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Internal server error" ? 500 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireAdminUser();
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const poll = await prisma.customVotePoll.findUnique({
      where: { id },
    });

    if (!poll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    await prisma.customVotePoll.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Commissioner custom polls DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
