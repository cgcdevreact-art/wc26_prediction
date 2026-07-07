import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ensureTablesExist } from "../../../votes/route";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await ensureTablesExist();
    const resolvedParams = await props.params;
    const targetId = resolvedParams.id; // Target comment/reply being replied to

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "You must be signed in to reply" }, { status: 401 });
    }

    const body = await request.json();
    const { content, commentId, parentId } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: "Reply content cannot be empty" }, { status: 400 });
    }

    if (!commentId) {
      return NextResponse.json({ error: "Missing commentId in request body" }, { status: 400 });
    }

    const reply = await prisma.commentReply.create({
      data: {
        commentId,
        parentId: parentId || targetId === commentId ? null : targetId,
        userId: session.user.id,
        content: content.trim(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, reply });
  } catch (error: any) {
    console.error("Failed to post reply:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
