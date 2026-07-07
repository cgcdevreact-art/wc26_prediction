export interface TeamInfo {
  name: string;
  flag: string;
  code: string;
}

export interface FixtureView {
  match_no: number;
  date: string;
  kickoffTime: string;
  kickoffAtIso: string;
  timezoneLabel: string;
  group: string;
  homeTeamObj: TeamInfo;
  awayTeamObj: TeamInfo;
  venue: string;
  city: string;
  status: "UPCOMING" | "LIVE" | "COMPLETED" | string;
  homeScore: string;
  awayScore: string;
  time_elapsed: string;
  isKnockout: boolean;
  stageName: string;
  predictions?: {
    homePercent: number;
    awayPercent: number;
    totalVotes: number;
  };
}

export const fixturesService = {
  async fetchFixtures(): Promise<FixtureView[]> {
    const response = await fetch("/api/fixtures");
    if (!response.ok) {
      throw new Error(`Failed to fetch fixtures: ${response.statusText}`);
    }
    const data = await response.json();
    if (data.success && Array.isArray(data.fixtures)) {
      return data.fixtures;
    }
    throw new Error(data.error || "Invalid data format received from fixtures API");
  }
};
