"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Search, Trophy, Globe, Award, Users, ChevronLeft, ChevronRight, X, Sparkles, Shield } from "lucide-react";
import { CountryFlag } from "@/components/ui/CountryFlag";

// Static pre-cached URLs for top world clubs to load instantly and save API bandwidth
const PRE_CACHED_LOGOS: Record<string, string> = {
  "Manchester City": "https://www.thesportsdb.com/images/media/team/badge/xqyyxy1473531117.png",
  "Manchester United": "https://www.thesportsdb.com/images/media/team/badge/z3vj581628172349.png",
  "Liverpool": "https://www.thesportsdb.com/images/media/team/badge/091wxm1670932049.png",
  "Chelsea": "https://www.thesportsdb.com/images/media/team/badge/97vsn71628172081.png",
  "Arsenal": "https://www.thesportsdb.com/images/media/team/badge/uyhbfe1612467090.png",
  "Real Madrid": "https://www.thesportsdb.com/images/media/team/badge/vvvupq1437264177.png",
  "FC Barcelona": "https://www.thesportsdb.com/images/media/team/badge/0296rr1519754714.png",
  "Barcelona": "https://www.thesportsdb.com/images/media/team/badge/0296rr1519754714.png",
  "Atletico Madrid": "https://www.thesportsdb.com/images/media/team/badge/1f5m061612466986.png",
  "Bayern Munich": "https://www.thesportsdb.com/images/media/team/badge/14101a1670932170.png",
  "Borussia Dortmund": "https://www.thesportsdb.com/images/media/team/badge/vryusy1421422731.png",
  "Paris Saint-Germain": "https://www.thesportsdb.com/images/media/team/badge/7697411634567431.png",
  "Juventus": "https://www.thesportsdb.com/images/media/team/badge/d82hch1634567299.png",
  "Inter Milan": "https://www.thesportsdb.com/images/media/team/badge/l94hca1621516246.png",
  "Inter": "https://www.thesportsdb.com/images/media/team/badge/l94hca1621516246.png",
  "AC Milan": "https://www.thesportsdb.com/images/media/team/badge/578fsh1628173459.png",
  "Napoli": "https://www.thesportsdb.com/images/media/team/badge/q2t9691621516298.png",
  "Tottenham Hotspur": "https://www.thesportsdb.com/images/media/team/badge/9514f71628172153.png",
  "Tottenham": "https://www.thesportsdb.com/images/media/team/badge/9514f71628172153.png",
  "Ajax": "https://www.thesportsdb.com/images/media/team/badge/9a37e11634567086.png",
  "Boca Juniors": "https://www.thesportsdb.com/images/media/team/badge/9f4t681533036113.png",
  "River Plate": "https://www.thesportsdb.com/images/media/team/badge/2sn6p11608678854.png",
  "Flamengo": "https://www.thesportsdb.com/images/media/team/badge/uprswx1420760459.png",
  "Palmeiras": "https://www.thesportsdb.com/images/media/team/badge/b2g9p71556054178.png",
  "Al Hilal": "https://www.thesportsdb.com/images/media/team/badge/y25px01648507421.png",
  "Al Ittihad": "https://www.thesportsdb.com/images/media/team/badge/qtxvuy1420800662.png",
  "Al Nassr": "https://www.thesportsdb.com/images/media/team/badge/346e2y1572522295.png"
};

// In-memory and LocalStorage cache for resolved club logos to prevent rate limiting
const LOGO_CACHE_KEY = "wc26_club_logos_cache_v3";
const memoryCache: Record<string, string> = { ...PRE_CACHED_LOGOS };

if (typeof window !== "undefined") {
  try {
    const saved = localStorage.getItem(LOGO_CACHE_KEY);
    if (saved) {
      Object.assign(memoryCache, JSON.parse(saved));
    }
  } catch (e) {
    console.error("Failed to load logo cache:", e);
  }
}

const saveCache = () => {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOGO_CACHE_KEY, JSON.stringify(memoryCache));
    } catch (e) {
      console.error("Failed to save logo cache:", e);
    }
  }
};

// Global request queue for logo fetches to process sequentially (throttling)
interface QueueItem {
  cleanName: string;
  resolve: (url: string | null) => void;
}
const requestQueue: QueueItem[] = [];
let isProcessingQueue = false;

