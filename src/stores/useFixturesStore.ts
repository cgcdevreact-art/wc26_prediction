import { create } from "zustand";
import { fixturesService, FixtureView } from "@/services/fixturesService";

interface FixturesState {
  fixtures: FixtureView[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  activeStage: "all" | "group" | "knockout";
  selectedStatus: "ALL" | "LIVE" | "UPCOMING" | "COMPLETED";
  selectedDate: string;
  selectedLocation: string;
  
  // Actions
  setSearchQuery: (query: string) => void;
  setActiveStage: (stage: "all" | "group" | "knockout") => void;
  setSelectedStatus: (status: "ALL" | "LIVE" | "UPCOMING" | "COMPLETED") => void;
  setSelectedDate: (date: string) => void;
  setSelectedLocation: (location: string) => void;
  loadFixtures: () => Promise<void>;
  resetFilters: () => void;
}

export const useFixturesStore = create<FixturesState>((set, get) => ({
  fixtures: [],
  loading: false,
  error: null,
  searchQuery: "",
  activeStage: "all",
  selectedStatus: "ALL",
  selectedDate: "",
  selectedLocation: "",

  setSearchQuery: (query) => set({ searchQuery: query }),
  setActiveStage: (stage) => set({ activeStage: stage }),
  setSelectedStatus: (status) => set({ selectedStatus: status }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setSelectedLocation: (location) => set({ selectedLocation: location }),

  loadFixtures: async () => {
    set({ loading: true, error: null });
    try {
      const fixtures = await fixturesService.fetchFixtures();
      set({ fixtures, loading: false });
    } catch (err: any) {
      set({ error: err.message || "Failed to fetch fixtures", loading: false });
    }
  },

  resetFilters: () => set({
    searchQuery: "",
    selectedStatus: "ALL",
    selectedDate: "",
    selectedLocation: ""
  })
}));
