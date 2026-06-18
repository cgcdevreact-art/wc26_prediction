import { NextResponse } from "next/server";
import { FIXTURES_REVALIDATE_SECONDS } from "@/lib/fixtures/source";
import { readFixturesFromDb, syncFixturesToDb } from "@/lib/fixtures/sync";

export const runtime = "nodejs";

export async function GET() {
  try {
    let { fixtures, lastSyncedAt, source } = await readFixturesFromDb();
    let warmed = false;

    if (fixtures.length === 0) {
      await syncFixturesToDb();
      ({ fixtures, lastSyncedAt, source } = await readFixturesFromDb());
      warmed = true;
    }

    return NextResponse.json(
      {
        success: true,
        fixtures,
        source: source || "db",
        warmed,
        lastSyncedAt,
      },
      {
        headers: {
          "Cache-Control": `s-maxage=${FIXTURES_REVALIDATE_SECONDS}, stale-while-revalidate=60`,
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to load fixtures", details: message },
      { status: 500 }
    );
  }
}
