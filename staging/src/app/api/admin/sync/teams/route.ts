import { NextResponse } from "next/server";
import { syncTeams } from "@/lib/football-data/sync";

export async function POST(request: Request) {
  try {
    const result = await syncTeams("WC");
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Sync error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
