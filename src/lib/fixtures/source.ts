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
};

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

function getTodayDate() {
  const today = new Date().toISOString().split("T")[0];
  if (today.startsWith("2026-06") || today.startsWith("2026-07")) {
    return today;
  }

  return "2026-06-17";
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
  const today = getTodayDate();
  const teamsMap = buildTeamsMap(teamsData);
  const stadiumsMap = buildStadiumsMap(stadiumsData);

  return (gamesData.games || [])
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
      };

      const formattedDate = formatMatchDate(game.local_date);
      const elapsed = String(game.time_elapsed || "").toLowerCase();
      const isFinished =
        String(game.finished || "").toUpperCase() === "TRUE" || elapsed === "finished";

      let status = "UPCOMING";
      let timeElapsed = String(game.time_elapsed || "notstarted");

      if (isFinished || (formattedDate && formattedDate < today)) {
        status = "COMPLETED";
        timeElapsed = "finished";
      } else if (formattedDate === today) {
        status = "LIVE";
        timeElapsed = elapsed && elapsed !== "notstarted" ? String(game.time_elapsed) : "44";
      } else {
        timeElapsed = "notstarted";
      }

      const matchNo = Number.parseInt(String(game.id || index + 1), 10);

      return {
        match_no: Number.isNaN(matchNo) ? index + 1 : matchNo,
        date: formattedDate,
        group: game.group || "",
        homeTeamObj: homeTeam,
        awayTeamObj: awayTeam,
        venue: stadium.venue,
        city: stadium.city,
        status,
        homeScore:
          status === "UPCOMING"
            ? "-"
            : status === "COMPLETED"
            ? normalizeScore(game.home_score, "2")
            : normalizeScore(game.home_score, "0"),
        awayScore:
          status === "UPCOMING"
            ? "-"
            : status === "COMPLETED"
            ? normalizeScore(game.away_score, "0")
            : normalizeScore(game.away_score, "0"),
        time_elapsed: timeElapsed,
        isKnockout: game.type !== "group",
        stageName: getStageName(game.type),
      };
    })
    .sort((a, b) => a.match_no - b.match_no);
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
