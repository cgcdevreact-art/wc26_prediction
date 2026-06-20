import { NextResponse } from "next/server";
import { FIXTURES_REVALIDATE_SECONDS, fetchLiveSource, mapFixtures } from "@/lib/fixtures/source";
import { readFixturesFromDb, syncFixturesToDb } from "@/lib/fixtures/sync";

export const runtime = "nodejs";

export async function GET() {
  try {
    try {
      const fixtures = mapFixtures(await fetchLiveSource());
      await syncFixturesToDb();

      return NextResponse.json(
        {
          success: true,
          fixtures,
          source: "live",
          warmed: false,
          lastSyncedAt: new Date(),
        },
        {
          headers: {
            "Cache-Control": `s-maxage=${FIXTURES_REVALIDATE_SECONDS}, stale-while-revalidate=60`,
          },
        }
      );
    } catch (liveError) {
      console.warn("Falling back to cached fixtures because live fetch failed.", liveError);
    }

    let { fixtures, lastSyncedAt, source } = await readFixturesFromDb();
    let warmed = false;
    const isStale =
      !lastSyncedAt ||
      Date.now() - new Date(lastSyncedAt).getTime() > FIXTURES_REVALIDATE_SECONDS * 1000;

    if (fixtures.length === 0 || isStale) {
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
