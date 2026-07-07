import { create } from "zustand";
import { tournamentService, BracketRound } from "@/services/tournamentService";
import { standingsService, TeamStanding } from "@/services/standingsService";
import { FixtureView } from "@/services/fixturesService";

interface TournamentState {
  rounds: BracketRound[];
  standings: Record<string, TeamStanding[]>;
  qualifications: Record<string, string[]>;
  
  // Actions
  updateTournamentData: (fixtures: FixtureView[]) => void;
}

export const useTournamentStore = create<TournamentState>((set) => ({
  rounds: [],
  standings: {},
  qualifications: {},

  updateTournamentData: (fixtures) => {
    if (!fixtures || fixtures.length === 0) return;
    const rounds = tournamentService.getKnockoutRounds(fixtures);
    const standings = standingsService.calculateGroupStandings(fixtures);
    const qualifications = tournamentService.getTeamQualifications(fixtures);
    
    set({ rounds, standings, qualifications });
  }
}));
