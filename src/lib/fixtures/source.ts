export const FIXTURES_REVALIDATE_SECONDS = 300;
const LIVE_API_TIMEOUT_MS = 20000;
const LIVE_API_MAX_RETRIES = 3;
const LIVE_API_RETRY_DELAY_MS = 2500;

type TeamApiRecord = {
  id?: string | number;
  iso2?: string;
  fifa_code?: string;
  name_en?: string;
  name_fa?: string;
};

type StadiumApiRecord = {
  id?: string | number;
  name_en?: string;
  fifa_name?: string;
  city_en?: string;
  region?: string;
};

type GameApiRecord = {
  id?: string | number;
  group?: string;
  type?: string;
  local_date?: string;
  finished?: string | boolean;
  time_elapsed?: string | number;
  home_team_id?: string | number;
  away_team_id?: string | number;
  home_team_label?: string;
  away_team_label?: string;
  home_team_name_en?: string;
  away_team_name_en?: string;
  stadium_id?: string | number;
  home_score?: string | number | null;
  away_score?: string | number | null;
};

type TeamsPayload = { teams?: TeamApiRecord[] };
type StadiumsPayload = { stadiums?: StadiumApiRecord[] };
type GamesPayload = { games?: GameApiRecord[] };

export type FixturesSource = {
  gamesData: GamesPayload;
  teamsData: TeamsPayload;
  stadiumsData: StadiumsPayload;
};

export type FixtureView = {
  match_no: number;
  date: string;
  kickoffTime: string;
  kickoffAtIso: string;
  timezoneLabel: string;
  group: string;
  homeTeamObj: {
    name: string;
    flag: string;
    code: string;
  };
  awayTeamObj: {
    name: string;
    flag: string;
    code: string;
  };
  venue: string;
  city: string;
  status: string;
  homeScore: string;
  awayScore: string;
  time_elapsed: string;
  isKnockout: boolean;
  stageName: string;
};

type TeamView = FixtureView["homeTeamObj"];
type StadiumView = {
  venue: string;
  city: string;
  region: string;
};

function getRegionTimezoneMeta(region?: string) {
  const normalizedRegion = String(region || "").toLowerCase();

  if (normalizedRegion.includes("eastern")) {
    return {
      utcOffsetHours: 4,
      shortLabel: "EDT",
      fullLabel: "Eastern Time",
    };
  }

  if (normalizedRegion.includes("central")) {
    return {
      utcOffsetHours: 5,
      shortLabel: "CDT",
      fullLabel: "Central Time",
    };
  }

  if (normalizedRegion.includes("western")) {
    return {
      utcOffsetHours: 7,
      shortLabel: "PDT",
      fullLabel: "Pacific Time",
    };
  }

  return {
    utcOffsetHours: 4,
    shortLabel: "EDT",
    fullLabel: "Eastern Time",
  };
}

function getFlagEmoji(countryCode: string) {
  if (!countryCode || countryCode.length !== 2) return "🏳️";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function getStageName(type: string | undefined) {
  const t = String(type || "").toLowerCase();
  if (t === "group") return "Group Stage";
  if (t === "r32" || t === "round_of_32" || t.includes("32")) return "Round of 32";
  if (t === "r16" || t === "round_of_16" || t.includes("16")) return "Round of 16";
  if (t === "qf" || t === "quarter" || t.includes("quarter")) return "Quarter-Finals";
  if (t === "sf" || t === "semi" || t.includes("semi")) return "Semi-Finals";
  if (t === "third" || t.includes("third")) return "Third Place Playoff";
  if (t === "final") return "Final";
  return "Knockout Stage";
}

function formatMatchDate(localDate?: string) {
  if (!localDate) return "";

  try {
    const datePart = localDate.split(" ")[0];
    const dateParts = datePart.split("/");

    if (dateParts.length !== 3) return "";

    return `${dateParts[2]}-${dateParts[0].padStart(2, "0")}-${dateParts[1].padStart(2, "0")}`;
  } catch (error) {
    console.error("Error parsing game date:", localDate, error);
    return "";
  }
}

function formatMatchTime(localDate?: string) {
  if (!localDate) return "";

  try {
    const [, timePart = ""] = localDate.trim().split(/\s+/);
    return timePart;
  } catch (error) {
    console.error("Error parsing game time:", localDate, error);
    return "";
  }
}

function parseMatchDateTime(localDate?: string, region?: string) {
  if (!localDate) return null;

  try {
    const [datePart, timePart] = localDate.trim().split(/\s+/);
    if (!datePart) return null;

    const dateParts = datePart.split("/");
    if (dateParts.length !== 3) return null;

    const [month, day, year] = dateParts;
    const [hours = "0", minutes = "0"] = (timePart || "00:00").split(":");
    const { utcOffsetHours } = getRegionTimezoneMeta(region);
    const parsed = new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hours) + utcOffsetHours,
        Number(minutes),
        0,
        0
      )
    );

    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch (error) {
    console.error("Error parsing game date time:", localDate, error);
    return null;
  }
}

