import { FixtureView } from "./fixturesService";

export interface TeamStanding {
  code: string;
  name: string;
  flag: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
}

export const standingsService = {
  calculateGroupStandings(fixtures: FixtureView[]): Record<string, TeamStanding[]> {
    const data: Record<string, Record<string, TeamStanding>> = {};

    // Filter to group stage matches
    const groupMatches = fixtures.filter((f) => !f.isKnockout);

    groupMatches.forEach((m) => {
      const g = m.group || "UNKNOWN";
      if (!data[g]) {
        data[g] = {};
      }

      // Initialize home team standing if not present
      if (m.homeTeamObj.code && !data[g][m.homeTeamObj.code]) {
        data[g][m.homeTeamObj.code] = this.initStanding(m.homeTeamObj.code, m.homeTeamObj.name, m.homeTeamObj.flag);
      }
      // Initialize away team standing if not present
      if (m.awayTeamObj.code && !data[g][m.awayTeamObj.code]) {
        data[g][m.awayTeamObj.code] = this.initStanding(m.awayTeamObj.code, m.awayTeamObj.name, m.awayTeamObj.flag);
      }

      const hCode = m.homeTeamObj.code;
      const aCode = m.awayTeamObj.code;

      if (m.status === "COMPLETED" && hCode && aCode) {
        const hs = parseInt(m.homeScore, 10);
        const as = parseInt(m.awayScore, 10);

        if (!isNaN(hs) && !isNaN(as)) {
          data[g][hCode].played += 1;
          data[g][aCode].played += 1;
          data[g][hCode].gf += hs;
          data[g][hCode].ga += as;
          data[g][aCode].gf += as;
          data[g][aCode].ga += hs;
          data[g][hCode].gd = data[g][hCode].gf - data[g][hCode].ga;
          data[g][aCode].gd = data[g][aCode].gf - data[g][aCode].ga;

          if (hs > as) {
            data[g][hCode].won += 1;
            data[g][hCode].pts += 3;
            data[g][aCode].lost += 1;
          } else if (hs < as) {
            data[g][aCode].won += 1;
            data[g][aCode].pts += 3;
            data[g][hCode].lost += 1;
          } else {
            data[g][hCode].drawn += 1;
            data[g][hCode].pts += 1;
            data[g][aCode].drawn += 1;
            data[g][aCode].pts += 1;
          }
        }
      }
    });

    const sorted: Record<string, TeamStanding[]> = {};
    Object.entries(data).forEach(([group, groupTeams]) => {
      sorted[group] = Object.values(groupTeams).sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.gd !== a.gd) return b.gd - a.gd;
        if (b.gf !== a.gf) return b.gf - a.gf;
        return a.name.localeCompare(b.name); // Lexicographical fallback
      });
    });

    return sorted;
  },

  initStanding(code: string, name: string, flag: string): TeamStanding {
    return {
      code,
      name,
      flag,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      pts: 0,
    };
  }
};
