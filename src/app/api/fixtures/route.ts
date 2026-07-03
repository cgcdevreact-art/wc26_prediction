import { NextResponse } from "next/server";
import { FIXTURES_REVALIDATE_SECONDS, fetchLiveSource, mapFixtures } from "@/lib/fixtures/source";
import { readFixturesFromDb, syncFixturesToDb } from "@/lib/fixtures/sync";

export const runtime = "nodejs";

export async function GET() {
  try {
    try {
      const liveSource = await fetchLiveSource();
      const fixtures = mapFixtures(liveSource);
      try {
        await syncFixturesToDb();
      } catch (dbSyncError) {
        console.warn("Failed to sync live fixtures to database cache:", dbSyncError);
      }

      return NextResponse.json(
        {
          success: true,
          fixtures,
          games: liveSource.gamesData?.games || [],
          stadiums: liveSource.stadiumsData?.stadiums || [],
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
      try {
        await syncFixturesToDb();
        ({ fixtures, lastSyncedAt, source } = await readFixturesFromDb());
        warmed = true;
      } catch (syncError) {
        console.warn("Failed to sync fixtures on stale check. Using existing database cache.", syncError);
      }
    }

    // Load local fallback files for raw games/stadiums if server is offline or live api failed
    let games: any[] = [];
    let stadiums: any[] = [];
    try {
      const fs = require("fs");
      const path = require("path");
      const gamesFile = fs.readFileSync(path.join(process.cwd(), "public", "games_live.json"), "utf8");
      const stadiumsFile = fs.readFileSync(path.join(process.cwd(), "public", "stadiums_live.json"), "utf8");
      games = JSON.parse(gamesFile).games || [];
      stadiums = JSON.parse(stadiumsFile).stadiums || [];
    } catch (e) {
      console.error("Failed to read local fallback files:", e);
    }

    return NextResponse.json(
      {
        success: true,
        fixtures,
        games,
        stadiums,
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
