import { NextResponse } from "next/server";
import { getTeams } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const teams = await getTeams();
    return NextResponse.json(teams);
  } catch (error) {
    console.error("API error fetching teams:", error);
    return NextResponse.json({ error: "Failed to fetch teams" }, { status: 500 });
  }
}
