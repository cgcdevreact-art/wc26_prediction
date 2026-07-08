export interface VotePayload {
  marketMatchId?: string;
  matchId?: number;
  teamId?: number;
  vote?: "HOME" | "AWAY" | string;
}

export interface VotePercentResponse {
  homeProb: number;
  awayProb: number;
  totalVotes: number;
}

export interface TournamentWinnerResponse {
  teams: Array<{
    name: string;
    code: string;
    flag: string;
    prob: number;
    color: string;
    exactProbability: number;
  }>;
  allTeams?: Array<{
    name: string;
    code: string;
    flag: string;
    prob: number;
    color: string;
    exactProbability: number;
  }>;
  chartData: any[];
  totalVotes: number;
  userSelection?: string | null;
}

export const votingService = {
  // Cast vote for a match winner (HOME/AWAY)
  async castMatchVote(marketMatchId: string, vote: "HOME" | "AWAY"): Promise<boolean> {
    const res = await fetch("/api/markets/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marketMatchId, vote })
    });
    return res.ok;
  },

  // Cast vote for team qualification
  async castQualificationVote(matchId: number, teamId: number): Promise<boolean> {
    const res = await fetch("/api/votes/qualification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, teamId })
    });
    return res.ok;
  },

  // Cast vote for tournament champion winner
  async castWinnerVote(teamId: number): Promise<boolean> {
    const res = await fetch("/api/votes/winner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId })
    });
    return res.ok;
  },

  // Fetch the dynamic overall tournament winner polls
  async fetchTournamentWinnerVotes(): Promise<TournamentWinnerResponse> {
    const res = await fetch("/api/votes/winner");
    if (!res.ok) {
      throw new Error("Failed to fetch tournament winner votes");
    }
    return res.json();
  },

  // Fetch qualification votes for a match
  async fetchQualificationVotes(matchId: number): Promise<Record<string, number>> {
    const res = await fetch(`/api/votes/qualification?matchId=${matchId}`);
    if (!res.ok) {
      throw new Error("Failed to fetch qualification votes");
    }
    return res.json();
  }
};
