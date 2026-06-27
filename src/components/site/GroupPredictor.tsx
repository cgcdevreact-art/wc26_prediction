"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTeams, useGroupsConfig, useCupResults } from "@/components/TeamsProvider";
import { Trophy, Sparkles, RefreshCw, Play, Lock, Award, Check, Zap, X, Minus, Plus, FolderOpen, Trash2, Edit2, Save, AlertCircle, Brain, Cpu } from "lucide-react";
import { useSession } from "next-auth/react";
import { StaminaBar, AlignmentGauge, TemperatureSlider } from "@/components/ui/SciFiControls";
import { useSimulationStore } from "@/lib/store/simulationStore";
import { toast } from "sonner";
import { getMatchExpectedGoals } from "@/lib/simulation/model";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { UpgradeModal } from "./UpgradeModal";
import { ScoreTrendGraph } from "./ScoreTrendGraph";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { buildAuthModalHref } from "@/lib/auth-modal";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { readPredictionPayload } from "@/lib/predictionWinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PredictorMatch {
  id: string; // group-X-index
  group: string;
  homeCode: string;
  awayCode: string;
  homeScore: number | "";
  awayScore: number | "";
}

function normalizePredictorScore(value: unknown): number | "" {
  if (value === "" || value === null || value === undefined) return "";
  if (typeof value === "string" && value.toLowerCase() === "nan") return "";
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : "";
}

function hasValidPredictorScore(value: number | ""): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function hasAssignedMatchScores(match: PredictorMatch): boolean {
  return hasValidPredictorScore(match.homeScore) && hasValidPredictorScore(match.awayScore);
}

function hasStartedLiveGame(game: any): boolean {
  const progress = String(game?.time_elapsed ?? game?.status ?? "").toLowerCase().trim();
  if (!progress) return false;
  if (progress.includes("notstarted")) return false;
  if (/^\d+$/.test(progress)) return true;

  return [
    "live",
    "finished",
    "ft",
    "fulltime",
    "halftime",
    "half-time",
    "1h",
    "2h",
    "extra",
    "pen",
    "playing",
    "inprogress",
  ].some((keyword) => progress.includes(keyword));
}

function clearPredictorMatchScores(match: PredictorMatch): PredictorMatch {
  return {
    ...match,
    homeScore: "",
    awayScore: "",
  };
}

interface TeamStanding {
  code: string;
  group: string;
  team: any;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
}

const TOTAL_TOURNAMENT_MATCHES = 104;

// Generate the 6 fixtures for a group of 4 teams
function generateGroupMatches(groupName: string, teams: string[]): PredictorMatch[] {
  const [t1, t2, t3, t4] = teams;
  return [
    { id: `${groupName}-1`, group: groupName, homeCode: t1, awayCode: t2, homeScore: "", awayScore: "" },
    { id: `${groupName}-2`, group: groupName, homeCode: t3, awayCode: t4, homeScore: "", awayScore: "" },
    { id: `${groupName}-3`, group: groupName, homeCode: t1, awayCode: t3, homeScore: "", awayScore: "" },
    { id: `${groupName}-4`, group: groupName, homeCode: t2, awayCode: t4, homeScore: "", awayScore: "" },
    { id: `${groupName}-5`, group: groupName, homeCode: t4, awayCode: t1, homeScore: "", awayScore: "" },
    { id: `${groupName}-6`, group: groupName, homeCode: t2, awayCode: t3, homeScore: "", awayScore: "" },
  ];
}

