"use client";

import React, { createContext, useContext } from "react";

export interface Team {
  code: string;
  name: string;
  flag: string;
  confederation: "UEFA" | "CONMEBOL" | "CONCACAF" | "AFC" | "CAF" | "OFC";
  rank: number;
  elo: number;
  power: number;
  attack: number;
  defense: number;
  squadValueM: number;
  avgAge: number;
  goalsPerMatch: number;
  prob: {
    qualify: number;
    r32: number;
    r16: number;
    qf: number;
    sf: number;
    final: number;
    champion: number;
  };
}

interface TeamsContextType {
  teams: Team[];
  groupsConfig: Record<string, string[]>;
  results: Record<string, { homeGoals: number; awayGoals: number }>;
}

const TeamsContext = createContext<TeamsContextType | undefined>(undefined);

export function TeamsProvider({
  children,
  teams,
  groupsConfig,
  results,
}: {
  children: React.ReactNode;
  teams: Team[];
  groupsConfig: Record<string, string[]>;
  results: Record<string, { homeGoals: number; awayGoals: number }>;
}) {
  return (
    <TeamsContext.Provider value={{ teams, groupsConfig, results }}>
      {children}
    </TeamsContext.Provider>
  );
}

export function useTeams() {
  const context = useContext(TeamsContext);
  if (context === undefined) {
    throw new Error("useTeams must be used within a TeamsProvider");
  }
  return context.teams;
}

export function useGroupsConfig() {
  const context = useContext(TeamsContext);
  if (context === undefined) {
    throw new Error("useGroupsConfig must be used within a TeamsProvider");
  }
  return context.groupsConfig;
}

export function useCupResults() {
  const context = useContext(TeamsContext);
  if (context === undefined) {
    throw new Error("useCupResults must be used within a TeamsProvider");
  }
  return context.results;
}
