import { FixtureView } from "./fixturesService";

export interface BracketRound {
  name: string;
  key: string;
  matches: FixtureView[];
}

export const tournamentService = {
  // Groups knockout fixtures by stage in hierarchical order
  getKnockoutRounds(fixtures: FixtureView[]): BracketRound[] {
    const knockouts = fixtures.filter((f) => f.isKnockout);

    const roundKeys = [
      { key: "r32", label: "Round of 32", pattern: /32/i },
      { key: "r16", label: "Round of 16", pattern: /16/i },
      { key: "qf", label: "Quarter-Finals", pattern: /quarter/i },
      { key: "sf", label: "Semi-Finals", pattern: /semi/i },
      { key: "final", label: "Final", pattern: /^final$/i }
    ];

    const roundsMap: Record<string, FixtureView[]> = {
      r32: [],
      r16: [],
      qf: [],
      sf: [],
      final: []
    };

    knockouts.forEach((m) => {
      const stage = m.stageName || "";
      const matchedRound = roundKeys.find((r) => r.pattern.test(stage) || stage.toLowerCase().includes(r.label.toLowerCase()));
      if (matchedRound) {
        roundsMap[matchedRound.key].push(m);
      }
    });

    // Sort matches in each round by match number to ensure proper pairing
    const result: BracketRound[] = [];
    roundKeys.forEach((r) => {
      const matches = roundsMap[r.key].sort((a, b) => a.match_no - b.match_no);
      if (matches.length > 0) {
        result.push({
          name: r.label,
          key: r.key,
          matches
        });
      }
    });

    return result;
  },

  // Calculate paths for each team in the tournament dynamically based on results
  getTeamQualifications(fixtures: FixtureView[]): Record<string, string[]> {
    const qualifications: Record<string, string[]> = {};

    fixtures.forEach((f) => {
      if (f.status === "COMPLETED") {
        const hs = parseInt(f.homeScore, 10);
        const as = parseInt(f.awayScore, 10);
        if (!isNaN(hs) && !isNaN(as)) {
          const winner = hs > as ? f.homeTeamObj.code : f.awayTeamObj.code;
          const stage = f.stageName;

          if (winner) {
            if (!qualifications[winner]) {
              qualifications[winner] = [];
            }
            if (!qualifications[winner].includes(stage)) {
              qualifications[winner].push(stage);
            }
          }
        }
      }
    });

    return qualifications;
  }
};
