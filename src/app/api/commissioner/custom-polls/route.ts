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

export async function GET() {
  try {
    const adminUser = await requireAdminUser();
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const polls = await prisma.customVotePoll.findMany({
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
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ polls });
  } catch (error) {
    console.error("Commissioner custom polls GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminUser = await requireAdminUser();
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const normalized = normalizeCustomPollInput(body);

    const poll = await prisma.customVotePoll.create({
      data: {
        question: normalized.question,
        description: normalized.description,
        status: normalized.status,
        opensAt: normalized.opensAt,
        closesAt: normalized.closesAt,
        createdById: adminUser.id,
        options: {
          create: normalized.options.map((option, index) => ({
            label: option.label,
            shortLabel: option.shortLabel,
            imageUrl: option.imageUrl,
            accentColor: option.accentColor,
            sortOrder: option.sortOrder ?? index,
          })),
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
        _count: {
          select: { responses: true },
        },
      },
    });

    return NextResponse.json({ poll }, { status: 201 });
  } catch (error) {
    console.error("Commissioner custom polls POST error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Internal server error" ? 500 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
