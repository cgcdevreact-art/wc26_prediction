import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ensureTablesExist } from "../../../votes/route";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await ensureTablesExist();
    const resolvedParams = await props.params;
    const matchId = resolvedParams.id;

    const url = new URL(request.url);
    const sort = url.searchParams.get("sort") || "Newest";

    // Query parent comments and include deep nested replies up to 3 levels
    const comments = await prisma.comment.findMany({
      where: { matchId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
          },
        },
        likes: true,
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                role: true,
              },
            },
            likes: true,
            replies: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                    role: true,
                  },
                },
                likes: true,
                replies: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        image: true,
                        role: true,
                      },
                    },
                    likes: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Helper to calculate total replies recursively
    const countTotalReplies = (c: any): number => {
      let count = c.replies ? c.replies.length : 0;
      if (c.replies) {
        for (const r of c.replies) {
          count += countTotalReplies(r);
        }
      }
      return count;
    };

    // Helper to calculate trending score: engagement count weighted by age
    const getTrendingScore = (c: any): number => {
      const likesCount = c.likes ? c.likes.length : 0;
      const repliesCount = countTotalReplies(c);
      const score = likesCount + repliesCount * 2;
      const ageHours = (Date.now() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60);
      return score / (ageHours + 2); // Simple gravity formula
    };

    // Sort parent comments
    if (sort === "Newest") {
      comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sort === "Oldest") {
      comments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sort === "Most Liked") {
      comments.sort((a, b) => (b.likes ? b.likes.length : 0) - (a.likes ? a.likes.length : 0));
    } else if (sort === "Most Replies") {
      comments.sort((a, b) => countTotalReplies(b) - countTotalReplies(a));
    } else if (sort === "Trending") {
      comments.sort((a, b) => getTrendingScore(b) - getTrendingScore(a));
    }

    return NextResponse.json({ success: true, comments });
  } catch (error: any) {
    console.error("Failed to fetch comments:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await ensureTablesExist();
    const resolvedParams = await props.params;
    const matchId = resolvedParams.id;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "You must be signed in to post comments" }, { status: 401 });
    }

    const { content } = await request.json();
    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: "Comment content cannot be empty" }, { status: 400 });
    }

    const comment = await prisma.comment.create({
      data: {
        matchId,
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

    return NextResponse.json({ success: true, comment });
  } catch (error: any) {
    console.error("Failed to post comment:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
