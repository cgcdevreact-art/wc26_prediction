import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ensureTablesExist } from "../route";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ matchId: string }> }
) {
  try {
    await ensureTablesExist();
    const resolvedParams = await props.params;
    const matchId = resolvedParams.matchId;

    const session = await auth();
    const cookieDeviceId = request.cookies.get("device_id")?.value || null;
    const userId = session?.user?.id || null;

    // Fetch summary
    const summaryRows: any[] = await prisma.$queryRawUnsafe(
      "SELECT team_a_votes as teamAVotes, team_b_votes as teamBVotes, draw_votes as drawVotes, total_votes as totalVotes FROM vote_summary WHERE match_id = ?",
      String(matchId)
    );

    const summary = summaryRows && summaryRows[0] ? {
      teamAVotes: Number(summaryRows[0].teamAVotes),
      teamBVotes: Number(summaryRows[0].teamBVotes),
      drawVotes: Number(summaryRows[0].drawVotes),
      totalVotes: Number(summaryRows[0].totalVotes)
    } : {
      teamAVotes: 0,
      teamBVotes: 0,
      drawVotes: 0,
      totalVotes: 0
    };

    // Check user vote
    let userVote: string | null = null;
    let existingVote: any[] = [];

    if (userId) {
      existingVote = await prisma.$queryRawUnsafe(
        "SELECT selected_team FROM votes WHERE user_id = ? AND match_id = ?",
        userId,
        String(matchId)
      );
    } else if (cookieDeviceId) {
      existingVote = await prisma.$queryRawUnsafe(
        "SELECT selected_team FROM votes WHERE device_id = ? AND match_id = ?",
        cookieDeviceId,
        String(matchId)
      );
    }

    if (existingVote && existingVote[0]) {
      userVote = existingVote[0].selected_team;
    }

    return NextResponse.json({
      success: true,
      summary,
      userVote
    });
  } catch (error: any) {
    console.error("Failed to fetch vote stats:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