// Poisson distribution random generator for realistic score simulation
function getPoisson(lambda: number) {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

// Helper: Convert group code (e.g., A-1) to unique integer ID
function getNumericId(id: string): number {
  const [group, index] = id.split("-");
  const groupCode = group.charCodeAt(0) - 64; // A=1, B=2, ... L=12
  return groupCode * 10 + parseInt(index);
}

// Helper: Reversible conversion of 3-letter country code (e.g., ARG) to integer
function teamCodeToInt(code: string): number {
  if (code.length !== 3) return 0;
  return code.charCodeAt(0) * 10000 + code.charCodeAt(1) * 100 + code.charCodeAt(2);
}

// Helper: Reversible conversion from integer back to 3-letter country code
function intToTeamCode(val: number): string {
  if (val <= 0) return "";
  const c3 = val % 100;
  const c2 = Math.floor((val % 10000) / 100);
  const c1 = Math.floor(val / 10000);
  return String.fromCharCode(c1) + String.fromCharCode(c2) + String.fromCharCode(c3);
}

// Helper: Get group match details like date, time, match number and venue
// Accepts live games & stadiums arrays fetched from worldcup26.ir
function getGroupMatchDetails(
  group: string,
  suffix: number,
  allGames: any[],
  allStadiums: any[],
  homeCode: string,
  awayCode: string,
  teams: any[]
) {
  const groupOffset = group.charCodeAt(0) - 65; // A=0, B=1, ... L=11

  let time = "12:00 PM";
  if (suffix === 1) time = groupOffset % 2 === 0 ? "12:30 AM" : "03:30 PM";
  else if (suffix === 2) time = groupOffset % 2 === 0 ? "07:30 AM" : "08:30 PM";
  else if (suffix === 3) time = groupOffset % 2 === 0 ? "09:30 PM" : "01:30 PM";
  else if (suffix === 4) time = groupOffset % 2 === 0 ? "06:30 AM" : "05:30 PM";
  else if (suffix === 5) time = "06:30 AM";
  else if (suffix === 6) time = "06:30 AM";

  const normalizeCode = (c: string) => {
    if (!c) return "";
    const clean = c.toUpperCase().trim();
    if (clean === "KSA") return "SAU";
    return clean;
  };

  const getCode = (id: string | number, nameEn: string) => {
    // 1. Static API ID mapping (highly reliable)
    const liveTeamIdMap: Record<string, string> = {
      "1":"MEX","2":"RSA","3":"KOR","4":"CZE","5":"CAN","6":"BIH","7":"QAT","8":"SUI","9":"BRA","10":"MAR","11":"HAI","12":"SCO","13":"USA","14":"PAR","15":"AUS","16":"TUR","17":"GER","18":"CUW","19":"CIV","20":"ECU","21":"NED","22":"JPN","23":"SWE","24":"TUN","25":"BEL","26":"EGY","27":"IRN","28":"NZL","29":"ESP","30":"CPV","31":"KSA","32":"URU","33":"FRA","34":"SEN","35":"IRQ","36":"NOR","37":"ARG","38":"ALG","39":"AUT","40":"JOR","41":"POR","42":"COD","43":"UZB","44":"COL","45":"ENG","46":"CRO","47":"GHA","48":"PAN"
    };
    const mappedCode = liveTeamIdMap[String(id)];
    if (mappedCode) return normalizeCode(mappedCode);

    // 2. Fallback Name / ID matching
    const normalizeName = (n: string) => {
      if (!n) return "";
      const lower = n.toLowerCase().trim();
      if (lower.includes("congo")) return "congo";
      if (lower.includes("korea") || lower.includes("south korea")) return "south korea";
      if (lower.includes("usa") || lower.includes("united states")) return "united states";
      return lower;
    };

    const targetName = normalizeName(nameEn);
    const t = teams.find((x: any) => 
      (x.id !== undefined && x.id !== null && String(x.id) === String(id)) ||
      (x.name && targetName && normalizeName(x.name) === targetName)
    );
    return t ? normalizeCode(t.code) : "";
  };

  const groupGames = allGames.filter((g: any) => g.group === group);
  
  // Find match dynamically based on team codes
  let game = groupGames.find((g: any) => {
    const hCode = getCode(g.home_team_id, g.home_team_name_en || "");
    const aCode = getCode(g.away_team_id, g.away_team_name_en || "");
    const targetH = normalizeCode(homeCode);
    const targetA = normalizeCode(awayCode);
    
    return (hCode === targetH && aCode === targetA) || (hCode === targetA && aCode === targetH);
  });

  // Fallback to suffix-to-sorted-index if not found
  if (!game) {
    const sortedGames = [...groupGames].sort((a: any, b: any) => parseInt(a.id) - parseInt(b.id));
    const suffixToSortedIndex: Record<number, number> = {
      1: 0,
      2: 1,
      3: 3,
      4: 4,
      5: 5,
      6: 2
    };
    const sortedIndex = suffixToSortedIndex[suffix] ?? (suffix - 1);
    game = sortedGames[sortedIndex];
  }

  if (!game) {
    return { date: "TBD", time, matchNumber: 0, venue: "TBD", isSwapped: false };
  }

  // Once we have a game, compute isSwapped accurately based on team codes
  const hCode = getCode(game.home_team_id, game.home_team_name_en || "");
  const aCode = getCode(game.away_team_id, game.away_team_name_en || "");
  const targetH = normalizeCode(homeCode);
  const targetA = normalizeCode(awayCode);
  const isSwapped = (hCode === targetA && aCode === targetH);

  // Parse local_date: e.g. "06/13/2026 21:00" (timezone independent)
  let formattedDate = "TBD";
  try {
    if (game.local_date) {
      const datePart = game.local_date.split(" ")[0];
      const dateParts = datePart.split("/");
      if (dateParts.length === 3) {
        const [month, day, year] = dateParts.map(Number);
        const dateObj = new Date(Date.UTC(year, month - 1, day));
        formattedDate = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
      }

      // Extract time from local_date if available
      const timePart = game.local_date.split(" ")[1];
      if (timePart) {
        time = timePart;
      }
    }
  } catch (err) {
    console.error("Error parsing game date:", game.local_date, err);
  }

  // Lookup stadium name from the live stadiums data
  const stadiumObj = allStadiums.find((s: any) => String(s.id) === String(game.stadium_id));
  const venueLabel = stadiumObj
    ? `${stadiumObj.name_en}, ${stadiumObj.city_en.split('(')[0].trim()}`
    : "TBD";

  return {
    date: formattedDate,
    time,
    matchNumber: parseInt(game.id),
    venue: venueLabel,
    isSwapped
  };
}

// Helper: Compute win/draw/loss probabilities using Poisson distribution
function computeProbs(homeLambda: number, awayLambda: number, isKnockout: boolean) {
  const poissonPdf = (lambda: number, k: number) => {
    let fact = 1;
    for (let i = 2; i <= k; i++) fact *= i;
    return (Math.pow(lambda, k) * Math.exp(-lambda)) / fact;
  };

  const homeP = Array.from({ length: 8 }, (_, k) => poissonPdf(homeLambda, k));
  const awayP = Array.from({ length: 8 }, (_, k) => poissonPdf(awayLambda, k));

  let pHomeWin = 0;
  let pDraw = 0;
  let pAwayWin = 0;

  for (let h = 0; h < 8; h++) {
    for (let a = 0; a < 8; a++) {
      const p = homeP[h] * awayP[a];
      if (h > a) pHomeWin += p;
      else if (h === a) pDraw += p;
      else pAwayWin += p;
    }
  }

  const total = pHomeWin + pDraw + pAwayWin;
  pHomeWin /= total || 1;
  pDraw /= total || 1;
  pAwayWin /= total || 1;

  if (isKnockout) {
    const drawSplit = pHomeWin / (pHomeWin + pAwayWin || 1);
    pHomeWin += pDraw * drawSplit;
    pAwayWin += pDraw * (1 - drawSplit);
    pDraw = 0;
  }

  return {
    homeWin: Math.round(pHomeWin * 100),
    draw: isKnockout ? 0 : Math.round(pDraw * 100),
    awayWin: Math.round(pAwayWin * 100)
  };
}

// Venue & Date details for all knockout matches matching reference diagram
const KO_DETAILS: Record<string, { venue: string; date: string }[]> = {
  r32: [
    { venue: "Boston", date: "6/29" },
    { venue: "New York/NJ", date: "6/30" },
    { venue: "Los Angeles", date: "6/29" },
    { venue: "Monterrey", date: "6/29" },
    { venue: "Toronto", date: "7/2" },
    { venue: "Los Angeles", date: "7/3" },
    { venue: "San Francisco", date: "7/2" },
    { venue: "Seattle", date: "7/2" },
    { venue: "Houston", date: "6/30" },
    { venue: "Dallas", date: "7/1" },
    { venue: "Mexico City", date: "7/1" },
    { venue: "Atlanta", date: "7/2" },
    { venue: "Miami", date: "7/4" },
    { venue: "Dallas", date: "7/4" },
    { venue: "Vancouver", date: "7/3" },
    { venue: "Kansas City", date: "7/4" },
  ],
  r16: [
    { venue: "Philadelphia", date: "7/5" },
    { venue: "Houston", date: "7/5" },
    { venue: "Dallas", date: "7/7" },
    { venue: "Seattle", date: "7/7" },
    { venue: "New York/NJ", date: "7/6" },
    { venue: "Miami", date: "7/12" },
    { venue: "Mexico City", date: "7/6" },
    { venue: "Atlanta", date: "7/7" },
  ],
  qf: [
    { venue: "Boston", date: "7/10" },
    { venue: "Los Angeles", date: "7/11" },
    { venue: "Miami", date: "7/12" },
    { venue: "Kansas City", date: "7/12" },
  ],
  sf: [
    { venue: "Dallas", date: "7/15" },
    { venue: "Atlanta", date: "7/16" },
  ],
  final: [
    { venue: "New York/NJ", date: "7/20" }
  ],
  third: [
    { venue: "Miami", date: "7/19" }
  ]
};

const MODEL_META = {
  base: {
    label: "Base",
    title: "Base Model",
    description: "Uses team-level Elo, Attack, and Defense metrics to calculate expected goals.",
    summary: "Predicts using country-level Elo and attack/defense ratings.",
    accent: "text-emerald-600 dark:text-neon",
    border: "border-emerald-200/80 dark:border-emerald-400/20",
    glow: "from-emerald-500/12 via-transparent to-transparent dark:from-emerald-400/10",
    badge: "bg-emerald-100/80 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300",
    Icon: Cpu,
  },
  advanced: {
    label: "Advanced",
    title: "Advanced Model",
    description: "Factors in average player Overall Ratings to adjust base expected goals for squad quality.",
    summary: "Scales expected goals using the ratio of overall average player ratings.",
    accent: "text-sky-700 dark:text-sky-300",
    border: "border-sky-200/80 dark:border-sky-400/20",
    glow: "from-sky-500/12 via-transparent to-transparent dark:from-sky-400/10",
    badge: "bg-sky-100/80 text-sky-800 dark:bg-sky-400/10 dark:text-sky-300",
    Icon: Brain,
  },
  pro: {
    label: "Pro",
    title: "Pro Model",
    description: "Incorporates deep player attributes including Attacking Impact, Passing/Creativity, Recent Form, Defensive Impact, International Experience, Fitness/Availability, and Discipline Risk.",
    summary: "Integrates specific player-level attributes (Form, Passing, Impact, Fitness, Discipline Risk).",
    accent: "text-cyan-700 dark:text-cyan-300",
    border: "border-cyan-200/80 dark:border-cyan-400/20",
    glow: "from-cyan-500/12 via-transparent to-transparent dark:from-cyan-400/10",
    badge: "bg-cyan-100/80 text-cyan-800 dark:bg-cyan-400/10 dark:text-cyan-300",
    Icon: Sparkles,
  },
} as const;

interface GroupPredictorProps {
  defaultTab?: "group" | "knockout";
  onlyKnockout?: boolean;
  fullWidth?: boolean;
}

export function GroupPredictor({ defaultTab = "group", onlyKnockout = false, fullWidth = false }: GroupPredictorProps) {
  const teams = useTeams();
  const GROUPS_CONFIG = useGroupsConfig();
  const cupResults = useCupResults();
  const getTeam = (code: string) => teams.find(t => t.code === code) || teams[0];
  const { data: session } = useSession();
  const { players, isInitialized, initializeData, selectedModel } = useSimulationStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ─── Live data from worldcup26.ir ───
  const [liveGames, setLiveGames] = useState<any[]>([]);
  const [liveStadiums, setLiveStadiums] = useState<any[]>([]);

  const openAuthModal = (mode: "signin" | "signup" = "signin") => {
    router.push(buildAuthModalHref({
      pathname,
      search: searchParams.toString(),
      mode,
      callbackUrl: pathname,
    }));
  };

  useEffect(() => {
    // Fetch games + stadiums from worldcup26.ir live API.
    async function fetchLiveData() {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const [gamesRes, stadiumsRes] = await Promise.all([
          fetch("https://worldcup26.ir/get/games", { signal: controller.signal, cache: "no-store" }),
          fetch("https://worldcup26.ir/get/stadiums", { signal: controller.signal, cache: "no-store" }),
        ]);

        clearTimeout(timeout);

        if (!gamesRes.ok || !stadiumsRes.ok) throw new Error("API response not OK");

        const gData = await gamesRes.json();
        const sData = await stadiumsRes.json();

        setLiveGames(gData.games || []);
        setLiveStadiums(sData.stadiums || []);
      } catch (error) {
        console.error("Failed to load live games/stadiums from real API", error);
        setLiveGames([]);
        setLiveStadiums([]);
      }
    }

    fetchLiveData();
  }, []);

  useEffect(() => {
    if (!isInitialized) {
      Promise.all([
        fetch("/api/teams").then((res) => res.json()),
        fetch("/api/players").then((res) => res.json()),
      ]).then(([teamsData, playersData]) => {
        initializeData(teamsData, playersData);
      }).catch((err) => {
        console.error("Failed to load teams/players in simulator", err);
      });
    }
  }, [isInitialized, initializeData]);

  const getTeamPlayers = (teamCode: string) => {
    return Object.values(players)
      .filter((p) => p["Team Code"] === teamCode)
      .sort((a, b) => {
        const ratingA = parseInt(a["Overall Rating"] || "0", 10);
        const ratingB = parseInt(b["Overall Rating"] || "0", 10);
        return ratingB - ratingA;
      });
  };
  const [activeTab, setActiveTab] = useState<"group" | "knockout">(defaultTab);
  const [koRound, setKoRound] = useState<"r32" | "r16" | "qf" | "sf" | "final">("r32");

  // Selection state for groups batch operations
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  const [zoomScale, setZoomScale] = useState(85);

  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeModalReason, setUpgradeModalReason] = useState<"plus" | "pro" | "credits" | "guest">("plus");
  const [creditsUsed, setCreditsUsed] = useState<number>(0);
  const [guestCreditsUsed, setGuestCreditsUsed] = useState<number>(0);

  // Confirmation state for simulations
  const [confirmSimOpen, setConfirmSimOpen] = useState(false);
  const [confirmSimType, setConfirmSimType] = useState<"all" | "group" | null>(null);
  const [confirmSimGroup, setConfirmSimGroup] = useState<string | null>(null);
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<string | null>(null);
  const [simScope, setSimScope] = useState<"whole" | "r32">("whole");

  const handleConfirmSimulation = () => {
    if (confirmSimType === "all") {
      if (simScope === "whole") {
        handleWholeTournamentSimulationWithCredits();
      } else {
        handleAiPredictKnockoutsWithCredits(true);
      }
    } else if (confirmSimType === "group" && confirmSimGroup) {
      predictGroup(confirmSimGroup);
    }
    setConfirmSimOpen(false);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const gc = Number(localStorage.getItem("wc26_guest_sims") || "0");
      setGuestCreditsUsed(gc);
    }
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      fetch("/api/user/credits")
        .then(res => res.json())
        .then(data => {
          if (data && typeof data.usageCount === "number") {
            setCreditsUsed(data.usageCount);
          }
        })
        .catch(err => console.error("Error fetching credit count:", err));
    }
  }, [session]);

  const consumeCredit = async () => {
    // Guest flow
    if (!session) {
      const currentGuest = Number(localStorage.getItem("wc26_guest_sims") || "0");
      if (currentGuest >= 3) {
        setUpgradeModalReason("guest");
        setUpgradeModalOpen(true);
        return false;
      }
      const newGuest = currentGuest + 1;
      localStorage.setItem("wc26_guest_sims", String(newGuest));
      setGuestCreditsUsed(newGuest);
      return true;
    }

    // Authenticated user flow
    const tier = (session.user.subscriptionTier || "free").toLowerCase();
    if (tier !== "free") {
      return true;
    }

    try {
      const res = await fetch("/api/user/credits", { method: "POST" });
      const data = await res.json();

      if (res.status === 403) {
        setUpgradeModalReason("credits");
        setUpgradeModalOpen(true);
        return false;
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to update credits");
      }

      if (typeof data.usageCount === "number") {
        setCreditsUsed(data.usageCount);
      }
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to update credits. Please try again.");
      return false;
    }
  };

  const handleAiPredictWithCredits = async () => {
    const allowed = await consumeCredit();
    if (allowed) {
      handleAiPredict();
    }
  };

  const handleAiPredictKnockoutsWithCredits = async (forceOverwrite = false) => {
    const allowed = await consumeCredit();
    if (allowed) {
      handleAiPredictKnockouts(forceOverwrite);
    }
  };

  const toggleGroupSelection = (groupName: string) => {
    setSelectedGroups((prev) => {
      if (prev.includes(groupName)) {
        if (prev.length === 1) {
          return [];
        } else {
          return [groupName];
        }
      } else {
        return [groupName];
      }
    });
  };

  const predictGroup = (groupName: string) => {
    const predicted = matches.map((m) => {
      if (m.group !== groupName) return m;
      const homeTeam = getTeam(m.homeCode);
      const awayTeam = getTeam(m.awayCode);
      const { homeLambda, awayLambda } = getMatchExpectedGoals(homeTeam, awayTeam, players, selectedModel);
      return {
        ...m,
        homeScore: getPoisson(homeLambda),
        awayScore: getPoisson(awayLambda),
      };
    });
    setMatches(predicted);
    saveBulkToDb(predicted);
  };

  const resetGroup = (groupName: string) => {
    const resetMatches = matches.map((m): PredictorMatch => {
      if (m.group !== groupName) return m;
      return clearPredictorMatchScores(m);
    });
    setMatches(resetMatches);

    const clearedWinners = {
      r32: Array(16).fill(null),
      r16: Array(8).fill(null),
      qf: Array(4).fill(null),
      sf: Array(2).fill(null),
      final: Array(1).fill(null),
    };
    setKoWinners(clearedWinners);
    setKoScores({});
    setThirdWinner(null);
    setThirdScores({ home: "", away: "" });
    saveBulkToDb(resetMatches, clearedWinners, {}, null, { home: "", away: "" });
  };

  const randomizeGroup = (groupName: string) => {
    const random = matches.map((m) => {
      if (m.group !== groupName) return m;
      return {
        ...m,
        homeScore: Math.floor(Math.random() * 5),
        awayScore: Math.floor(Math.random() * 5),
      };
    });
    setMatches(random);
    saveBulkToDb(random);
  };

  // Initial group matches state and hydration from cup.json
  const initialMatches = useMemo(() => {
    let matches: PredictorMatch[] = [];
    Object.entries(GROUPS_CONFIG).forEach(([groupName, teams]) => {
      const groupFixtures = generateGroupMatches(groupName, teams);
      const hydrated = groupFixtures.map((m) => {
        const [gName, idxStr] = m.id.split("-");
        const cupKey = `${gName}-${idxStr.padStart(2, "0")}`;
        const result = cupResults[cupKey];
        if (result) {
          return {
            ...m,
            homeScore: normalizePredictorScore(result.homeGoals),
            awayScore: normalizePredictorScore(result.awayGoals),
          };
        }
        return m;
      });
      matches = [...matches, ...hydrated];
    });
    return matches;
  }, [GROUPS_CONFIG, cupResults]);

  const [matches, setMatches] = useState<PredictorMatch[]>(initialMatches);
  const [useRealScores, setUseRealScores] = useState(false);
  const [preRealScoresMatches, setPreRealScoresMatches] = useState<PredictorMatch[] | null>(null);

  const disableRealScoresState = () => {
    setUseRealScores(false);
    setPreRealScoresMatches(null);
  };

  const getAssignedLiveScoreForMatch = useCallback((match: PredictorMatch) => {
    const suffix = parseInt(match.id.split("-")[1]);
    const details = getGroupMatchDetails(match.group, suffix, liveGames, liveStadiums, match.homeCode, match.awayCode, teams);
    if (!details || details.matchNumber <= 0) return null;

    const game = liveGames.find((g: any) => parseInt(g.id) === details.matchNumber);
    if (!game) return null;
    if (!hasStartedLiveGame(game)) return null;

    const homeScore = normalizePredictorScore(game.home_score);
    const awayScore = normalizePredictorScore(game.away_score);

    if (!hasValidPredictorScore(homeScore) || !hasValidPredictorScore(awayScore)) {
      return null;
    }

    if (details.isSwapped) {
      return { homeScore: awayScore, awayScore: homeScore };
    }
    return { homeScore, awayScore };
  }, [liveGames, liveStadiums, teams]);

  const getAssignedLiveScoreForKoMatch = useCallback((home: string, away: string) => {
    if (!useRealScores || liveGames.length === 0) return null;

    const targetH = home.toUpperCase().trim();
    const targetA = away.toUpperCase().trim();
    const normalizeCode = (c: string) => (c === "KSA" ? "SAU" : c);
    const predH = normalizeCode(targetH);
    const predA = normalizeCode(targetA);

    const game = liveGames.find((g: any) => {
      const gType = String(g.type || "").toLowerCase();
      if (gType === "group") return false; // only search knockout games

      const getCode = (id: string | number, nameEn: string) => {
        const liveTeamIdMap: Record<string, string> = {
          "1":"MEX","2":"RSA","3":"KOR","4":"CZE","5":"CAN","6":"BIH","7":"QAT","8":"SUI","9":"BRA","10":"MAR","11":"HAI","12":"SCO","13":"USA","14":"PAR","15":"AUS","16":"TUR","17":"GER","18":"CUW","19":"CIV","20":"ECU","21":"NED","22":"JPN","23":"SWE","24":"TUN","25":"BEL","26":"EGY","27":"IRN","28":"NZL","29":"ESP","30":"CPV","31":"KSA","32":"URU","33":"FRA","34":"SEN","35":"IRQ","36":"NOR","37":"ARG","38":"ALG","39":"AUT","40":"JOR","41":"POR","42":"COD","43":"UZB","44":"COL","45":"ENG","46":"CRO","47":"GHA","48":"PAN"
        };
        const mappedCode = liveTeamIdMap[String(id)];
        if (mappedCode) return mappedCode.toUpperCase().trim();
        const targetName = nameEn.toLowerCase().trim();
        const t = teams.find((x: any) => 
          (x.id !== undefined && x.id !== null && String(x.id) === String(id)) ||
          (x.name && targetName && x.name.toLowerCase().trim() === targetName)
        );
        return t ? t.code.toUpperCase().trim() : "";
      };

      const hCode = getCode(g.home_team_id, g.home_team_name_en || "");
      const aCode = getCode(g.away_team_id, g.away_team_name_en || "");

      const apiH = normalizeCode(hCode);
      const apiA = normalizeCode(aCode);

      return (apiH === predH && apiA === predA) || (apiH === predA && apiA === predH);
    });

    if (!game) return null;
    if (!hasStartedLiveGame(game)) return null;

    const homeScore = normalizePredictorScore(game.home_score);
    const awayScore = normalizePredictorScore(game.away_score);

    if (!hasValidPredictorScore(homeScore) || !hasValidPredictorScore(awayScore)) {
      return null;
    }

    const getCode = (id: string | number, nameEn: string) => {
      const liveTeamIdMap: Record<string, string> = {
        "1":"MEX","2":"RSA","3":"KOR","4":"CZE","5":"CAN","6":"BIH","7":"QAT","8":"SUI","9":"BRA","10":"MAR","11":"HAI","12":"SCO","13":"USA","14":"PAR","15":"AUS","16":"TUR","17":"GER","18":"CUW","19":"CIV","20":"ECU","21":"NED","22":"JPN","23":"SWE","24":"TUN","25":"BEL","26":"EGY","27":"IRN","28":"NZL","29":"ESP","30":"CPV","31":"KSA","32":"URU","33":"FRA","34":"SEN","35":"IRQ","36":"NOR","37":"ARG","38":"ALG","39":"AUT","40":"JOR","41":"POR","42":"COD","43":"UZB","44":"COL","45":"ENG","46":"CRO","47":"GHA","48":"PAN"
      };
      const mappedCode = liveTeamIdMap[String(id)];
      if (mappedCode) return mappedCode.toUpperCase().trim();
      const targetName = nameEn.toLowerCase().trim();
      const t = teams.find((x: any) => 
        (x.id !== undefined && x.id !== null && String(x.id) === String(id)) ||
        (x.name && targetName && x.name.toLowerCase().trim() === targetName)
      );
      return t ? t.code.toUpperCase().trim() : "";
    };
    const hCode = getCode(game.home_team_id, game.home_team_name_en || "");
    const isSwapped = (normalizeCode(hCode) === predA);

    if (isSwapped) {
      return { homeScore: awayScore, awayScore: homeScore };
    }
    return { homeScore, awayScore };
  }, [useRealScores, liveGames, teams]);

  const applyRealScores = useCallback((currentMatches: PredictorMatch[]) => {
    return currentMatches.map((m) => {
      const liveScore = getAssignedLiveScoreForMatch(m);
      if (liveScore) {
        return {
          ...m,
          homeScore: liveScore.homeScore,
          awayScore: liveScore.awayScore,
        };
      }
      const homeTeam = teams.find((t) => t.code === m.homeCode) || teams[0];
      const awayTeam = teams.find((t) => t.code === m.awayCode) || teams[0];
      const { homeLambda, awayLambda } = getMatchExpectedGoals(homeTeam, awayTeam, players, selectedModel);
      return {
        ...m,
        homeScore: getPoisson(homeLambda),
        awayScore: getPoisson(awayLambda),
      };
    });
  }, [getAssignedLiveScoreForMatch, teams, players, selectedModel]);

  const matchesRef = useRef(matches);
  useEffect(() => {
    matchesRef.current = matches;
  }, [matches]);

  const syncKnockoutBracketRef = useRef<((currentMatches: PredictorMatch[]) => void) | null>(null);
  useEffect(() => {
    syncKnockoutBracketRef.current = syncKnockoutBracket;
  });

  const handleToggleRealScores = (checked: boolean) => {
    setUseRealScores(checked);
    if (checked) {
      setPreRealScoresMatches(matches);
      const updatedMatches = applyRealScores(matches);
      setMatches(updatedMatches);
      if (syncKnockoutBracketRef.current) {
        syncKnockoutBracketRef.current(updatedMatches);
      }
    } else {
      if (preRealScoresMatches) {
        setMatches(preRealScoresMatches);
      }
      setPreRealScoresMatches(null);
    }
  };

  useEffect(() => {
    if (useRealScores && liveGames.length > 0) {
      const currentMatches = matchesRef.current;
      const updatedMatches = applyRealScores(currentMatches);
      const hasChanged = updatedMatches.some((m, idx) => {
        const prev = currentMatches[idx];
        return prev.homeScore !== m.homeScore || prev.awayScore !== m.awayScore;
      });
      if (hasChanged) {
        setMatches(updatedMatches);
        if (syncKnockoutBracketRef.current) {
          syncKnockoutBracketRef.current(updatedMatches);
        }
      }
    }
  }, [liveGames, useRealScores, applyRealScores]);

  const globalRealPercent = useMemo(() => {
    const realCount = matches.filter((m) => getAssignedLiveScoreForMatch(m)).length;
    return Math.round((realCount / TOTAL_TOURNAMENT_MATCHES) * 100);
  }, [matches, getAssignedLiveScoreForMatch]);

  const simulatePendingMatches = useCallback(() => {
    const updatedMatches = matches.map((m) => {
      if (hasAssignedMatchScores(m)) return m;
      const liveScore = getAssignedLiveScoreForMatch(m);
      if (liveScore) {
        return {
          ...m,
          homeScore: liveScore.homeScore,
          awayScore: liveScore.awayScore,
        };
      }

      const homeTeam = getTeam(m.homeCode);
      const awayTeam = getTeam(m.awayCode);
      const { homeLambda, awayLambda } = getMatchExpectedGoals(homeTeam, awayTeam, players, selectedModel);
      return {
        ...m,
        homeScore: getPoisson(homeLambda),
        awayScore: getPoisson(awayLambda),
      };
    });

    setMatches(updatedMatches);

    const clearedWinners = {
      r32: Array(16).fill(null),
      r16: Array(8).fill(null),
      qf: Array(4).fill(null),
      sf: Array(2).fill(null),
      final: Array(1).fill(null),
    };
    setKoWinners(clearedWinners);
    setKoScores({});
    setThirdWinner(null);
    setThirdScores({ home: "", away: "" });

    saveBulkToDb(updatedMatches, clearedWinners, {}, null, { home: "", away: "" });
  }, [getAssignedLiveScoreForMatch, getTeam, matches, players, selectedModel]);

  const simulatePendingGroupMatches = useCallback((groupName: string) => {
    const updatedMatches = matches.map((m) => {
      if (m.group !== groupName) return m;
      if (hasAssignedMatchScores(m)) return m;
      const liveScore = getAssignedLiveScoreForMatch(m);
      if (liveScore) {
        return {
          ...m,
          homeScore: liveScore.homeScore,
          awayScore: liveScore.awayScore,
        };
      }
      const homeTeam = getTeam(m.homeCode);
      const awayTeam = getTeam(m.awayCode);
      const { homeLambda, awayLambda } = getMatchExpectedGoals(homeTeam, awayTeam, players, selectedModel);
      return {
        ...m,
        homeScore: getPoisson(homeLambda),
        awayScore: getPoisson(awayLambda),
      };
    });
    setMatches(updatedMatches);
    saveBulkToDb(updatedMatches);
  }, [getAssignedLiveScoreForMatch, getTeam, matches, players, selectedModel]);

  const hasRealCupResult = useCallback((match: PredictorMatch): boolean => {
    const [gName, idxStr] = match.id.split("-");
    const cupKey = `${gName}-${idxStr.padStart(2, "0")}`;
    return !!cupResults[cupKey];
  }, [cupResults]);

  const pendingMatchesCount = useMemo(() => {
    return matches.filter((m) => !hasAssignedMatchScores(m)).length;
  }, [matches]);

  // Slots and multi-saves states
  const [currentSlot, setCurrentSlot] = useState<number | null>(null);
  const [allPredictions, setAllPredictions] = useState<any[]>([]);
  const [slotNames, setSlotNames] = useState<Record<number, string>>({
    0: "Official Prediction", 1: "Save 1", 2: "Save 2", 3: "Save 3", 4: "Save 4", 5: "Save 5"
  });
  const [slotDates, setSlotDates] = useState<Record<number, string>>({
    0: "", 1: "", 2: "", 3: "", 4: "", 5: ""
  });
  const [isSavesModalOpen, setIsSavesModalOpen] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<number | null>(null);
  const [editingSlotName, setEditingSlotName] = useState("");
  const [expandedSlotDetails, setExpandedSlotDetails] = useState<Record<number, boolean>>({});
  const [slotToOverwriteConfirm, setSlotToOverwriteConfirm] = useState<number | null>(null);
  const [slotSummaries, setSlotSummaries] = useState<Record<number, any>>({});

  // Knockout prediction state storing team codes
  // Knockout prediction state storing team codes
  const [koWinners, setKoWinners] = useState<{
    r32: (string | null)[];
    r16: (string | null)[];
    qf: (string | null)[];
    sf: (string | null)[];
    final: (string | null)[];
  }>({
    r32: Array(16).fill(null),
    r16: Array(8).fill(null),
    qf: Array(4).fill(null),
    sf: Array(2).fill(null),
    final: Array(1).fill(null),
  });

  // Knockout prediction scores state storing goals for each team
  const [koScores, setKoScores] = useState<Record<string, { home: number | ""; away: number | "" }>>({});

  // 3rd place match prediction state
  const [thirdWinner, setThirdWinner] = useState<string | null>(null);
  const [thirdScores, setThirdScores] = useState<{ home: number | ""; away: number | "" }>({ home: "", away: "" });

  // 1v1 Simulator Modal State
  const [simMatch, setSimMatch] = useState<{
    type: "group" | "knockout" | "third";
    id?: string;
    round?: string;
    matchIndex?: number;
    homeCode: string;
    awayCode: string;
    homeScore: number | "";
    awayScore: number | "";
    details: { date: string; time?: string; matchNumber?: number; venue: string };
  } | null>(null);

  const [simTemperature, setSimTemperature] = useState<number>(20);
  const [simCrowdSupport, setSimCrowdSupport] = useState<number>(50); // 0-100: percentage of support for home team
  const [simHomePhysical, setSimHomePhysical] = useState<number>(100);
  const [simHomeDiscipline, setSimHomeDiscipline] = useState<number>(0);
  const [simHomePlayerOut, setSimHomePlayerOut] = useState<string>("");
  const [simAwayPhysical, setSimAwayPhysical] = useState<number>(100);
  const [simAwayDiscipline, setSimAwayDiscipline] = useState<number>(0);
  const [simAwayPlayerOut, setSimAwayPlayerOut] = useState<string>("");
  const [simHomeGoals, setSimHomeGoals] = useState<number | "">("");
  const [simAwayGoals, setSimAwayGoals] = useState<number | "">("");

  const handleOpenSimulator = (match: {
    type: "group" | "knockout" | "third";
    id?: string;
    round?: string;
    matchIndex?: number;
    homeCode: string;
    awayCode: string;
    homeScore: number | "";
    awayScore: number | "";
    details: { date: string; time?: string; matchNumber?: number; venue: string };
  }) => {
    setSimMatch(match);
    setSimTemperature(20);
    setSimCrowdSupport(50);
    setSimHomePhysical(100);
    setSimHomeDiscipline(0);
    setSimHomePlayerOut("");
    setSimAwayPhysical(100);
    setSimAwayDiscipline(0);
    setSimAwayPlayerOut("");
    setSimHomeGoals(match.homeScore);
    setSimAwayGoals(match.awayScore);
  };

  const getPlayerRating = (playerName: string, teamCode: string) => {
    if (!playerName) return 0;
    const player = players[`${teamCode}-${playerName}`];
    if (!player) return 0;
    return parseInt(player["Overall Rating"] || "80", 10);
  };

  const handleReSimulate = () => {
    if (!simMatch) return;
    const homeTeam = getTeam(simMatch.homeCode);
    const awayTeam = getTeam(simMatch.awayCode);

    const baseGoals = getMatchExpectedGoals(homeTeam, awayTeam, players, selectedModel);
    let homeLambda = baseGoals.homeLambda;
    let awayLambda = baseGoals.awayLambda;

    // Apply modifiers to base lambdas
    homeLambda += homeLambda * (simHomeDiscipline * 0.04);
    awayLambda += awayLambda * (simAwayDiscipline * 0.04);

    homeLambda -= homeLambda * ((100 - simHomePhysical) * 0.005);
    awayLambda -= awayLambda * ((100 - simAwayPhysical) * 0.005);

    if (simHomePlayerOut) {
      const r = getPlayerRating(simHomePlayerOut, simMatch.homeCode);
      homeLambda -= homeLambda * ((r / 100) * 0.1);
    }
    if (simAwayPlayerOut) {
      const r = getPlayerRating(simAwayPlayerOut, simMatch.awayCode);
      awayLambda -= awayLambda * ((r / 100) * 0.1);
    }

    const crowdDiff = simCrowdSupport - 50;
    if (crowdDiff > 0) {
      homeLambda += homeLambda * (crowdDiff * 0.002);
    } else if (crowdDiff < 0) {
      awayLambda += awayLambda * (-crowdDiff * 0.002);
    }

    let tempGoalsMultiplier = 1.0;
    if (simTemperature < 15) {
      tempGoalsMultiplier = 1.0 - Math.min(0.15, (15 - simTemperature) * 0.0075);
    } else if (simTemperature > 22) {
      tempGoalsMultiplier = 1.0 - Math.min(0.15, (simTemperature - 22) * 0.0065);
    }

    homeLambda *= tempGoalsMultiplier;
    awayLambda *= tempGoalsMultiplier;

    // ensure positive lambda
    homeLambda = Math.max(0.1, homeLambda);
    awayLambda = Math.max(0.1, awayLambda);

    let hs = getPoisson(homeLambda);
    let as = getPoisson(awayLambda);

    if (simMatch.type !== "group" && hs === as) {
      if (Math.random() > 0.5) hs += 1;
      else as += 1;
    }

    setSimHomeGoals(hs);
    setSimAwayGoals(as);
  };

  const simProbabilities = useMemo(() => {
    if (!simMatch) return { homeWin: 50, draw: 0, awayWin: 50 };
    const homeTeam = getTeam(simMatch.homeCode);
    const awayTeam = getTeam(simMatch.awayCode);

    const baseGoals = getMatchExpectedGoals(homeTeam, awayTeam, players, selectedModel);
    let homeLambda = baseGoals.homeLambda;
    let awayLambda = baseGoals.awayLambda;

    // Apply modifiers to base lambdas
    homeLambda += homeLambda * (simHomeDiscipline * 0.04);
    awayLambda += awayLambda * (simAwayDiscipline * 0.04);

    homeLambda -= homeLambda * ((100 - simHomePhysical) * 0.005);
    awayLambda -= awayLambda * ((100 - simAwayPhysical) * 0.005);

    if (simHomePlayerOut) {
      const r = getPlayerRating(simHomePlayerOut, simMatch.homeCode);
      homeLambda -= homeLambda * ((r / 100) * 0.1);
    }
    if (simAwayPlayerOut) {
      const r = getPlayerRating(simAwayPlayerOut, simMatch.awayCode);
      awayLambda -= awayLambda * ((r / 100) * 0.1);
    }

    const crowdDiff = simCrowdSupport - 50;
    if (crowdDiff > 0) {
      homeLambda += homeLambda * (crowdDiff * 0.002);
    } else if (crowdDiff < 0) {
      awayLambda += awayLambda * (-crowdDiff * 0.002);
    }

    let tempGoalsMultiplier = 1.0;
    if (simTemperature < 15) {
      tempGoalsMultiplier = 1.0 - Math.min(0.15, (15 - simTemperature) * 0.0075);
    } else if (simTemperature > 22) {
      tempGoalsMultiplier = 1.0 - Math.min(0.15, (simTemperature - 22) * 0.0065);
    }

    homeLambda *= tempGoalsMultiplier;
    awayLambda *= tempGoalsMultiplier;

    // ensure positive lambda
    homeLambda = Math.max(0.1, homeLambda);
    awayLambda = Math.max(0.1, awayLambda);

    return computeProbs(homeLambda, awayLambda, simMatch.type !== "group");
  }, [simMatch, simTemperature, simCrowdSupport, simHomePhysical, simHomeDiscipline, simHomePlayerOut, simAwayPhysical, simAwayDiscipline, simAwayPlayerOut, players, selectedModel]);

  const handleApplyResult = () => {
    if (!simMatch || simHomeGoals === "" || simAwayGoals === "") return;

    const hGoals = simHomeGoals;
    const aGoals = simAwayGoals;

    if (simMatch.type === "group") {
      disableRealScoresState();
      const matchId = simMatch.id!;
      setMatches((prev) =>
        prev.map((m) =>
          m.id === matchId
            ? { ...m, homeScore: hGoals, awayScore: aGoals }
            : m
        )
      );
      const numericId = getNumericId(matchId);
      savePredictionToDb(numericId, "MATCH_SCORE", hGoals, aGoals);
    } else if (simMatch.type === "knockout") {
      const round = simMatch.round as "r32" | "r16" | "qf" | "sf" | "final";
      const idx = simMatch.matchIndex!;
      const winner = hGoals > aGoals ? simMatch.homeCode : simMatch.awayCode;

      const nextScores = {
        ...koScores,
        [`${round}-${idx}`]: { home: hGoals, away: aGoals }
      };
      setKoScores(nextScores);
      advanceWinner(round, idx, winner, nextScores);
    } else if (simMatch.type === "third") {
      const winner = hGoals > aGoals ? simMatch.homeCode : simMatch.awayCode;
      setThirdScores({ home: hGoals, away: aGoals });
      setThirdWinner(winner);
      savePredictionToDb(501, "KNOCKOUT_WINNER", hGoals, aGoals, winner);
    }

    setSimMatch(null);
  };

  // Load predictions from DB on authentication
  const fetchAllUserPredictions = async () => {
    if (!session?.user?.id) return;
    try {
      const res = await fetch("/api/predictions");
      if (res.ok) {
        const preds = await res.json();
        setAllPredictions(preds);
        return preds;
      }
    } catch (err) {
      console.error("Failed to load user predictions", err);
    }
  };

  useEffect(() => {
    if (allPredictions.length === 0) return;

    const names: Record<number, string> = { 0: "Official Prediction", 1: "Save 1", 2: "Save 2", 3: "Save 3", 4: "Save 4", 5: "Save 5" };
    const dates: Record<number, string> = { 0: "", 1: "", 2: "", 3: "", 4: "", 5: "" };
    const summaries: Record<number, any> = {};

    const metadataPreds = allPredictions.filter((p: any) => p.type === "SLOT_METADATA");
    metadataPreds.forEach((p: any) => {
      const slotId = p.matchId - 999000;
      if (slotId >= 0 && slotId <= 5) {
        try {
          const meta = readPredictionPayload<{ name?: string; updatedAt?: string; summary?: unknown }>(p.predictedPayload, p.predictedWinner);
          if (meta && typeof meta === "object") {
            if ("name" in meta && meta.name && slotId > 0) names[slotId] = meta.name;
            if ("updatedAt" in meta && meta.updatedAt) dates[slotId] = new Date(meta.updatedAt).toLocaleString();
            if ("summary" in meta && meta.summary) summaries[slotId] = meta.summary;
          }
        } catch (e) {
          // ignore
        }
      }
    });

    for (let slotId = 0; slotId <= 5; slotId++) {
      if (!dates[slotId]) {
        const matchType = slotId === 0 ? "MATCH_SCORE" : `MATCH_SCORE_SLOT_${slotId}`;
        const koType = slotId === 0 ? "KNOCKOUT_WINNER" : `KNOCKOUT_WINNER_SLOT_${slotId}`;
        const slotPreds = allPredictions.filter((p: any) =>
          p.type === matchType ||
          p.type === koType
        );
        if (slotPreds.length > 0) {
          const latestDate = new Date(Math.max(...slotPreds.map((p: any) => new Date(p.updatedAt).getTime())));
          dates[slotId] = latestDate.toLocaleString();
        }
      }
    }

    setSlotNames(names);
    setSlotDates(dates);
    setSlotSummaries(summaries);
  }, [allPredictions]);

  // Load predictions from DB on authentication
  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchUserPredictions = async () => {
      const preds = await fetchAllUserPredictions();
      if (!preds || preds.length === 0) return;

      const groupPreds = preds.filter((p: any) => p.type === "MATCH_SCORE");
      const koPreds = preds.filter((p: any) => p.type === "KNOCKOUT_WINNER");

      // Hydrate matches
      if (groupPreds.length > 0) {
        setMatches((prev) =>
          prev.map((m) => {
            const numId = getNumericId(m.id);
            const pred = groupPreds.find((p: any) => p.matchId === numId);
            if (pred) {
              return {
                ...m,
                homeScore: normalizePredictorScore(pred.predictedHomeScore),
                awayScore: normalizePredictorScore(pred.predictedAwayScore),
              };
            }
            return m;
          })
        );
      }

      // Hydrate knockout bracket
      if (koPreds.length > 0) {
        setKoWinners((prev) => {
          const next = { ...prev };
          const nextScores: Record<string, { home: number | ""; away: number | "" }> = {};

          koPreds.forEach((p: any) => {
            const id = p.matchId;
            const team = intToTeamCode(p.predictedTeamId);
            let round: "r32" | "r16" | "qf" | "sf" | "final" | null = null;
            let idx = 0;

            if (id >= 100 && id < 116) { round = "r32"; idx = id - 100; }
            else if (id >= 200 && id < 208) { round = "r16"; idx = id - 200; }
            else if (id >= 300 && id < 304) { round = "qf"; idx = id - 300; }
            else if (id >= 400 && id < 402) { round = "sf"; idx = id - 400; }
            else if (id === 500) { round = "final"; idx = 0; }
            else if (id === 501) {
              setThirdWinner(team);
              setThirdScores({
                home: normalizePredictorScore(p.predictedHomeScore),
                away: normalizePredictorScore(p.predictedAwayScore)
              });
            }

            if (round) {
              next[round][idx] = team;
              nextScores[`${round}-${idx}`] = {
                home: normalizePredictorScore(p.predictedHomeScore),
                away: normalizePredictorScore(p.predictedAwayScore)
              };
            }
          });
          setKoScores((prevScores) => ({ ...prevScores, ...nextScores }));
          return next;
        });
      }
    };

    fetchUserPredictions();
  }, [session]);

  const handleLoadFromSlot = async (slotId: number | null) => {
    disableRealScoresState();
    const matchType = slotId ? `MATCH_SCORE_SLOT_${slotId}` : "MATCH_SCORE";
    const koType = slotId ? `KNOCKOUT_WINNER_SLOT_${slotId}` : "KNOCKOUT_WINNER";

    const groupPreds = allPredictions.filter((p: any) => p.type === matchType);
    const koPreds = allPredictions.filter((p: any) => p.type === koType);

    // Hydrate matches
    setMatches((prev) =>
      prev.map((m) => {
        const numId = getNumericId(m.id);
        const pred = groupPreds.find((p: any) => p.matchId === numId);
        return {
          ...m,
          homeScore: pred ? normalizePredictorScore(pred.predictedHomeScore) : "",
          awayScore: pred ? normalizePredictorScore(pred.predictedAwayScore) : "",
        };
      })
    );

    // Load knockout bracket
    const nextWinners: typeof koWinners = {
      r32: Array(16).fill(null),
      r16: Array(8).fill(null),
      qf: Array(4).fill(null),
      sf: Array(2).fill(null),
      final: Array(1).fill(null),
    };
    const nextScores: Record<string, { home: number | ""; away: number | "" }> = {};
    let loadedThirdWinner: string | null = null;
    let loadedThirdScores = { home: "" as number | "", away: "" as number | "" };

    koPreds.forEach((p: any) => {
      const id = p.matchId;
      const team = intToTeamCode(p.predictedTeamId);
      let round: "r32" | "r16" | "qf" | "sf" | "final" | null = null;
      let idx = 0;

      if (id >= 100 && id < 116) { round = "r32"; idx = id - 100; }
      else if (id >= 200 && id < 208) { round = "r16"; idx = id - 200; }
      else if (id >= 300 && id < 304) { round = "qf"; idx = id - 300; }
      else if (id >= 400 && id < 402) { round = "sf"; idx = id - 400; }
      else if (id === 500) { round = "final"; idx = 0; }
      else if (id === 501) {
        loadedThirdWinner = team;
        loadedThirdScores = {
          home: normalizePredictorScore(p.predictedHomeScore),
          away: normalizePredictorScore(p.predictedAwayScore)
        };
      }

      if (round) {
        nextWinners[round][idx] = team;
        nextScores[`${round}-${idx}`] = {
          home: normalizePredictorScore(p.predictedHomeScore),
          away: normalizePredictorScore(p.predictedAwayScore)
        };
      }
    });

    setKoWinners(nextWinners);
    setKoScores(nextScores);
    setThirdWinner(loadedThirdWinner);
    setThirdScores(loadedThirdScores);
    setCurrentSlot(slotId);
    toast.success(slotId ? `Successfully loaded progress from Save Slot "${slotNames[slotId]}"!` : "Successfully loaded Official Prediction!");
  };

  const handleRenameSlot = async (slotId: number, newName: string) => {
    if (!session?.user?.id) return;

    setSlotNames((prev) => ({ ...prev, [slotId]: newName }));

    const payload = {
      matchId: 999000 + slotId,
      type: "SLOT_METADATA",
      predictedWinner: JSON.stringify({
        name: newName,
        updatedAt: new Date().toISOString()
      })
    };

    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await fetchAllUserPredictions();
        toast.success(`Slot ${slotId} renamed to "${newName}"`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to rename slot");
    }
  };

  const handleClearSlot = async (slotId: number) => {
    if (!session?.user?.id) return;

    try {
      const res = await fetch(`/api/predictions?slot=${slotId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        await fetchAllUserPredictions();
        if (currentSlot === slotId) {
          handleReset();
        }
        toast.success(`Cleared Save Slot ${slotId}`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to clear slot");
    }
  };

  // Save single prediction to DB
  const savePredictionToDb = async (matchId: number, type: string, homeScore: number | "", awayScore: number | "", teamCode?: string | null) => {
    // Disabled auto-save
    return;
  };

  const getPredictionSummary = (
    mList: PredictorMatch[],
    koW: typeof koWinners,
    koS: typeof koScores,
    tWinner: string | null,
    tScores: typeof thirdScores
  ) => {
    const groupPredictedCount = mList.filter((m) => hasAssignedMatchScores(m)).length;

    const data: Record<string, Record<string, any>> = {};
    Object.entries(GROUPS_CONFIG).forEach(([group, codes]) => {
      data[group] = {};
      codes.forEach((code) => {
        data[group][code] = {
          code,
          pts: 0,
          gd: 0,
          gf: 0,
          elo: getTeam(code)?.elo || 0
        };
      });
    });

    mList.forEach((m) => {
      const g = m.group;
      const h = m.homeCode;
      const a = m.awayCode;
      if (hasAssignedMatchScores(m)) {
        const hs = Number(m.homeScore);
        const as = Number(m.awayScore);

        if (data[g] && data[g][h] && data[g][a]) {
          data[g][h].gf += hs;
          data[g][h].ga += as;
          data[g][a].gf += as;
          data[g][a].ga += hs;
          data[g][h].gd = data[g][h].gf - data[g][h].ga;
          data[g][a].gd = data[g][a].gf - data[g][a].ga;

          if (hs > as) {
            data[g][h].pts += 3;
          } else if (hs < as) {
            data[g][a].pts += 3;
          } else {
            data[g][h].pts += 1;
            data[g][a].pts += 1;
          }
        }
      }
    });

    const standingsSummary: Record<string, { winner: string; runnerUp: string }> = {};
    Object.entries(data).forEach(([group, groupTeams]) => {
      const sorted = Object.values(groupTeams).sort((a: any, b: any) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.gd !== a.gd) return b.gd - a.gd;
        if (b.gf !== a.gf) return b.gf - a.gf;
        return b.elo - a.elo;
      });
      standingsSummary[group] = {
        winner: sorted[0]?.code || "",
        runnerUp: sorted[1]?.code || ""
      };
    });

    let bracketPredictedCount = 0;
    const rounds: ("r32" | "r16" | "qf" | "sf" | "final")[] = ["r32", "r16", "qf", "sf", "final"];
    rounds.forEach((round) => {
      koW[round].forEach((code) => {
        if (code) bracketPredictedCount++;
      });
    });
    if (tWinner) bracketPredictedCount++;

    const championCode = koW.final[0] || null;

    return {
      groupPredictedCount,
      totalGroupMatches: mList.length,
      standingsSummary,
      bracketPredictedCount,
      championCode
    };
  };

  const saveBulkToDb = async (
    updatedMatches: PredictorMatch[],
    updatedKoWinners?: typeof koWinners,
    updatedKoScores?: typeof koScores,
    updatedThirdWinner?: string | null,
    updatedThirdScores?: typeof thirdScores,
    manual: boolean = false,
    slotId: number | null = null
  ) => {
    if (!session?.user?.id || (!manual && slotId === null)) return;

    const targetSlot = slotId !== null ? slotId : currentSlot;

    const payload: any[] = [];
    const matchType = targetSlot ? `MATCH_SCORE_SLOT_${targetSlot}` : "MATCH_SCORE";
    const koType = targetSlot ? `KNOCKOUT_WINNER_SLOT_${targetSlot}` : "KNOCKOUT_WINNER";

    updatedMatches.forEach((m) => {
      payload.push({
        matchId: getNumericId(m.id),
        type: matchType,
        predictedHomeScore: hasValidPredictorScore(m.homeScore) ? m.homeScore : null,
        predictedAwayScore: hasValidPredictorScore(m.awayScore) ? m.awayScore : null,
      });
    });

    const activeWinners = updatedKoWinners || koWinners;
    const activeScores = updatedKoScores || koScores;
    const activeThirdWinner = updatedThirdWinner !== undefined ? updatedThirdWinner : thirdWinner;
    const activeThirdScores = updatedThirdScores || thirdScores;

    activeWinners.r32.forEach((code, idx) => {
      if (code) {
        const scores = activeScores[`r32-${idx}`] || { home: "", away: "" };
        const matchup = koMatchups.r32[idx] || { home: null, away: null };
        payload.push({
          matchId: 100 + idx,
          type: koType,
          predictedTeamId: teamCodeToInt(code),
          predictedHomeScore: scores.home !== "" ? Number(scores.home) : null,
          predictedAwayScore: scores.away !== "" ? Number(scores.away) : null,
          predictedWinner: JSON.stringify({
            homeCode: matchup.home,
            awayCode: matchup.away,
            winnerCode: code
          })
        });
      }
    });
    activeWinners.r16.forEach((code, idx) => {
      if (code) {
        const scores = activeScores[`r16-${idx}`] || { home: "", away: "" };
        const matchup = koMatchups.r16[idx] || { home: null, away: null };
        payload.push({
          matchId: 200 + idx,
          type: koType,
          predictedTeamId: teamCodeToInt(code),
          predictedHomeScore: scores.home !== "" ? Number(scores.home) : null,
          predictedAwayScore: scores.away !== "" ? Number(scores.away) : null,
          predictedWinner: JSON.stringify({
            homeCode: matchup.home,
            awayCode: matchup.away,
            winnerCode: code
          })
        });
      }
    });
    activeWinners.qf.forEach((code, idx) => {
      if (code) {
        const scores = activeScores[`qf-${idx}`] || { home: "", away: "" };
        const matchup = koMatchups.qf[idx] || { home: null, away: null };
        payload.push({
          matchId: 300 + idx,
          type: koType,
          predictedTeamId: teamCodeToInt(code),
          predictedHomeScore: scores.home !== "" ? Number(scores.home) : null,
          predictedAwayScore: scores.away !== "" ? Number(scores.away) : null,
          predictedWinner: JSON.stringify({
            homeCode: matchup.home,
            awayCode: matchup.away,
            winnerCode: code
          })
        });
      }
    });
    activeWinners.sf.forEach((code, idx) => {
      if (code) {
        const scores = activeScores[`sf-${idx}`] || { home: "", away: "" };
        const matchup = koMatchups.sf[idx] || { home: null, away: null };
        payload.push({
          matchId: 400 + idx,
          type: koType,
          predictedTeamId: teamCodeToInt(code),
          predictedHomeScore: scores.home !== "" ? Number(scores.home) : null,
          predictedAwayScore: scores.away !== "" ? Number(scores.away) : null,
          predictedWinner: JSON.stringify({
            homeCode: matchup.home,
            awayCode: matchup.away,
            winnerCode: code
          })
        });
      }
    });
    if (activeWinners.final[0]) {
      const scores = activeScores[`final-0`] || { home: "", away: "" };
      const matchup = koMatchups.final[0] || { home: null, away: null };
      payload.push({
        matchId: 500,
        type: koType,
        predictedTeamId: teamCodeToInt(activeWinners.final[0]),
        predictedHomeScore: scores.home !== "" ? Number(scores.home) : null,
        predictedAwayScore: scores.away !== "" ? Number(scores.away) : null,
        predictedWinner: JSON.stringify({
          homeCode: matchup.home,
          awayCode: matchup.away,
          winnerCode: activeWinners.final[0]
        })
      });
    }
    if (activeThirdWinner) {
      const getLoser = (sfIdx: number) => {
        const matchup = koMatchups.sf[sfIdx];
        const winner = activeWinners.sf[sfIdx];
        if (!matchup || !winner) return null;
        return matchup.home === winner ? matchup.away : matchup.home;
      };
      payload.push({
        matchId: 501,
        type: koType,
        predictedTeamId: teamCodeToInt(activeThirdWinner),
        predictedHomeScore: activeThirdScores.home !== "" ? Number(activeThirdScores.home) : null,
        predictedAwayScore: activeThirdScores.away !== "" ? Number(activeThirdScores.away) : null,
        predictedWinner: JSON.stringify({
          homeCode: getLoser(0),
          awayCode: getLoser(1),
          winnerCode: activeThirdWinner
        })
      });
    }

    const metadataSlot = targetSlot !== null ? targetSlot : 0;
    const slotName = metadataSlot === 0 ? "Official Prediction" : (slotNames[metadataSlot] || `Save Slot ${metadataSlot}`);
    const summary = getPredictionSummary(
      updatedMatches,
      activeWinners,
      activeScores,
      activeThirdWinner,
      activeThirdScores
    );
    payload.push({
      matchId: 999000 + metadataSlot,
      type: "SLOT_METADATA",
      predictedWinner: JSON.stringify({
        name: slotName,
        updatedAt: new Date().toISOString(),
        summary
      })
    });

    try {
      await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await fetchAllUserPredictions();
    } catch (err) {
      console.error("Failed to save predictions in bulk", err);
    }
  };

  // Handle score input change
  const handleScoreChange = (matchId: string, side: "home" | "away", val: string) => {
    disableRealScoresState();
    const score = val === "" ? "" : Math.max(0, parseInt(val) || 0);
    setMatches((prev) =>
      prev.map((m) => {
        if (m.id === matchId) {
          return {
            ...m,
            homeScore: side === "home" ? score : m.homeScore,
            awayScore: side === "away" ? score : m.awayScore,
          };
        }
        return m;
      })
    );
  };


  // Standings calculator
  const standings = useMemo(() => {
    const data: Record<string, Record<string, TeamStanding>> = {};

    Object.entries(GROUPS_CONFIG).forEach(([group, codes]) => {
      data[group] = {};
      codes.forEach((code) => {
        data[group][code] = {
          code,
          group,
          team: getTeam(code),
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          gf: 0,
          ga: 0,
          gd: 0,
          pts: 0,
        };
      });
    });

    matches.forEach((m) => {
      const g = m.group;
      const h = m.homeCode;
      const a = m.awayCode;

      if (hasAssignedMatchScores(m)) {
        const hs = Number(m.homeScore);
        const as = Number(m.awayScore);

        data[g][h].played += 1;
        data[g][a].played += 1;
        data[g][h].gf += hs;
        data[g][h].ga += as;
        data[g][a].gf += as;
        data[g][a].ga += hs;
        data[g][h].gd = data[g][h].gf - data[g][h].ga;
        data[g][a].gd = data[g][a].gf - data[g][a].ga;

        if (hs > as) {
          data[g][h].won += 1;
          data[g][h].pts += 3;
          data[g][a].lost += 1;
        } else if (hs < as) {
          data[g][a].won += 1;
          data[g][a].pts += 3;
          data[g][h].lost += 1;
        } else {
          data[g][h].drawn += 1;
          data[g][h].pts += 1;
          data[g][a].drawn += 1;
          data[g][a].pts += 1;
        }
      }
    });

    const sorted: Record<string, TeamStanding[]> = {};
    Object.entries(data).forEach(([group, groupTeams]) => {
      sorted[group] = Object.values(groupTeams).sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.gd !== a.gd) return b.gd - a.gd;
        if (b.gf !== a.gf) return b.gf - a.gf;
        return (b.team.elo || 0) - (a.team.elo || 0);
      });
    });

    return sorted;
  }, [matches]);

  // Collect the 3rd place teams and rank them
  const thirdPlaceStandings = useMemo(() => {
    const list: TeamStanding[] = [];
    Object.entries(standings).forEach(([group, listTeams]) => {
      if (listTeams[2]) list.push(listTeams[2]);
    });
    return list.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return (b.team.elo || 0) - (a.team.elo || 0);
    });
  }, [standings]);

  // Check if all group stage matches have scores predicted
  const isGroupStageComplete = useMemo(() => {
    return matches.every((m) => hasAssignedMatchScores(m));
  }, [matches]);

  // Seeding R32 qualified teams
  const r32Teams = useMemo(() => {
    // Seeding is always active, falling back to static ELO-sorted standings if incomplete

    const winners = Object.keys(standings).map((g) => standings[g][0].code);
    const runnersUp = Object.keys(standings).map((g) => standings[g][1].code);
    const bestThirdPlaces = thirdPlaceStandings.slice(0, 8).map((t) => t.code);

    const getWinner = (grp: string) => standings[grp][0].code;
    const getRunner = (grp: string) => standings[grp][1].code;
    const getThird = (idx: number) => bestThirdPlaces[idx] || "ARG";

    return [
      { home: getWinner("A"), away: getThird(7) },
      { home: getRunner("B"), away: getRunner("C") },
      { home: getWinner("C"), away: getThird(6) },
      { home: getRunner("D"), away: getRunner("E") },
      { home: getWinner("E"), away: getThird(5) },
      { home: getRunner("F"), away: getRunner("G") },
      { home: getWinner("G"), away: getThird(4) },
      { home: getRunner("H"), away: getRunner("I") },
      { home: getWinner("B"), away: getThird(3) },
      { home: getRunner("A"), away: getRunner("J") },
      { home: getWinner("D"), away: getThird(2) },
      { home: getRunner("K"), away: getRunner("L") },
      { home: getWinner("F"), away: getThird(1) },
      { home: getWinner("H"), away: getThird(0) },
      { home: getWinner("I"), away: getWinner("J") },
      { home: getWinner("K"), away: getWinner("L") },
    ];
  }, [isGroupStageComplete, standings, thirdPlaceStandings]);

  const koMatchups = useMemo(() => {
    const matchups: Record<string, { home: string | null; away: string | null }[]> = {
      r32: [], r16: [], qf: [], sf: [], final: [],
    };

    matchups.r32 = r32Teams.map((pair) => ({
      home: pair?.home ?? null,
      away: pair?.away ?? null,
    }));

    for (let i = 0; i < 8; i++) {
      matchups.r16.push({ home: koWinners.r32[2 * i] ?? null, away: koWinners.r32[2 * i + 1] ?? null });
    }
    for (let i = 0; i < 4; i++) {
      matchups.qf.push({ home: koWinners.r16[2 * i] ?? null, away: koWinners.r16[2 * i + 1] ?? null });
    }
    for (let i = 0; i < 2; i++) {
      matchups.sf.push({ home: koWinners.qf[2 * i] ?? null, away: koWinners.qf[2 * i + 1] ?? null });
    }
    matchups.final.push({ home: koWinners.sf[0] ?? null, away: koWinners.sf[1] ?? null });

    return matchups;
  }, [r32Teams, koWinners]);

  const topTeamsData = useMemo(() => {
    const isEliminated = (teamCode: string) => {
      if (koWinners.final[0] && koWinners.final[0] !== teamCode) return true;
      for (const round of ["r32", "r16", "qf", "sf", "final"] as const) {
        for (let i = 0; i < koMatchups[round].length; i++) {
          const match = koMatchups[round][i];
          if (match.home === teamCode || match.away === teamCode) {
            const winner = koWinners[round][i];
            if (winner !== null && winner !== teamCode) {
              return true;
            }
          }
        }
      }
      return false;
    };

    const isQualified = (teamCode: string) => {
      if (!isGroupStageComplete) return true;
      return r32Teams.some(m => m.home === teamCode || m.away === teamCode);
    };

    const isTeamEliminated = (teamCode: string) => {
      if (!isQualified(teamCode)) return true;
      return isEliminated(teamCode);
    };

    const aliveTeams = teams.filter(t => !isTeamEliminated(t.code));
    const totalAliveProb = aliveTeams.reduce((sum, t) => sum + t.prob.champion, 0) || 1;

    return [...teams]
      .map(t => {
        const eliminated = isTeamEliminated(t.code);
        // Normalized probability for alive teams, 0 for eliminated teams
        const winProb = eliminated ? 0 : (t.prob.champion / totalAliveProb) * 100;
        return {
          name: t.name,
          code: t.code,
          flag: t.flag,
          winProb: Number(winProb.toFixed(1)),
          isEliminated: eliminated
        };
      })
      .sort((a, b) => {
        if (a.isEliminated !== b.isEliminated) {
          return a.isEliminated ? 1 : -1;
        }
        return b.winProb - a.winProb;
      })
      .slice(0, 8);
  }, [teams, koMatchups, koWinners, r32Teams, isGroupStageComplete]);

  // Computed losers of SF for the 3rd place match
  const sfLosers = useMemo(() => {
    const homeMatch = koMatchups.sf[0];
    const awayMatch = koMatchups.sf[1];
    const homeWinner = koWinners.sf[0];
    const awayWinner = koWinners.sf[1];

    let homeLoser: string | null = null;
    let awayLoser: string | null = null;

    if (homeMatch?.home && homeMatch?.away && homeWinner) {
      homeLoser = homeWinner === homeMatch.home ? homeMatch.away : homeMatch.home;
    }
    if (awayMatch?.home && awayMatch?.away && awayWinner) {
      awayLoser = awayWinner === awayMatch.home ? awayMatch.away : awayMatch.home;
    }
    return { home: homeLoser, away: awayLoser };
  }, [koMatchups.sf, koWinners.sf]);

  const handleSelectKoWinner = (round: "r32" | "r16" | "qf" | "sf" | "final", matchIndex: number, teamCode: string) => {
    // Determine default scores if empty
    const currentScores = koScores[`${round}-${matchIndex}`] || { home: "", away: "" };
    let newHomeScore = currentScores.home;
    let newAwayScore = currentScores.away;

    // Check which team is home vs away
    const match = koMatchups[round][matchIndex];
    if (newHomeScore === "" || newAwayScore === "" || newHomeScore === newAwayScore) {
      if (teamCode === match.home) {
        newHomeScore = 2;
        newAwayScore = 1;
      } else {
        newHomeScore = 1;
        newAwayScore = 2;
      }
    }

    const nextScores = {
      ...koScores,
      [`${round}-${matchIndex}`]: { home: newHomeScore, away: newAwayScore }
    };
    setKoScores(nextScores);

    setKoWinners((prev) => {
      const next = { ...prev };
      next[round] = [...prev[round]];
      if (next[round][matchIndex] === teamCode) return prev;
      next[round][matchIndex] = teamCode;

      // Handle bracket dependency resets
      if (round === "r32") {
        const r16Index = Math.floor(matchIndex / 2);
        next.r16 = [...prev.r16]; next.r16[r16Index] = null;
        const qfIndex = Math.floor(r16Index / 2);
        next.qf = [...prev.qf]; next.qf[qfIndex] = null;
        const sfIndex = Math.floor(qfIndex / 2);
        next.sf = [...prev.sf]; next.sf[sfIndex] = null;
        next.final = [null];
        setThirdWinner(null);
        setThirdScores({ home: "", away: "" });
      } else if (round === "r16") {
        const qfIndex = Math.floor(matchIndex / 2);
        next.qf = [...prev.qf]; next.qf[qfIndex] = null;
        const sfIndex = Math.floor(qfIndex / 2);
        next.sf = [...prev.sf]; next.sf[sfIndex] = null;
        next.final = [null];
        setThirdWinner(null);
        setThirdScores({ home: "", away: "" });
      } else if (round === "qf") {
        const sfIndex = Math.floor(matchIndex / 2);
        next.sf = [...prev.sf]; next.sf[sfIndex] = null;
        next.final = [null];
        setThirdWinner(null);
        setThirdScores({ home: "", away: "" });
      } else if (round === "sf") {
        next.final = [null];
        setThirdWinner(null);
        setThirdScores({ home: "", away: "" });
      }

      // Save prediction to DB
      let dbMatchId = 100;
      if (round === "r32") dbMatchId = 100 + matchIndex;
      else if (round === "r16") dbMatchId = 200 + matchIndex;
      else if (round === "qf") dbMatchId = 300 + matchIndex;
      else if (round === "sf") dbMatchId = 400 + matchIndex;
      else if (round === "final") dbMatchId = 500;
      savePredictionToDb(dbMatchId, "KNOCKOUT_WINNER", newHomeScore, newAwayScore, teamCode);

      return next;
    });
  };

  const advanceWinner = (
    round: "r32" | "r16" | "qf" | "sf" | "final",
    matchIndex: number,
    teamCode: string,
    currentKoScores: typeof koScores
  ) => {
    setKoWinners((prev) => {
      const next = { ...prev };
      if (next[round][matchIndex] === teamCode) return prev;
      next[round][matchIndex] = teamCode;

      // Reset subsequent rounds
      if (round === "r32") {
        const r16Index = Math.floor(matchIndex / 2);
        next.r16 = [...prev.r16]; next.r16[r16Index] = null;
        const qfIndex = Math.floor(r16Index / 2);
        next.qf = [...prev.qf]; next.qf[qfIndex] = null;
        const sfIndex = Math.floor(qfIndex / 2);
        next.sf = [...prev.sf]; next.sf[sfIndex] = null;
        next.final = [null];
        setThirdWinner(null);
        setThirdScores({ home: "", away: "" });
      } else if (round === "r16") {
        const qfIndex = Math.floor(matchIndex / 2);
        next.qf = [...prev.qf]; next.qf[qfIndex] = null;
        const sfIndex = Math.floor(qfIndex / 2);
        next.sf = [...prev.sf]; next.sf[sfIndex] = null;
        next.final = [null];
        setThirdWinner(null);
        setThirdScores({ home: "", away: "" });
      } else if (round === "qf") {
        const sfIndex = Math.floor(matchIndex / 2);
        next.sf = [...prev.sf]; next.sf[sfIndex] = null;
        next.final = [null];
        setThirdWinner(null);
        setThirdScores({ home: "", away: "" });
      } else if (round === "sf") {
        next.final = [null];
        setThirdWinner(null);
        setThirdScores({ home: "", away: "" });
      }

      // Save prediction to DB
      let dbMatchId = 100;
      if (round === "r32") dbMatchId = 100 + matchIndex;
      else if (round === "r16") dbMatchId = 200 + matchIndex;
      else if (round === "qf") dbMatchId = 300 + matchIndex;
      else if (round === "sf") dbMatchId = 400 + matchIndex;
      else if (round === "final") dbMatchId = 500;

      const scores = currentKoScores[`${round}-${matchIndex}`] || { home: "", away: "" };
      savePredictionToDb(dbMatchId, "KNOCKOUT_WINNER", scores.home, scores.away, teamCode);

      return next;
    });
  };

  const handleKoScoreChange = (
    round: "r32" | "r16" | "qf" | "sf" | "final",
    matchIndex: number,
    side: "home" | "away",
    val: string
  ) => {
    const scoreVal = val === "" ? "" : Math.max(0, parseInt(val) || 0);
    const currentScores = koScores[`${round}-${matchIndex}`] || { home: "", away: "" };
    const newScores = {
      ...currentScores,
      [side]: scoreVal,
    };

    const updatedScores = {
      ...koScores,
      [`${round}-${matchIndex}`]: newScores,
    };
    setKoScores(updatedScores);

    // Auto-advance if scores are valid and not equal
    const match = koMatchups[round][matchIndex];
    if (newScores.home !== "" && newScores.away !== "" && match.home && match.away) {
      if (newScores.home > newScores.away) {
        advanceWinner(round, matchIndex, match.home, updatedScores);
      } else if (newScores.away > newScores.home) {
        advanceWinner(round, matchIndex, match.away, updatedScores);
      }
    }
  };

  const handleSelectThirdWinner = (teamCode: string) => {
    let newHomeScore = thirdScores.home;
    let newAwayScore = thirdScores.away;
    const homeThird = sfLosers.home;
    const awayThird = sfLosers.away;

    if (newHomeScore === "" || newAwayScore === "" || newHomeScore === newAwayScore) {
      if (teamCode === homeThird) {
        newHomeScore = 2;
        newAwayScore = 1;
      } else {
        newHomeScore = 1;
        newAwayScore = 2;
      }
    }

    const nextThirdScores = { home: newHomeScore, away: newAwayScore };
    setThirdScores(nextThirdScores);
    setThirdWinner(teamCode);
    savePredictionToDb(501, "KNOCKOUT_WINNER", newHomeScore, newAwayScore, teamCode);
  };

  const handleThirdScoreChange = (side: "home" | "away", val: string) => {
    const scoreVal = val === "" ? "" : Math.max(0, parseInt(val) || 0);
    const newScores = {
      ...thirdScores,
      [side]: scoreVal,
    };
    setThirdScores(newScores);

    const homeThird = sfLosers.home;
    const awayThird = sfLosers.away;

    if (newScores.home !== "" && newScores.away !== "" && homeThird && awayThird) {
      let winner = thirdWinner;
      if (newScores.home > newScores.away) {
        winner = homeThird;
      } else if (newScores.away > newScores.home) {
        winner = awayThird;
      }
      if (winner) {
        setThirdWinner(winner);
        savePredictionToDb(501, "KNOCKOUT_WINNER", newScores.home, newScores.away, winner);
      }
    }
  };

  const simulateKoMatch = (home: string, away: string) => {
    const liveScore = getAssignedLiveScoreForKoMatch(home, away);
    if (liveScore) {
      const hs = liveScore.homeScore;
      const as = liveScore.awayScore;
      return { hs, as, winner: hs > as ? home : away };
    }

    const homeTeam = getTeam(home);
    const awayTeam = getTeam(away);
    const { homeLambda, awayLambda } = getMatchExpectedGoals(homeTeam, awayTeam, players, selectedModel);
    let hs = getPoisson(homeLambda);
    let as = getPoisson(awayLambda);

    // Knockouts cannot end in a draw!
    if (hs === as) {
      if (Math.random() > 0.5) hs += 1;
      else as += 1;
    }
    return { hs, as, winner: hs > as ? home : away };
  };

  const computeStandingsSync = (currentMatches: PredictorMatch[]) => {
    const data: Record<string, Record<string, TeamStanding>> = {};

    Object.entries(GROUPS_CONFIG).forEach(([group, codes]) => {
      data[group] = {};
      codes.forEach((code) => {
        data[group][code] = {
          code,
          group,
          team: getTeam(code),
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          gf: 0,
          ga: 0,
          gd: 0,
          pts: 0,
        };
      });
    });

    currentMatches.forEach((m) => {
      const g = m.group;
      const h = m.homeCode;
      const a = m.awayCode;

      if (hasAssignedMatchScores(m)) {
        const hs = Number(m.homeScore);
        const as = Number(m.awayScore);

        data[g][h].played += 1;
        data[g][a].played += 1;
        data[g][h].gf += hs;
        data[g][h].ga += as;
        data[g][a].gf += as;
        data[g][a].ga += hs;
        data[g][h].gd = data[g][h].gf - data[g][h].ga;
        data[g][a].gd = data[g][a].gf - data[g][a].ga;

        if (hs > as) {
          data[g][h].won += 1;
          data[g][h].pts += 3;
          data[g][a].lost += 1;
        } else if (hs < as) {
          data[g][a].won += 1;
          data[g][a].pts += 3;
          data[g][h].lost += 1;
        } else {
          data[g][h].drawn += 1;
          data[g][h].pts += 1;
          data[g][a].drawn += 1;
          data[g][a].pts += 1;
        }
      }
    });

    const sorted: Record<string, TeamStanding[]> = {};
    Object.entries(data).forEach(([group, groupTeams]) => {
      sorted[group] = Object.values(groupTeams).sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.gd !== a.gd) return b.gd - a.gd;
        if (b.gf !== a.gf) return b.gf - a.gf;
        return (b.team.elo || 0) - (a.team.elo || 0);
      });
    });

    return sorted;
  };

  const computeThirdPlaceStandingsSync = (currentStandings: Record<string, TeamStanding[]>) => {
    const list: TeamStanding[] = [];
    Object.keys(currentStandings).forEach((g) => {
      list.push(currentStandings[g][2]);
    });
    return list.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return (b.team.elo || 0) - (a.team.elo || 0);
    });
  };

  const computeR32TeamsSync = (currentStandings: Record<string, TeamStanding[]>, thirdPlaces: TeamStanding[]) => {
    const bestThirdPlaces = thirdPlaces.slice(0, 8).map((t) => t.code);

    const getWinner = (grp: string) => currentStandings[grp][0].code;
    const getRunner = (grp: string) => currentStandings[grp][1].code;
    const getThird = (idx: number) => bestThirdPlaces[idx] || "ARG";

    return [
      { home: getWinner("A"), away: getThird(7) },
      { home: getRunner("B"), away: getRunner("C") },
      { home: getWinner("C"), away: getThird(6) },
      { home: getRunner("D"), away: getRunner("E") },
      { home: getWinner("E"), away: getThird(5) },
      { home: getRunner("F"), away: getRunner("G") },
      { home: getWinner("G"), away: getThird(4) },
      { home: getRunner("H"), away: getRunner("I") },
      { home: getWinner("B"), away: getThird(3) },
      { home: getRunner("A"), away: getRunner("J") },
      { home: getWinner("D"), away: getThird(2) },
      { home: getRunner("K"), away: getRunner("L") },
      { home: getWinner("F"), away: getThird(1) },
      { home: getWinner("H"), away: getThird(0) },
      { home: getWinner("I"), away: getWinner("J") },
      { home: getWinner("K"), away: getWinner("L") },
    ];
  };

  const syncKnockoutBracket = (currentMatches: PredictorMatch[]) => {
    const currentStandings = computeStandingsSync(currentMatches);
    const currentThirdPlaces = computeThirdPlaceStandingsSync(currentStandings);
    const r32Pairs = computeR32TeamsSync(currentStandings, currentThirdPlaces);

    const updatedWinners = {
      r32: Array(16).fill(null),
      r16: Array(8).fill(null),
      qf: Array(4).fill(null),
      sf: Array(2).fill(null),
      final: Array(1).fill(null),
    };
    const updatedScores: Record<string, { home: number | ""; away: number | "" }> = {};

    // Simulate R32
    r32Pairs.forEach((pair, idx) => {
      if (!pair.home || !pair.away) return;
      const { hs, as, winner } = simulateKoMatch(pair.home, pair.away);
      updatedWinners.r32[idx] = winner;
      updatedScores[`r32-${idx}`] = { home: hs, away: as };
    });

    // R16
    for (let idx = 0; idx < 8; idx++) {
      const home = updatedWinners.r32[2 * idx];
      const away = updatedWinners.r32[2 * idx + 1];
      if (!home || !away) continue;
      const { hs, as, winner } = simulateKoMatch(home, away);
      updatedWinners.r16[idx] = winner;
      updatedScores[`r16-${idx}`] = { home: hs, away: as };
    }

    // QF
    for (let idx = 0; idx < 4; idx++) {
      const home = updatedWinners.r16[2 * idx];
      const away = updatedWinners.r16[2 * idx + 1];
      if (!home || !away) continue;
      const { hs, as, winner } = simulateKoMatch(home, away);
      updatedWinners.qf[idx] = winner;
      updatedScores[`qf-${idx}`] = { home: hs, away: as };
    }

    // SF
    for (let idx = 0; idx < 2; idx++) {
      const home = updatedWinners.qf[2 * idx];
      const away = updatedWinners.qf[2 * idx + 1];
      if (!home || !away) continue;
      const { hs, as, winner } = simulateKoMatch(home, away);
      updatedWinners.sf[idx] = winner;
      updatedScores[`sf-${idx}`] = { home: hs, away: as };
    }

    // Final
    const homeFinal = updatedWinners.sf[0];
    const awayFinal = updatedWinners.sf[1];
    if (homeFinal && awayFinal) {
      const { hs, as, winner } = simulateKoMatch(homeFinal, awayFinal);
      updatedWinners.final[0] = winner;
      updatedScores[`final-0`] = { home: hs, away: as };
    }

    // 3rd Place Match
    const homeMatch = { home: updatedWinners.qf[0], away: updatedWinners.qf[1] };
    const awayMatch = { home: updatedWinners.qf[2], away: updatedWinners.qf[3] };
    const homeWinner = updatedWinners.sf[0];
    const awayWinner = updatedWinners.sf[1];

    let homeLoser: string | null = null;
    let awayLoser: string | null = null;

    if (homeMatch.home && homeMatch.away && homeWinner) {
      homeLoser = homeWinner === homeMatch.home ? homeMatch.away : homeMatch.home;
    }
    if (awayMatch.home && awayMatch.away && awayWinner) {
      awayLoser = awayWinner === awayMatch.home ? awayMatch.away : awayMatch.home;
    }

    let simulatedThirdWinner: string | null = null;
    let simulatedThirdScores: { home: number | ""; away: number | "" } = { home: "", away: "" };

    if (homeLoser && awayLoser) {
      const { hs, as, winner } = simulateKoMatch(homeLoser, awayLoser);
      simulatedThirdWinner = winner;
      simulatedThirdScores = { home: hs, away: as };
    }

    setKoWinners(updatedWinners);
    setKoScores(updatedScores);
    setThirdWinner(simulatedThirdWinner);
    setThirdScores(simulatedThirdScores);

    saveBulkToDb(currentMatches, updatedWinners, updatedScores, simulatedThirdWinner, simulatedThirdScores);
  };

  const handleWholeTournamentSimulation = () => {
    disableRealScoresState();
    const targetGroups = selectedGroups.length > 0 ? selectedGroups : Object.keys(GROUPS_CONFIG);
    const predictedMatches = matches.map((m) => {
      if (!targetGroups.includes(m.group)) return m;
      const homeTeam = getTeam(m.homeCode);
      const awayTeam = getTeam(m.awayCode);
      const { homeLambda, awayLambda } = getMatchExpectedGoals(homeTeam, awayTeam, players, selectedModel);
      return {
        ...m,
        homeScore: getPoisson(homeLambda),
        awayScore: getPoisson(awayLambda),
      };
    });

    const currentStandings = computeStandingsSync(predictedMatches);
    const thirdPlaces = computeThirdPlaceStandingsSync(currentStandings);
    const r32Pairs = computeR32TeamsSync(currentStandings, thirdPlaces);

    const updatedWinners = {
      r32: Array(16).fill(null),
      r16: Array(8).fill(null),
      qf: Array(4).fill(null),
      sf: Array(2).fill(null),
      final: Array(1).fill(null),
    };
    const updatedScores: Record<string, { home: number | ""; away: number | "" }> = {};

    // Simulate R32
    r32Pairs.forEach((m, idx) => {
      if (!m.home || !m.away) return;
      const { hs, as, winner } = simulateKoMatch(m.home, m.away);
      updatedWinners.r32[idx] = winner;
      updatedScores[`r32-${idx}`] = { home: hs, away: as };
    });

    // R16
    for (let idx = 0; idx < 8; idx++) {
      const home = updatedWinners.r32[2 * idx];
      const away = updatedWinners.r32[2 * idx + 1];
      if (!home || !away) continue;
      const { hs, as, winner } = simulateKoMatch(home, away);
      updatedWinners.r16[idx] = winner;
      updatedScores[`r16-${idx}`] = { home: hs, away: as };
    }

    // QF
    for (let idx = 0; idx < 4; idx++) {
      const home = updatedWinners.r16[2 * idx];
      const away = updatedWinners.r16[2 * idx + 1];
      if (!home || !away) continue;
      const { hs, as, winner } = simulateKoMatch(home, away);
      updatedWinners.qf[idx] = winner;
      updatedScores[`qf-${idx}`] = { home: hs, away: as };
    }

    // SF
    for (let idx = 0; idx < 2; idx++) {
      const home = updatedWinners.qf[2 * idx];
      const away = updatedWinners.qf[2 * idx + 1];
      if (!home || !away) continue;
      const { hs, as, winner } = simulateKoMatch(home, away);
      updatedWinners.sf[idx] = winner;
      updatedScores[`sf-${idx}`] = { home: hs, away: as };
    }

    // Final
    const homeFinal = updatedWinners.sf[0];
    const awayFinal = updatedWinners.sf[1];
    if (homeFinal && awayFinal) {
      const { hs, as, winner } = simulateKoMatch(homeFinal, awayFinal);
      updatedWinners.final[0] = winner;
      updatedScores[`final-0`] = { home: hs, away: as };
    }

    // 3rd Place Match
    const homeMatch = { home: updatedWinners.qf[0], away: updatedWinners.qf[1] };
    const awayMatch = { home: updatedWinners.qf[2], away: updatedWinners.qf[3] };
    const homeWinner = updatedWinners.sf[0];
    const awayWinner = updatedWinners.sf[1];

    let homeLoser: string | null = null;
    let awayLoser: string | null = null;

    if (homeMatch.home && homeMatch.away && homeWinner) {
      homeLoser = homeWinner === homeMatch.home ? homeMatch.away : homeMatch.home;
    }
    if (awayMatch.home && awayMatch.away && awayWinner) {
      awayLoser = awayWinner === awayMatch.home ? awayMatch.away : awayMatch.home;
    }

    let simulatedThirdWinner: string | null = null;
    let simulatedThirdScores: { home: number | ""; away: number | "" } = { home: "", away: "" };

    if (homeLoser && awayLoser) {
      const { hs, as, winner } = simulateKoMatch(homeLoser, awayLoser);
      simulatedThirdWinner = winner;
      simulatedThirdScores = { home: hs, away: as };
    }

    setMatches(predictedMatches);
    setKoWinners(updatedWinners);
    setKoScores(updatedScores);
    setThirdWinner(simulatedThirdWinner);
    setThirdScores(simulatedThirdScores);

    saveBulkToDb(predictedMatches, updatedWinners, updatedScores, simulatedThirdWinner, simulatedThirdScores);
    setSelectedGroups([]);
  };

  const handleWholeTournamentSimulationWithCredits = async () => {
    const allowed = await consumeCredit();
    if (allowed) {
      handleWholeTournamentSimulation();
    }
  };

  // AI Poisson Predict
  const handleAiPredict = () => {
    disableRealScoresState();
    const targetGroups = selectedGroups.length > 0 ? selectedGroups : Object.keys(GROUPS_CONFIG);
    const predicted = matches.map((m) => {
      if (!targetGroups.includes(m.group)) return m;
      const homeTeam = getTeam(m.homeCode);
      const awayTeam = getTeam(m.awayCode);
      const { homeLambda, awayLambda } = getMatchExpectedGoals(homeTeam, awayTeam, players, selectedModel);
      return {
        ...m,
        homeScore: getPoisson(homeLambda),
        awayScore: getPoisson(awayLambda),
      };
    });
    setMatches(predicted);

    const clearedWinners = {
      r32: Array(16).fill(null),
      r16: Array(8).fill(null),
      qf: Array(4).fill(null),
      sf: Array(2).fill(null),
      final: Array(1).fill(null),
    };
    setKoWinners(clearedWinners);
    setKoScores({});
    setThirdWinner(null);
    setThirdScores({ home: "", away: "" });

    saveBulkToDb(predicted, clearedWinners, {}, null, { home: "", away: "" });
    setSelectedGroups([]);
  };

  // Wild Random scores
  const handleRandomize = () => {
    disableRealScoresState();
    const targetGroups = selectedGroups.length > 0 ? selectedGroups : Object.keys(GROUPS_CONFIG);
    const random = matches.map((m) => {
      if (!targetGroups.includes(m.group)) return m;
      return {
        ...m,
        homeScore: Math.floor(Math.random() * 5),
        awayScore: Math.floor(Math.random() * 5),
      };
    });
    setMatches(random);

    const clearedWinners = {
      r32: Array(16).fill(null),
      r16: Array(8).fill(null),
      qf: Array(4).fill(null),
      sf: Array(2).fill(null),
      final: Array(1).fill(null),
    };
    setKoWinners(clearedWinners);
    setKoScores({});
    setThirdWinner(null);
    setThirdScores({ home: "", away: "" });

    saveBulkToDb(random, clearedWinners, {}, null, { home: "", away: "" });
    setSelectedGroups([]);
  };

  // Clear Board
  const handleReset = () => {
    disableRealScoresState();
    const resetMatches = matches.map(clearPredictorMatchScores);
    setMatches(resetMatches);

    const clearedWinners = {
      r32: Array(16).fill(null),
      r16: Array(8).fill(null),
      qf: Array(4).fill(null),
      sf: Array(2).fill(null),
      final: Array(1).fill(null),
    };
    setKoWinners(clearedWinners);
    setKoScores({});
    setThirdWinner(null);
    setThirdScores({ home: "", away: "" });
    saveBulkToDb(resetMatches, clearedWinners, {}, null, { home: "", away: "" });
  };


  const handleSimulateRound = (round: "r32" | "r16" | "qf" | "sf" | "final") => {
    const updatedWinners = { ...koWinners };
    const updatedScores = { ...koScores };
    let simulatedThirdWinner = thirdWinner;
    let simulatedThirdScores = { ...thirdScores };

    const matchups = koMatchups[round];
    matchups.forEach((m, idx) => {
      if (!m.home || !m.away) return;
      const { hs, as, winner } = simulateKoMatch(m.home, m.away);
      updatedWinners[round][idx] = winner;
      updatedScores[`${round}-${idx}`] = { home: hs, away: as };
    });

    // Reset subsequent rounds
    if (round === "r32") {
      updatedWinners.r16 = Array(8).fill(null);
      updatedWinners.qf = Array(4).fill(null);
      updatedWinners.sf = Array(2).fill(null);
      updatedWinners.final = [null];
      simulatedThirdWinner = null;
      simulatedThirdScores = { home: "", away: "" };
    } else if (round === "r16") {
      updatedWinners.qf = Array(4).fill(null);
      updatedWinners.sf = Array(2).fill(null);
      updatedWinners.final = [null];
      simulatedThirdWinner = null;
      simulatedThirdScores = { home: "", away: "" };
    } else if (round === "qf") {
      updatedWinners.sf = Array(2).fill(null);
      updatedWinners.final = [null];
      simulatedThirdWinner = null;
      simulatedThirdScores = { home: "", away: "" };
    } else if (round === "sf") {
      updatedWinners.final = [null];
      simulatedThirdWinner = null;
      simulatedThirdScores = { home: "", away: "" };
    } else if (round === "final") {
      // Simulate 3rd place match as well if semi-final losers are available
      const homeMatch = koMatchups.sf[0];
      const awayMatch = koMatchups.sf[1];
      const homeWinner = updatedWinners.sf[0];
      const awayWinner = updatedWinners.sf[1];

      let homeLoser: string | null = null;
      let awayLoser: string | null = null;

      if (homeMatch.home && homeMatch.away && homeWinner) {
        homeLoser = homeWinner === homeMatch.home ? homeMatch.away : homeMatch.home;
      }
      if (awayMatch.home && awayMatch.away && awayWinner) {
        awayLoser = awayWinner === awayMatch.home ? awayMatch.away : awayMatch.home;
      }

      if (homeLoser && awayLoser) {
        const { hs, as, winner } = simulateKoMatch(homeLoser, awayLoser);
        simulatedThirdWinner = winner;
        simulatedThirdScores = { home: hs, away: as };
      }
    }

    setThirdWinner(simulatedThirdWinner);
    setThirdScores(simulatedThirdScores);
    setKoScores(updatedScores);
    setKoWinners(updatedWinners);
    saveBulkToDb(matches, updatedWinners, updatedScores, simulatedThirdWinner, simulatedThirdScores);
  };

  // AI Predict knockouts
  const handleAiPredictKnockouts = (forceOverwrite = false) => {
    let finalMatches = matches;
    if (forceOverwrite) {
      setUseRealScores(true);
      finalMatches = matches.map((m) => {
        const liveScore = getAssignedLiveScoreForMatch(m);
        if (liveScore) {
          return {
            ...m,
            homeScore: liveScore.homeScore,
            awayScore: liveScore.awayScore,
          };
        }
        if (hasAssignedMatchScores(m)) {
          return m;
        }
        const homeTeam = getTeam(m.homeCode);
        const awayTeam = getTeam(m.awayCode);
        const { homeLambda, awayLambda } = getMatchExpectedGoals(homeTeam, awayTeam, players, selectedModel);
        return {
          ...m,
          homeScore: getPoisson(homeLambda),
          awayScore: getPoisson(awayLambda),
        };
      });
      setMatches(finalMatches);
    }

    const currentStandings = forceOverwrite ? computeStandingsSync(finalMatches) : standings;
    const currentThirdPlaces = forceOverwrite ? computeThirdPlaceStandingsSync(currentStandings) : thirdPlaceStandings;
    const r32Pairs = forceOverwrite ? computeR32TeamsSync(currentStandings, currentThirdPlaces) : r32Teams;

    const updatedWinners = forceOverwrite ? {
      r32: Array(16).fill(null),
      r16: Array(8).fill(null),
      qf: Array(4).fill(null),
      sf: Array(2).fill(null),
      final: Array(1).fill(null),
    } : { ...koWinners };
    const updatedScores = forceOverwrite ? {} : { ...koScores };

    // Simulate R32 if needed
    const pairs = forceOverwrite ? r32Pairs : koMatchups.r32;
    pairs.forEach((m, idx) => {
      if (!m.home || !m.away) return;
      if (!updatedWinners.r32[idx]) {
        const { hs, as, winner } = simulateKoMatch(m.home, m.away);
        updatedWinners.r32[idx] = winner;
        updatedScores[`r32-${idx}`] = { home: hs, away: as };
      }
    });

    // R16
    for (let idx = 0; idx < 8; idx++) {
      const home = updatedWinners.r32[2 * idx];
      const away = updatedWinners.r32[2 * idx + 1];
      if (!home || !away) continue;
      if (!updatedWinners.r16[idx]) {
        const { hs, as, winner } = simulateKoMatch(home, away);
        updatedWinners.r16[idx] = winner;
        updatedScores[`r16-${idx}`] = { home: hs, away: as };
      }
    }

    // QF
    for (let idx = 0; idx < 4; idx++) {
      const home = updatedWinners.r16[2 * idx];
      const away = updatedWinners.r16[2 * idx + 1];
      if (!home || !away) continue;
      if (!updatedWinners.qf[idx]) {
        const { hs, as, winner } = simulateKoMatch(home, away);
        updatedWinners.qf[idx] = winner;
        updatedScores[`qf-${idx}`] = { home: hs, away: as };
      }
    }

    // SF
    for (let idx = 0; idx < 2; idx++) {
      const home = updatedWinners.qf[2 * idx];
      const away = updatedWinners.qf[2 * idx + 1];
      if (!home || !away) continue;
      if (!updatedWinners.sf[idx]) {
        const { hs, as, winner } = simulateKoMatch(home, away);
        updatedWinners.sf[idx] = winner;
        updatedScores[`sf-${idx}`] = { home: hs, away: as };
      }
    }

    // Final
    const homeFinal = updatedWinners.sf[0];
    const awayFinal = updatedWinners.sf[1];
    if (homeFinal && awayFinal) {
      if (!updatedWinners.final[0]) {
        const { hs, as, winner } = simulateKoMatch(homeFinal, awayFinal);
        updatedWinners.final[0] = winner;
        updatedScores[`final-0`] = { home: hs, away: as };
      }
    }

    // 3rd Place Match
    let simulatedThirdWinner = forceOverwrite ? null : thirdWinner;
    let simulatedThirdScores: { home: number | ""; away: number | ""; } = forceOverwrite ? { home: "", away: "" } : { ...thirdScores };

    const homeMatch = { home: updatedWinners.qf[0], away: updatedWinners.qf[1] };
    const awayMatch = { home: updatedWinners.qf[2], away: updatedWinners.qf[3] };
    const homeWinner = updatedWinners.sf[0];
    const awayWinner = updatedWinners.sf[1];

    let homeLoser: string | null = null;
    let awayLoser: string | null = null;

    if (homeMatch.home && homeMatch.away && homeWinner) {
      homeLoser = homeWinner === homeMatch.home ? homeMatch.away : homeMatch.home;
    }
    if (awayMatch.home && awayMatch.away && awayWinner) {
      awayLoser = awayWinner === awayMatch.home ? awayMatch.away : awayMatch.home;
    }

    if (homeLoser && awayLoser) {
      if (!simulatedThirdWinner) {
        const { hs, as, winner } = simulateKoMatch(homeLoser, awayLoser);
        simulatedThirdWinner = winner;
        simulatedThirdScores = { home: hs, away: as };
      }
    }

    setThirdWinner(simulatedThirdWinner);
    setThirdScores(simulatedThirdScores);
    setKoScores(updatedScores);
    setKoWinners(updatedWinners);
    saveBulkToDb(finalMatches, updatedWinners, updatedScores, simulatedThirdWinner, simulatedThirdScores);
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProgress = async () => {
    if (!session?.user?.id) {
      toast.error("Please sign in to save your progress!");
      return;
    }

    setIsSavesModalOpen(true);
  };

  // Recalculate Knockouts on model change
  const prevModelRef = useRef(selectedModel);
  useEffect(() => {
    if (isInitialized && prevModelRef.current !== selectedModel) {
      prevModelRef.current = selectedModel;

      // Re-calculate the knockout bracket according to the new model
      // We force an overwrite of the knockouts
      handleAiPredictKnockouts(true);
      toast.info(`Bracket re-calculated using ${selectedModel} model`);
    }
  }, [selectedModel, isInitialized]);

  const toolbarButtonClass =
    "inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-[1.2rem] border border-slate-300 bg-white px-4 py-2.5 text-center text-sm font-black text-slate-950 shadow-sm transition-all duration-200 hover:border-transparent hover:bg-gradient-to-r hover:from-[#0a8a45] hover:via-[#2c7c87] hover:to-[#af3fd1] hover:text-white hover:shadow-[0_16px_35px_rgba(44,124,135,0.22)] active:scale-[0.98] dark:border-white/10 dark:bg-slate-900 dark:text-white dark:hover:border-transparent sm:w-auto sm:min-w-[156px]";
  const primaryToolbarButtonClass =
    "inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-[1.2rem] border border-transparent bg-gradient-to-r from-[#0a8a45] via-[#2c7c87] to-[#af3fd1] px-4 py-2.5 text-center text-sm font-black text-white shadow-[0_16px_35px_rgba(44,124,135,0.22)] transition-all duration-200 hover:opacity-95 hover:shadow-[0_20px_40px_rgba(44,124,135,0.28)] active:scale-[0.98] sm:w-auto sm:min-w-[156px]";

  return (
    <div className={`container mx-auto px-4  py-8  transition-all duration-300 ${fullWidth || activeTab === "knockout" ? "container" : "container"}`}>
      {/* Guest Warnings Banner */}
      {!session && (
        <div className="mb-6 p-4 rounded-xl border border-green-600/30 dark:border-green-500/30 bg-green-100/50 dark:bg-green-900/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-semibold text-green-700 dark:text-green-400 flex items-center gap-1.5 text-sm">
              <span>👋 Predicting as a Guest</span>
            </span>
            <p className="text-xs text-muted-foreground dark:text-white/60 mt-0.5">
              Your predictions are currently local. Sign In to save your progress, calculate prediction points, and rank on the global leaderboard!
            </p>
          </div>
          <button
            onClick={() => openAuthModal("signin")}
            className="rounded-lg bg-green-600 dark:bg-green-400 text-white dark:text-green-950 px-4 py-2 text-xs font-bold hover:bg-green-700 dark:hover:bg-green-300 transition w-full sm:w-auto shrink-0"
          >
            Sign In / Sign Up
          </button>
        </div>
      )}

      {/* Top dashboard control bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border dark:border-white/10 pb-6 mb-8">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <Trophy className="h-6 w-6 text-gold" />
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl text-foreground dark:text-white">
              {onlyKnockout ? "Knockout Bracket Builder" : "World Cup 2026 Simulator"}
            </h1>
            {session?.user?.id && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-full dark:text-neon dark:bg-neon/10 dark:border-neon/30 mt-1">
                Active Slot: {currentSlot !== null ? slotNames[currentSlot] : "Official Prediction"}
              </span>
            )}
          </div>
          <p className="mt-1 max-w-[450px] text-sm text-muted-foreground">
            {onlyKnockout
              ? "Build your knockout bracket from the Round of 32 down to the Champion."
              : "Fully interactive 48-team tournament predictor. Set scores, qualify third-places, and build your knockout bracket."
            }
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          {!session ? (
            <div className="text-xs text-muted-foreground mr-2 hidden md:block">
              Guest Sims: <strong className="text-neon">{guestCreditsUsed}</strong> / 3
            </div>
          ) : (
            session.user.subscriptionTier === "free" && (
              <div className="text-xs text-muted-foreground mr-2 hidden md:block">
                Free Sims: <strong className="text-neon">{creditsUsed}</strong> / 5
              </div>
            )
          )}
          <label
            className={`inline-flex min-h-[56px] w-full items-center justify-center gap-3 rounded-[1.2rem] border px-4 py-2.5 text-center text-sm font-black transition-all duration-200 cursor-pointer select-none sm:w-auto sm:min-w-[180px] ${
              useRealScores
                ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-600 dark:text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                : "border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 text-slate-700 dark:text-slate-300 dark:hover:bg-white/5"
            }`}
          >
            <input
              type="checkbox"
              id="toolbar-real-time-data"
              checked={useRealScores}
              onChange={(e) => handleToggleRealScores(e.target.checked)}
              className="h-5 w-5 rounded-md border-slate-300 dark:border-white/20 bg-slate-100 dark:bg-slate-800 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-background cursor-pointer accent-cyan-500 transition-all duration-200 hover:scale-105"
            />
            <div className="flex items-center gap-1.5">
              <Zap className={`h-4 w-4 transition-all duration-300 ${useRealScores ? "text-cyan-500 fill-cyan-500 scale-110 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)] animate-pulse" : "text-slate-400 dark:text-slate-500"}`} />
              <span className="text-xs font-bold leading-none select-none">
                Include Real-Time Data ({globalRealPercent}%)
              </span>
            </div>
          </label>

          {session?.user?.id && (
            <button
              onClick={() => setIsSavesModalOpen(true)}
              className={toolbarButtonClass}
            >
              <FolderOpen className="h-4 w-4 text-cyan-400" />
              Saves Manager
            </button>
          )}

          {onlyKnockout ? (
            <>
              <button
                onClick={() => handleAiPredictKnockoutsWithCredits()}
                className={primaryToolbarButtonClass}
              >
                <Sparkles className="h-4 w-4" />
                Simulate Bracket
              </button>
              <button
                onClick={handleReset}
                className={toolbarButtonClass}
              >
                <RefreshCw className="h-4 w-4" />
                Reset
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setConfirmSimType("all");
                  setConfirmSimGroup(null);
                  setConfirmSimOpen(true);
                }}
                className={primaryToolbarButtonClass}
              >
                <Sparkles className="h-4 w-4" />
                Simulate All
              </button>
              {pendingMatchesCount > 0 && (
                <button
                  onClick={simulatePendingMatches}
                  className={toolbarButtonClass}
                >
                  <Play className="h-4 w-4 text-emerald-400" />
                  Simulate Empty ({pendingMatchesCount})
                </button>
              )}
              <button
                onClick={handleReset}
                className={toolbarButtonClass}
              >
                <RefreshCw className="h-4 w-4" />
                Reset
              </button>
            </>
          )}
        </div>
      </div>

      {/* Highest Possibility Chart */}
      {!onlyKnockout && (
        <div className="w-full mb-8 rounded-3xl p-6 md:p-8 border border-border dark:border-white/5 bg-card dark:bg-[#121623] shadow-sm dark:shadow-lg animate-fade-in">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80 mb-1">
                Live win probability
              </h3>
              <h2 className="font-display text-2xl font-bold text-foreground dark:text-white">Top contenders</h2>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/10 dark:bg-gradient-to-br dark:from-yellow-600/40 dark:to-yellow-900/40 border border-yellow-500/20 dark:border-yellow-600/30">
              <Trophy className="h-6 w-6 text-yellow-500" />
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topTeamsData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6EE7B7" />
                    <stop offset="100%" stopColor="#C084FC" />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="code"
                  tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={12}
                />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: "var(--color-muted)", opacity: 0.15 }}
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 13, boxShadow: "var(--shadow-glass)" }}
                  formatter={(value: any, name: any, props: any) => {
                    const isElim = props?.payload?.isEliminated;
                    return [`${value}%${isElim ? ' (Out)' : ''}`, "Win Probability"];
                  }}
                  labelStyle={{ color: "var(--color-neon)", fontWeight: "bold", marginBottom: 6 }}
                  itemStyle={{ color: "var(--foreground)" }}
                />
                <Bar
                  dataKey="winProb"
                  fill="url(#barGradient)"
                  radius={[10, 10, 10, 10]}
                  barSize={96}
                  minPointSize={15}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            {topTeamsData.slice(0, 4).map((team) => (
              <div
                key={team.code}
                className="flex flex-col items-center justify-center bg-muted/30 dark:bg-white/5 border border-border dark:border-white/10 rounded-2xl py-4 shadow-glass transition-all animate-fade-in"
              >
                <CountryFlag
                  code={team.code}
                  flag={team.flag}
                  name={team.name}
                  className="mb-1 h-6 w-8 rounded object-cover drop-shadow-sm"
                  emojiClassName="mb-1 text-xl leading-none"
                />
                <span className="text-[10px] font-bold text-muted-foreground uppercase">{team.code}</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-[#6EE7B7] mt-1 flex items-center gap-1.5">
                  <span>{team.winProb.toFixed(1)}%</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "group" && (
        <ScoreTrendGraph
          matches={matches}
          predictionMatches={useRealScores && preRealScoresMatches ? preRealScoresMatches : matches}
          teams={teams}
          liveGames={liveGames}
          liveStadiums={liveStadiums}
          getGroupMatchDetails={getGroupMatchDetails}
        />
      )}

      {/* Tab Selectors */}
      {!onlyKnockout && (
        <div className="mb-8 flex flex-col gap-4 border-b border-border dark:border-white/10 md:flex-row md:items-end md:justify-between">
          <div className="flex -mb-[1px]">
            <button
              onClick={() => setActiveTab("group")}
              className={`px-6 py-3 font-display text-lg font-semibold border-b-2 transition ${activeTab === "group"
                ? "border-neon text-neon"
                : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
            >
              Group Stage
            </button>
            {isGroupStageComplete && (
              <button
                onClick={() => setActiveTab("knockout")}
                className={`flex items-center gap-2 px-6 py-3 font-display text-lg font-semibold border-b-2 transition ${activeTab === "knockout"
                  ? "border-neon text-neon"
                  : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
              >
                Knockout Bracket
              </button>
            )}
          </div>

          <div className="md:max-w-md pb-4 md:pb-3 w-full md:w-auto">
            <SimulationEngineBadge model={selectedModel} />
          </div>
        </div>
      )}

      {/* Group Stage View */}
      {activeTab === "group" && (
        <div className="space-y-6">
          {/* Real-life Scores Integrator */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl glass-strong border border-border/40 bg-slate-900/10 dark:bg-black/10 shadow-glass">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
                id="use-actual-scores"
                checked={useRealScores}
                onChange={(e) => handleToggleRealScores(e.target.checked)}
                className="h-5 w-5 rounded-md border-border bg-black/10 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-background cursor-pointer accent-cyan-500"
              />
              <label htmlFor="use-actual-scores" className="text-sm font-semibold text-foreground/90 select-none cursor-pointer">
                Use actual / real-life scores for group stage matches
              </label>
            </div>
            <div className="flex items-center gap-2">
              {pendingMatchesCount > 0 && (
                <button
                  type="button"
                  onClick={simulatePendingMatches}
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-emerald-600 transition hover:bg-emerald-500/15 dark:text-emerald-400"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>Simulate Pending Matches</span>
                </button>
              )}
              {useRealScores && (
                <span className="text-xs font-black text-cyan-500 dark:text-cyan-400 uppercase tracking-widest bg-cyan-500/10 dark:bg-cyan-950/40 px-2.5 py-1 rounded-lg border border-cyan-500/20 shadow-sm animate-pulse">
                  Real-life scores assigned
                </span>
              )}
            </div>
          </div>

          <div className={`grid gap-4 sm:gap-6 ${fullWidth ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"}`}>
            {Object.keys(GROUPS_CONFIG).map((groupName) => {
              const groupMatches = matches.filter((m) => m.group === groupName);
              const groupStandings = standings[groupName];
              const isGroupPredicted = groupMatches.length > 0 && groupMatches.every((m) => hasAssignedMatchScores(m));
              const assignedRealDataMatches = groupMatches.filter((m) => getAssignedLiveScoreForMatch(m)).length;
              const realDataPercent = groupMatches.length > 0
                ? Math.round((assignedRealDataMatches / groupMatches.length) * 100)
                : 0;

              return (
                <div
                  key={groupName}
                  className={`glass-strong rounded-2xl p-4 border flex flex-col justify-between transition duration-300 shadow-glass ${isGroupPredicted
                    ? "border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                    : "border-border hover:border-neon/30"
                    }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="font-display font-bold text-lg text-gradient flex items-center gap-1.5">
                        Group {groupName}
                      </h2>
                      {/* Quick Actions / Status for Single Group */}
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                        {isGroupPredicted ? (
                          <>
                            <span className="text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shadow-sm flex items-center gap-1">
                              <Check className="h-3 w-3" /> {useRealScores && realDataPercent > 0 ? `${realDataPercent}% Real Data` : "Simulated"}
                            </span>
                            <button
                              onClick={() => setDeleteGroupTarget(groupName)}
                              title="Reset Group"
                              className="text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 p-1.5 rounded-full transition"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            {(() => {
                              const groupPending = groupMatches.filter((m) => !hasAssignedMatchScores(m)).length;
                              if (groupPending > 0 && groupPending < groupMatches.length) {
                                return (
                                  <button
                                    onClick={() => simulatePendingGroupMatches(groupName)}
                                    title={`Simulate ${groupPending} pending match${groupPending > 1 ? "es" : ""}`}
                                    className="text-emerald-500 hover:text-emerald-400 hover:underline transition font-black flex items-center gap-1"
                                  >
                                    <Play className="h-3 w-3" />
                                    Simulate Pending ({groupPending})
                                  </button>
                                );
                              }
                              return (
                                <button
                                  onClick={() => {
                                    setConfirmSimType("group");
                                    setConfirmSimGroup(groupName);
                                    setConfirmSimOpen(true);
                                  }}
                                  title="Predict Group"
                                  className="text-cyan-500 hover:text-cyan-400 hover:underline transition font-black"
                                >
                                  Run Simulation
                                </button>
                              );
                            })()}
                          </>
                        )}
                      </div>
                    </div>
                    <table className="w-full text-[11px] sm:text-xs text-left mb-4 border-collapse">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          <th className="pb-1.5 font-medium w-5">#</th>
                          <th className="pb-1.5 font-medium">Team</th>
                          <th className="pb-1.5 font-medium text-center w-10">Elo</th>
                          <th className="pb-1.5 font-medium text-center w-8">Att</th>
                          <th className="pb-1.5 font-medium text-center w-8">Def</th>
                          <th className="pb-1.5 font-medium text-right w-24">Top Player</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupStandings.map((row, idx) => {
                          const qualify = idx < 2;
                          const teamPlayers = getTeamPlayers(row.code);
                          const topPlayer = teamPlayers[0];
                          const topPlayerName = topPlayer ? (topPlayer["Name on Shirt"] || topPlayer["Player Name"]) : "";
                          const rawRating = topPlayer ? (topPlayer["Overall Rating"] || "") : "";
                          const topPlayerRating = (rawRating && String(rawRating).toLowerCase() !== "nan") ? rawRating : "";
                          const topPlayerDisp = topPlayerName ? `${topPlayerName} (${topPlayerRating})` : "N/A";

                          return (
                            <tr
                              key={row.code}
                              className={`border-b border-border/50 dark:border-white/5 last:border-0 ${qualify ? "text-foreground font-medium animate-pulse-ring/10" : "text-muted-foreground"
                                }`}
                            >
                              <td className="py-1">
                                <span
                                  className={`inline-block w-4 h-4 text-[9px] font-bold text-center rounded leading-4 ${idx === 0 ? "bg-neon/20 text-neon" : idx === 1 ? "bg-neon-2/20 text-neon-2" : "bg-muted dark:bg-white/5 text-muted-foreground"
                                    }`}
                                >
                                  {idx + 1}
                                </span>
                              </td>
                              <td className="py-1 truncate flex items-center gap-1.5 max-w-[90px]">
                                <CountryFlag
                                  code={row.team.code}
                                  flag={row.team.flag}
                                  name={row.team.name}
                                  className="h-4 w-6 shrink-0 rounded-[2px] object-cover"
                                  emojiClassName="text-base shrink-0 leading-none"
                                />
                                <span className="truncate">{row.team.name}</span>
                              </td>
                              <td className="py-1 text-center font-mono tabular-nums text-foreground/80 dark:text-white/80">
                                {row.team.elo && Number.isFinite(row.team.elo) ? Math.round(row.team.elo) : "-"}
                              </td>
                              <td className="py-1 text-center font-mono tabular-nums text-foreground/80 dark:text-white/80">
                                {(() => {
                                  const val = row.team.attack;
                                  if (val === undefined || val === null || !Number.isFinite(val)) return "-";
                                  if (val < 10) {
                                    const minM = 0.75;
                                    const maxM = 1.10;
                                    const minR = 50;
                                    const maxR = 95;
                                    const rating = ((val - minM) / (maxM - minM)) * (maxR - minR) + minR;
                                    const rounded = Math.max(15, Math.min(99, Math.round(rating)));
                                    return Number.isFinite(rounded) ? rounded : "-";
                                  }
                                  const rounded = Math.round(val);
                                  return Number.isFinite(rounded) ? rounded : "-";
                                })()}
                              </td>
                              <td className="py-1 text-center font-mono tabular-nums text-foreground/80 dark:text-white/80">
                                {(() => {
                                  const val = row.team.defense;
                                  if (val === undefined || val === null || !Number.isFinite(val)) return "-";
                                  if (val < 10) {
                                    const minM = 0.75;
                                    const maxM = 1.10;
                                    const minR = 50;
                                    const maxR = 95;
                                    const rating = ((val - minM) / (maxM - minM)) * (maxR - minR) + minR;
                                    const rounded = Math.max(15, Math.min(99, Math.round(rating)));
                                    return Number.isFinite(rounded) ? rounded : "-";
                                  }
                                  const rounded = Math.round(val);
                                  return Number.isFinite(rounded) ? rounded : "-";
                                })()}
                              </td>
                              <td className="py-1 text-right text-muted-foreground truncate max-w-[100px]" title={topPlayerDisp}>
                                <span className="text-neon/90 font-medium">{topPlayerName || "N/A"}</span>
                                {topPlayerRating && <span className="text-[10px] ml-1 text-foreground/50 dark:text-white/40">({topPlayerRating})</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="border-t border-border pt-3 space-y-2.5">
                    {groupMatches.map((m) => {
                      const tHome = getTeam(m.homeCode);
                      const tAway = getTeam(m.awayCode);

                      const matchSuffix = parseInt(m.id.split("-")[1]);
                      const details = getGroupMatchDetails(groupName, matchSuffix, liveGames, liveStadiums, m.homeCode, m.awayCode, teams);

                      const isReal = getAssignedLiveScoreForMatch(m);
                      const isSimulated = useRealScores && hasAssignedMatchScores(m) && !isReal;

                      return (
                        <div key={m.id} className="flex items-center justify-between text-xs py-2 border-b border-border last:border-0 hover:bg-black/5 dark:hover:bg-white/5 px-2 rounded-xl transition duration-200 gap-2">
                          {/* Match Info Column */}
                          <div className="flex flex-col text-[9px] text-muted-foreground w-16 shrink-0 leading-tight gap-0.5">
                            <span className="font-semibold text-foreground/75">{details.date}</span>
                            <span>{details.time}</span>
                            {isSimulated ? (
                              <span className="inline-block text-[8px] font-sans px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 w-fit font-bold uppercase tracking-wide">
                                Simulated
                              </span>
                            ) : (
                              useRealScores && isReal && (
                                <span className="inline-block text-[8px] font-sans px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 w-fit font-bold uppercase tracking-wide">
                                  Real
                                </span>
                              )
                            )}
                            <span className="opacity-40">#{details.matchNumber}</span>
                          </div>

                          {/* Match Core (Teams & Score) */}
                          <div className="flex-1 flex items-center justify-center gap-1.5 min-w-0">
                            {/* Home Team */}
                            <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                              <span className="truncate font-semibold text-foreground/90 text-right text-[11px] sm:text-xs">{tHome.name}</span>
                              <CountryFlag
                                code={tHome.code}
                                flag={tHome.flag}
                                name={tHome.name}
                                className="h-4 w-6 shrink-0 rounded-[2px] object-cover"
                                emojiClassName="text-base shrink-0 leading-none"
                              />
                            </div>

                            {/* Score Display */}
                            <div className="flex items-center gap-1 shrink-0 bg-black/10 dark:bg-black/40 px-2 py-1 rounded-lg border border-border font-mono text-xs font-bold w-12 justify-center">
                              <span className={hasValidPredictorScore(m.homeScore) ? "text-neon" : "text-foreground/30"}>
                                {hasValidPredictorScore(m.homeScore) ? m.homeScore : "-"}
                              </span>
                              <span className="text-foreground/30">:</span>
                              <span className={hasValidPredictorScore(m.awayScore) ? "text-neon" : "text-foreground/30"}>
                                {hasValidPredictorScore(m.awayScore) ? m.awayScore : "-"}
                              </span>
                            </div>

                            {/* Away Team */}
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              <CountryFlag
                                code={tAway.code}
                                flag={tAway.flag}
                                name={tAway.name}
                                className="h-4 w-6 shrink-0 rounded-[2px] object-cover"
                                emojiClassName="text-base shrink-0 leading-none"
                              />
                              <span className="truncate font-semibold text-foreground/90 text-[11px] sm:text-xs">{tAway.name}</span>
                            </div>
                          </div>

                          {/* Simulate Match button */}
                          <button
                            onClick={() => handleOpenSimulator({
                              type: "group",
                              id: m.id,
                              homeCode: m.homeCode,
                              awayCode: m.awayCode,
                              homeScore: m.homeScore,
                              awayScore: m.awayScore,
                              details
                            })}
                            title="Simulate Match 1v1"
                            className="p-1.5 bg-muted dark:bg-zinc-800 border border-border dark:border-zinc-700 text-foreground/60 dark:text-muted-foreground hover:bg-neon dark:hover:bg-neon hover:text-black dark:hover:text-black hover:border-neon dark:hover:border-neon hover:scale-105 rounded-xl transition duration-200 shrink-0 ml-1 flex items-center justify-center"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.0" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>



          {/* Third Place Standings Grid */}
          <div className="glass rounded-2xl p-6 border border-white/5 max-w-4xl mx-auto shadow-glass">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-4">
              <div>
                <h3 className="font-display font-bold text-xl flex items-center gap-2">
                  <Award className="h-5 w-5 text-neon" />
                  3rd Place Standings
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  The best 8 third-place teams qualify for the Round of 32. Marked green below.
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 bg-neon rounded-full" /> Qualified (Top 8)
                <span className="w-2.5 h-2.5 bg-destructive rounded-full ml-2" /> Eliminated
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-muted-foreground">
                    <th className="pb-2 font-medium w-12">Rank</th>
                    <th className="pb-2 font-medium w-16 text-center">Group</th>
                    <th className="pb-2 font-medium">Team</th>
                    <th className="pb-2 font-medium text-center w-12">Pld</th>
                    <th className="pb-2 font-medium text-center w-12">GD</th>
                    <th className="pb-2 font-medium text-center w-12">GF</th>
                    <th className="pb-2 font-medium text-right w-16">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {thirdPlaceStandings.map((row, idx) => {
                    const qualified = idx < 8;
                    const borderClass = qualified
                      ? "border-l-4 border-l-neon bg-neon/5 font-semibold"
                      : "border-l-4 border-l-destructive/50 opacity-60";

                    return (
                      <tr
                        key={row.code}
                        className={`border-b border-white/5 hover:bg-white/5 last:border-0 transition ${borderClass}`}
                      >
                        <td className="py-2.5 pl-3 font-semibold">{idx + 1}</td>
                        <td className="py-2.5 text-center font-bold text-gradient">Group {row.group}</td>
                        <td className="py-2.5 flex items-center gap-2">
                          <CountryFlag
                            code={row.team.code}
                            flag={row.team.flag}
                            name={row.team.name}
                            className="h-5 w-7 shrink-0 rounded object-cover"
                            emojiClassName="text-xl leading-none"
                          />
                          <span className="font-medium">{row.team.name}</span>
                        </td>
                        <td className="py-2.5 text-center font-mono">{row.played}</td>
                        <td className="py-2.5 text-center font-mono">
                          {row.gd > 0 ? `+${row.gd}` : row.gd}
                        </td>
                        <td className="py-2.5 text-center font-mono">{row.gf}</td>
                        <td
                          className={`py-2.5 text-right pr-4 font-display font-bold text-base ${qualified ? "text-neon" : "text-muted-foreground"
                            }`}
                        >
                          {row.pts}
                        </td>
                      </tr>
                    );
                  })}
                  {thirdPlaceStandings.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground text-xs">
                        Predict group scores above to populate third-place rankings.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Knockout Bracket View */}
      {activeTab === "knockout" && (
        <div id="knockout-bracket-view" className="space-y-6 md:space-y-8 animate-in slide-in-from-right-8 fade-in duration-500 pt-4">
          {!isGroupStageComplete ? (
            <div className="glass-strong rounded-3xl p-12 text-center max-w-xl mx-auto flex flex-col items-center gap-4 border border-white/10 my-8 shadow-glass bg-black/40">
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground">
                <Lock className="h-8 w-8" />
              </div>
              <h3 className="font-display font-bold text-2xl text-gradient">Knockout Bracket Locked</h3>
              <p className="text-sm text-muted-foreground">
                The Knockout stage requires all 72 group stage matches to have predicted scores before teams can be seeded.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <button
                  onClick={async () => {
                    const allowed = await consumeCredit();
                    if (allowed) {
                      handleAiPredict();
                      setActiveTab("group");
                    }
                  }}
                  className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-neon to-neon-2 px-6 py-2.5 text-sm font-semibold text-background hover:opacity-90 transition shadow-neon"
                >
                  <Sparkles className="h-4 w-4" />
                  Simulate Group Stage with AI
                </button>
                <button
                  onClick={() => setActiveTab("group")}
                  className="rounded-lg glass border border-white/10 px-6 py-2.5 text-sm font-semibold hover:bg-white/5 transition"
                >
                  Predict Manually
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-fade-in">
              {(() => {
                const renderCompactGroupCard = (groupName: string) => {
                  const groupStandings = standings[groupName] || [];
                  return (
                    <div key={groupName} className="w-56 bg-muted/80 dark:bg-black/40 border border-border dark:border-white/5 rounded-2xl p-3 shrink-0 flex flex-col justify-between hover:border-foreground/20 dark:hover:border-white/10 transition duration-200">
                      <div className="text-center font-display font-bold text-xs text-gradient pb-1.5 border-b border-border dark:border-white/5 mb-1.5">
                        Group {groupName}
                      </div>
                      <div className="space-y-1">
                        {groupStandings.map((row, idx) => {
                          const qualify = idx < 2;
                          return (
                            <div key={row.code} className="flex items-center justify-between text-[11px] py-0.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-[10px] text-muted-foreground w-3 text-center">{idx + 1}</span>
                                <CountryFlag
                                  code={row.team.code}
                                  flag={row.team.flag}
                                  name={row.team.name}
                                  className="h-4 w-6 shrink-0 rounded-[2px] object-cover"
                                  emojiClassName="text-sm shrink-0 leading-none"
                                />
                                <span className={`truncate font-medium ${qualify ? "text-neon font-semibold" : "text-muted-foreground"}`}>
                                  {row.team.name}
                                </span>
                              </div>
                              <span className="font-mono text-[9px] text-muted-foreground/60">{row.team.elo && Number.isFinite(row.team.elo) ? Math.round(row.team.elo) : "-"}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                };

                return (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                      <button
                        onClick={() => handleAiPredictKnockoutsWithCredits()}
                        className="flex items-center gap-2 rounded-lg bg-muted dark:bg-white/5 border border-border dark:border-white/10 px-6 py-2.5 text-sm font-semibold hover:bg-muted/80 dark:hover:bg-white/10 transition text-neon shadow-neon"
                      >
                        <Sparkles className="h-4 w-4" />
                        Simulate Remaining Bracket
                      </button>

                      {/* Zoom Controls */}
                      <div className="flex items-center gap-2 bg-muted/50 dark:bg-white/5 border border-border dark:border-white/10 rounded-xl p-1 shrink-0">
                        <button
                          onClick={() => setZoomScale(prev => Math.max(50, prev - 10))}
                          className="p-1.5 rounded-lg hover:bg-card dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition cursor-pointer"
                          title="Zoom Out"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="text-xs font-mono font-bold w-12 text-center text-foreground">
                          {zoomScale}%
                        </span>
                        <button
                          onClick={() => setZoomScale(prev => Math.min(150, prev + 10))}
                          className="p-1.5 rounded-lg hover:bg-card dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition cursor-pointer"
                          title="Zoom In"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setZoomScale(85)}
                          className="text-[10px] font-bold px-2 py-1 rounded-md hover:bg-card dark:hover:bg-white/10 text-neon transition cursor-pointer"
                        >
                          Reset
                        </button>
                      </div>
                    </div>



                    {/* Horizontal Scrollable Bracket Tree */}
                    <div className="w-full select-none border border-border dark:border-white/5 rounded-3xl bg-muted/40 dark:bg-black/20 p-2 md:p-4">
                      <div
                        className="flex gap-4 items-stretch w-full px-2 lg:px-4 py-4 overflow-x-auto scrollbar-custom min-h-[760px] lg:min-h-[820px]"
                        style={{ zoom: zoomScale / 100 }}
                      >

                        {/* Far Left Column: Groups A-F */}
                        <div className="flex flex-col w-56 min-w-[224px] shrink-0 justify-between py-2 gap-2">
                          <div className="text-center font-display font-bold text-xs tracking-wider uppercase text-neon pb-2 border-b border-white/10 mb-2">
                            Groups A - F
                          </div>
                          {["A", "B", "C", "D", "E", "F"].map((groupName) => renderCompactGroupCard(groupName))}
                        </div>

                        {/* Left Column 1: Round of 32 */}
                        <div className="flex flex-col w-56 min-w-[224px] shrink-0 gap-3">
                          <div className="flex items-center justify-between text-center font-display font-bold text-xs tracking-wider uppercase text-neon pb-2 border-b border-white/10 mb-2">
                            <span>Round of 32</span>
                            <button
                              onClick={() => handleSimulateRound("r32")}
                              title="Simulate Round of 32"
                              className="p-1 rounded hover:bg-white/10 text-neon hover:scale-110 transition shrink-0"
                            >
                              <Zap className="h-3.5 w-3.5 fill-neon/20" />
                            </button>
                          </div>
                          <div className="flex-1 flex flex-col justify-around py-1">
                            {koMatchups.r32.slice(0, 8).map((m, idx) => (
                              <KnockoutMatchCard
                                key={`r32-left-${idx}`}
                                round="r32"
                                matchIndex={idx}
                                homeCode={m.home}
                                awayCode={m.away}
                                winnerCode={koWinners.r32[idx]}
                                homeScore={koScores[`r32-${idx}`]?.home ?? ""}
                                awayScore={koScores[`r32-${idx}`]?.away ?? ""}
                                onScoreChange={(side, val) => handleKoScoreChange("r32", idx, side, val)}
                                onSelectWinner={(code) => handleSelectKoWinner("r32", idx, code)}
                                onSimulateClick={() => handleOpenSimulator({
                                  type: "knockout",
                                  round: "r32",
                                  matchIndex: idx,
                                  homeCode: m.home!,
                                  awayCode: m.away!,
                                  homeScore: koScores[`r32-${idx}`]?.home ?? "",
                                  awayScore: koScores[`r32-${idx}`]?.away ?? "",
                                  details: KO_DETAILS.r32[idx]
                                })}
                                label={`Match ${idx + 1}`}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Left Column 2: Round of 16 */}
                        <div className="flex flex-col w-56 min-w-[224px] shrink-0 gap-3">
                          <div className="flex items-center justify-between text-center font-display font-bold text-xs tracking-wider uppercase text-neon pb-2 border-b border-white/10 mb-2">
                            <span>Round of 16</span>
                            <button
                              onClick={() => handleSimulateRound("r16")}
                              title="Simulate Round of 16"
                              className="p-1 rounded hover:bg-white/10 text-neon hover:scale-110 transition shrink-0"
                            >
                              <Zap className="h-3.5 w-3.5 fill-neon/20" />
                            </button>
                          </div>
                          <div className="flex-1 flex flex-col justify-around py-4">
                            {koMatchups.r16.slice(0, 4).map((m, idx) => (
                              <KnockoutMatchCard
                                key={`r16-left-${idx}`}
                                round="r16"
                                matchIndex={idx}
                                homeCode={m.home}
                                awayCode={m.away}
                                winnerCode={koWinners.r16[idx]}
                                homeScore={koScores[`r16-${idx}`]?.home ?? ""}
                                awayScore={koScores[`r16-${idx}`]?.away ?? ""}
                                onScoreChange={(side, val) => handleKoScoreChange("r16", idx, side, val)}
                                onSelectWinner={(code) => handleSelectKoWinner("r16", idx, code)}
                                onSimulateClick={() => handleOpenSimulator({
                                  type: "knockout",
                                  round: "r16",
                                  matchIndex: idx,
                                  homeCode: m.home!,
                                  awayCode: m.away!,
                                  homeScore: koScores[`r16-${idx}`]?.home ?? "",
                                  awayScore: koScores[`r16-${idx}`]?.away ?? "",
                                  details: KO_DETAILS.r16[idx]
                                })}
                                label={`Match ${idx + 1}`}
                                lockedMessage="TBD (R32)"
                              />
                            ))}
                          </div>
                        </div>

                        {/* Left Column 3: Quarter-Finals */}
                        <div className="flex flex-col w-56 min-w-[224px] shrink-0 gap-3">
                          <div className="flex items-center justify-between text-center font-display font-bold text-xs tracking-wider uppercase text-neon pb-2 border-b border-white/10 mb-2">
                            <span>Quarter-Finals</span>
                            <button
                              onClick={() => handleSimulateRound("qf")}
                              title="Simulate Quarter-Finals"
                              className="p-1 rounded hover:bg-white/10 text-neon hover:scale-110 transition shrink-0"
                            >
                              <Zap className="h-3.5 w-3.5 fill-neon/20" />
                            </button>
                          </div>
                          <div className="flex-1 flex flex-col justify-around py-8">
                            {koMatchups.qf.slice(0, 2).map((m, idx) => (
                              <KnockoutMatchCard
                                key={`qf-left-${idx}`}
                                round="qf"
                                matchIndex={idx}
                                homeCode={m.home}
                                awayCode={m.away}
                                winnerCode={koWinners.qf[idx]}
                                homeScore={koScores[`qf-${idx}`]?.home ?? ""}
                                awayScore={koScores[`qf-${idx}`]?.away ?? ""}
                                onScoreChange={(side, val) => handleKoScoreChange("qf", idx, side, val)}
                                onSelectWinner={(code) => handleSelectKoWinner("qf", idx, code)}
                                onSimulateClick={() => handleOpenSimulator({
                                  type: "knockout",
                                  round: "qf",
                                  matchIndex: idx,
                                  homeCode: m.home!,
                                  awayCode: m.away!,
                                  homeScore: koScores[`qf-${idx}`]?.home ?? "",
                                  awayScore: koScores[`qf-${idx}`]?.away ?? "",
                                  details: KO_DETAILS.qf[idx]
                                })}
                                label={`QF Match ${idx + 1}`}
                                lockedMessage="TBD (R16)"
                              />
                            ))}
                          </div>
                        </div>

                        {/* Left Column 4: Semi-Finals */}
                        <div className="flex flex-col w-56 min-w-[224px] shrink-0 gap-3">
                          <div className="flex items-center justify-between text-center font-display font-bold text-xs tracking-wider uppercase text-neon pb-2 border-b border-white/10 mb-2">
                            <span>Semi-Finals</span>
                            <button
                              onClick={() => handleSimulateRound("sf")}
                              title="Simulate Semi-Finals"
                              className="p-1 rounded hover:bg-white/10 text-neon hover:scale-110 transition shrink-0"
                            >
                              <Zap className="h-3.5 w-3.5 fill-neon/20" />
                            </button>
                          </div>
                          <div className="flex-1 flex flex-col justify-around py-12">
                            {koMatchups.sf.slice(0, 1).map((m, idx) => (
                              <KnockoutMatchCard
                                key={`sf-left-${idx}`}
                                round="sf"
                                matchIndex={idx}
                                homeCode={m.home}
                                awayCode={m.away}
                                winnerCode={koWinners.sf[idx]}
                                homeScore={koScores[`sf-${idx}`]?.home ?? ""}
                                awayScore={koScores[`sf-${idx}`]?.away ?? ""}
                                onScoreChange={(side, val) => handleKoScoreChange("sf", idx, side, val)}
                                onSelectWinner={(code) => handleSelectKoWinner("sf", idx, code)}
                                onSimulateClick={() => handleOpenSimulator({
                                  type: "knockout",
                                  round: "sf",
                                  matchIndex: idx,
                                  homeCode: m.home!,
                                  awayCode: m.away!,
                                  homeScore: koScores[`sf-${idx}`]?.home ?? "",
                                  awayScore: koScores[`sf-${idx}`]?.away ?? "",
                                  details: KO_DETAILS.sf[idx]
                                })}
                                label={`SF Match ${idx + 1}`}
                                lockedMessage="TBD (QF)"
                              />
                            ))}
                          </div>
                        </div>

                        {/* Center Column: Trophy, Final, 3rd Place Match, and Champion */}
                        <div className="flex flex-col w-64 min-w-[256px] shrink-0 gap-3 justify-center">
                          {/* Trophy / Champion Celebration */}
                          <div className="text-center mb-4">
                            {koWinners.final[0] ? (
                              <div className="glass-strong rounded-3xl p-6 border border-neon/50 shadow-neon flex flex-col items-center gap-4 text-center animate-float bg-muted/30 dark:bg-black/40">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-neon to-neon-2 flex items-center justify-center text-background text-3xl font-bold shadow-md">
                                  🏆
                                </div>
                                <div>
                                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold">
                                    World Cup Champion
                                  </div>
                                  <div className="text-2xl font-display font-bold mt-2 flex items-center gap-1.5 justify-center">
                                    <CountryFlag
                                      code={getTeam(koWinners.final[0]).code}
                                      flag={getTeam(koWinners.final[0]).flag}
                                      name={getTeam(koWinners.final[0]).name}
                                      className="h-6 w-8 shrink-0 rounded object-cover"
                                      emojiClassName="text-2xl leading-none"
                                    />
                                    <span className="text-gradient truncate max-w-[180px]">{getTeam(koWinners.final[0]).name}</span>
                                  </div>
                                  <div className="text-[10px] text-muted-foreground mt-1">
                                    Elo: {getTeam(koWinners.final[0]).elo} · FIFA #{getTeam(koWinners.final[0]).rank}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="glass rounded-3xl p-6 border border-border dark:border-white/5 flex flex-col items-center gap-3 text-center opacity-60">
                                <div className="text-4xl animate-pulse">🏆</div>
                                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                                  FIFA World Cup Trophy
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  Simulate or predict matches to crown the champion
                                </div>
                              </div>
                            )}
                          </div>

                          {/* World Cup Final Match */}
                          <div className="flex flex-col gap-2">
                            <div className="text-center font-display font-bold text-xs tracking-wider uppercase text-gold pb-2 border-b border-white/10 mb-2">
                              World Cup Final
                            </div>
                            <KnockoutMatchCard
                              round="final"
                              matchIndex={0}
                              homeCode={koMatchups.final[0].home}
                              awayCode={koMatchups.final[0].away}
                              winnerCode={koWinners.final[0]}
                              homeScore={koScores["final-0"]?.home ?? ""}
                              awayScore={koScores["final-0"]?.away ?? ""}
                              onScoreChange={(side, val) => handleKoScoreChange("final", 0, side, val)}
                              onSelectWinner={(code) => handleSelectKoWinner("final", 0, code)}
                              onSimulateClick={() => handleOpenSimulator({
                                type: "knockout",
                                round: "final",
                                matchIndex: 0,
                                homeCode: koMatchups.final[0].home!,
                                awayCode: koMatchups.final[0].away!,
                                homeScore: koScores["final-0"]?.home ?? "",
                                awayScore: koScores["final-0"]?.away ?? "",
                                details: KO_DETAILS.final[0]
                              })}
                              label="Final"
                              lockedMessage="TBD (SF Winners)"
                            />
                          </div>

                          {/* 3rd Place Match */}
                          <div className="flex flex-col gap-2 mt-4">
                            <div className="text-center font-display font-bold text-xs tracking-wider uppercase text-muted-foreground pb-2 border-b border-white/10 mb-2">
                              3rd Place Match
                            </div>
                            <KnockoutMatchCard
                              round="third"
                              matchIndex={0}
                              homeCode={sfLosers.home}
                              awayCode={sfLosers.away}
                              winnerCode={thirdWinner}
                              homeScore={thirdScores.home}
                              awayScore={thirdScores.away}
                              onScoreChange={handleThirdScoreChange}
                              onSelectWinner={handleSelectThirdWinner}
                              onSimulateClick={() => handleOpenSimulator({
                                type: "third",
                                homeCode: sfLosers.home!,
                                awayCode: sfLosers.away!,
                                homeScore: thirdScores.home,
                                awayScore: thirdScores.away,
                                details: KO_DETAILS.third[0]
                              })}
                              label="3rd Place"
                              lockedMessage="TBD (SF Losers)"
                            />
                          </div>
                        </div>

                        {/* Right Column 4: Semi-Finals */}
                        <div className="flex flex-col w-56 min-w-[224px] shrink-0 gap-3">
                          <div className="flex items-center justify-between text-center font-display font-bold text-xs tracking-wider uppercase text-neon pb-2 border-b border-white/10 mb-2">
                            <span>Semi-Finals</span>
                            <button
                              onClick={() => handleSimulateRound("sf")}
                              title="Simulate Semi-Finals"
                              className="p-1 rounded hover:bg-white/10 text-neon hover:scale-110 transition shrink-0"
                            >
                              <Zap className="h-3.5 w-3.5 fill-neon/20" />
                            </button>
                          </div>
                          <div className="flex-1 flex flex-col justify-around py-12">
                            {koMatchups.sf.slice(1, 2).map((m, idx) => {
                              const realIdx = idx + 1;
                              return (
                                <KnockoutMatchCard
                                  key={`sf-right-${realIdx}`}
                                  round="sf"
                                  matchIndex={realIdx}
                                  homeCode={m.home}
                                  awayCode={m.away}
                                  winnerCode={koWinners.sf[realIdx]}
                                  homeScore={koScores[`sf-${realIdx}`]?.home ?? ""}
                                  awayScore={koScores[`sf-${realIdx}`]?.away ?? ""}
                                  onScoreChange={(side, val) => handleKoScoreChange("sf", realIdx, side, val)}
                                  onSelectWinner={(code) => handleSelectKoWinner("sf", realIdx, code)}
                                  onSimulateClick={() => handleOpenSimulator({
                                    type: "knockout",
                                    round: "sf",
                                    matchIndex: realIdx,
                                    homeCode: m.home!,
                                    awayCode: m.away!,
                                    homeScore: koScores[`sf-${realIdx}`]?.home ?? "",
                                    awayScore: koScores[`sf-${realIdx}`]?.away ?? "",
                                    details: KO_DETAILS.sf[realIdx]
                                  })}
                                  label={`SF Match ${realIdx + 1}`}
                                  lockedMessage="TBD (QF)"
                                />
                              );
                            })}
                          </div>
                        </div>

                        {/* Right Column 3: Quarter-Finals */}
                        <div className="flex flex-col w-56 min-w-[224px] shrink-0 gap-3">
                          <div className="flex items-center justify-between text-center font-display font-bold text-xs tracking-wider uppercase text-neon pb-2 border-b border-white/10 mb-2">
                            <span>Quarter-Finals</span>
                            <button
                              onClick={() => handleSimulateRound("qf")}
                              title="Simulate Quarter-Finals"
                              className="p-1 rounded hover:bg-white/10 text-neon hover:scale-110 transition shrink-0"
                            >
                              <Zap className="h-3.5 w-3.5 fill-neon/20" />
                            </button>
                          </div>
                          <div className="flex-1 flex flex-col justify-around py-8">
                            {koMatchups.qf.slice(2, 4).map((m, idx) => {
                              const realIdx = idx + 2;
                              return (
                                <KnockoutMatchCard
                                  key={`qf-right-${realIdx}`}
                                  round="qf"
                                  matchIndex={realIdx}
                                  homeCode={m.home}
                                  awayCode={m.away}
                                  winnerCode={koWinners.qf[realIdx]}
                                  homeScore={koScores[`qf-${realIdx}`]?.home ?? ""}
                                  awayScore={koScores[`qf-${realIdx}`]?.away ?? ""}
                                  onScoreChange={(side, val) => handleKoScoreChange("qf", realIdx, side, val)}
                                  onSelectWinner={(code) => handleSelectKoWinner("qf", realIdx, code)}
                                  onSimulateClick={() => handleOpenSimulator({
                                    type: "knockout",
                                    round: "qf",
                                    matchIndex: realIdx,
                                    homeCode: m.home!,
                                    awayCode: m.away!,
                                    homeScore: koScores[`qf-${realIdx}`]?.home ?? "",
                                    awayScore: koScores[`qf-${realIdx}`]?.away ?? "",
                                    details: KO_DETAILS.qf[realIdx]
                                  })}
                                  label={`QF Match ${realIdx + 1}`}
                                  lockedMessage="TBD (R16)"
                                />
                              );
                            })}
                          </div>
                        </div>

                        {/* Right Column 2: Round of 16 */}
                        <div className="flex flex-col w-56 min-w-[224px] shrink-0 gap-3">
                          <div className="flex items-center justify-between text-center font-display font-bold text-xs tracking-wider uppercase text-neon pb-2 border-b border-white/10 mb-2">
                            <span>Round of 16</span>
                            <button
                              onClick={() => handleSimulateRound("r16")}
                              title="Simulate Round of 16"
                              className="p-1 rounded hover:bg-white/10 text-neon hover:scale-110 transition shrink-0"
                            >
                              <Zap className="h-3.5 w-3.5 fill-neon/20" />
                            </button>
                          </div>
                          <div className="flex-1 flex flex-col justify-around py-4">
                            {koMatchups.r16.slice(4, 8).map((m, idx) => {
                              const realIdx = idx + 4;
                              return (
                                <KnockoutMatchCard
                                  key={`r16-right-${realIdx}`}
                                  round="r16"
                                  matchIndex={realIdx}
                                  homeCode={m.home}
                                  awayCode={m.away}
                                  winnerCode={koWinners.r16[realIdx]}
                                  homeScore={koScores[`r16-${realIdx}`]?.home ?? ""}
                                  awayScore={koScores[`r16-${realIdx}`]?.away ?? ""}
                                  onScoreChange={(side, val) => handleKoScoreChange("r16", realIdx, side, val)}
                                  onSelectWinner={(code) => handleSelectKoWinner("r16", realIdx, code)}
                                  onSimulateClick={() => handleOpenSimulator({
                                    type: "knockout",
                                    round: "r16",
                                    matchIndex: realIdx,
                                    homeCode: m.home!,
                                    awayCode: m.away!,
                                    homeScore: koScores[`r16-${realIdx}`]?.home ?? "",
                                    awayScore: koScores[`r16-${realIdx}`]?.away ?? "",
                                    details: KO_DETAILS.r16[realIdx]
                                  })}
                                  label={`Match ${realIdx + 1}`}
                                  lockedMessage="TBD (R32)"
                                />
                              );
                            })}
                          </div>
                        </div>

                        {/* Right Column 1: Round of 32 */}
                        <div className="flex flex-col w-56 min-w-[224px] shrink-0 gap-3">
                          <div className="flex items-center justify-between text-center font-display font-bold text-xs tracking-wider uppercase text-neon pb-2 border-b border-white/10 mb-2">
                            <span>Round of 32</span>
                            <button
                              onClick={() => handleSimulateRound("r32")}
                              title="Simulate Round of 32"
                              className="p-1 rounded hover:bg-white/10 text-neon hover:scale-110 transition shrink-0"
                            >
                              <Zap className="h-3.5 w-3.5 fill-neon/20" />
                            </button>
                          </div>
                          <div className="flex-1 flex flex-col justify-around py-1">
                            {koMatchups.r32.slice(8, 16).map((m, idx) => {
                              const realIdx = idx + 8;
                              return (
                                <KnockoutMatchCard
                                  key={`r32-right-${realIdx}`}
                                  round="r32"
                                  matchIndex={realIdx}
                                  homeCode={m.home}
                                  awayCode={m.away}
                                  winnerCode={koWinners.r32[realIdx]}
                                  homeScore={koScores[`r32-${realIdx}`]?.home ?? ""}
                                  awayScore={koScores[`r32-${realIdx}`]?.away ?? ""}
                                  onScoreChange={(side, val) => handleKoScoreChange("r32", realIdx, side, val)}
                                  onSelectWinner={(code) => handleSelectKoWinner("r32", realIdx, code)}
                                  onSimulateClick={() => handleOpenSimulator({
                                    type: "knockout",
                                    round: "r32",
                                    matchIndex: realIdx,
                                    homeCode: m.home!,
                                    awayCode: m.away!,
                                    homeScore: koScores[`r32-${realIdx}`]?.home ?? "",
                                    awayScore: koScores[`r32-${realIdx}`]?.away ?? "",
                                    details: KO_DETAILS.r32[realIdx]
                                  })}
                                  label={`Match ${realIdx + 1}`}
                                />
                              );
                            })}
                          </div>
                        </div>

                        {/* Far Right Column: Groups G-L */}
                        <div className="flex flex-col w-56 min-w-[224px] shrink-0 justify-between py-2 gap-2">
                          <div className="text-center font-display font-bold text-xs tracking-wider uppercase text-neon pb-2 border-b border-white/10 mb-2">
                            Groups G - L
                          </div>
                          {["G", "H", "I", "J", "K", "L"].map((groupName) => renderCompactGroupCard(groupName))}
                        </div>

                      </div>
                    </div>

                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* 1v1 Match Simulator Modal */}
      {simMatch && (() => {
        const homeTeam = getTeam(simMatch.homeCode);
        const awayTeam = getTeam(simMatch.awayCode);
        const homeSupport = simCrowdSupport;
        const awaySupport = 100 - simCrowdSupport;

        let crowdLeadText = "Equal Support";
        if (simCrowdSupport > 50) crowdLeadText = `🔥 ${homeTeam.name}`;
        else if (simCrowdSupport < 50) crowdLeadText = `🔥 ${awayTeam.name}`;

        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
            <div className="bg-card/95 dark:bg-zinc-900/95 border border-border dark:border-zinc-800 rounded-3xl w-full max-w-xl text-foreground dark:text-white overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="p-5 border-b border-border dark:border-zinc-800 flex items-center justify-between bg-muted/20 dark:bg-zinc-950/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted dark:bg-zinc-800 border border-border dark:border-zinc-700 flex items-center justify-center text-lg shadow-inner">
                    ⚽
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg text-foreground dark:text-white">Match Simulation</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span>📅 {simMatch.details.date}</span>
                      <span className="opacity-30">•</span>
                      <span>⏰ {simMatch.details.time || "08:00 PM"}</span>
                      {simMatch.details.matchNumber && (
                        <>
                          <span className="opacity-30">•</span>
                          <span>🔢 #{simMatch.details.matchNumber}</span>
                        </>
                      )}
                      <span className="opacity-30">•</span>
                      <span className="text-neon-2">📍 {simMatch.details.venue}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSimMatch(null)}
                  className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground dark:hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">

                {/* Temperature Slider */}
                <TemperatureSlider
                  value={simTemperature}
                  onChange={setSimTemperature}
                />

                {/* Crowd Support */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Crowd Support</span>
                    <span className="text-[10px] font-bold text-neon uppercase tracking-wide">{crowdLeadText}</span>
                  </div>
                  <div className="space-y-1 bg-muted/10 dark:bg-zinc-850/40 p-3 rounded-xl border border-border dark:border-zinc-800/50">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={simCrowdSupport}
                      onChange={(e) => setSimCrowdSupport(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-muted dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-neon focus:outline-none"
                    />
                    <div className="flex justify-between text-[10px] font-semibold text-muted-foreground pt-1">
                      <span>{homeSupport}% {homeTeam.name}</span>
                      <span>{awaySupport}% {awayTeam.name}</span>
                    </div>
                  </div>
                </div>

                {/* Symmetrical Match Card (Flags & Simulated Score) */}
                <div className="grid grid-cols-3 items-center bg-muted/20 dark:bg-zinc-950/60 p-4 rounded-2xl border border-border dark:border-zinc-800">
                  {/* Home Team */}
                  <div className="flex flex-col items-center text-center space-y-1">
                    <CountryFlag
                      code={homeTeam.code}
                      flag={homeTeam.flag}
                      name={homeTeam.name}
                      className="h-8 w-10 rounded object-cover drop-shadow-md"
                      emojiClassName="text-3xl leading-none"
                    />
                    <span className="font-display font-bold text-sm leading-tight max-w-[120px] truncate">{homeTeam.name}</span>
                    <span className="text-[10px] text-muted-foreground/80 font-mono">Rating: {homeTeam.elo.toFixed(0)}</span>
                  </div>

                  {/* Score */}
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <div className="text-3xl font-mono font-black tracking-tight text-foreground dark:text-white flex items-center gap-2">
                      <span className="bg-muted dark:bg-zinc-800 px-3 py-1 rounded-xl border border-border dark:border-zinc-700 min-w-[2.5rem] text-center shadow-inner text-foreground dark:text-white">
                        {simHomeGoals !== "" ? simHomeGoals : "-"}
                      </span>
                      <span className="text-muted-foreground/40">:</span>
                      <span className="bg-muted dark:bg-zinc-800 px-3 py-1 rounded-xl border border-border dark:border-zinc-700 min-w-[2.5rem] text-center shadow-inner text-foreground dark:text-white">
                        {simAwayGoals !== "" ? simAwayGoals : "-"}
                      </span>
                    </div>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-neon mt-1 bg-neon/10 px-2 py-0.5 rounded-full border border-neon/20">
                      {simHomeGoals !== "" ? (useRealScores && simMatch && getAssignedLiveScoreForMatch({ id: simMatch.id || "", group: "", homeCode: simMatch.homeCode, awayCode: simMatch.awayCode, homeScore: "", awayScore: "" }) ? "Real Data" : "Simulated") : "Not Simulated"}
                    </span>
                  </div>

                  {/* Away Team */}
                  <div className="flex flex-col items-center text-center space-y-1">
                    <CountryFlag
                      code={awayTeam.code}
                      flag={awayTeam.flag}
                      name={awayTeam.name}
                      className="h-8 w-10 rounded object-cover drop-shadow-md"
                      emojiClassName="text-3xl leading-none"
                    />
                    <span className="font-display font-bold text-sm leading-tight max-w-[120px] truncate">{awayTeam.name}</span>
                    <span className="text-[10px] text-muted-foreground/80 font-mono">Rating: {awayTeam.elo.toFixed(0)}</span>
                  </div>
                </div>

                {/* Team Condition Modifiers */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Home Team Modifiers */}
                  <div className="space-y-4 p-4 rounded-2xl bg-muted/10 dark:bg-zinc-850/20 border border-border dark:border-zinc-800/50">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neon-2 border-b border-border dark:border-zinc-800 pb-1.5 block">
                      {homeTeam.name} Stats
                    </span>

                    <div className="flex flex-col gap-4 pt-2">
                      <StaminaBar
                        value={simHomePhysical}
                        onChange={setSimHomePhysical}
                      />
                      <AlignmentGauge
                        value={simHomeDiscipline}
                        onChange={setSimHomeDiscipline}
                      />
                    </div>

                    {/* Player Out Dropdown */}
                    <div className="pt-2">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Missing Player Penalty</span>
                      <select
                        value={simHomePlayerOut}
                        onChange={(e) => setSimHomePlayerOut(e.target.value)}
                        className="w-full bg-card dark:bg-zinc-900 border border-border dark:border-zinc-700 text-xs text-foreground dark:text-white rounded-lg p-2 focus:ring-1 focus:ring-neon focus:outline-none"
                      >
                        <option value="">None (Full Squad)</option>
                        {getTeamPlayers(homeTeam.code).map((p) => (
                          <option key={p["Player Name"]} value={p["Player Name"]} className="text-foreground bg-card dark:text-white dark:bg-zinc-900">
                            {p["Player Name"]} ({p["Overall Rating"]})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Away Team Modifiers */}
                  <div className="space-y-4 p-4 rounded-2xl bg-muted/10 dark:bg-zinc-850/20 border border-border dark:border-zinc-800/50">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neon-2 border-b border-border dark:border-zinc-800 pb-1.5 block">
                      {awayTeam.name} Stats
                    </span>

                    <div className="flex flex-col gap-4 pt-2">
                      <StaminaBar
                        value={simAwayPhysical}
                        onChange={setSimAwayPhysical}
                      />
                      <AlignmentGauge
                        value={simAwayDiscipline}
                        onChange={setSimAwayDiscipline}
                      />
                    </div>

                    {/* Player Out Dropdown */}
                    <div className="pt-2">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Missing Player Penalty</span>
                      <select
                        value={simAwayPlayerOut}
                        onChange={(e) => setSimAwayPlayerOut(e.target.value)}
                        className="w-full bg-card dark:bg-zinc-900 border border-border dark:border-zinc-700 text-xs text-foreground dark:text-white rounded-lg p-2 focus:ring-1 focus:ring-neon focus:outline-none"
                      >
                        <option value="">None (Full Squad)</option>
                        {getTeamPlayers(awayTeam.code).map((p) => (
                          <option key={p["Player Name"]} value={p["Player Name"]} className="text-foreground bg-card dark:text-white dark:bg-zinc-900">
                            {p["Player Name"]} ({p["Overall Rating"]})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Win/Draw/Loss Probabilities */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[9px] uppercase font-bold text-muted-foreground">
                    <span>{homeTeam.name} Win %</span>
                    {simMatch.type === "group" && <span>Draw %</span>}
                    <span>{awayTeam.name} Win %</span>
                  </div>
                  {/* Segmented Progress Bar */}
                  <div className="h-3.5 rounded-full overflow-hidden flex w-full border border-border dark:border-zinc-800 shadow-inner bg-muted/20 dark:bg-zinc-950">
                    <div
                      className="bg-[#22c55e] transition-all duration-300 flex items-center justify-center text-[9px] font-bold text-zinc-950"
                      style={{ width: `${simProbabilities.homeWin}%` }}
                    />
                    {simMatch.type === "group" && (
                      <div
                        className="bg-zinc-500/80 transition-all duration-300 flex items-center justify-center text-[9px] font-bold text-white"
                        style={{ width: `${simProbabilities.draw}%` }}
                      />
                    )}
                    <div
                      className="bg-[#ef4444] transition-all duration-300 flex items-center justify-center text-[9px] font-bold text-white"
                      style={{ width: `${simProbabilities.awayWin}%` }}
                    />
                  </div>
                  {/* Value Labels */}
                  <div className="flex justify-between text-xs font-mono font-bold px-1 text-foreground dark:text-white">
                    <span className="text-[#22c55e]">{simProbabilities.homeWin}%</span>
                    {simMatch.type === "group" && <span className="text-zinc-400">{simProbabilities.draw}%</span>}
                    <span className="text-[#ef4444]">{simProbabilities.awayWin}%</span>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-border dark:border-zinc-850 flex gap-3 bg-muted/20 dark:bg-zinc-950/40 shrink-0">
                <button
                  type="button"
                  onClick={handleReSimulate}
                  className="flex-1 bg-muted dark:bg-zinc-800/80 hover:bg-black/5 dark:hover:bg-zinc-700 hover:text-foreground dark:hover:text-white text-foreground/90 dark:text-white/90 border border-border dark:border-zinc-700 py-3 rounded-2xl flex items-center justify-center gap-2 transition duration-200 font-semibold"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Re-Simulate</span>
                </button>

                <button
                  type="button"
                  onClick={handleApplyResult}
                  disabled={simHomeGoals === "" || simAwayGoals === ""}
                  className="flex-1 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 text-zinc-950 font-bold py-3 rounded-2xl flex items-center justify-center gap-2 transition duration-200 shadow-[0_0_15px_rgba(34,197,94,0.3)] disabled:shadow-none"
                >
                  <Check className="w-4 h-4 stroke-[3px]" />
                  <span>Apply Result</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {isGroupStageComplete && activeTab === "group" && pathname === "/simulator" && !simMatch && !upgradeModalOpen && (
        <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100vw-1.5rem)] max-w-md -translate-x-1/2 animate-float animate-in fade-in slide-in-from-bottom-8 duration-500 sm:bottom-6 sm:w-[calc(100vw-2rem)]">
          <div className="glass-strong flex flex-col gap-4 rounded-2xl border border-neon/40 bg-black/85 p-4 shadow-[0_10px_40px_rgba(6,182,212,0.25)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-neon/10 border border-neon/30 flex items-center justify-center text-neon shrink-0 shadow-[0_0_10px_rgba(6,182,212,0.15)]">
                <Trophy className="h-4.5 w-4.5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <h4 className="font-display font-bold text-sm text-foreground">Group Stage Complete!</h4>
                <p className="text-[10px] text-muted-foreground/90 mt-0.5 leading-tight">
                  All 72 matches simulated. The brackets are locked and loaded.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setActiveTab("knockout");
                setTimeout(() => {
                  document.getElementById("knockout-bracket-view")?.scrollIntoView({ behavior: "smooth" });
                }, 50);
              }}
              className="w-full shrink-0 rounded-xl bg-gradient-to-r from-neon to-neon-2 px-4 py-2.5 text-xs font-bold text-background shadow-neon transition duration-200 hover:scale-105 hover:opacity-90 active:scale-95 sm:w-auto"
            >
              Show Brackets
            </button>
          </div>
        </div>
      )}
      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        reason="credits"
      />

      {/* Saves Manager Modal */}
      {isSavesModalOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity duration-300"
            onClick={() => setIsSavesModalOpen(false)}
          />

          {/* Content Card */}
          <div className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.3)] md:p-8 animate-fade-in z-50 max-h-[85vh] flex flex-col">
            {/* Glow Effects */}
            <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-cyan-500/10 blur-2xl animate-pulse dark:block hidden" />
            <div className="pointer-events-none absolute -right-16 -bottom-16 h-48 w-48 rounded-full bg-fuchsia-500/10 blur-2xl animate-pulse dark:block hidden" />

            {/* Close Button */}
            <button
              onClick={() => setIsSavesModalOpen(false)}
              className="absolute right-5 top-5 rounded-full p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/5 dark:hover:text-white transition"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Header */}
            <div className="mb-6">
              <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <Trophy className="h-6 w-6 text-gold" />
                <span>Saved Brackets & Predictions</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Save, load, and rename multiple prediction paths. Slot 0 is used for global leaderboard points.
              </p>
            </div>

            {/* Active Slot Info and Actions */}
            {currentSlot !== null && (
              <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-cyan-50 via-slate-50/50 to-fuchsia-50 dark:from-cyan-950/40 dark:via-slate-900/60 dark:to-fuchsia-950/40 border border-cyan-500/20 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest bg-cyan-100 dark:bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-200 dark:border-cyan-800/30">Active Slot</span>
                      <strong className="text-sm text-slate-950 dark:text-slate-100">{slotNames[currentSlot]}</strong>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">You are currently editing this save slot. Any changes made to scores or winner picks are local until saved.</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={async () => {
                        await handleLoadFromSlot(currentSlot);
                        setIsSavesModalOpen(false);
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 border border-slate-200 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 text-slate-700 dark:text-white transition active:scale-95"
                      title="Discard local changes and load the last saved state of this slot"
                    >
                      Restore Saved
                    </button>
                    <button
                      onClick={() => {
                        setSlotToOverwriteConfirm(currentSlot);
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-cyan-600 to-fuchsia-600 text-white transition active:scale-95 shadow-md"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* List of Slots */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-custom">
              {[0, 1, 2, 3, 4, 5].map((slotId) => {
                const isOfficial = slotId === 0;
                const hasData = !!slotDates[slotId];
                const isCurrent = currentSlot === slotId || (slotId === 0 && currentSlot === null);
                const isEditing = editingSlotId === slotId;
                const summary = slotSummaries[slotId];
                const isConfirming = slotToOverwriteConfirm === slotId;

                return (
                  <div
                    key={slotId}
                    className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col gap-3 ${isCurrent
                      ? "bg-gradient-to-r from-cyan-50 to-fuchsia-50 dark:from-cyan-950/20 dark:to-fuchsia-950/20 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.05)]"
                      : "bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-white/5"
                      }`}
                  >
                    {/* Upper row: Title, badge, date & load/save buttons */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isOfficial ? (
                            <span className="text-[10px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest bg-cyan-50 dark:bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-200 dark:border-cyan-800/30">Official</span>
                          ) : (
                            <span className="text-xs font-mono font-bold text-slate-550 dark:text-slate-400">Slot {slotId}</span>
                          )}

                          {isEditing && !isOfficial ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={editingSlotName}
                                onChange={(e) => setEditingSlotName(e.target.value)}
                                className="bg-white dark:bg-slate-900 border border-cyan-500/40 rounded px-2 py-0.5 text-xs text-slate-950 dark:text-white focus:outline-none focus:border-cyan-500 font-bold"
                                autoFocus
                                maxLength={30}
                              />
                              <button
                                onClick={() => {
                                  if (editingSlotName.trim()) {
                                    handleRenameSlot(slotId, editingSlotName.trim());
                                  }
                                  setEditingSlotId(null);
                                }}
                                className="p-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition"
                              >
                                <Check className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => setEditingSlotId(null)}
                                className="p-1 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={`font-display font-extrabold text-sm truncate ${hasData ? "text-slate-800 dark:text-slate-100" : "text-slate-400 italic dark:text-slate-500"}`}>
                                {isOfficial ? "Official Active Prediction" : slotNames[slotId]}
                              </span>
                              {!isOfficial && (
                                <button
                                  onClick={() => {
                                    setEditingSlotId(slotId);
                                    setEditingSlotName(slotNames[slotId]);
                                  }}
                                  className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-950 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-white/5 transition"
                                  title="Rename Slot"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                              )}
                              {isCurrent && <Check className="h-4 w-4 text-emerald-550 dark:text-emerald-400 shrink-0" />}
                            </div>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
                          <span>{hasData ? `Saved on: ${slotDates[slotId]}` : "Empty Slot"}</span>
                          {isOfficial && <span className="text-slate-400 dark:text-slate-550 font-mono">• Used for Leaderboard points</span>}
                        </div>
                      </div>

                      {/* Summary Display */}
                      {hasData && summary && (
                        <div className="mt-3 p-3 bg-white/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-white/5 rounded-xl text-[11px] flex flex-col gap-2">
                          <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                            <span>Groups: <strong>{summary.groupPredictedCount} / {summary.totalGroupMatches}</strong></span>
                            <span>Knockout: <strong>{summary.bracketPredictedCount} / 16</strong></span>
                          </div>
                          {summary.championCode && (
                            <div className="flex items-center gap-1.5 mt-0.5 font-bold text-yellow-600 dark:text-yellow-500">
                              <Trophy className="h-3 w-3" />
                              Champion: {getTeam(summary.championCode)?.name || summary.championCode}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Buttons */}
                      <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                        {hasData && (
                          <button
                            onClick={() => {
                              handleLoadFromSlot(isOfficial ? null : slotId);
                              setIsSavesModalOpen(false);
                            }}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 border border-slate-200 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 text-slate-700 dark:text-white flex items-center gap-1.5 transition active:scale-95"
                          >
                            <FolderOpen className="h-3.5 w-3.5 text-cyan-500 dark:text-cyan-400" /> Load
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (hasData) {
                              setSlotToOverwriteConfirm(slotId);
                            } else {
                              saveBulkToDb(matches, koWinners, koScores, thirdWinner, thirdScores, true, isOfficial ? null : slotId);
                              toast.success(isOfficial ? "Saved to Official Prediction!" : `Progress saved to Slot "${slotNames[slotId]}"!`);
                            }
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 ${hasData
                            ? "bg-slate-100 hover:bg-slate-200 border border-slate-200 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 text-slate-700 dark:text-white"
                            : "bg-gradient-to-r from-emerald-600 to-teal-600 border border-emerald-500/20 text-white hover:opacity-90 font-black shadow-md"
                            }`}
                        >
                          <Save className="h-3.5 w-3.5" /> {hasData ? "Overwrite" : "Save Here"}
                        </button>
                        {hasData && !isOfficial && (
                          <button
                            onClick={() => handleClearSlot(slotId)}
                            className="p-2 text-rose-600 hover:bg-rose-500/10 border border-slate-200 dark:text-rose-400 dark:border-rose-500/10 dark:hover:border-rose-500/30 rounded-xl transition active:scale-95"
                            title="Clear Slot"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Overwrite Confirmation Overlay/Inline */}
                    {isConfirming && (
                      <div className="bg-slate-50 dark:bg-slate-900 border border-amber-500/20 dark:border-amber-500/30 rounded-xl p-3 mt-1 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 animate-bounce" />
                          <span className="text-xs text-slate-700 dark:text-slate-200 font-medium">
                            Overwrite <strong className="text-amber-600 dark:text-amber-400">"{isOfficial ? "Official Active Prediction" : slotNames[slotId]}"</strong>? The existing save will be replaced.
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setSlotToOverwriteConfirm(null)}
                            className="px-3 py-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition"
                          >
                            Keep Existing (Cancel)
                          </button>
                          <button
                            onClick={async () => {
                              await saveBulkToDb(matches, koWinners, koScores, thirdWinner, thirdScores, true, isOfficial ? null : slotId);
                              toast.success(isOfficial ? "Saved to Official Prediction!" : `Progress saved to Slot "${slotNames[slotId]}"!`);
                              setSlotToOverwriteConfirm(null);
                            }}
                            className="px-3.5 py-1 text-[11px] font-black rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 transition hover:brightness-110 active:scale-95"
                          >
                            Yes, Overwrite
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Details Summary */}
                    {hasData && summary && (
                      <div className="bg-slate-100/50 dark:bg-slate-900/40 rounded-xl p-3 border border-slate-200 dark:border-white/5 space-y-2.5">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-550 dark:text-slate-400">Group Stage:</span>
                            <strong className="text-emerald-600 dark:text-emerald-400">{summary.groupPredictedCount || 0} / 72 matches</strong>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-550 dark:text-slate-400">Bracket:</span>
                            <strong className="text-purple-600 dark:text-purple-400">{summary.bracketPredictedCount || 0} / 32 matches</strong>
                          </div>
                          {summary.championCode && (
                            <div className="flex items-center gap-1.5 sm:ml-auto">
                              <span className="text-slate-550 dark:text-slate-400">Predicted Champion:</span>
                              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/20">
                                <CountryFlag flag={getTeam(summary.championCode).flag} className="h-3 w-4.5" />
                                {getTeam(summary.championCode).name}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Expandable Group Standings details */}
                        {summary.standingsSummary && (
                          <div>
                            <button
                              onClick={() => setExpandedSlotDetails(prev => ({ ...prev, [slotId]: !prev[slotId] }))}
                              className="text-[10px] text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 font-bold flex items-center gap-1 transition"
                            >
                              {expandedSlotDetails[slotId] ? "Hide Standings Details ▲" : "Show Standings Details ▼"}
                            </button>

                            {expandedSlotDetails[slotId] && (
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mt-2 pt-2 border-t border-slate-200 dark:border-white/5 animate-fade-in">
                                {Object.entries(summary.standingsSummary).map(([group, teams]: [string, any]) => (
                                  <div key={group} className="bg-white dark:bg-slate-950/60 p-2 rounded-lg border border-slate-200 dark:border-white/5 flex flex-col gap-1">
                                    <div className="text-[10px] font-black text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-white/5 pb-0.5 mb-1">Group {group}</div>
                                    {teams.winner ? (
                                      <div className="flex items-center gap-1 text-[10px] text-slate-800 dark:text-slate-200 truncate">
                                        <span className="text-amber-500 dark:text-amber-400 font-bold shrink-0">1st</span>
                                        <CountryFlag flag={getTeam(teams.winner).flag} className="h-2.5 w-4 inline-block shrink-0" />
                                        <span className="truncate">{getTeam(teams.winner).name}</span>
                                      </div>
                                    ) : (
                                      <div className="text-[10px] text-slate-400 dark:text-slate-650 italic">No prediction</div>
                                    )}
                                    {teams.runnerUp ? (
                                      <div className="flex items-center gap-1 text-[10px] text-slate-700 dark:text-slate-300 truncate">
                                        <span className="text-slate-500 dark:text-slate-400 font-bold shrink-0">2nd</span>
                                        <CountryFlag flag={getTeam(teams.runnerUp).flag} className="h-2.5 w-4 inline-block shrink-0" />
                                        <span className="truncate">{getTeam(teams.runnerUp).name}</span>
                                      </div>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/5 flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              <span>Active Save Target: <strong className="text-cyan-500 dark:text-cyan-400">{currentSlot ? slotNames[currentSlot] : "Official Prediction"}</strong></span>
              <button
                onClick={() => setIsSavesModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-white transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Simulation Confirmation Dialog */}
      <AlertDialog open={confirmSimOpen} onOpenChange={setConfirmSimOpen}>
        <AlertDialogContent className="bg-white text-slate-900 border border-slate-200 shadow-xl rounded-2xl dark:bg-slate-950 dark:text-white dark:border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display font-bold text-xl text-slate-950 dark:text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-cyan-500" />
              <span>Confirm Simulation</span>
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-slate-500 dark:text-slate-400 mt-2 text-sm leading-relaxed">
                {confirmSimType === "all" ? (
                  <>
                    <p className="mb-3">Choose the simulation scope. This will use your model configuration to predict scores.</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSimScope("whole")}
                        className={`p-3 rounded-xl border-2 text-left transition cursor-pointer ${
                          simScope === "whole"
                            ? "border-cyan-500 bg-cyan-500/10 dark:bg-cyan-500/5 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                            : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Trophy className={`h-4 w-4 ${simScope === "whole" ? "text-cyan-500" : "text-slate-400"}`} />
                          <span className={`font-bold text-xs uppercase tracking-wider ${simScope === "whole" ? "text-cyan-600 dark:text-cyan-400" : "text-slate-600 dark:text-slate-300"}`}>
                            Whole Tournament
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
                          Simulate all 48 group matches + knockout bracket through the Final
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSimScope("r32")}
                        className={`p-3 rounded-xl border-2 text-left transition cursor-pointer ${
                          simScope === "r32"
                            ? "border-cyan-500 bg-cyan-500/10 dark:bg-cyan-500/5 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                            : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Sparkles className={`h-4 w-4 ${simScope === "r32" ? "text-cyan-500" : "text-slate-400"}`} />
                          <span className={`font-bold text-xs uppercase tracking-wider ${simScope === "r32" ? "text-cyan-600 dark:text-cyan-400" : "text-slate-600 dark:text-slate-300"}`}>
                            Round of 32
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
                          Simulate knockout bracket starting from Round of 32 through the Final
                        </p>
                      </button>
                    </div>
                  </>
                ) : (
                  <span>{`Are you sure you want to simulate matches for Group ${confirmSimGroup}? This will predict and overwrite current scores for this group.`}</span>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex gap-2">
            <AlertDialogCancel className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 dark:border-white/10 dark:text-white dark:hover:bg-white/5 cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSimulation}
              className="px-4 py-2 text-xs font-black rounded-xl bg-gradient-to-r from-cyan-600 to-fuchsia-600 text-white hover:scale-[1.02] active:scale-95 transition cursor-pointer"
            >
              Run Simulation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Group Confirmation Dialog */}
      <AlertDialog open={!!deleteGroupTarget} onOpenChange={(open) => !open && setDeleteGroupTarget(null)}>
        <AlertDialogContent className="bg-white text-slate-900 border border-slate-200 shadow-xl rounded-2xl dark:bg-slate-950 dark:text-white dark:border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display font-bold text-xl text-slate-950 dark:text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-500" />
              <span>Confirm Group Reset</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 dark:text-slate-400 mt-2 text-sm leading-relaxed">
              Are you sure you want to reset matches for Group {deleteGroupTarget}? This will clear all predicted scores and outcomes for this group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex gap-2">
            <AlertDialogCancel className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 dark:border-white/10 dark:text-white dark:hover:bg-white/5 cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteGroupTarget) {
                  resetGroup(deleteGroupTarget);
                  setDeleteGroupTarget(null);
                }
              }}
              className="px-4 py-2 text-xs font-black rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition cursor-pointer"
            >
              Reset Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SimulationEngineBadge({ model }: { model: keyof typeof MODEL_META }) {
  const meta = MODEL_META[model];
  const Icon = meta.Icon;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-white/10 dark:bg-slate-900/50">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-550 dark:text-slate-400">
            Simulation Engine
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-white">
            {meta.title}
          </div>
          {meta.description && (
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-normal">
              {meta.description}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Single Knockout Match Row Card Component
interface KnockoutMatchCardProps {
  round: "r32" | "r16" | "qf" | "sf" | "final" | "third";
  matchIndex: number;
  homeCode: string | null;
  awayCode: string | null;
  winnerCode: string | null;
  homeScore: number | "";
  awayScore: number | "";
  onScoreChange: (side: "home" | "away", val: string) => void;
  onSelectWinner: (code: string) => void;
  onSimulateClick: () => void;
  label: string;
  lockedMessage?: string;
}

function KnockoutMatchCard({
  round,
  matchIndex,
  homeCode,
  awayCode,
  winnerCode,
  homeScore,
  awayScore,
  onScoreChange,
  onSelectWinner,
  onSimulateClick,
  label,
  lockedMessage = "Seeding not available yet.",
}: KnockoutMatchCardProps) {
  const teams = useTeams();
  const getTeam = (code: string) => teams.find(t => t.code === code) || teams[0];
  const tHome = homeCode ? getTeam(homeCode) : null;
  const tAway = awayCode ? getTeam(awayCode) : null;
  const isLocked = !homeCode || !awayCode;

  const details = KO_DETAILS[round]?.[matchIndex];

  if (isLocked) {
    return (
      <div className="glass rounded-xl p-2.5 border border-white/5 opacity-40 flex flex-col justify-center min-h-[90px] text-center shadow-glass">
        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{label}</span>
        <span className="text-[10px] text-muted-foreground/60">{lockedMessage}</span>
      </div>
    );
  }

  return (
    <div className="glass-strong rounded-xl p-2.5 border border-white/5 hover:border-neon/20 transition flex flex-col justify-between min-h-[90px] shadow-glass bg-black/30">
      <div
        onClick={onSimulateClick}
        title="Simulate 1v1"
        className="flex items-center justify-between text-[9px] uppercase font-bold tracking-wider text-muted-foreground border-b border-white/5 pb-1 mb-1.5 cursor-pointer hover:text-neon group/hdr transition duration-200"
      >
        <span className="text-neon-2 group-hover/hdr:text-neon transition">{label}</span>
        <div className="flex items-center gap-1">
          {details && (
            <span className="text-white/40 group-hover/hdr:text-white/70 transition">
              {details.venue} · {details.date}
            </span>
          )}
          <Sparkles className="h-3 w-3 text-white/20 group-hover/hdr:text-neon transition ml-1" />
        </div>
      </div>

      <div className="space-y-2">
        {/* Home Row */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => tHome && onSelectWinner(tHome.code)}
            className={`flex-1 flex items-center justify-between p-1.5 rounded-lg transition ${winnerCode === homeCode
              ? "bg-gradient-to-r from-neon/20 to-neon-2/15 border border-neon/30 text-foreground font-bold"
              : "hover:bg-white/5 text-muted-foreground"
              }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <CountryFlag
                code={tHome?.code}
                flag={tHome?.flag}
                name={tHome?.name}
                className="h-4 w-6 shrink-0 rounded-[2px] object-cover"
                emojiClassName="text-base shrink-0 leading-none"
              />
              <span className={`text-xs font-medium truncate ${winnerCode === homeCode ? "font-bold text-neon" : ""}`}>
                {tHome?.name}
              </span>
            </div>
            {winnerCode === homeCode && <Check className="h-3 w-3 text-neon shrink-0 ml-1" />}
          </button>

          <input
            type="number"
            value={homeScore}
            min={0}
            onChange={(e) => onScoreChange("home", e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder="-"
            className="w-8 h-7 text-center bg-white/5 border border-white/10 rounded-lg font-bold text-xs text-foreground focus:ring-1 focus:ring-neon focus:outline-none placeholder-white/10 shrink-0 [-moz-appearance:_textfield] [&::-webkit-outer-spin-button]:margin-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:margin-0 [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        {/* Away Row */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => tAway && onSelectWinner(tAway.code)}
            className={`flex-1 flex items-center justify-between p-1.5 rounded-lg transition ${winnerCode === awayCode
              ? "bg-gradient-to-r from-neon/20 to-neon-2/15 border border-neon/30 text-foreground font-bold"
              : "hover:bg-white/5 text-muted-foreground"
              }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <CountryFlag
                code={tAway?.code}
                flag={tAway?.flag}
                name={tAway?.name}
                className="h-4 w-6 shrink-0 rounded-[2px] object-cover"
                emojiClassName="text-base shrink-0 leading-none"
              />
              <span className={`text-xs font-medium truncate ${winnerCode === awayCode ? "font-bold text-neon" : ""}`}>
                {tAway?.name}
              </span>
            </div>
            {winnerCode === awayCode && <Check className="h-3.5 w-3.5 text-neon shrink-0 ml-1" />}
          </button>

          <input
            type="number"
            value={awayScore}
            min={0}
            onChange={(e) => onScoreChange("away", e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder="-"
            className="w-8 h-7 text-center bg-white/5 border border-white/10 rounded-lg font-bold text-xs text-foreground focus:ring-1 focus:ring-neon focus:outline-none placeholder-white/10 shrink-0 [-moz-appearance:_textfield] [&::-webkit-outer-spin-button]:margin-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:margin-0 [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
      </div>
    </div>
  );
}
