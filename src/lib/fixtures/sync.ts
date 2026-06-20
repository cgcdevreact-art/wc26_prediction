import { prisma } from "@/lib/prisma";
import {
  fetchLiveSource,
  FIXTURES_REVALIDATE_SECONDS,
  mapFixtures,
  type FixtureView,
} from "./source";

function toDbRows(fixtures: FixtureView[], source: string) {
  return fixtures.map((fixture) => ({
    matchNo: fixture.match_no,
    date: fixture.date,
    group: fixture.group,
    homeTeamName: fixture.homeTeamObj.name,
    homeTeamFlag: fixture.homeTeamObj.flag,
    homeTeamCode: fixture.homeTeamObj.code,
    awayTeamName: fixture.awayTeamObj.name,
    awayTeamFlag: fixture.awayTeamObj.flag,
    awayTeamCode: fixture.awayTeamObj.code,
    venue: fixture.venue,
    city: fixture.city,
    status: fixture.status,
    homeScore: fixture.homeScore,
    awayScore: fixture.awayScore,
    timeElapsed: fixture.time_elapsed,
    isKnockout: fixture.isKnockout,
    stageName: fixture.stageName,
    source,
  }));
}

export async function syncFixturesToDb() {
  const source = "live";
  const fixtures = mapFixtures(await fetchLiveSource());
  await replaceFixtureCache(fixtures, source);

  return {
    success: true,
    count: fixtures.length,
    source,
    revalidateSeconds: FIXTURES_REVALIDATE_SECONDS,
  };
}

async function replaceFixtureCache(fixtures: FixtureView[], source: string) {
  const rows = toDbRows(fixtures, source);

  await prisma.$transaction([
    prisma.fixtureCache.deleteMany(),
    ...(rows.length > 0 ? [prisma.fixtureCache.createMany({ data: rows })] : []),
  ]);
}

export async function readFixturesFromDb() {
  const rows = await prisma.fixtureCache.findMany({
    orderBy: { matchNo: "asc" },
  });

  return {
    fixtures: rows.map((row) => ({
      match_no: row.matchNo,
      date: row.date,
      kickoffTime: "",
      kickoffAtIso: "",
      timezoneLabel: "",
      group: row.group,
      homeTeamObj: {
        name: row.homeTeamName,
        flag: row.homeTeamFlag,
        code: row.homeTeamCode,
      },
      awayTeamObj: {
        name: row.awayTeamName,
        flag: row.awayTeamFlag,
        code: row.awayTeamCode,
      },
      venue: row.venue,
      city: row.city,
      status: row.status,
      homeScore: row.homeScore,
      awayScore: row.awayScore,
      time_elapsed: row.timeElapsed,
      isKnockout: row.isKnockout,
      stageName: row.stageName,
    })),
    lastSyncedAt: rows[0]?.updatedAt ?? null,
    source: rows[0]?.source ?? null,
  };
}
