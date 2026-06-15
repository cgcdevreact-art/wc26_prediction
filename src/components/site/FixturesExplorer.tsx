"use client";

import React, { useState, useMemo } from "react";
import fixturesData from "@/../public/fixtures.json";
import { Search, Calendar, MapPin, Trophy } from "lucide-react";
import { TEAM_INFO } from "@/lib/team-mapping";

const TEAM_FLAGS: Record<string, string> = {
  "Mexico": "🇲🇽",
  "Canada": "🇨🇦",
  "USA": "🇺🇸",
  "United States": "🇺🇸",
};

const GROUPS_CONFIG: Record<string, string[]> = {
  A: ["ARG", "MEX", "ALG", "UZB"],
  B: ["ESP", "SEN", "EGY", "QAT"],
  C: ["FRA", "USA", "CAN", "IRQ"],
  D: ["ENG", "URU", "NOR", "RSA"],
  E: ["POR", "JPN", "CIV", "SAU"],
  F: ["BRA", "SUI", "PAN", "JOR"],
  G: ["MAR", "IRN", "SWE", "BIH"],
  H: ["NED", "TUR", "CZE", "CPV"],
  I: ["BEL", "AUT", "PAR", "GHA"],
  J: ["GER", "ECU", "SCO", "HAI"],
  K: ["CRO", "KOR", "TUN", "CUW"],
  L: ["COL", "AUS", "COD", "NZL"],
};

const CODE_TO_TEAM: Record<string, { name: string; flag: string }> = {};
Object.entries(TEAM_INFO).forEach(([name, info]) => {
  CODE_TO_TEAM[info.code] = { name, flag: info.flag };
});

function resolveGroupSlot(part: string, groupName?: string): { name: string; flag: string } {
  if (!groupName) {
    const isPlaceholder = part.match(/^(Winner|Runner-up|3rd|Loser|[A-L]\d)/i);
    return { name: part, flag: isPlaceholder ? "🏆" : "🏳️" };
  }

  const group = groupName.toUpperCase();
  const config = GROUPS_CONFIG[group];
  if (!config) {
    const isPlaceholder = part.match(/^(Winner|Runner-up|3rd|Loser|[A-L]\d)/i);
    return { name: part, flag: isPlaceholder ? "🏆" : "🏳️" };
  }

  let tla = part;

  // Handle Group A host and slots
  if (group === "A") {
    if (part === "Mexico") tla = "MEX";
    else if (part === "A2") tla = "ARG";
    else if (part === "A3") tla = "ALG";
    else if (part === "A4") tla = "UZB";
  }
  // Handle Group B host and slots
  else if (group === "B") {
    if (part === "Canada") tla = "ESP";
    else if (part === "B2") tla = "SEN";
    else if (part === "B3") tla = "EGY";
    else if (part === "B4") tla = "QAT";
  }
  // Handle Group D host and slots
  else if (group === "D") {
    if (part === "USA") tla = "ENG";
    else if (part === "D2") tla = "URU";
    else if (part === "D3") tla = "NOR";
    else if (part === "D4") tla = "RSA";
  }
  // Standard slots for any other group (C, E, F, G, H, I, J, K, L)
  else {
    const match = part.match(/^[A-L]([1-4])$/);
    if (match) {
      const index = parseInt(match[1]) - 1;
      if (index >= 0 && index < config.length) {
        tla = config[index];
      }
    }
  }

  const team = CODE_TO_TEAM[tla];
  if (team) {
    return team;
  }

  // If it is a placeholder
  const isPlaceholder = part.match(/^(Winner|Runner-up|3rd|Loser|[A-L]\d)/i);
  return {
    name: part,
    flag: isPlaceholder ? "🏆" : "🏳️",
  };
}

function getTeamLabel(teamStr: string, groupName?: string) {
  const parts = teamStr.split(" vs ");
  return parts.map((part) => resolveGroupSlot(part, groupName));
}

