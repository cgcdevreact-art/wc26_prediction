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

function getMatchScore(matchNo: number, homeName: string, awayName: string) {
  // Deterministic scores based on match number and team names
  const hash = (matchNo * 31 + (homeName?.charCodeAt(0) || 0) + (awayName?.charCodeAt(0) || 0)) % 100;
  const homeGoals = hash % 3; // 0, 1, 2
  const awayGoals = (hash + 5) % 3; // 0, 1, 2
  return { homeGoals, awayGoals };
}

function getLiveMinutes(matchNo: number) {
  // Deterministic live minutes for the 4 matches on June 15, 2026
  const minutes = [78, 44, 61, 19];
  return minutes[matchNo % minutes.length];
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
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedLocation, setSelectedLocation] = useState<string>("");

  const groups = ["ALL", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

  // Flatten and prepare fixtures data
  const processedFixtures = useMemo(() => {
    const list: any[] = [];
    const today = "2026-06-15"; // active tournament date context

    const getStatus = (dateStr: string) => {
      if (!dateStr) return "UPCOMING";
      if (dateStr === today) return "LIVE";
      if (dateStr < today) return "COMPLETED";
      return "UPCOMING";
    };
    
    if (activeStage === "group") {
      fixturesData.schedule.group_stage.fixtures.forEach((f: any) => {
        list.push({
          ...f,
          stageName: "Group Stage",
          isKnockout: false,
          status: getStatus(f.date),
        });
      });
    } else {
      // Round of 32
      fixturesData.schedule.round_of_32.fixtures.forEach((f: any) => {
        list.push({ ...f, stageName: "Round of 32", isKnockout: true, status: getStatus(f.date) });
      });
      // Round of 16
      fixturesData.schedule.round_of_16.fixtures.forEach((f: any) => {
        list.push({ ...f, stageName: "Round of 16", isKnockout: true, status: getStatus(f.date) });
      });
      // Quarter Finals
      fixturesData.schedule.quarter_finals.fixtures.forEach((f: any) => {
        list.push({ ...f, stageName: "Quarter-Finals", isKnockout: true, status: getStatus(f.date) });
      });
      // Semi Finals
      fixturesData.schedule.semi_finals.fixtures.forEach((f: any) => {
        list.push({ ...f, stageName: "Semi-Finals", isKnockout: true, status: getStatus(f.date) });
      });
      // Third Place
      fixturesData.schedule.third_place_playoff.fixtures.forEach((f: any) => {
        list.push({ ...f, stageName: "Third Place Playoff", isKnockout: true, status: getStatus(f.date) });
      });
      // Final
      fixturesData.schedule.final.fixtures.forEach((f: any) => {
        list.push({ ...f, stageName: "Final", isKnockout: true, status: getStatus(f.date) });
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

      // Status Filter
      if (selectedStatus !== "ALL" && f.status !== selectedStatus) {
        return false;
      }

      // Location Filter
      if (selectedLocation && f.city !== selectedLocation) {
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
  }, [processedFixtures, selectedGroup, selectedDate, selectedStatus, selectedLocation, search, activeStage]);

  // Format Dates List for filter dropdown
  const uniqueDates = useMemo(() => {
    const dates = new Set<string>();
    processedFixtures.forEach((f) => {
      if (f.date) dates.add(f.date);
    });
    return Array.from(dates).sort();
  }, [processedFixtures]);

  // Format Cities List for filter dropdown
  const uniqueLocations = useMemo(() => {
    const locations = new Set<string>();
    processedFixtures.forEach((f) => {
      if (f.city) locations.add(f.city);
    });
    return Array.from(locations).sort();
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

  const handleReset = () => {
    setSearch("");
    setSelectedGroup("ALL");
    setSelectedDate("");
    setSelectedStatus("ALL");
    setSelectedLocation("");
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
              setSelectedStatus("ALL");
              setSelectedLocation("");
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
              setSelectedStatus("ALL");
              setSelectedLocation("");
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
      <div className="glass-strong rounded-2xl p-4 mb-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 items-center">
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

        {/* Status Filter */}
        <div className="relative">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-white/10 bg-[#0f172a] text-foreground outline-none transition focus:border-neon"
          >
            <option value="ALL" className="bg-popover">All Statuses</option>
            <option value="LIVE" className="bg-popover">Live Now</option>
            <option value="COMPLETED" className="bg-popover">Completed</option>
            <option value="UPCOMING" className="bg-popover">Upcoming</option>
          </select>
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
            <span>Knockout placeholders</span>
          </div>
        )}

        {/* Location Filter */}
        <div className="relative">
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-white/10 bg-[#0f172a] text-foreground outline-none transition focus:border-neon"
          >
            <option value="" className="bg-popover">All Locations</option>
            {uniqueLocations.map((loc) => (
              <option key={loc} value={loc} className="bg-popover">
                {loc}
              </option>
            ))}
          </select>
        </div>

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
          onClick={handleReset}
          className="text-xs font-semibold text-neon hover:text-neon-2 transition py-2 text-center cursor-pointer"
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
              const isLive = f.status === "LIVE";
              const score = getMatchScore(f.match_no, teamMatchup[0].name, teamMatchup[1]?.name || "");

              return (
                <tr
                  key={`${f.stageName}-${f.match_no || i}`}
                  className={`border-b border-white/5 hover:bg-white/5 transition duration-200 ${
                    isLive ? "bg-red-500/[0.02] border-l-2 border-l-red-500" : ""
                  }`}
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
                      
                      {/* Score / Status Display */}
                      {isLive ? (
                        <div className="flex flex-col items-center shrink-0 min-w-[80px]">
                          <span className="text-sm font-black font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)] animate-pulse">
                            {score.homeGoals} - {score.awayGoals}
                          </span>
                          <span className="text-[9px] uppercase tracking-wider font-extrabold text-red-500 mt-1 flex items-center gap-1">
                            <span className="h-1 w-1 rounded-full bg-red-500 animate-ping" />
                            LIVE {getLiveMinutes(f.match_no)}'
                          </span>
                        </div>
                      ) : f.status === "COMPLETED" ? (
                        <div className="flex flex-col items-center shrink-0 min-w-[80px]">
                          <span className="text-sm font-mono font-bold px-2 py-0.5 rounded bg-white/5 border border-white/10 text-muted-foreground">
                            {score.homeGoals} - {score.awayGoals}
                          </span>
                          <span className="text-[8px] uppercase font-bold text-muted-foreground/60 mt-1">FT</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center shrink-0 min-w-[80px]">
                          <span className="text-xs uppercase font-extrabold text-muted-foreground/50 px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
                            VS
                          </span>
                          <span className="text-[8px] uppercase font-bold text-muted-foreground/40 mt-1">Upcoming</span>
                        </div>
                      )}

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