function hasLiveElapsedSignal(rawElapsed: string) {
  const elapsed = rawElapsed.trim().toLowerCase();
  if (!elapsed || elapsed === "notstarted") return false;
  if (elapsed === "finished" || elapsed === "ft" || elapsed === "fulltime") return false;
  if (/^\d+$/.test(elapsed)) return true;

  return [
    "live",
    "half",
    "break",
    "injury",
    "extra",
    "pen",
    "2nd",
    "1st",
  ].some((token) => elapsed.includes(token));
}

function getDerivedLiveMinute(kickoffAt: Date, now: Date) {
  const elapsedMinutes = Math.max(1, Math.floor((now.getTime() - kickoffAt.getTime()) / 60000));
  return String(Math.min(elapsedMinutes, 120));
}

function buildTeamsMap(teamsData: TeamsPayload) {
  const teamsMap: Record<string, TeamView> = {};

  for (const team of teamsData.teams || []) {
    const iso = team.iso2 || "";
    teamsMap[String(team.id)] = {
      name: team.name_en || team.name_fa || "",
      flag: iso ? getFlagEmoji(iso) : "🏳️",
      code: team.fifa_code || "",
    };
  }

  return teamsMap;
}

function buildStadiumsMap(stadiumsData: StadiumsPayload) {
  const stadiumsMap: Record<string, StadiumView> = {};

  for (const stadium of stadiumsData.stadiums || []) {
    stadiumsMap[String(stadium.id)] = {
      venue: stadium.name_en || stadium.fifa_name || "TBD",
      city: stadium.city_en || "TBD",
      region: stadium.region || "",
    };
  }

  return stadiumsMap;
}

function normalizeScore(value: string | number | null | undefined, fallback: string) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return String(value);
}