export function FixturesExplorer() {
  const [activeStage, setActiveStage] = useState<"group" | "knockout">("group");
  const [selectedGroup, setSelectedGroup] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  const groups = ["ALL", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

  // Flatten and prepare fixtures data
  const processedFixtures = useMemo(() => {
    const list: any[] = [];
    
    if (activeStage === "group") {
      fixturesData.schedule.group_stage.fixtures.forEach((f: any) => {
        list.push({
          ...f,
          stageName: "Group Stage",
          isKnockout: false,
        });
      });
    } else {
      // Round of 32
      fixturesData.schedule.round_of_32.fixtures.forEach((f: any) => {
        list.push({ ...f, stageName: "Round of 32", isKnockout: true });
      });
      // Round of 16
      fixturesData.schedule.round_of_16.fixtures.forEach((f: any) => {
        list.push({ ...f, stageName: "Round of 16", isKnockout: true });
      });
      // Quarter Finals
      fixturesData.schedule.quarter_finals.fixtures.forEach((f: any) => {
        list.push({ ...f, stageName: "Quarter-Finals", isKnockout: true });
      });
      // Semi Finals
      fixturesData.schedule.semi_finals.fixtures.forEach((f: any) => {
        list.push({ ...f, stageName: "Semi-Finals", isKnockout: true });
      });
      // Third Place
      fixturesData.schedule.third_place_playoff.fixtures.forEach((f: any) => {
        list.push({ ...f, stageName: "Third Place Playoff", isKnockout: true });
      });
      // Final
      fixturesData.schedule.final.fixtures.forEach((f: any) => {
        list.push({ ...f, stageName: "Final", isKnockout: true });
      });
    }
    return list;
  }, [activeStage]);

  // Filter fixtures
  const filteredFixtures = useMemo(() => {
    return processedFixtures.filter((f) => {
      // Group Filter
      if (activeStage === "group" && selectedGroup !== "ALL" && f.group !== selectedGroup) {
        return false;
      }
      
      // Date Filter
      if (selectedDate && f.date !== selectedDate) {
        return false;
      }

      // Search Filter (resolved teams, venue, city)
      if (search) {
        const query = search.toLowerCase();
        const resolvedTeams = getTeamLabel(f.teams, f.group);
        const teamsMatch = resolvedTeams.some(t => t.name.toLowerCase().includes(query));
        const venueMatch = f.venue.toLowerCase().includes(query);
        const cityMatch = f.city?.toLowerCase().includes(query) || false;
        if (!teamsMatch && !venueMatch && !cityMatch) {
          return false;
        }
      }
      
      return true;
    });
  }, [processedFixtures, selectedGroup, selectedDate, search, activeStage]);

  // Format Dates List for filter dropdown
  const uniqueDates = useMemo(() => {
    const dates = new Set<string>();
    processedFixtures.forEach((f) => {
      if (f.date) dates.add(f.date);
    });
    return Array.from(dates).sort();
  }, [processedFixtures]);

  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return "";
    const dateObj = new Date(dateStr);
    return dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      weekday: "short",
      timeZone: "UTC",
    });
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-neon">Tournament Schedule</div>
          <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl text-white">Matches & Fixtures</h2>
          <p className="mt-2 text-muted-foreground text-sm max-w-xl">
            Browse full schedules for all 104 matches of the FIFA World Cup 2026™. Filter by stage, date, or search by venue.
          </p>
        </div>

        {/* Stage Selector tabs */}
        <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl shrink-0">
          <button
            onClick={() => {
              setActiveStage("group");
              setSelectedGroup("ALL");
              setSelectedDate("");
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition duration-200 ${
              activeStage === "group" ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Group Stage
          </button>
          <button
            onClick={() => {
              setActiveStage("knockout");
              setSelectedDate("");
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition duration-200 ${
              activeStage === "knockout" ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Knockout Rounds
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <div className="glass-strong rounded-2xl p-4 mb-6 grid gap-4 sm:grid-cols-2 md:grid-cols-4 items-center">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground/60" />
          <input
            type="text"
            placeholder="Search teams or venues..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-white/10 bg-white/5 text-foreground placeholder-muted-foreground outline-none transition focus:border-neon focus:bg-white/10 focus:ring-1 focus:ring-neon"
          />
        </div>

        {/* Group Filter (Only on group stage) */}
        {activeStage === "group" ? (
          <div className="relative">
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-white/10 bg-[#0f172a] text-foreground outline-none transition focus:border-neon"
            >
              {groups.map((g) => (
                <option key={g} value={g} className="bg-popover">
                  {g === "ALL" ? "All Groups" : `Group ${g}`}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground/60 flex items-center gap-1.5 px-3">
            <Trophy className="h-4 w-4 text-neon" />
            <span>Knockout placement placeholders</span>
          </div>
        )}

        {/* Date Filter */}
        <div className="relative">
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-white/10 bg-[#0f172a] text-foreground outline-none transition focus:border-neon"
          >
            <option value="">All Dates</option>
            {uniqueDates.map((d) => (
              <option key={d} value={d} className="bg-popover">
                {formatDateLabel(d)}
              </option>
            ))}
          </select>
        </div>

        {/* Reset Buttons */}
        <button
          onClick={() => {
            setSearch("");
            setSelectedGroup("ALL");
            setSelectedDate("");
          }}
          className="text-xs font-semibold text-neon hover:text-neon-2 transition py-2 text-center"
        >
          Reset Filters
        </button>
      </div>

      {/* Fixtures display list / table */}
      <div className="glass overflow-x-auto rounded-2xl border border-white/10 shadow-xl max-h-[600px] overflow-y-auto scrollbar-custom">
        <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
          <thead className="sticky top-0 z-10 text-[10px] uppercase tracking-wider bg-[#090e1c] border-b border-white/10 text-muted-foreground">
            <tr>
              <th className="px-5 py-3.5 font-medium w-16 text-center">Match</th>
              <th className="px-5 py-3.5 font-medium w-36">Date</th>
              {activeStage === "group" && <th className="px-5 py-3.5 font-medium w-16 text-center">Gp</th>}
              <th className="px-5 py-3.5 font-medium text-center">Matchup</th>
              <th className="px-5 py-3.5 font-medium">Venue & City</th>
            </tr>
          </thead>
          <tbody>
            {filteredFixtures.map((f, i) => {
              const teamMatchup = getTeamLabel(f.teams, f.group);
              return (
                <tr
                  key={`${f.stageName}-${f.match_no || i}`}
                  className="border-b border-white/5 hover:bg-white/5 transition duration-200"
                >
                  <td className="px-5 py-4 text-center font-mono text-xs text-muted-foreground">
                    #{f.match_no || i + 1}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground/60" />
                      <span className="font-semibold text-foreground">{formatDateLabel(f.date)}</span>
                    </div>
                  </td>
                  {activeStage === "group" && (
                    <td className="px-5 py-4 text-center">
                      <span className="bg-white/5 border border-white/10 rounded-lg px-2 py-0.5 text-xs text-neon font-semibold">
                        {f.group}
                      </span>
                    </td>
                  )}
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-center gap-4 text-center max-w-sm mx-auto">
                      <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
                        <span className="truncate text-sm font-semibold text-foreground">{teamMatchup[0].name}</span>
                        <span className="text-xl leading-none">{teamMatchup[0].flag}</span>
                      </div>
                      <span className="text-xs uppercase font-extrabold text-muted-foreground/50 px-1.5 py-0.5 rounded bg-white/5">VS</span>
                      <div className="flex-1 flex items-center justify-start gap-2 min-w-0">
                        <span className="text-xl leading-none">{teamMatchup[1]?.flag || "🏳️"}</span>
                        <span className="truncate text-sm font-semibold text-foreground">{teamMatchup[1]?.name || "TBD"}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 max-w-xs truncate">
                    <div className="flex items-start gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground/60 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold text-foreground">{f.venue}</div>
                        {f.city && <div className="truncate text-[10px] text-muted-foreground mt-0.5">{f.city}</div>}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {filteredFixtures.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            No fixtures match the selected filters.
          </div>
        )}
      </div>
    </section>
  );
}
