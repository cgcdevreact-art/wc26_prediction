"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Search, Calendar, MapPin } from "lucide-react";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { EmptyFixturesState } from "./EmptyFixturesState";

const isNumericString = (val: any) => /^\d+$/.test(String(val));

export function FixturesExplorer() {
  const [activeStage, setActiveStage]           = useState<"group" | "knockout">("knockout");
  const [selectedGroup, setSelectedGroup]       = useState<string>("ALL");
  const [search, setSearch]                     = useState("");
  const [selectedDate, setSelectedDate]         = useState("");
  const [selectedStatus, setSelectedStatus]     = useState<string>("ALL");
  const [selectedLocation, setSelectedLocation] = useState<string>("");

  const [fixtures, setFixtures] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [now, setNow]           = useState(() => Date.now());

  const groups = ["ALL", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

  // Fetch matches, teams, and stadiums from local proxy API
  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch("/api/fixtures");
        if (!res.ok) {
          throw new Error(`Failed to fetch fixtures: ${res.status}`);
        }
        const data = await res.json();
        if (!active) return;

        if (data.success && Array.isArray(data.fixtures)) {
          setFixtures(data.fixtures);
        } else {
          throw new Error(data.error || "Invalid response format from API");
        }
        setLoading(false);
      } catch (err: any) {
        console.error("Error fetching live matches:", err);
        if (active) {
          setError(err.message || "Failed to load live fixtures");
          setLoading(false);
        }
      }
    };

    fetchData();

    // Auto-refresh every 2 minutes
    const interval = setInterval(fetchData, 120000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Flatten and prepare fixtures data (filter by stage)
  const processedFixtures = useMemo(() => {
    return fixtures.filter(f => f.isKnockout === (activeStage === "knockout"));
  }, [fixtures, activeStage]);

  // Filter fixtures based on selected dropdown options and search query
  const filteredFixtures = useMemo(() => {
    const nextFixtures = processedFixtures.filter((f) => {
      // Group Filter
      if (activeStage === "group" && selectedGroup !== "ALL" && f.group !== selectedGroup) {
        return false;
      }

      // Date Filter
      if (selectedDate && f.date !== selectedDate) {
        return false;
      }

      // Status Filter
      // By default ("ALL"), hide completed matches — only show them when explicitly selected
      if (selectedStatus === "ALL" && f.status === "COMPLETED") {
        return false;
      }
      if (selectedStatus !== "ALL" && f.status !== selectedStatus) {
        return false;
      }

      // Location Filter
      if (selectedLocation && f.city !== selectedLocation) {
        return false;
      }

      // Search Filter (home team, away team, venue, city)
      if (search) {
        const query = search.toLowerCase();
        const teamsMatch =
          f.homeTeamObj.name.toLowerCase().includes(query) ||
          f.awayTeamObj.name.toLowerCase().includes(query);
        const venueMatch = f.venue.toLowerCase().includes(query);
        const cityMatch = f.city?.toLowerCase().includes(query) || false;
        if (!teamsMatch && !venueMatch && !cityMatch) {
          return false;
        }
      }

      return true;
    });

    if (selectedStatus === "COMPLETED") {
      nextFixtures.sort((a, b) => {
        const matchA = Number(a.match_no || 0);
        const matchB = Number(b.match_no || 0);
        return matchB - matchA;
      });
    }

    return nextFixtures;
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

  const isTodayFixtureDate = (fixtureDate?: string) => {
    if (!fixtureDate) return false;
    const todayUtc = new Date(now).toISOString().slice(0, 10);
    return fixtureDate === todayUtc;
  };

  const formatCountdown = (kickoffAtIso?: string, status?: string, fixtureDate?: string) => {
    if (status === "COMPLETED") return "FT";
    if (status === "LIVE") return "Live now";
    if (!kickoffAtIso) return "TBD";
    if (status === "UPCOMING" && isTodayFixtureDate(fixtureDate)) return null;

    const diffMs = new Date(kickoffAtIso).getTime() - now;
    if (diffMs <= 0) return "Starting now";

    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) return `In ${days}d ${hours}h`;
    if (hours > 0) return `In ${hours}h ${minutes}m`;
    if (minutes > 0) return `In ${minutes}m ${seconds}s`;
    return `In ${seconds}s`;
  };

  const formatMatchupCountdown = (kickoffAtIso?: string, status?: string, fixtureDate?: string) => {
    if (status !== "UPCOMING" || !kickoffAtIso) return null;
    if (!isTodayFixtureDate(fixtureDate)) return null;

    const diffMs = new Date(kickoffAtIso).getTime() - now;
    if (diffMs <= 0) return "00s";

    const totalSeconds = Math.floor(diffMs / 1000);
    const days         = Math.floor(totalSeconds / 86400);
    const hours        = Math.floor((totalSeconds % 86400) / 3600);
    const minutes      = Math.floor((totalSeconds % 3600) / 60);
    const seconds      = totalSeconds % 60;

    if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  return (
    <div className="py-2">
      <div className="flex justify-between items-center mb-6">
        {/* Stage Selector tabs */}
        <div className="flex bg-muted dark:bg-white/5 border border-border dark:border-white/10 p-1 rounded-xl shrink-0">
          <button
            onClick={() => {
              setActiveStage("group");
              setSelectedGroup("ALL");
              setSelectedDate("");
              setSelectedStatus("ALL");
              setSelectedLocation("");
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition duration-200 ${activeStage === "group" ? "bg-card dark:bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"
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
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition duration-200 ${activeStage === "knockout" ? "bg-card dark:bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
          >
            Knockout Rounds
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <div
        className={`glass-strong rounded-2xl p-4 mb-6 grid gap-4 items-center ${activeStage === "group" ? "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6" : "sm:grid-cols-2 lg:grid-cols-5"
          }`}
      >
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground/60" />
          <input
            type="text"
            placeholder="Search teams or venues..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-border dark:border-white/10 bg-background dark:bg-white/5 text-foreground placeholder-muted-foreground outline-none transition focus:border-neon focus:bg-card dark:focus:bg-white/10 focus:ring-1 focus:ring-neon"
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-border dark:border-white/10 bg-background dark:bg-[#0f172a] text-foreground outline-none transition focus:border-neon"
          >
            <option value="ALL" className="bg-popover text-foreground">Live & Upcoming</option>
            <option value="LIVE" className="bg-popover text-foreground">Live Now</option>
            <option value="UPCOMING" className="bg-popover text-foreground">Upcoming</option>
            <option value="COMPLETED" className="bg-popover text-foreground">Completed</option>
          </select>
        </div>

        {/* Group Filter (Only on group stage) */}
        {activeStage === "group" ? (
          <div className="relative">
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-border dark:border-white/10 bg-background dark:bg-[#0f172a] text-foreground outline-none transition focus:border-neon"
            >
              {groups.map((g) => (
                <option key={g} value={g} className="bg-popover text-foreground">
                  {g === "ALL" ? "All Groups" : `Group ${g}`}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {/* Location Filter */}
        <div className="relative">
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-border dark:border-white/10 bg-background dark:bg-[#0f172a] text-foreground outline-none transition focus:border-neon"
          >
            <option value="" className="bg-popover text-foreground">All Locations</option>
            {uniqueLocations.map((loc) => (
              <option key={loc} value={loc} className="bg-popover text-foreground">
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
            className="w-full px-3 py-2 text-sm rounded-xl border border-border dark:border-white/10 bg-background dark:bg-[#0f172a] text-foreground outline-none transition focus:border-neon"
          >
            <option value="" className="bg-popover text-foreground">All Dates</option>
            {uniqueDates.map((d) => (
              <option key={d} value={d} className="bg-popover text-foreground">
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
      <div className="glass rounded-2xl border border-border dark:border-white/10 shadow-xl overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto overflow-x-auto scrollbar-custom">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
              <div className="h-10 w-10 border-4 border-neon border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-semibold tracking-wider uppercase text-neon animate-pulse">Loading live fixtures...</span>
            </div>
          ) : error ? (
            <div className="text-center py-20 text-red-400 border border-red-500/20 bg-red-500/5 rounded-2xl m-4">
              Could not load live fixtures: {error}
            </div>
          ) : (
            <>
              <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
                <thead className="sticky top-0 z-10 text-[10px] uppercase tracking-wider bg-muted dark:bg-[#090e1c] border-b border-border dark:border-white/10 text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3.5 font-medium w-16 text-center">Match</th>
                    <th className="px-5 py-3.5 font-medium w-48">Date & Time</th>
                    {activeStage === "group" && <th className="px-5 py-3.5 font-medium w-16 text-center">Group</th>}
                    <th className="px-5 py-3.5 font-medium text-center">Matchup</th>
                    <th className="px-5 py-3.5 font-medium">Venue & City</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFixtures.map((f, i) => {
                    const teamMatchup = [f.homeTeamObj, f.awayTeamObj];
                    const isLive = f.status === "LIVE";
                    const score = { homeGoals: f.homeScore, awayGoals: f.awayScore };
                    const dateCountdown = formatCountdown(f.kickoffAtIso, f.status, f.date);
                    const matchupCountdown = formatMatchupCountdown(f.kickoffAtIso, f.status, f.date);

                    return (
                      <tr
                        key={`${f.stageName}-${f.match_no || i}`}
                        className={`border-b border-border dark:border-white/5 hover:bg-muted/50 dark:hover:bg-white/5 transition duration-200 ${isLive ? "bg-red-500/[0.02] border-l-2 border-l-red-500" : ""
                          }`}
                      >
                        <td className="px-5 py-4 text-center font-mono text-xs text-muted-foreground">
                          #{f.match_no || i + 1}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 text-foreground">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground/60" />
                              <span className="text-sm font-bold">{formatDateLabel(f.date)}</span>
                            </div>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-xs font-medium text-muted-foreground tabular-nums">
                                {f.kickoffTime || "TBD"}
                              </span>
                              {f.timezoneLabel ? (
                                <span className="text-[10px] font-medium text-muted-foreground/70">
                                  {f.timezoneLabel}
                                </span>
                              ) : null}
                            </div>
                            {dateCountdown ? (
                              <span className="mt-1 text-[10px] font-bold text-cyan-700 dark:text-neon">
                                {dateCountdown}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        {activeStage === "group" && (
                          <td className="px-5 py-4 text-center">
                            <span className="bg-muted dark:bg-white/5 border border-border dark:border-white/10 rounded-lg px-2 py-0.5 text-xs text-neon font-semibold">
                              {f.group}
                            </span>
                          </td>
                        )}
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-center gap-4 text-center max-w-sm mx-auto">
                            <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
                              <span className="truncate text-sm font-semibold text-foreground">{teamMatchup[0].name}</span>
                              <CountryFlag
                                code={teamMatchup[0].code}
                                flag={teamMatchup[0].flag}
                                name={teamMatchup[0].name}
                                className="h-5 w-7"
                                emojiClassName="text-xl leading-none"
                              />
                            </div>

                            {/* Score / Status Display */}
                            {isLive ? (
                              <div className="flex flex-col items-center shrink-0 min-w-[80px]">
                                <span className="text-sm font-black font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                                  {score.homeGoals} - {score.awayGoals}
                                </span>
                                <span className="text-[9px] uppercase tracking-wider font-extrabold text-red-500 mt-1 flex items-center gap-1">
                                  <span className="h-1 w-1 rounded-full bg-red-500 animate-ping" />
                                  LIVE {f.time_elapsed && isNumericString(f.time_elapsed) ? `${f.time_elapsed}'` : f.time_elapsed === "LIVE" ? "NOW" : (f.time_elapsed || "")}
                                </span>
                              </div>
                            ) : f.status === "COMPLETED" ? (
                              <div className="flex flex-col items-center shrink-0 min-w-[80px]">
                                <span className="text-sm font-mono font-bold px-2 py-0.5 rounded bg-muted dark:bg-white/5 border border-border dark:border-white/10 text-muted-foreground">
                                  {score.homeGoals} - {score.awayGoals}
                                </span>
                                <span className="text-[8px] uppercase font-bold text-muted-foreground/60 mt-1">FT</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center shrink-0 min-w-[80px]">
                                <span className="text-xs uppercase font-extrabold text-muted-foreground/50 px-1.5 py-0.5 rounded bg-muted dark:bg-white/5 border border-border dark:border-white/5">
                                  VS
                                </span>
                                <span className="text-[8px] uppercase font-bold text-muted-foreground/40 mt-1">Upcoming</span>
                                {matchupCountdown ? (
                                  <span className="mt-1 whitespace-nowrap text-[10px] font-mono font-bold tabular-nums text-red-500">
                                    {matchupCountdown}
                                  </span>
                                ) : null}
                              </div>
                            )}

                            <div className="flex-1 flex items-center justify-start gap-2 min-w-0">
                              <CountryFlag
                                code={teamMatchup[1]?.code}
                                flag={teamMatchup[1]?.flag}
                                name={teamMatchup[1]?.name}
                                className="h-5 w-7"
                                emojiClassName="text-xl leading-none"
                              />
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
                  {filteredFixtures.length === 0 && (
                    <tr>
                      <td colSpan={activeStage === "group" ? 5 : 4} className="p-0">
                        <EmptyFixturesState
                          onReset={handleReset}
                          title={activeStage === "group" ? "No matches found for group stage" : undefined}
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>

      {/* <Link
        href="/predictions/country"
        className="mt-10 block overflow-hidden rounded-2xl border border-black/8 shadow-lg transition-opacity duration-300 hover:opacity-95 dark:border-white/10"
      >
        <img
          src="/banner.png"
          alt="FIFA World Cup 2026 Banner"
          className="h-auto w-full"
        />
      </Link> */}
    </div>
  );
}
