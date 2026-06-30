import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

let lastMatchesSyncTime = 0;

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Auto-sync matches if database is empty or stale (older than 120s)
    const now = Date.now();
    const count = await prisma.match.count();
    if (count === 0 || now - lastMatchesSyncTime > 120 * 1000) {
      try {
        const { syncMatches } = await import("@/lib/football-data/sync");
        await syncMatches("WC");
        lastMatchesSyncTime = now;
      } catch (syncError) {
        console.error("Failed to auto-sync matches in admin route:", syncError);
      }
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const sort = url.searchParams.get("sort") || "utcDate";
    const order = url.searchParams.get("order") || "desc";
    const status = url.searchParams.get("status") || "";
    
    const skip = (page - 1) * limit;

    const where = status ? { status } : {};
    
    // Support sorting by nested relation fields or standard fields
    let orderBy: any = {};
    if (sort === 'homeTeam') {
      orderBy = { homeTeam: { shortName: order } };
    } else {
      orderBy = { [sort]: order };
    }

    const [matches, total] = await Promise.all([
      prisma.match.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          homeTeam: { select: { name: true, shortName: true, tla: true, crest: true } },
          awayTeam: { select: { name: true, shortName: true, tla: true, crest: true } },
        },
      }),
      prisma.match.count({ where }),
    ]);

    return NextResponse.json({ matches, total, page, limit });
  } catch (error: any) {
    console.error("Admin matches GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
