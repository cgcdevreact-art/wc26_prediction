import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const comments = await prisma.marketComment.findMany({
      where: {
        marketMatchId: resolvedParams.id
      },
      include: {
        user: {
          select: {
            name: true,
            image: true,
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error("Failed to fetch comments:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const marketMatchId = resolvedParams.id;
    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== "string" || content.trim() === "") {
      return NextResponse.json({ error: "Invalid comment content" }, { status: 400 });
    }

    const comment = await prisma.marketComment.create({
      data: {
        userId: session.user.id,
        marketMatchId,
        content: content.trim(),
      },
      include: {
        user: {
          select: {
            name: true,
            image: true,
          }
        }
      }
    });

    return NextResponse.json(comment);
  } catch (error) {
    console.error("Failed to post comment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