const processQueue = async () => {
  if (isProcessingQueue || requestQueue.length === 0) return;
  isProcessingQueue = true;

  while (requestQueue.length > 0) {
    const item = requestQueue.shift();
    if (item) {
      const { cleanName, resolve } = item;

      // Double-check cache in case it resolved while waiting in the queue
      if (memoryCache[cleanName]) {
        resolve(memoryCache[cleanName] === "FAILED" ? null : memoryCache[cleanName]);
        continue;
      }

      const fetchLogo = async (searchTerm: string): Promise<string | null> => {
        try {
          const res = await fetch(
            `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(searchTerm)}`
          );
          const data = await res.json();
          if (data.teams && data.teams.length > 0) {
            const badge = data.teams[0].strBadge || data.teams[0].strTeamBadge;
            if (badge) return badge;
          }
        } catch (e) {
          // fetch error
        }
        return null;
      };

      // Try 1: cleaned name
      let badge = await fetchLogo(cleanName);

      // Try 2: simplified name (stripping prefixes/suffixes)
      if (!badge) {
        const simplified = cleanName
          .replace(/^(FC|CF|AC|SC|AS|FK|SV|RC|UD|SSC|Cd|Club|1\.\s*FC|1\.\s*FSV|FSV)\s+/i, "")
          .replace(/\s+(FC|CF|AC|SC|AS|FK|SV|RC|UD|SSC|Club)$/i, "")
          .trim();
        
        if (simplified && simplified !== cleanName) {
          badge = await fetchLogo(simplified);
        }
      }

      if (badge) {
        memoryCache[cleanName] = badge;
        saveCache();
        resolve(badge);
      } else {
        // Cache failures to prevent spammed requests for un-resolvable small clubs
        memoryCache[cleanName] = "FAILED";
        saveCache();
        resolve(null);
      }

      // Sequential delay (150ms) to bypass rate limits and keep user interaction smooth
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  isProcessingQueue = false;
};

const queueLogoFetch = (cleanName: string): Promise<string | null> => {
  return new Promise((resolve) => {
    requestQueue.push({ cleanName, resolve });
    processQueue();
  });
};

export function ClubLogo({
  name,
  className = "h-8 w-8",
  fallbackClassName = "h-8 w-8 text-slate-400 bg-slate-50 dark:bg-white/[0.03] dark:text-slate-500",
}: {
  name: string;
  className?: string;
  fallbackClassName?: string;
}) {
  const cleanName = name.replace(/\s*\([^)]*\)\s*$/, "").trim();
  const [logoUrl, setLogoUrl] = useState<string | null>(() => {
    const cached = memoryCache[cleanName];
    return cached && cached !== "FAILED" ? cached : null;
  });
  const [failed, setFailed] = useState(() => memoryCache[cleanName] === "FAILED");

  useEffect(() => {
    if (memoryCache[cleanName]) {
      if (memoryCache[cleanName] === "FAILED") {
        setFailed(true);
        setLogoUrl(null);
      } else {
        setLogoUrl(memoryCache[cleanName]);
        setFailed(false);
      }
      return;
    }

    setFailed(false);

    let active = true;
    queueLogoFetch(cleanName).then((badge) => {
      if (!active) return;
      if (badge) {
        setLogoUrl(badge);
        setFailed(false);
      } else {
        setFailed(true);
      }
    });

    return () => {
      active = false;
    };
  }, [cleanName]);

  if (logoUrl && !failed) {
    return (
      <img
        src={logoUrl}
        alt={`${cleanName} logo`}
        className={`${className} object-contain`}
        loading="lazy"
        onError={() => {
          setFailed(true);
        }}
      />
    );
  }

  const initial = cleanName ? cleanName.charAt(0).toUpperCase() : "?";
  return (
    <div className={`flex items-center justify-center rounded-full border border-slate-200 dark:border-white/10 ${fallbackClassName} font-bold text-xs uppercase tracking-wider relative overflow-hidden`}>
      <Shield className="h-full w-full opacity-[0.08] absolute p-1 text-slate-400 dark:text-slate-500" />
      <span className="relative z-10">{initial}</span>
    </div>
  );
}

interface Player {
  Team: string;
  "Team Code": string;
  "Player Name": string;
  Position: string;
  PositionCode?: string;
  "Position Code"?: string;
  Club: string;
  "Club Association": string;
  "Overall Rating": string;
  "Rating Tier": string;
  Age?: string;
  "Age on 2026-06-11"?: string;
}

interface ClubsClientProps {
  players: Player[];
  flagMap: Record<string, string>;
}

export default function ClubsClient({ players, flagMap }: ClubsClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAssociation, setSelectedAssociation] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"count" | "rating" | "name">("count");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedClubName, setSelectedClubName] = useState<string | null>(null);
  
  const itemsPerPage = 15;

  // Process players data to group by club
  const clubs = useMemo(() => {
    const clubMap: Record<string, {
      name: string;
      association: string;
      players: Player[];
      ratingSum: number;
      representedTeams: Set<string>;
      teamCodes: Set<string>;
    }> = {};

    players.forEach((player) => {
      const clubRaw = player.Club;
      if (!clubRaw || clubRaw.trim() === "") return;
      const clubName = clubRaw.trim();

      // Fallback for association if empty: extract from e.g. "FC Stade Nyonnais (SUI)"
      let association = player["Club Association"] || "";
      if (!association || association.trim() === "") {
        const match = clubName.match(/\(([^)]+)\)$/);
        if (match) {
          association = match[1];
        }
      }

      if (!clubMap[clubName]) {
        clubMap[clubName] = {
          name: clubName,
          association: association,
          players: [],
          ratingSum: 0,
          representedTeams: new Set<string>(),
          teamCodes: new Set<string>(),
        };
      }

      clubMap[clubName].players.push(player);
      
      // Parse rating
      const ratingVal = parseInt((player["Overall Rating"] || "60").replace("%", ""), 10) || 60;
      clubMap[clubName].ratingSum += ratingVal;

      if (player.Team) {
        clubMap[clubName].representedTeams.add(player.Team);
      }
      if (player["Team Code"]) {
        clubMap[clubName].teamCodes.add(player["Team Code"]);
      }
    });

    return Object.values(clubMap).map((c) => {
      const avgRating = Math.round(c.ratingSum / c.players.length);
      
      // Clean name: e.g. "Real Madrid (ESP)" -> "Real Madrid"
      const displayName = c.name.replace(/\s*\([^)]*\)\s*$/, "");

      // Average Age
      const ages = c.players
        .map(p => parseFloat(p["Age on 2026-06-11"] || "") || parseFloat(p.Age || "") || 0)
        .filter(Boolean);
      const avgAge = ages.length ? Math.round((ages.reduce((sum, val) => sum + val, 0) / ages.length) * 10) / 10 : 0;

      // Average Height
      const heights = c.players
        .map(p => parseInt(p["Height (cm)"] || "", 10) || 0)
        .filter(Boolean);
      const avgHeight = heights.length ? Math.round(heights.reduce((sum, val) => sum + val, 0) / heights.length) : 0;

      return {
        fullName: c.name,
        displayName,
        association: c.association,
        playersCount: c.players.length,
        avgRating,
        avgAge,
        avgHeight,
        representedTeams: Array.from(c.representedTeams).sort(),
        teamCodes: Array.from(c.teamCodes).sort(),
        players: c.players.sort((a, b) => {
          const rA = parseInt((a["Overall Rating"] || "0").replace("%", ""), 10) || 0;
          const rB = parseInt((b["Overall Rating"] || "0").replace("%", ""), 10) || 0;
          return rB - rA; // Sort players by rating descending
        })
      };
    });
  }, [players]);

  // Extract unique associations for the filter dropdown
  const uniqueAssociations = useMemo(() => {
    const list = clubs
      .map((c) => c.association)
      .filter((a): a is string => Boolean(a) && a.trim() !== "");
    return Array.from(new Set(list)).sort();
  }, [clubs]);

  // Filter and sort clubs
  const filteredAndSortedClubs = useMemo(() => {
    let result = clubs.filter((club) => {
      const matchesSearch = 
        club.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        club.fullName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesAssoc = 
        selectedAssociation === "ALL" || 
        club.association === selectedAssociation;

      return matchesSearch && matchesAssoc;
    });

    // Apply sorting
    result.sort((a, b) => {
      if (sortBy === "count") {
        if (b.playersCount !== a.playersCount) {
          return b.playersCount - a.playersCount;
        }
        return b.avgRating - a.avgRating; // tie-breaker
      }
      if (sortBy === "rating") {
        if (b.avgRating !== a.avgRating) {
          return b.avgRating - a.avgRating;
        }
        return b.playersCount - a.playersCount; // tie-breaker
      }
      return a.displayName.localeCompare(b.displayName);
    });

    return result;
  }, [clubs, searchQuery, selectedAssociation, sortBy]);

  // Calculate current page items
  const totalClubs = filteredAndSortedClubs.length;
  const totalPages = Math.max(1, Math.ceil(totalClubs / itemsPerPage));
  
  // Adjust page if it exceeds total pages
  const activePage = currentPage > totalPages ? totalPages : currentPage;
  
  const paginatedClubs = useMemo(() => {
    const startIndex = (activePage - 1) * itemsPerPage;
    return filteredAndSortedClubs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedClubs, activePage, itemsPerPage]);

  // Find the selected club details
  const selectedClub = useMemo(() => {
    if (!selectedClubName) return null;
    return clubs.find(c => c.fullName === selectedClubName) || null;
  }, [clubs, selectedClubName]);

  // Reset pagination when filter or search changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleAssociationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedAssociation(e.target.value);
    setCurrentPage(1);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value as any);
    setCurrentPage(1);
  };

  // Get Position Badge Style
  const getPositionBadge = (posCode?: string) => {
    const code = posCode?.toUpperCase() || "";
    if (code === "GK") return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/30";
    if (["DF", "CB", "LB", "RB", "LWB", "RWB"].includes(code)) return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/30";
    if (["MF", "CM", "DM", "AM", "LM", "RM"].includes(code)) return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/30";
    return "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/30";
  };

  // Get Rating Tier Badge Style
  const getRatingBadge = (tier?: string) => {
    const t = tier || "Good";
    if (t === "Elite") return "bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold px-2 py-0.5 rounded-full border-none shadow-[0_2px_8px_rgba(99,102,241,0.2)]";
    if (t === "Very Strong") return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/30";
    if (t === "Strong") return "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900/30";
    return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-white/[0.04] dark:text-slate-300 dark:border-white/5";
  };

  return (
    <div className="space-y-6">
      {/* Search & Filters Section */}
      <div className="grid gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-[0_20px_50px_rgba(15,23,42,0.08)] md:grid-cols-3 dark:border-white/10 dark:bg-slate-950">
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search clubs..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-foreground shadow-sm placeholder:text-muted-foreground outline-none transition focus:border-cyan-500 dark:border-white/10 dark:bg-white/[0.04] dark:focus:border-cyan-400"
          />
        </div>

        <div>
          <select
            value={selectedAssociation}
            onChange={handleAssociationChange}
            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-foreground shadow-sm outline-none transition focus:border-cyan-500 dark:border-white/10 dark:bg-white/[0.04] dark:focus:border-cyan-400"
          >
            <option value="ALL">All Associations</option>
            {uniqueAssociations.map((assoc) => (
              <option key={assoc} value={assoc}>
                {assoc}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={sortBy}
            onChange={handleSortChange}
            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-foreground shadow-sm outline-none transition focus:border-cyan-500 dark:border-white/10 dark:bg-white/[0.04] dark:focus:border-cyan-400"
          >
            <option value="count">Most Players (Default)</option>
            <option value="rating">Highest Avg Rating</option>
            <option value="name">Club Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Main Content Layout - Split Screen on Desktop when a club is selected */}
      <div className={`grid grid-cols-1 gap-6 transition-all duration-500 ${selectedClub ? "lg:grid-cols-3" : "grid-cols-1"}`}>
        {/* Club Rankings Table */}
        <div className={`${selectedClub ? "lg:col-span-2" : "w-full"}`}>
          <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-950">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-cyan-50/40 text-[10px] sm:text-xs font-bold uppercase tracking-[0.12em] text-slate-700 dark:border-white/10 dark:bg-[linear-gradient(90deg,rgba(255,255,255,0.04),rgba(6,182,212,0.05),rgba(255,255,255,0.04))] dark:text-slate-200">
                  <tr>
                    <th className="px-4 py-4 text-center w-16">Rank</th>
                    <th className="px-4 py-4">Club</th>
                    <th className="px-4 py-4 text-center w-28">Players</th>
                    <th className="px-4 py-4 text-center w-28">Avg Rating</th>
                    <th className="px-6 py-4 hidden sm:table-cell">National Teams</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {paginatedClubs.map((club, idx) => {
                    const globalIdx = (activePage - 1) * itemsPerPage + idx + 1;
                    const isSelected = selectedClubName === club.fullName;

                    return (
                      <tr
                        key={club.fullName}
                        onClick={() => setSelectedClubName(isSelected ? null : club.fullName)}
                        className={`group cursor-pointer transition-all duration-200 hover:bg-slate-50 dark:hover:bg-white/[0.02] ${
                          isSelected ? "bg-cyan-50/30 dark:bg-cyan-950/20" : ""
                        }`}
                      >
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ring-1 ${
                            globalIdx === 1 
                              ? "bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900/30"
                              : globalIdx === 2
                              ? "bg-slate-200 text-slate-800 ring-slate-350 dark:bg-slate-800/80 dark:text-slate-200 dark:ring-slate-700/50"
                              : globalIdx === 3
                              ? "bg-amber-700/10 text-amber-900 ring-amber-700/20 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-900/10"
                              : "text-slate-500 ring-slate-200/50 dark:text-slate-400 dark:ring-white/5"
                          }`}>
                            {globalIdx}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-semibold text-slate-950 dark:text-white">
                          <div className="flex items-center gap-3">
                            <ClubLogo
                              name={club.fullName}
                              className="h-10 w-10 flex-shrink-0 object-contain"
                              fallbackClassName="h-10 w-10 text-slate-400 bg-slate-50 dark:bg-white/[0.03] dark:text-slate-500"
                            />
                            <div className="flex flex-col">
                              <span className="group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors font-semibold text-sm sm:text-base">
                                {club.displayName}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <CountryFlag
                                  code={club.association}
                                  name={club.association}
                                  className="h-3 w-4.5 rounded-[1px] object-cover shadow-sm border border-slate-200/20 dark:border-white/5"
                                />
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                                  {club.association || "Unknown"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex min-w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-white/[0.05] px-3 py-1 font-mono text-sm font-semibold text-slate-800 dark:text-slate-200 ring-1 ring-slate-200 dark:ring-white/10 group-hover:scale-105 transition-transform duration-200">
                            {club.playersCount}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                              {club.avgRating}%
                            </span>
                            {/* Rating Progress pill */}
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.08]">
                              <div
                                className={`h-full rounded-full bg-gradient-to-r ${
                                  club.avgRating >= 80 
                                    ? "from-violet-500 to-indigo-500" 
                                    : club.avgRating >= 75
                                    ? "from-emerald-500 to-teal-500"
                                    : "from-cyan-500 to-blue-500"
                                }`}
                                style={{ width: `${club.avgRating}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 hidden sm:table-cell">
                          <div className="flex flex-wrap items-center gap-1.5 max-w-[240px]">
                            {club.teamCodes.slice(0, 5).map((code) => (
                              <CountryFlag
                                key={code}
                                code={code}
                                name={code}
                                className="h-4 w-6 object-cover shadow-sm transition-transform duration-200 hover:-translate-y-0.5"
                              />
                            ))}
                            {club.teamCodes.length > 5 && (
                              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-white/[0.02] px-1.5 py-0.5 rounded border border-slate-200/50 dark:border-white/5">
                                +{club.teamCodes.length - 5}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {totalClubs === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Trophy className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                          <p className="text-sm font-medium">No clubs match your filters</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-white/10">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Showing <span className="font-bold text-slate-800 dark:text-slate-200">{(activePage - 1) * itemsPerPage + 1}</span> to{" "}
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {Math.min(activePage * itemsPerPage, totalClubs)}
                  </span>{" "}
                  of <span className="font-bold text-slate-800 dark:text-slate-200">{totalClubs}</span> clubs
                </span>

                <div className="flex items-center gap-2">
                  <button
                    disabled={activePage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-300 dark:hover:bg-white/[0.08]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  
                  <div className="flex h-9 items-center px-3 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-white/[0.04] rounded-lg">
                    {activePage} / {totalPages}
                  </div>

                  <button
                    disabled={activePage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-300 dark:hover:bg-white/[0.08]"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Club Squad Detail Panel */}
        {selectedClub && (
          <div className="lg:col-span-1 animate-in slide-in-from-right duration-300">
            <div className="sticky top-6 flex flex-col rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-950 overflow-hidden max-h-[calc(100vh-140px)]">
              {/* Detail Header */}
              <div className="relative p-6 border-b border-slate-100 dark:border-white/[0.04] bg-gradient-to-br from-slate-50/50 via-white to-cyan-50/10 dark:from-slate-900/50 dark:via-slate-950 dark:to-cyan-950/10">
                <button
                  onClick={() => setSelectedClubName(null)}
                  className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="flex items-center gap-4 pr-6">
                  <ClubLogo
                    name={selectedClub.fullName}
                    className="h-14 w-14 object-contain"
                    fallbackClassName="h-14 w-14 text-slate-400 bg-slate-50 dark:bg-white/[0.03] dark:text-slate-500 text-lg font-bold"
                  />
                  <div>
                    <h3 className="font-display text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                      {selectedClub.displayName}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <CountryFlag
                        code={selectedClub.association}
                        name={selectedClub.association}
                        className="h-3.5 w-5 rounded-sm object-cover border border-slate-200/40 dark:border-white/5"
                      />
                      <p className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                        {selectedClub.association || "Unknown association"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stats Panel Grid */}
                <div className="grid grid-cols-3 gap-2 mt-6">
                  <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-white/[0.02] text-center shadow-sm">
                    <Users className="h-4 w-4 text-indigo-500 mb-1" />
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Players</span>
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-white mt-0.5">{selectedClub.playersCount}</span>
                  </div>

                  <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-white/[0.02] text-center shadow-sm">
                    <Award className="h-4 w-4 text-emerald-500 mb-1" />
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Avg OVR</span>
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-white mt-0.5">{selectedClub.avgRating}%</span>
                  </div>

                  <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-white/[0.02] text-center shadow-sm">
                    <Globe className="h-4 w-4 text-cyan-500 mb-1" />
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Countries</span>
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-white mt-0.5">{selectedClub.representedTeams.length}</span>
                  </div>
                </div>

                {/* Additional Stats Row */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {selectedClub.avgAge > 0 && (
                    <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/30 dark:bg-slate-900/30 border border-slate-200/40 dark:border-white/[0.01] shadow-sm">
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Avg Age</span>
                      <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">{selectedClub.avgAge} yrs</span>
                    </div>
                  )}
                  {selectedClub.avgHeight > 0 && (
                    <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/30 dark:bg-slate-900/30 border border-slate-200/40 dark:border-white/[0.01] shadow-sm">
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Avg Height</span>
                      <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">{selectedClub.avgHeight} cm</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Squad List Section */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-500" />
                  Squad in World Cup
                </div>

                <div className="space-y-3">
                  {selectedClub.players.map((player, idx) => {
                    const posCode = player["Position Code"] || player.PositionCode || player.Position?.slice(0,2);
                    const ratingStr = parseInt((player["Overall Rating"] || "0").replace("%", ""), 10) || 60;
                    
                    return (
                      <div 
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50/30 hover:border-slate-200/60 dark:border-white/5 dark:bg-white/[0.01] dark:hover:border-white/10 transition-all duration-200 shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          {/* Position Badge */}
                          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-black ${getPositionBadge(posCode)}`}>
                            {posCode}
                          </span>

                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              {player["Squad No."] && (
                                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 font-mono">
                                  #{player["Squad No."]}
                                </span>
                              )}
                              <span className="font-semibold text-sm text-slate-900 dark:text-white">
                                {player["Player Name"]}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                              {/* National Team */}
                              <div className="flex items-center gap-1">
                                <CountryFlag
                                  code={player["Team Code"]}
                                  name={player.Team}
                                  className="h-3 w-4.5 rounded-sm object-cover"
                                />
                                <span className="text-[10px] text-muted-foreground font-medium">
                                  {player.Team}
                                </span>
                              </div>
                              {/* Age & Height */}
                              {(player["Age on 2026-06-11"] || player["Height (cm)"]) && (
                                <span className="text-[10px] text-slate-450 dark:text-slate-550 font-medium">
                                  • {player["Age on 2026-06-11"] ? `${Math.floor(parseFloat(player["Age on 2026-06-11"]))}y` : ""}
                                  {player["Height (cm)"] ? ` ${player["Height (cm)"]}cm` : ""}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Player Rating Badge */}
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                            {ratingStr}%
                          </span>
                          <span className={`text-[8px] font-black uppercase tracking-wider ${getRatingBadge(player["Rating Tier"])}`}>
                            {player["Rating Tier"] || "Good"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
