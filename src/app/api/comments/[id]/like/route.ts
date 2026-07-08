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
    const targetId = resolvedParams.id; // Target comment/reply ID to like

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "You must be signed in to like comments" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { type } = body; // "COMMENT" or "REPLY"

    if (!type || (type !== "COMMENT" && type !== "REPLY")) {
      return NextResponse.json({ error: "Invalid like target type (must be COMMENT or REPLY)" }, { status: 400 });
    }

    let liked = false;

    if (type === "COMMENT") {
      const existing = await prisma.commentLike.findUnique({
        where: { userId_commentId: { userId, commentId: targetId } },
      });

      if (existing) {
        await prisma.commentLike.delete({
          where: { id: existing.id },
        });
        liked = false;
      } else {
        await prisma.commentLike.create({
          data: {
            userId,
            commentId: targetId,
          },
        });
        liked = true;
      }
    } else {
      const existing = await prisma.commentLike.findUnique({
        where: { userId_replyId: { userId, replyId: targetId } },
      });

      if (existing) {
        await prisma.commentLike.delete({
          where: { id: existing.id },
        });
        liked = false;
      } else {
        await prisma.commentLike.create({
          data: {
            userId,
            replyId: targetId,
          },
        });
        liked = true;
      }
    }

    return NextResponse.json({ success: true, liked });
  } catch (error: any) {
    console.error("Failed to toggle like:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