export function mapFixtures({ gamesData, teamsData, stadiumsData }: FixturesSource): FixtureView[] {
  const teamsMap = buildTeamsMap(teamsData);
  const stadiumsMap = buildStadiumsMap(stadiumsData);
  const now = new Date();

  const mapped = (gamesData.games || [])
    .map((game, index) => {
      const homeTeamName = game.home_team_label || game.home_team_name_en || "TBC";
      const awayTeamName = game.away_team_label || game.away_team_name_en || "TBC";

      const homeTeam = teamsMap[String(game.home_team_id)] || {
        name: homeTeamName,
        flag: homeTeamName.match(/Winner|Runner-up|3rd|Loser/i) ? "🏆" : "🏳️",
        code: "",
      };

      const awayTeam = teamsMap[String(game.away_team_id)] || {
        name: awayTeamName,
        flag: awayTeamName.match(/Winner|Runner-up|3rd|Loser/i) ? "🏆" : "🏳️",
        code: "",
      };

      const stadium = stadiumsMap[String(game.stadium_id)] || {
        venue: "TBD",
        city: "TBD",
        region: "",
      };
      const timezoneMeta = getRegionTimezoneMeta(stadium.region);

      const formattedDate = formatMatchDate(game.local_date);
      const kickoffAt = parseMatchDateTime(game.local_date, stadium.region);
      const rawElapsed = String(game.time_elapsed || "");
      const elapsed = rawElapsed.toLowerCase();
      const isFinished =
        String(game.finished || "").toUpperCase() === "TRUE" ||
        elapsed === "finished" ||
        elapsed === "ft" ||
        elapsed === "fulltime";
      const isWithinLiveWindow =
        kickoffAt !== null &&
        now >= kickoffAt &&
        now < new Date(kickoffAt.getTime() + 3 * 60 * 60 * 1000);
      const isLive = !isFinished && isWithinLiveWindow;

      let status = "UPCOMING";
      let timeElapsed = "notstarted";

      if (isFinished) {
        status = "COMPLETED";
        timeElapsed = "finished";
      } else if (isLive) {
        status = "LIVE";
        timeElapsed =
          rawElapsed && rawElapsed.toLowerCase() !== "notstarted" && hasLiveElapsedSignal(rawElapsed)
            ? rawElapsed
            : kickoffAt
              ? getDerivedLiveMinute(kickoffAt, now)
              : "LIVE";
      }

      const matchNo = Number.parseInt(String(game.id || index + 1), 10);

      return {
        match_no: Number.isNaN(matchNo) ? index + 1 : matchNo,
        date: formattedDate,
        kickoffTime: formatMatchTime(game.local_date),
        kickoffAtIso: kickoffAt ? kickoffAt.toISOString() : "",
        timezoneLabel: timezoneMeta.shortLabel,
        group: game.group || "",
        homeTeamObj: homeTeam,
        awayTeamObj: awayTeam,
        venue: stadium.venue,
        city: stadium.city,
        status,
        homeScore:
          status === "UPCOMING"
            ? "-"
            : normalizeScore(game.home_score, status === "LIVE" ? "0" : "-"),
        awayScore:
          status === "UPCOMING"
            ? "-"
            : normalizeScore(game.away_score, status === "LIVE" ? "0" : "-"),
        time_elapsed: timeElapsed,
        isKnockout: game.type !== "group",
        stageName: getStageName(game.type),
      };
    });

  // Resolve placeholder names dynamically (Winner/Loser Match X)
  let changed = true;
  let iterations = 0;
  while (changed && iterations < 10) {
    changed = false;
    iterations++;

    for (const f of mapped) {
      // 1. Resolve Home Team if it's a placeholder
      const homeMatchResult = f.homeTeamObj.name.match(/^(Winner|Loser)\s+Match\s+(\d+)$/i);
      if (homeMatchResult) {
        const type = homeMatchResult[1].toLowerCase(); // "winner" or "loser"
        const targetMatchNo = parseInt(homeMatchResult[2], 10);
        const targetFixture = mapped.find(tf => tf.match_no === targetMatchNo);
        
        if (targetFixture && targetFixture.status === "COMPLETED") {
          const hs = parseInt(targetFixture.homeScore, 10);
          const as = parseInt(targetFixture.awayScore, 10);
          if (!isNaN(hs) && !isNaN(as)) {
            let winnerObj = null;
            let loserObj = null;
            
            if (hs > as) {
              winnerObj = targetFixture.homeTeamObj;
              loserObj = targetFixture.awayTeamObj;
            } else if (as > hs) {
              winnerObj = targetFixture.awayTeamObj;
              loserObj = targetFixture.homeTeamObj;
            } else {
              // Tie. Check subsequent matches to see which team advanced
              const homeCode = targetFixture.homeTeamObj.code;
              const awayCode = targetFixture.awayTeamObj.code;
              if (homeCode && awayCode) {
                const homeAdvanced = mapped.some(m => 
                  m.isKnockout && 
                  m.match_no > targetFixture.match_no && 
                  (m.homeTeamObj.code === homeCode || m.awayTeamObj.code === homeCode)
                );
                const awayAdvanced = mapped.some(m => 
                  m.isKnockout && 
                  m.match_no > targetFixture.match_no && 
                  (m.homeTeamObj.code === awayCode || m.awayTeamObj.code === awayCode)
                );
                if (homeAdvanced && !awayAdvanced) {
                  winnerObj = targetFixture.homeTeamObj;
                  loserObj = targetFixture.awayTeamObj;
                } else if (awayAdvanced && !homeAdvanced) {
                  winnerObj = targetFixture.awayTeamObj;
                  loserObj = targetFixture.homeTeamObj;
                }
              }
            }
            
            const resolvedTeam = type === "winner" ? winnerObj : loserObj;
            if (resolvedTeam && resolvedTeam.code) {
              f.homeTeamObj = { ...resolvedTeam };
              changed = true;
            }
          }
        }
      }

      // 2. Resolve Away Team if it's a placeholder
      const awayMatchResult = f.awayTeamObj.name.match(/^(Winner|Loser)\s+Match\s+(\d+)$/i);
      if (awayMatchResult) {
        const type = awayMatchResult[1].toLowerCase(); // "winner" or "loser"
        const targetMatchNo = parseInt(awayMatchResult[2], 10);
        const targetFixture = mapped.find(tf => tf.match_no === targetMatchNo);
        
        if (targetFixture && targetFixture.status === "COMPLETED") {
          const hs = parseInt(targetFixture.homeScore, 10);
          const as = parseInt(targetFixture.awayScore, 10);
          if (!isNaN(hs) && !isNaN(as)) {
            let winnerObj = null;
            let loserObj = null;
            
            if (hs > as) {
              winnerObj = targetFixture.homeTeamObj;
              loserObj = targetFixture.awayTeamObj;
            } else if (as > hs) {
              winnerObj = targetFixture.awayTeamObj;
              loserObj = targetFixture.homeTeamObj;
            } else {
              // Tie. Check subsequent matches to see which team advanced
              const homeCode = targetFixture.homeTeamObj.code;
              const awayCode = targetFixture.awayTeamObj.code;
              if (homeCode && awayCode) {
                const homeAdvanced = mapped.some(m => 
                  m.isKnockout && 
                  m.match_no > targetFixture.match_no && 
                  (m.homeTeamObj.code === homeCode || m.awayTeamObj.code === homeCode)
                );
                const awayAdvanced = mapped.some(m => 
                  m.isKnockout && 
                  m.match_no > targetFixture.match_no && 
                  (m.homeTeamObj.code === awayCode || m.awayTeamObj.code === awayCode)
                );
                if (homeAdvanced && !awayAdvanced) {
                  winnerObj = targetFixture.homeTeamObj;
                  loserObj = targetFixture.awayTeamObj;
                } else if (awayAdvanced && !homeAdvanced) {
                  winnerObj = targetFixture.awayTeamObj;
                  loserObj = targetFixture.homeTeamObj;
                }
              }
            }
            
            const resolvedTeam = type === "winner" ? winnerObj : loserObj;
            if (resolvedTeam && resolvedTeam.code) {
              f.awayTeamObj = { ...resolvedTeam };
              changed = true;
            }
          }
        }
      }
    }
  }

  return mapped.sort((a, b) => a.match_no - b.match_no);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJsonWithRetry<T>(url: string): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= LIVE_API_MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LIVE_API_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        next: { revalidate: FIXTURES_REVALIDATE_SECONDS },
      });

      if (!response.ok) {
        throw new Error(`Request failed for ${url}: ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error;

      if (attempt < LIVE_API_MAX_RETRIES) {
        await sleep(LIVE_API_RETRY_DELAY_MS * attempt);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Failed to fetch ${url}`);
}

export async function fetchLiveSource(): Promise<FixturesSource> {
  const [gamesData, teamsData, stadiumsData] = await Promise.all([
    fetchJsonWithRetry<GamesPayload>("https://worldcup26.ir/get/games"),
    fetchJsonWithRetry<TeamsPayload>("https://worldcup26.ir/get/teams"),
    fetchJsonWithRetry<StadiumsPayload>("https://worldcup26.ir/get/stadiums"),
  ]);

  return {
    gamesData,
    teamsData,
    stadiumsData,
  };
}
