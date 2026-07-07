import { create } from "zustand";
import { votingService, TournamentWinnerResponse } from "@/services/votingService";

interface VoteStats {
  homeProb: number;
  awayProb: number;
  totalVotes: number;
}

interface VotingState {
  matchStats: Record<string, VoteStats>; // Keyed by matchId or marketMatchId
  userVotes: Record<string, string>; // Keyed by matchId -> selection (e.g. "HOME", "AWAY", "teamId")
  tournamentWinnerPolls: TournamentWinnerResponse | null;
  loading: boolean;
  
  // Actions
  voteMatch: (matchId: string, selection: "HOME" | "AWAY") => Promise<void>;
  voteQualification: (matchId: number, teamId: number, teamCode: string) => Promise<void>;
  voteTournamentWinner: (teamId: number, teamCode: string) => Promise<void>;
  loadTournamentWinnerPolls: () => Promise<void>;
  initializeMatchVotes: (matches: any[]) => void;
}

export const useVotingStore = create<VotingState>((set, get) => ({
  matchStats: {},
  userVotes: {},
  tournamentWinnerPolls: null,
  loading: false,

  initializeMatchVotes: (matches) => {
    const matchStats: Record<string, VoteStats> = {};
    matches.forEach((m) => {
      matchStats[m.id] = {
        homeProb: m.homeProb ?? 50,
        awayProb: m.awayProb ?? 50,
        totalVotes: m.totalVotes ?? 0
      };
    });
    set({ matchStats });
  },

  voteMatch: async (matchId, selection) => {
    const previousStats = get().matchStats[matchId];
    const previousUserVote = get().userVotes[matchId];

    // Lock if they already voted the same way
    if (previousUserVote === selection) return;

    // Optimistic Update
    const currentStats = previousStats || { homeProb: 50, awayProb: 50, totalVotes: 0 };
    let newHomeProb = currentStats.homeProb;
    let newAwayProb = currentStats.awayProb;
    let newTotalVotes = currentStats.totalVotes;

    if (!previousUserVote) {
      newTotalVotes += 1;
      if (selection === "HOME") {
        newHomeProb = Math.round(((currentStats.homeProb * currentStats.totalVotes + 100) / newTotalVotes));
      } else {
        newAwayProb = Math.round(((currentStats.awayProb * currentStats.totalVotes + 100) / newTotalVotes));
      }
    } else {
      // Swapping vote
      if (selection === "HOME" && previousUserVote === "AWAY") {
        newHomeProb = Math.round(((currentStats.homeProb * currentStats.totalVotes + 100) / newTotalVotes));
        newAwayProb = Math.round(((currentStats.awayProb * currentStats.totalVotes - 100) / newTotalVotes));
      } else if (selection === "AWAY" && previousUserVote === "HOME") {
        newHomeProb = Math.round(((currentStats.homeProb * currentStats.totalVotes - 100) / newTotalVotes));
        newAwayProb = Math.round(((currentStats.awayProb * currentStats.totalVotes + 100) / newTotalVotes));
      }
    }

    newHomeProb = Math.max(0, Math.min(100, newHomeProb));
    newAwayProb = 100 - newHomeProb;

    set((state) => ({
      matchStats: {
        ...state.matchStats,
        [matchId]: { homeProb: newHomeProb, awayProb: newAwayProb, totalVotes: newTotalVotes }
      },
      userVotes: {
        ...state.userVotes,
        [matchId]: selection
      }
    }));

    try {
      const success = await votingService.castMatchVote(matchId, selection);
      if (!success) throw new Error("API rejection");
    } catch (err) {
      console.error("Voting failed, rolling back", err);
      // Rollback
      set((state) => ({
        matchStats: {
          ...state.matchStats,
          [matchId]: previousStats
        },
        userVotes: {
          ...state.userVotes,
          [matchId]: previousUserVote
        }
      }));
    }
  },

  voteQualification: async (matchId, teamId, teamCode) => {
    const key = `qualify-${matchId}`;
    const previousUserVote = get().userVotes[key];
    if (previousUserVote) return; // Only 1 vote allowed per user per category

    // Optimistic Update
    set((state) => ({
      userVotes: {
        ...state.userVotes,
        [key]: teamCode
      }
    }));

    try {
      const success = await votingService.castQualificationVote(matchId, teamId);
      if (!success) throw new Error("API rejection");
    } catch (err) {
      console.error("Qualification voting failed, rolling back", err);
      set((state) => ({
        userVotes: {
          ...state.userVotes,
          [key]: previousUserVote
        }
      }));
    }
  },

  voteTournamentWinner: async (teamId, teamCode) => {
    const key = "tournament-winner";
    const previousUserVote = get().userVotes[key];
    if (previousUserVote) return; // Only 1 vote allowed per user

    // Optimistic Update
    set((state) => ({
      userVotes: {
        ...state.userVotes,
        [key]: teamCode
      }
    }));

    try {
      const success = await votingService.castWinnerVote(teamId);
      if (!success) throw new Error("API rejection");
      await get().loadTournamentWinnerPolls(); // Refresh percentages
    } catch (err) {
      console.error("Tournament winner voting failed, rolling back", err);
      set((state) => ({
        userVotes: {
          ...state.userVotes,
          [key]: previousUserVote
        }
      }));
    }
  },

  loadTournamentWinnerPolls: async () => {
    try {
      const data = await votingService.fetchTournamentWinnerVotes();
      set({ tournamentWinnerPolls: data });
    } catch (err) {
      console.error("Failed to load winner polls:", err);
    }
  }
}));
