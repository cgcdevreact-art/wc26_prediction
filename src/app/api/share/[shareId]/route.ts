import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: any }
) {
  try {
    // Await params for compatibility with modern Next.js App Router
    const resolvedParams = await params;
    const { shareId } = resolvedParams;

    if (!shareId) {
      return NextResponse.json({ error: "Share ID is required" }, { status: 400 });
    }

    const share = await prisma.shareLink.findUnique({
      where: { id: shareId },
      include: {
        user: {
          select: { name: true, image: true }
        }
      }
    });

    if (!share) {
      return NextResponse.json({ error: "Shared prediction not found" }, { status: 404 });
    }

    // Increment view count asynchronously in the background
    prisma.shareLink.update({
      where: { id: shareId },
      data: { views: { increment: 1 } }
    }).catch(err => console.error("Failed to increment views:", err));

    return NextResponse.json({
      id: share.id,
      title: share.title,
      userName: share.user?.name || "Guest User",
      userImage: share.user?.image || null,
      snapshot: share.snapshot,
      championCode: share.championCode,
      finalist1Code: share.finalist1Code,
      finalist2Code: share.finalist2Code,
      modelUsed: share.modelUsed,
      views: share.views,
      createdAt: share.createdAt,
    });
  } catch (error: any) {
    console.error("Error inside share fetch API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
