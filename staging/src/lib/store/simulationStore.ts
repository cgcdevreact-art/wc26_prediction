import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TeamStats {
  "Team": string;
  "Team Code": string;
  "Players": string;
  "Avg Overall Rating": string;
  "Elite": string;
  "Very Strong": string;
  "Week": string; // Might be a typo in JSON for 'Weak', but keeping to match JSON
  "Avg Base Quality": string;
  "Avg Recent Form": string;
  "Avg Intl Exp": string;
}

export interface PlayerStats {
  "Team": string;
  "Team Code": string;
  "Squad No.": string;
  "Position Code": string;
  "Position": string;
  "Player Name": string;
  "First Name(s)": string;
  "Last Name(s)": string;
  "Name on Shirt": string;
  "DOB": string;
  "Age on 2026-06-11": string;
  "Club": string;
  "Club Association": string;
  "Height (cm)": string;
  "Head Coach": string;
  "Coach Nationality": string;
  "Official Source URL": string;
  "Base Quality": string;
  "Recent Form": string;
  "International Experience": string;
  "Attacking Impact": string;
  "Defensive Impact": string;
  "Passing / Creativity": string;
  "Fitness / Availability": string;
  "Discipline Risk": string;
  "Match Importance": string;
  "Overall Rating": string;
  "Rating Tier": string;
  "ImageUrl"?: string; // For user-added real images
}

export type SimulationModel = "base" | "advanced" | "pro";

interface SimulationState {
  teams: Record<string, TeamStats>; // Keyed by Team Code
  players: Record<string, PlayerStats>; // Keyed by Player Name + Team Code (as an ID)
  isInitialized: boolean;
  selectedModel: SimulationModel;
  
  // Actions
  initializeData: (defaultTeams: TeamStats[], defaultPlayers: PlayerStats[]) => void;
  updateTeam: (teamCode: string, field: keyof TeamStats, value: string) => void;
  updatePlayer: (playerId: string, field: keyof PlayerStats, value: string) => void;
  resetToDefaults: () => void;
  setSelectedModel: (model: SimulationModel) => void;
}

export const useSimulationStore = create<SimulationState>()(
  persist(
    (set) => ({
      teams: {},
      players: {},
      isInitialized: false,
      selectedModel: "base",

      initializeData: (defaultTeams, defaultPlayers) => set((state) => {
        // Only initialize if it hasn't been initialized yet, or if the state is missing teams
        if (state.isInitialized && Object.keys(state.teams).length >= defaultTeams.length) return state;

        const teamsMap: Record<string, TeamStats> = {};
        defaultTeams.forEach((t) => {
          teamsMap[t['Team Code']] = t;
        });

        const playersMap: Record<string, PlayerStats> = {};
        defaultPlayers.forEach((p) => {
          const id = `${p['Team Code']}-${p['Player Name']}`;
          playersMap[id] = p;
        });

        return {
          teams: teamsMap,
          players: playersMap,
          isInitialized: true,
        };
      }),

      updateTeam: (teamCode, field, value) => set((state) => ({
        teams: {
          ...state.teams,
          [teamCode]: {
            ...state.teams[teamCode],
            [field]: value,
          }
        }
      })),

      updatePlayer: (playerId, field, value) => set((state) => ({
        players: {
          ...state.players,
          [playerId]: {
            ...state.players[playerId],
            [field]: value,
          }
        }
      })),

      resetToDefaults: () => set({ isInitialized: false }), // Will re-trigger initialization
      setSelectedModel: (model) => set({ selectedModel: model }),
    }),
    {
      name: 'fifa-simulation-storage-v2', // bumped version to force a hard reset
    }
  )
);
