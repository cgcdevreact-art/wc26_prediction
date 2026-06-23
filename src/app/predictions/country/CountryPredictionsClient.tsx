"use client";

import { useEffect, useState, useMemo, useRef, ReactNode } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useSimulationStore, PlayerStats, TeamStats } from "@/lib/store/simulationStore";
import { useTeams, useGroupsConfig } from "@/components/TeamsProvider";
import { getMatchExpectedGoals, SimTeam } from "@/lib/simulation/model";
import { Trophy, Search, ChevronRight, User, TrendingUp, Sparkles, AlertCircle, Check, PencilLine, Lock, Trash2, X, Info, Minus, Plus, Shield, Zap, Coins, Cpu, Award, Route } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { UpgradeModal } from "@/components/site/UpgradeModal";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from "recharts";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { buildAuthModalHref } from "@/lib/auth-modal";
import { CustomCountry } from "@/components/site/WildcardCountrySection";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { readPredictionPayload } from "@/lib/predictionWinner";

// Poisson score generator
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

function formatTeamScaleRating(value: number | undefined | null) {
  if (value === undefined || value === null) return 75;
  if (value < 10) {
    const minM = 0.75;
    const maxM = 1.1;
    const minR = 50;
    const maxR = 95;
    const rating = ((value - minM) / (maxM - minM)) * (maxR - minR) + minR;
    return Math.max(15, Math.min(99, Math.round(rating)));
  }
  return Math.max(15, Math.min(99, Math.round(value)));
}

function clampRating(value: number, min = 1, max = 99) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function InfoTooltip({ content }: { content: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button 
            type="button"
            onClick={(e) => e.stopPropagation()} 
            className="inline-block ml-1.5 align-middle cursor-help select-none bg-transparent border-none p-0 outline-none focus:outline-none"
          >
            <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-slate-900 dark:hover:text-white transition-colors" />
          </button>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="max-w-[200px] bg-slate-950 text-white border border-white/10 px-2.5 py-1.5 text-[11px] font-medium normal-case tracking-normal leading-normal text-center shadow-xl rounded-lg z-50"
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const CustomCompareTooltip = ({ active, payload, label, mode }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-950/95 text-white border border-white/10 px-3 py-2 text-xs rounded-xl shadow-xl backdrop-blur-md">
        <p className="font-bold border-b border-white/10 pb-1 mb-1">{label}</p>
        <div className="space-y-1">
          {payload.map((pld: any) => {
            const countryName = pld.name;
            const value = pld.value;
            const rawVal = mode === "attributes" && pld.payload ? pld.payload[`${countryName}_raw`] : null;
            return (
              <div key={countryName} className="flex items-center justify-between gap-4 font-medium">
                <span className="flex items-center gap-1.5" style={{ color: pld.color }}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: pld.color }} />
                  {countryName}
                </span>
                <span className="font-bold font-mono">
                  {mode === "progression" ? `${value}%` : (rawVal ?? value)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

export default function CountryPredictionsClient({
  initialTeams,
  initialPlayers,
  flagMap
}: {
  initialTeams: TeamStats[],
  initialPlayers: PlayerStats[],
  flagMap: Record<string, string>
}) {
  const { isInitialized, initializeData, players, selectedModel, setSelectedModel } = useSimulationStore();
  const appTeams = useTeams();
  const GROUPS_CONFIG = useGroupsConfig();
  const { theme } = useTheme();
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [zoomScale, setZoomScale] = useState(85);

  // Saved predictions state & logic
  const [savedPredictions, setSavedPredictions] = useState<any[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);
  const [compareChartTab, setCompareChartTab] = useState<"progression" | "attributes">("progression");

  const fetchSavedPredictions = async () => {
    if (!session?.user?.id) return;
    setIsLoadingSaved(true);
    try {
      const res = await fetch("/api/predictions");
      if (res.ok) {
        const data = await res.json();
        const countryProjs = data.filter((p: any) => p.type === "COUNTRY_PROJECTION");
        setSavedPredictions(countryProjs);
      }
    } catch (err) {
      console.error("Error fetching saved predictions:", err);
    } finally {
      setIsLoadingSaved(false);
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      fetchSavedPredictions();
    }
  }, [session]);

  const handleLoadPrediction = (prediction: any) => {
    try {
      ignoreResetRef.current = true;
      const data = readPredictionPayload<any>(prediction.predictedPayload, prediction.predictedWinner);

      if (!data) {
        ignoreResetRef.current = false;
        return;
      }

      setSelectedCode(data.code);

      if (data.modelName) {
        setSelectedModel(data.modelName);
      }

      setCustomElo(data.customElo ?? data.elo ?? 1500);
      setCustomAttack(data.customAttack ?? 75);
      setCustomDefense(data.customDefense ?? 75);
      setCustomPlayerRatingDelta(data.customPlayerRatingDelta ?? 0);
      setPlayersIn(data.playersIn ?? []);
      setPlayersOut(data.playersOut ?? []);

      if (data.simResults) {
        setSimResults(data.simResults);
      } else {
        const reconstructedStages = data.stages || {
          group: 1000,
          r32: 0,
          r16: 0,
          qf: 0,
          sf: 0,
          final: 0,
          champion: (data.championProb ?? 0) * 10
        };
        setSimResults({
          stages: reconstructedStages,
          opponents: {},
          mockTournament: null
        });
      }

      toast.success(`Loaded saved simulation for ${data.name}!`);

      // Delay resetting the ref to allow React to flush state updates
      setTimeout(() => {
        ignoreResetRef.current = false;
      }, 100);
    } catch (err) {
      ignoreResetRef.current = false;
      console.error("Error loading prediction:", err);
      toast.error("Failed to load prediction. Data may be corrupted.");
    }
  };

  const handleDeletePrediction = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the saved prediction for ${name}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/predictions?id=${id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        toast.success(`Deleted prediction for ${name}`);
        setSelectedCompareIds(prev => prev.filter(cid => cid !== id));
        fetchSavedPredictions();
      } else {
        throw new Error("Failed to delete");
      }
    } catch (err) {
      console.error("Error deleting prediction:", err);
      toast.error("Failed to delete prediction.");
    }
  };

  const toggleCompareSelect = (id: string) => {
    setSelectedCompareIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((cid) => cid !== id);
      }
      if (prev.length >= 4) {
        toast.error("You can select a maximum of 4 predictions for comparison.");
        return prev;
      }
      return [...prev, id];
    });
  };

  // Credit limits states
  const [creditsUsed, setCreditsUsed] = useState<number>(0);
  const [guestCreditsUsed, setGuestCreditsUsed] = useState<number>(0);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeModalReason, setUpgradeModalReason] = useState<"plus" | "pro" | "credits" | "guest">("plus");
  const [subscriptionTier, setSubscriptionTier] = useState<string>("free");

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
          if (data) {
            if (typeof data.usageCount === "number") {
              setCreditsUsed(data.usageCount);
            }
            if (data.tier) {
              setSubscriptionTier(data.tier);
            }
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
    const tier = (subscriptionTier || session.user.subscriptionTier || "free").toLowerCase();
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

  const activeTheme = useMemo(() => {
    if (theme === "system") {
      if (typeof window !== "undefined") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }
      return "dark";
    }
    return theme;
  }, [theme]);

  const [mounted, setMounted] = useState(false);
  const [selectedCode, setSelectedCode] = useState("ARG");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [simProgress, setSimProgress] = useState(0);
  const hasSeenSelectionChange = useRef(false);
  const hasAppliedSearchSelection = useRef(false);
  const hasInitializedCustomizer = useRef(false);
  const ignoreResetRef = useRef(false);
  const formattedModelName = selectedModel ? selectedModel.charAt(0).toUpperCase() + selectedModel.slice(1) : "";
  const activePlan = (subscriptionTier || session?.user?.subscriptionTier || "free").toLowerCase();
  const canEditTeamCore = true;
  const canEditPlayerRatings = activePlan === "plus" || activePlan === "pro";
  const canEditPlayerAvailability = activePlan === "pro";

  const openAuthModal = (mode: "signin" | "signup" = "signin") => {
    router.push(buildAuthModalHref({
      pathname,
      search: searchParams.toString(),
      mode,
      callbackUrl: pathname,
    }));
  };

  // Simulation results state
  const [simResults, setSimResults] = useState<{
    stages: Record<string, number>;
    opponents: Record<string, Record<string, { count: number; gfSum: number; gaSum: number; wins: number }>>;
    mockTournament?: any;
  } | null>(null);

  const [customCountries, setCustomCountries] = useState<CustomCountry[]>([]);

  useEffect(() => {
    setMounted(true);
    initializeData(initialTeams, initialPlayers);
    let localList: CustomCountry[] = [];
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("wc26_custom_countries");
        if (stored) {
          localList = JSON.parse(stored);
          setCustomCountries(localList);
        }
      } catch (e) {
        console.error("Failed to load custom countries", e);
      }
    }

    if (session?.user?.id) {
      fetch("/api/user/custom-countries")
        .then((res) => res.json())
        .then(async (data) => {
          if (data.success && Array.isArray(data.customCountries)) {
            const dbList = data.customCountries;
            const merged = [...dbList];
            const uploadPromises = [];

            for (const localTeam of localList) {
              const existsInDb = dbList.some((dbTeam: any) => dbTeam.code === localTeam.code);
              if (!existsInDb) {
                merged.push(localTeam);
                uploadPromises.push(
                  fetch("/api/user/custom-countries", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(localTeam),
                  }).catch((err) => console.error("Error uploading custom team:", err))
                );
              }
            }

            if (uploadPromises.length > 0) {
              await Promise.all(uploadPromises);
            }

            setCustomCountries(merged);
            localStorage.setItem("wc26_custom_countries", JSON.stringify(merged));
          }
        })
        .catch((err) => console.error("Error fetching custom countries from DB:", err));
    }
  }, [initializeData, initialTeams, initialPlayers, session]);

  const handleDeleteCustomCountry = (code: string) => {
    if (!confirm("Are you sure you want to delete this custom country?")) {
      return;
    }
    const updated = customCountries.filter((c) => c.code !== code);
    localStorage.setItem("wc26_custom_countries", JSON.stringify(updated));
    setCustomCountries(updated);
    if (selectedCode === code) {
      setSelectedCode("ARG");
      // Update URL query parameters
      const params = new URLSearchParams(window.location.search);
      params.set("team", "ARG");
      window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
    }

    if (session?.user?.id) {
      fetch("/api/user/custom-countries", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      }).catch((err) => console.error("Error deleting custom country from DB:", err));
    }
  };

  useEffect(() => {
    if (hasAppliedSearchSelection.current || appTeams.length === 0) return;

    const requestedTeam = searchParams.get("team") || searchParams.get("country");
    if (!requestedTeam) {
      hasAppliedSearchSelection.current = true;
      return;
    }

    const normalizedCode = requestedTeam.trim().toUpperCase();
    const isCustom = normalizedCode.startsWith("CC_") || customCountries.some(cc => cc.code === normalizedCode);
    const teamExists = isCustom || appTeams.some((team) => team.code === normalizedCode);

    hasAppliedSearchSelection.current = true;

    if (!teamExists || normalizedCode === selectedCode) return;

    hasSeenSelectionChange.current = false;
    setSelectedCode(normalizedCode);
    setSearchQuery("");
  }, [appTeams, searchParams, selectedCode, customCountries]);

  const activeCustomCountry = useMemo(() => {
    return customCountries.find((cc) => cc.code === selectedCode);
  }, [selectedCode, customCountries]);

  const effectiveCode = useMemo(() => {
    return activeCustomCountry ? activeCustomCountry.replacedCode : selectedCode;
  }, [activeCustomCountry, selectedCode]);

  const selectedTeam = useMemo(() => {
    if (activeCustomCountry) {
      const origTeam = appTeams.find((t) => t.code === activeCustomCountry.replacedCode) || appTeams[0];
      return {
        code: activeCustomCountry.code,
        name: activeCustomCountry.name,
        flag: activeCustomCountry.flag,
        rank: origTeam?.rank || 99,
        elo: activeCustomCountry.elo,
        attack: activeCustomCountry.attack,
        defense: activeCustomCountry.defense,
        power: origTeam?.power || 75,
        squadValueM: origTeam?.squadValueM || 100,
      };
    }
    return appTeams.find((t) => t.code === selectedCode) || appTeams[0];
  }, [selectedCode, activeCustomCountry, appTeams]);

  const getTeam = (code: string): SimTeam => {
    const custom = customCountries.find((cc) => cc.replacedCode === code || cc.code === code);
    if (custom) {
      const isSelected = (custom.replacedCode === effectiveCode) || (custom.code === effectiveCode);
      return {
        code: custom.replacedCode,
        name: custom.name,
        flag: custom.flag,
        elo: isSelected ? customElo : custom.elo,
        attack: isSelected ? customAttack : custom.attack,
        defense: isSelected ? customDefense : custom.defense,
        power: appTeams.find((t) => t.code === custom.baselineCode)?.power || 75,
      };
    }
    const appTeam = appTeams.find((t) => t.code === code);
    if (appTeam) {
      const isSelected = code === effectiveCode;
      return {
        code: appTeam.code,
        name: appTeam.name,
        flag: appTeam.flag,
        elo: isSelected ? customElo : appTeam.elo,
        attack: isSelected ? customAttack : appTeam.attack,
        defense: isSelected ? customDefense : appTeam.defense,
        power: appTeam.power,
      };
    }
    return {
      code: "ARG",
      name: "Argentina",
      flag: "🇦🇷",
      elo: 1875,
      attack: 1.09,
      defense: 1.09,
    };
  };

  const [customElo, setCustomElo] = useState<number>(selectedTeam?.elo || 1500);
  const [customAttack, setCustomAttack] = useState<number>(formatTeamScaleRating(selectedTeam?.attack));
  const [customDefense, setCustomDefense] = useState<number>(formatTeamScaleRating(selectedTeam?.defense));
  const [customPlayerRatingDelta, setCustomPlayerRatingDelta] = useState<number>(0);
  const [playersIn, setPlayersIn] = useState<string[]>([]);
  const [playersOut, setPlayersOut] = useState<string[]>([]);

  useEffect(() => {
    if (ignoreResetRef.current) return;
    if (!selectedTeam) return;
    setCustomElo(Math.round(selectedTeam.elo));
    setCustomAttack(formatTeamScaleRating(selectedTeam.attack));
    setCustomDefense(formatTeamScaleRating(selectedTeam.defense));
    setCustomPlayerRatingDelta(0);
    setPlayersIn([]);
    setPlayersOut([]);
    setSimResults(null);
  }, [selectedCode, selectedTeam]);

  useEffect(() => {
    if (ignoreResetRef.current) return;
    if (!hasInitializedCustomizer.current) {
      hasInitializedCustomizer.current = true;
      return;
    }
    setSimResults(null);
  }, [customElo, customAttack, customDefense, customPlayerRatingDelta, playersIn, playersOut]);

  const togglePlayerSelection = (bucket: "in" | "out", playerId: string) => {
    if (!canEditPlayerAvailability) {
      setUpgradeModalReason("pro");
      setUpgradeModalOpen(true);
      return;
    }

    if (bucket === "in") {
      setPlayersIn((prev) => {
        const next = prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId];
        return next;
      });
      setPlayersOut((prev) => prev.filter((id) => id !== playerId));
      return;
    }

    setPlayersOut((prev) => {
      const next = prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId];
      return next;
    });
    setPlayersIn((prev) => prev.filter((id) => id !== playerId));
  };

  const customizedPlayers = useMemo(() => {
    if (!selectedCode) return players;

    const nextPlayers = { ...players };

    Object.entries(players).forEach(([playerId, player]) => {
      const targetTeamCode = activeCustomCountry ? activeCustomCountry.baselineCode : selectedCode;
      if (player["Team Code"] !== targetTeamCode) return;

      const currentOverall = parseInt(player["Overall Rating"]?.replace("%", "") || "75", 10);
      const currentForm = parseInt(player["Recent Form"]?.replace("%", "") || "70", 10);
      const currentFitness = parseInt(player["Fitness / Availability"]?.replace("%", "") || "80", 10);

      let ratingDelta = canEditPlayerRatings ? customPlayerRatingDelta : 0;
      let formDelta = 0;
      let fitnessValue = currentFitness;

      if (canEditPlayerAvailability && playersIn.includes(playerId)) {
        ratingDelta += 4;
        formDelta += 8;
        fitnessValue = 99;
      }

      if (canEditPlayerAvailability && playersOut.includes(playerId)) {
        ratingDelta -= 18;
        formDelta -= 18;
        fitnessValue = 25;
      }

      nextPlayers[playerId] = {
        ...player,
        "Overall Rating": String(clampRating(currentOverall + ratingDelta)),
        "Recent Form": String(clampRating(currentForm + formDelta)),
        "Fitness / Availability": String(clampRating(fitnessValue)),
      };
    });

    return nextPlayers;
  }, [players, selectedCode, customPlayerRatingDelta, playersIn, playersOut, canEditPlayerRatings, canEditPlayerAvailability, activeCustomCountry]);

  const getTeamPlayers = (teamCode: string) => {
    const custom = customCountries.find((cc) => cc.code === teamCode || cc.replacedCode === teamCode);
    const sourceCode = custom ? custom.baselineCode : teamCode;
    const rawPlayers = Object.values(customizedPlayers)
      .filter((p) => p["Team Code"] === sourceCode);

    if (custom) {
      return rawPlayers.map((p) => ({
        ...p,
        "Team Code": teamCode,
      })).sort((a, b) => {
        const ratingA = parseInt(a["Overall Rating"]?.replace("%", "") || "0", 10);
        const ratingB = parseInt(b["Overall Rating"]?.replace("%", "") || "0", 10);
        return ratingB - ratingA;
      });
    }

    return rawPlayers.sort((a, b) => {
      const ratingA = parseInt(a["Overall Rating"]?.replace("%", "") || "0", 10);
      const ratingB = parseInt(b["Overall Rating"]?.replace("%", "") || "0", 10);
      return ratingB - ratingA;
    });
  };

  const getTopPlayer = (teamCode: string) => {
    const teamPlayers = getTeamPlayers(teamCode);
    const topPlayer = teamPlayers[0];
    const name = topPlayer ? cleanPlayerName(topPlayer["Name on Shirt"] || topPlayer["Player Name"]) : "";
    const rating = topPlayer ? (topPlayer["Overall Rating"] || "") : "";
    return name ? `${name} (${rating})` : "N/A";
  };

  // Run 1,000 tournament simulations to calculate path probabilities
  const runSimulations = async () => {
    setIsSimulating(true);
    setSaveSuccess(false);
    setSimProgress(0);

    const iterations = 1000;
    const CHUNK_SIZE = 50;

    const stageCounts: Record<string, number> = {
      group: 0,
      r32: 0,
      r16: 0,
      qf: 0,
      sf: 0,
      final: 0,
      champion: 0
    };

    const stageOpponents: Record<string, Record<string, { count: number; gfSum: number; gaSum: number; wins: number }>> = {
      group: {},
      r32: {},
      r16: {},
      qf: {},
      sf: {},
      final: {}
    };

    const trackMatch = (stage: string, team: string, opponent: string, gf: number, ga: number, won: boolean) => {
      if (team !== effectiveCode) return;
      if (!stageOpponents[stage][opponent]) {
        stageOpponents[stage][opponent] = { count: 0, gfSum: 0, gaSum: 0, wins: 0 };
      }
      stageOpponents[stage][opponent].count += 1;
      stageOpponents[stage][opponent].gfSum += gf;
      stageOpponents[stage][opponent].gaSum += ga;
      if (won) stageOpponents[stage][opponent].wins += 1;
    };

    const simulateKo = (home: string, away: string) => {
      const homeTeam = getTeam(home);
      const awayTeam = getTeam(away);
      const { homeLambda, awayLambda } = getMatchExpectedGoals(homeTeam, awayTeam, customizedPlayers, selectedModel);
      let hs = getPoisson(homeLambda);
      let as = getPoisson(awayLambda);
      if (hs === as) {
        if (Math.random() > 0.5) hs += 1;
        else as += 1;
      }
      return { hs, as, winner: hs > as ? home : away };
    };

    let bestScore = -1;
    let bestMockTournament: any = null;

    for (let start = 0; start < iterations; start += CHUNK_SIZE) {
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          const end = Math.min(start + CHUNK_SIZE, iterations);
          for (let iteration = start; iteration < end; iteration++) {
            let currentScore = 0;

            // Mock Tournament tracking for this iteration
            const currentMock: any = {
              groups: {},
              r32: [],
              r16: [],
              qf: [],
              sf: [],
              final: null
            };

            // Group Stage Simulation
            const groupStandings: Record<string, { code: string; pts: number; gd: number; gf: number; elo: number }[]> = {};

            Object.entries(GROUPS_CONFIG).forEach(([groupName, groupTeams]) => {
              const standings = groupTeams.map(code => ({
                code,
                pts: 0,
                gd: 0,
                gf: 0,
                elo: getTeam(code).elo || 1500
              }));

              const playMatch = (t1Idx: number, t2Idx: number) => {
                const t1 = getTeam(standings[t1Idx].code);
                const t2 = getTeam(standings[t2Idx].code);
                const { homeLambda, awayLambda } = getMatchExpectedGoals(t1, t2, customizedPlayers, selectedModel);
                const hs = getPoisson(homeLambda);
                const as = getPoisson(awayLambda);

                standings[t1Idx].gf += hs;
                standings[t1Idx].gd += (hs - as);
                standings[t2Idx].gf += as;
                standings[t2Idx].gd += (as - hs);

                if (hs > as) {
                  standings[t1Idx].pts += 3;
                  trackMatch("group", t1.code, t2.code, hs, as, true);
                  trackMatch("group", t2.code, t1.code, as, hs, false);
                } else if (hs < as) {
                  standings[t2Idx].pts += 3;
                  trackMatch("group", t1.code, t2.code, hs, as, false);
                  trackMatch("group", t2.code, t1.code, as, hs, true);
                } else {
                  standings[t1Idx].pts += 1;
                  standings[t2Idx].pts += 1;
                  trackMatch("group", t1.code, t2.code, hs, as, false);
                  trackMatch("group", t2.code, t1.code, as, hs, false);
                }
              };

              // 6 fixtures:
              playMatch(0, 1);
              playMatch(2, 3);
              playMatch(0, 2);
              playMatch(1, 3);
              playMatch(3, 0);
              playMatch(1, 2);

              standings.sort((a, b) => {
                if (b.pts !== a.pts) return b.pts - a.pts;
                if (b.gd !== a.gd) return b.gd - a.gd;
                if (b.gf !== a.gf) return b.gf - a.gf;
                return b.elo - a.elo;
              });

              groupStandings[groupName] = standings;
              currentMock.groups[groupName] = standings;
            });

            stageCounts.group += 1;

            // Rank thirds
            const thirds = Object.entries(groupStandings).map(([_, stand]) => stand[2]);
            thirds.sort((a, b) => {
              if (b.pts !== a.pts) return b.pts - a.pts;
              if (b.gd !== a.gd) return b.gd - a.gd;
              if (b.gf !== a.gf) return b.gf - a.gf;
              return b.elo - a.elo;
            });
            const bestThirds = thirds.slice(0, 8);

            const getWinner = (g: string) => groupStandings[g]?.[0]?.code || "";
            const getRunner = (g: string) => groupStandings[g]?.[1]?.code || "";
            const getThird = (idx: number) => bestThirds[idx]?.code || "ARG";

            const qualifiedTeams = Array.from(new Set([
              ...Object.keys(GROUPS_CONFIG).flatMap((groupKey) => [getWinner(groupKey), getRunner(groupKey)]),
              ...bestThirds.map((team) => team.code),
            ].filter(Boolean)));

            // Generate R32 pairings
            const rawR32Pairings = [
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

            const assignedTeams = new Set<string>();
            const takeReplacementTeam = (otherTeam?: string) => {
              const replacement = qualifiedTeams.find((teamCode) => !assignedTeams.has(teamCode) && teamCode !== otherTeam);
              if (replacement) {
                assignedTeams.add(replacement);
              }
              return replacement || "";
            };

            const r32Pairings = rawR32Pairings.map((pair) => {
              let home = pair.home;
              if (!home || assignedTeams.has(home)) {
                home = takeReplacementTeam();
              } else {
                assignedTeams.add(home);
              }

              let away = pair.away;
              if (!away || away === home || assignedTeams.has(away)) {
                away = takeReplacementTeam(home);
              } else {
                assignedTeams.add(away);
              }

              if (away === home) {
                away = takeReplacementTeam(home);
              }

              return { home, away };
            }).filter((pair) => pair.home && pair.away && pair.home !== pair.away);

            // Check if selected country is in R32
            const inR32 = r32Pairings.some(p => p.home === effectiveCode || p.away === effectiveCode);
            if (inR32) currentScore = 1;
            if (inR32) stageCounts.r32 += 1;

            // Simulate R32
            const r16Teams: string[] = [];
            r32Pairings.forEach((pair) => {
              const { hs, as, winner } = simulateKo(pair.home, pair.away);
              r16Teams.push(winner);
              currentMock.r32.push({ home: pair.home, away: pair.away, hs, as, winner });
              if (inR32) {
                trackMatch("r32", pair.home, pair.away, hs, as, winner === pair.home);
                trackMatch("r32", pair.away, pair.home, as, hs, winner === pair.away);
              }
            });

            // Check if selected country is in R16
            const inR16 = r16Teams.includes(effectiveCode);
            if (inR16) currentScore = 2;
            if (inR16) stageCounts.r16 += 1;

            // Simulate R16
            const qfTeams: string[] = [];
            for (let i = 0; i < 8; i++) {
              const home = r16Teams[2 * i];
              const away = r16Teams[2 * i + 1];
              const { hs, as, winner } = simulateKo(home, away);
              qfTeams.push(winner);
              currentMock.r16.push({ home, away, hs, as, winner });
              if (inR16) {
                trackMatch("r16", home, away, hs, as, winner === home);
                trackMatch("r16", away, home, as, hs, winner === away);
              }
            }

            // Check QF
            const inQF = qfTeams.includes(effectiveCode);
            if (inQF) currentScore = 3;
            if (inQF) stageCounts.qf += 1;

            // Simulate QF
            const sfTeams: string[] = [];
            for (let i = 0; i < 4; i++) {
              const home = qfTeams[2 * i];
              const away = qfTeams[2 * i + 1];
              const { hs, as, winner } = simulateKo(home, away);
              sfTeams.push(winner);
              currentMock.qf.push({ home, away, hs, as, winner });
              if (inQF) {
                trackMatch("qf", home, away, hs, as, winner === home);
                trackMatch("qf", away, home, as, hs, winner === away);
              }
            }

            // Check SF
            const inSF = sfTeams.includes(effectiveCode);
            if (inSF) currentScore = 4;
            if (inSF) stageCounts.sf += 1;

            // Simulate SF
            const finalTeams: string[] = [];
            for (let i = 0; i < 2; i++) {
              const home = sfTeams[2 * i];
              const away = sfTeams[2 * i + 1];
              const { hs, as, winner } = simulateKo(home, away);
              finalTeams.push(winner);
              currentMock.sf.push({ home, away, hs, as, winner });
              if (inSF) {
                trackMatch("sf", home, away, hs, as, winner === home);
                trackMatch("sf", away, home, as, hs, winner === away);
              }
            }

            // Check Final
            const inFinal = finalTeams.includes(effectiveCode);
            if (inFinal) currentScore = 5;
            if (inFinal) stageCounts.final += 1;

            // Simulate Final
            const homeTeam = finalTeams[0];
            const awayTeam = finalTeams[1];
            const { hs, as, winner } = simulateKo(homeTeam, awayTeam);
            currentMock.final = { home: homeTeam, away: awayTeam, hs, as, winner };
            if (inFinal) {
              trackMatch("final", homeTeam, awayTeam, hs, as, winner === homeTeam);
              trackMatch("final", awayTeam, homeTeam, as, hs, winner === awayTeam);
            }

            if (winner === effectiveCode) {
              stageCounts.champion += 1;
              currentScore = 6;
            }

            // Keep best mock tournament
            if (currentScore > bestScore) {
              bestScore = currentScore;
              bestMockTournament = currentMock;
            }
          } // end chunk loop
          setSimProgress(Math.floor((end / iterations) * 100));
          resolve();
        }, 0);
      }); // end Promise
    } // end main loop

    setSimResults({
      stages: stageCounts,
      opponents: stageOpponents,
      mockTournament: bestMockTournament
    });
    setIsSimulating(false);
    setShowConfirmPopup(false);
  };

  const handleSavePrediction = async () => {
    if (!selectedTeam || !simResults || !pathStepInfo) return;
    setIsSaving(true);
    setSaveSuccess(false);

    // Convert team code to unique numeric ID for matchId to support multiple countries
    const teamNumericId = selectedTeam.code.charCodeAt(0) * 10000 +
      selectedTeam.code.charCodeAt(1) * 100 +
      selectedTeam.code.charCodeAt(2);

    const predictionData = {
      matchId: teamNumericId,
      type: "COUNTRY_PROJECTION",
      predictedWinner: JSON.stringify({
        code: selectedTeam.code,
        name: selectedTeam.name,
        flag: selectedTeam.flag,
        elo: Math.round(selectedTeam.elo),
        championProb: Math.round((simResults.stages.champion / 1000) * 100),
        stages: simResults.stages,
        modelName: selectedModel,
        customElo: customElo,
        customAttack: customAttack,
        customDefense: customDefense,
        squadValueM: selectedTeam.squadValueM,
        customPlayerRatingDelta: customPlayerRatingDelta,
        playersIn: playersIn,
        playersOut: playersOut,
        simResults: simResults,
        path: pathStepInfo.map(step => ({
          stage: step.stage,
          opponentCode: step.opponent?.code || null,
          opponentName: step.opponent?.name || null,
          opponentFlag: step.opponent?.flag || null,
          winPct: step.winPct,
          expectedScore: step.expectedScore
        }))
      })
    };

    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(predictionData)
      });

      if (!res.ok) throw new Error("Failed to save prediction");

      setSaveSuccess(true);
      toast.success(`Successfully saved simulation for ${selectedTeam.name}!`);
      // Refresh saved predictions list
      fetchSavedPredictions();
    } catch (err) {
      console.error(err);
      toast.error("Error saving prediction. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunSimulationClick = () => {
    if (!session) {
      toast.error("Please sign in first to run a simulation.");
      openAuthModal("signin");
      return;
    }

    setShowConfirmPopup(true);
    setSaveSuccess(false);
  };

  // Reset saved state whenever the selected country or prediction model changes
  useEffect(() => {
    if (mounted) {
      setSaveSuccess(false);
    }
  }, [selectedCode, selectedModel, mounted]);

  // Auto-run simulation if autorun=true is present in the URL
  useEffect(() => {
    if (!mounted || !isInitialized) return;

    const autorun = searchParams.get("autorun") === "true";
    if (autorun) {
      // Clear autorun from the URL so it doesn't re-run on subsequent page loads/refreshes
      const params = new URLSearchParams(searchParams.toString());
      params.delete("autorun");
      const cleanUrl = `${pathname}?${params.toString()}`;
      window.history.replaceState(null, "", cleanUrl);

      // Execute simulation automatically
      const executeAutoSim = async () => {
        const allowed = await consumeCredit();
        if (allowed) {
          runSimulations();
        }
      };
      executeAutoSim();
    }
  }, [mounted, isInitialized, searchParams, pathname]);

  // Sort and filter teams list in sidebar
  const sortedTeams = useMemo(() => {
    const baseList = [...appTeams].sort((a, b) => b.elo - a.elo);
    const customList = customCountries.map((cc) => {
      const orig = appTeams.find((t) => t.code === cc.replacedCode);
      return {
        code: cc.code,
        name: cc.name,
        flag: cc.flag,
        elo: cc.elo,
        rank: orig?.rank || 99,
        power: orig?.power || 75,
        attack: cc.attack,
        defense: cc.defense,
        squadValueM: orig?.squadValueM || 100,
        confederation: orig?.confederation || "UEFA",
      } as any;
    });
    return [...customList, ...baseList];
  }, [appTeams, customCountries]);

  const filteredTeams = useMemo(() => {
    if (!searchQuery) return sortedTeams;
    const q = searchQuery.toLowerCase();
    return sortedTeams.filter(t => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q));
  }, [searchQuery, sortedTeams]);

  // Dynamic calculations for Radar chart
  const radarData = useMemo(() => {
    if (!selectedTeam) return [];
    return [
      { axis: "Attack", v: formatTeamScaleRating(customAttack) },
      { axis: "Defense", v: formatTeamScaleRating(customDefense) },
      { axis: "Power", v: selectedTeam.power || 70 },
      { axis: "Form", v: Math.min(99, (selectedTeam.power || 70) + 4) },
      { axis: "Squad", v: Math.min(99, 50 + (selectedTeam.squadValueM || 500) / 15) },
      { axis: "Elo", v: Math.round(((customElo || 1500) - 1300) / 6) },
    ];
  }, [selectedTeam, customAttack, customDefense, customElo]);

  // Dynamic calculations for squad stats
  const squadStats = useMemo(() => {
    const teamPlayers = getTeamPlayers(selectedTeam.code);
    const total = teamPlayers.length;
    if (total === 0) {
      return { total: 0, avgRating: 0, elite: 0, veryStrong: 0, strong: 0, average: 0, weak: 0 };
    }

    let sumRating = 0;
    let elite = 0;
    let veryStrong = 0;
    let strong = 0;
    let average = 0;
    let weak = 0;

    teamPlayers.forEach((p) => {
      const rating = parseInt(p["Overall Rating"]?.replace("%", "") || "0", 10);
      sumRating += rating;
      const tier = (p["Rating Tier"] || "").trim().toLowerCase();
      if (tier.includes("elite")) elite++;
      else if (tier.includes("very strong")) veryStrong++;
      else if (tier.includes("strong")) strong++;
      else if (tier.includes("average") || tier.includes("good")) average++;
      else weak++;
    });

    return {
      total,
      avgRating: Math.round(sumRating / total),
      elite,
      veryStrong,
      strong,
      average,
      weak,
    };
  }, [selectedCode, customizedPlayers, selectedTeam]);

  const squadTiers = useMemo(() => ([
    { label: "Elite", count: squadStats.elite, color: "from-amber-400 via-yellow-400 to-lime-300" },
    { label: "Very Strong", count: squadStats.veryStrong, color: "from-neon to-neon-2" },
    { label: "Strong", count: squadStats.strong, color: "from-sky-500 to-cyan-400" },
    { label: "Good/Average", count: squadStats.average + squadStats.weak, color: "from-slate-500 to-slate-400" },
  ].map((tier) => ({
    ...tier,
    pct: squadStats.total > 0 ? Math.round((tier.count / squadStats.total) * 100) : 0,
  }))), [squadStats]);

  // Keep the compact path cards aligned with the showcased mock bracket.
  const pathStepInfo = useMemo(() => {
    if (!simResults?.mockTournament) return [];

    const stagesOrdered = [
      { key: "r32", label: "Round of 32" },
      { key: "r16", label: "Round of 16" },
      { key: "qf", label: "Quarter Final" },
      { key: "sf", label: "Semi Final" },
      { key: "final", label: "Final" }
    ] as const;

    let currentCode = effectiveCode;

    return stagesOrdered.flatMap((stage) => {
      const stageMatches =
        stage.key === "final"
          ? simResults.mockTournament.final
            ? [simResults.mockTournament.final]
            : []
          : simResults.mockTournament[stage.key] || [];

      const match = stageMatches.find(
        (m: any) => m.home === currentCode || m.away === currentCode,
      );

      if (!match) return [];

      const isHome = match.home === currentCode;
      const opponentCode = isHome ? match.away : match.home;
      const opponent = getTeam(opponentCode);
      const gf = isHome ? match.hs : match.as;
      const ga = isHome ? match.as : match.hs;
      const aggregateStats = simResults.opponents[stage.key]?.[opponentCode];
      const winPct = aggregateStats
        ? Math.round((aggregateStats.wins / aggregateStats.count) * 100)
        : match.winner === currentCode
          ? 100
          : 0;

      const step = {
        stage: stage.label,
        opponent,
        winPct,
        expectedScore: `${gf} - ${ga}`,
      };

      currentCode = match.winner;
      return [step];
    });
  }, [effectiveCode, simResults]);

  const selectedGroup = Object.entries(GROUPS_CONFIG).find(([_, list]) => list.includes(effectiveCode))?.[0] || "-";
  const championProbability = simResults ? (simResults.stages.champion / 1000) * 100 : 0;
  const stageCards = [
    { key: "group", label: "Group Stage", icon: "G" },
    { key: "r32", label: "Round of 32", icon: "32" },
    { key: "r16", label: "Round of 16", icon: "16" },
    { key: "qf", label: "Quarter Final", icon: "QF" },
    { key: "sf", label: "Semi Final", icon: "SF" },
    { key: "final", label: "Final", icon: "F" },
    { key: "champion", label: "Champion", icon: "🏆" }
  ] as const;

  const getBracketRowClasses = (teamCode: string, isWinner: boolean, accent: "blue" | "gold" = "blue") => {
    const isSelected = teamCode === effectiveCode;
    if (isSelected) {
      return "bg-gradient-to-r from-amber-100 to-yellow-50 border border-amber-300 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.12)] dark:from-amber-500/25 dark:to-yellow-400/10 dark:border-amber-400/40";
    }
    if (isWinner && accent === "gold") {
      return "bg-gradient-to-r from-amber-100/90 to-yellow-50 border border-amber-300/80 dark:from-amber-500/18 dark:to-yellow-400/10 dark:border-amber-400/35";
    }
    if (isWinner) {
      return "bg-gradient-to-r from-sky-100/90 to-blue-50 border border-sky-300/80 dark:from-sky-500/18 dark:to-blue-500/10 dark:border-sky-400/35";
    }
    return "bg-slate-100/80 border border-transparent opacity-70 dark:bg-white/[0.03]";
  };

  const getBracketScoreClasses = (teamCode: string) =>
    teamCode === effectiveCode
      ? "bg-amber-50 text-amber-900 dark:bg-amber-300/15 dark:text-amber-100"
      : "bg-white/75 text-slate-700 dark:bg-black/50 dark:text-white";

  if (!mounted) return null;

  return (
    <div className="mx-auto container mx-auto px-4 w-full  py-8   animate-in fade-in duration-700">
      {/* Premium Dashboard Header */}
      <div className="relative mb-10 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-900">
        <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-emerald-100/70 blur-3xl pointer-events-none dark:bg-neon/10" />
        <div className="absolute -left-20 -bottom-20 h-60 w-60 rounded-full bg-fuchsia-100/70 blur-3xl pointer-events-none dark:bg-neon-2/10" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-cyan-600 dark:text-neon flex items-center gap-2 font-bold mb-2">
              <Sparkles className="w-4 h-4 text-cyan-600 dark:text-neon animate-pulse" />
              Predictive Intelligence Platform
            </div>
            <h1 className="font-display text-4xl font-black sm:text-5xl text-slate-950 dark:text-gradient tracking-tight">
              Path to Glory Explorer
            </h1>
            <p className="mt-2 text-muted-foreground text-sm max-w-2xl leading-relaxed">
              Simulate the entire tournament 1,000 times dynamically based on the active model.
              {selectedModel === "base" && " Uses Elo / Att / Def stats."}
              {selectedModel === "advanced" && " Includes Squad value & stats."}
              {selectedModel === "pro" && " Incorporates Player aspects & form."}
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <div className="flex flex-col items-end rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 shadow-sm dark:border-white/10 dark:bg-slate-950/60">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Simulation Engine</span>
              <span className="text-lg font-bold font-display text-cyan-700 dark:text-neon mt-0.5">{formattedModelName}</span>
            </div>
            <button
              onClick={handleRunSimulationClick}
              disabled={isSimulating || !isInitialized}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-emerald-500 to-fuchsia-500 px-5 py-3 text-sm font-black text-white shadow-[0_16px_40px_rgba(14,165,233,0.2)] transition-all hover:scale-[1.02] hover:shadow-[0_20px_50px_rgba(14,165,233,0.28)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              <span>{isSimulating ? "Running..." : "Run Simulation"}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6 grid items-start gap-6 lg:grid-cols-[320px_1fr]">
        {/* Left Column: Stacked Sidebar */}
        <div className="space-y-6 lg:w-[320px] shrink-0">
          {/* Left list of countries: Futuristic Sidebar Control */}
          <Accordion
            type="multiple"
            defaultValue={["country-list"]}
            className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-900"
          >
            <AccordionItem value="country-list" className="border-none data-[state=open]:flex data-[state=open]:flex-col data-[state=open]:lg:h-[820px]">
              <AccordionTrigger className="shrink-0 px-5 pt-5 pb-3 hover:no-underline">
                <div>
                  <div className="font-display text-lg font-bold text-foreground">Country Rankings</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Browse and simulate every national team</div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="min-h-0 px-5 pb-5 data-[state=open]:flex data-[state=open]:flex-1 [&>div]:flex [&>div]:h-full [&>div]:min-h-0 [&>div]:flex-1 [&>div]:flex-col [&>div]:pb-0">
                <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                  <div className="relative mb-5 group">
                    <Search className="absolute inset-y-0 left-3.5 h-4 w-4 my-auto text-muted-foreground group-focus-within:text-neon transition-colors" />
                    <Input
                      placeholder="Search country..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-11 border-slate-200 bg-slate-50 text-foreground text-sm focus-visible:ring-cyan-500 focus-visible:border-cyan-500 rounded-xl h-11 transition-all dark:border-white/10 dark:bg-white/5 dark:focus-visible:ring-neon dark:focus-visible:border-neon dark:focus-visible:bg-white/[0.08]"
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-custom ">
                    {filteredTeams.map((t) => {
                      const active = t.code === selectedCode;
                      return (
                        <div
                          key={t.code}
                          onClick={() => setSelectedCode(t.code)}
                          className={`w-full flex items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-left text-sm transition-all duration-300 border relative overflow-hidden group cursor-pointer ${active
                            ? "bg-gradient-to-r from-cyan-50 to-fuchsia-50 border-cyan-300 text-slate-950 shadow-[0_12px_30px_rgba(14,165,233,0.12)] font-bold dark:from-neon/10 dark:to-neon-2/10 dark:border-neon/30 dark:text-white dark:shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                            : "border-slate-200 bg-slate-50 text-muted-foreground hover:bg-slate-100 hover:text-slate-950 dark:border-white/5 dark:bg-white/[0.01] dark:hover:bg-white/5 dark:hover:text-white"
                            }`}
                        >
                          {active && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-gradient-to-b from-cyan-500 to-fuchsia-500 dark:from-neon dark:to-neon-2" />
                          )}
                          <div className="flex items-center gap-2.5 min-w-0 z-10">
                            <CountryFlag
                              code={t.code}
                              flag={t.flag}
                              name={t.name}
                              className="h-6 w-8 shrink-0 drop-shadow-md group-hover:scale-105 transition-transform duration-300 object-cover rounded"
                              emojiClassName="text-xl shrink-0 drop-shadow-md group-hover:scale-105 transition-transform duration-300 select-none"
                            />
                            <span className="truncate tracking-wide">{t.name}</span>
                            {active && (
                              <PencilLine className="w-3.5 h-3.5 text-cyan-600 dark:text-neon shrink-0 animate-pulse" />
                            )}
                          </div>
                          <div className="flex items-center gap-2.5 z-10">
                            <div className="text-xs font-mono font-bold text-fuchsia-600 text-right opacity-90 dark:text-neon-2">
                              {Math.round(t.elo)}
                            </div>
                            {t.code.startsWith("CC_") && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCustomCountry(t.code);
                                }}
                                className="p-1 rounded-md text-muted-foreground hover:text-red-500 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer animate-in fade-in"
                                title="Delete custom country"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {filteredTeams.length === 0 && (
                      <div className="text-center py-12 text-xs text-muted-foreground">
                        No country matches &quot;{searchQuery}&quot;
                      </div>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Simulation Lab Accordion */}
          <Accordion
            id="country-simulation-lab"
            type="multiple"
            defaultValue={["simulation-lab"]}
            className="rounded-[2rem] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)] relative dark:border-white/10 dark:bg-slate-900"
          >
            <AccordionItem value="simulation-lab" className="border-none">
              <AccordionTrigger className="px-5 pt-5 pb-3 hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div>
                    <div className="font-display font-bold text-lg text-foreground">Simulation Lab</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Tune strength, rating, and availability.</div>
                  </div>
                  <span className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${activePlan === "pro"
                    ? "bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/20"
                    : activePlan === "plus"
                      ? "bg-cyan-500/10 text-cyan-500 border-cyan-500/20"
                      : "bg-slate-500/10 text-slate-500 border-slate-500/20"
                    }`}>
                    {activePlan === "pro" ? "Pro" : activePlan === "plus" ? "Plus" : "Free"}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5">
                      <span className="text-xs font-semibold text-slate-700 dark:text-white/70 flex items-center">
                        <span>Elo Rating</span>
                        <InfoTooltip content="Overall skill rating of the country. Higher ELO increases the probability of winning matches." />
                      </span>
                      <input
                        type="number"
                        min={1200}
                        max={2200}
                        value={customElo}
                        disabled={!canEditTeamCore}
                        onChange={(e) => setCustomElo(clampRating(Number(e.target.value || 1200), 1200, 2200))}
                        className="w-24 h-9 rounded-lg border border-slate-200 bg-white text-center text-sm font-mono font-bold text-slate-950 outline-none transition focus:border-cyan-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
                      />
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5">
                      <span className="text-xs font-semibold text-slate-700 dark:text-white/70 flex items-center">
                        <span>Attack Power</span>
                        <InfoTooltip content="Influences the average number of goals scored per match by this team." />
                      </span>
                      <input
                        type="number"
                        min={15}
                        max={99}
                        value={customAttack}
                        disabled={!canEditTeamCore}
                        onChange={(e) => setCustomAttack(clampRating(Number(e.target.value || 15), 15, 99))}
                        className="w-24 h-9 rounded-lg border border-slate-200 bg-white text-center text-sm font-mono font-bold text-slate-950 outline-none transition focus:border-cyan-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
                      />
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5">
                      <span className="text-xs font-semibold text-slate-700 dark:text-white/70 flex items-center">
                        <span>Defense Strength</span>
                        <InfoTooltip content="Influences the average number of goals conceded per match by this team." />
                      </span>
                      <input
                        type="number"
                        min={15}
                        max={99}
                        value={customDefense}
                        disabled={!canEditTeamCore}
                        onChange={(e) => setCustomDefense(clampRating(Number(e.target.value || 15), 15, 99))}
                        className="w-24 h-9 rounded-lg border border-slate-200 bg-white text-center text-sm font-mono font-bold text-slate-950 outline-none transition focus:border-cyan-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="py-2.5 border-b border-slate-100 dark:border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-700 dark:text-white/70 flex items-center gap-1.5">
                        <span>Player Rating Boost</span>
                        <InfoTooltip content="Increases or decreases the overall rating of all individual players in the squad." />
                        <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded-md border bg-cyan-500/10 text-cyan-600 border-cyan-500/20 dark:bg-neon/10 dark:text-neon dark:border-neon/20 shrink-0 select-none">
                          Plus
                        </span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        {!canEditPlayerRatings && <Lock className="w-3 h-3 text-amber-500" />}
                        <span className="text-xs font-mono font-bold text-cyan-600 dark:text-neon">
                          {customPlayerRatingDelta > 0 ? `+${customPlayerRatingDelta}` : customPlayerRatingDelta}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={-10}
                        max={10}
                        value={customPlayerRatingDelta}
                        disabled={!canEditPlayerRatings}
                        onChange={(e) => setCustomPlayerRatingDelta(Number(e.target.value))}
                        className="w-full accent-cyan-600 disabled:opacity-45"
                        onClick={() => {
                          if (!canEditPlayerRatings) {
                            setUpgradeModalReason("plus");
                            setUpgradeModalOpen(true);
                          }
                        }}
                      />
                    </div>
                  </div>

                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="players-in" className="border-b border-slate-100 dark:border-white/5">
                      <AccordionTrigger className="py-2.5 text-xs font-semibold text-slate-700 dark:text-white/70 hover:no-underline">
                        <span className="flex items-center justify-between w-full pr-4">
                          <span className="flex items-center gap-1.5">
                            <span>Players In</span>
                            <InfoTooltip content="Choose reserve players to sub into the active starting lineup/squad." />
                            <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded-md border bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/20 dark:bg-neon-2/10 dark:text-neon-2 dark:border-neon-2/20 shrink-0 select-none">
                              Pro
                            </span>
                            {playersIn.length > 0 && (
                              <span className="px-1.5 py-0.5 rounded-full bg-cyan-100 text-cyan-800 text-[10px] font-bold dark:bg-neon/20 dark:text-neon ml-1">
                                {playersIn.length}
                              </span>
                            )}
                          </span>
                          {!canEditPlayerAvailability && <Lock className="w-3 h-3 text-amber-500" />}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-3">
                        <PlayerBucketCompact
                          players={getTeamPlayers(selectedTeam.code).slice(0, 12)}
                          activeIds={playersIn}
                          disabled={!canEditPlayerAvailability}
                          onToggle={(playerId) => togglePlayerSelection("in", playerId)}
                          onLockedClick={() => {
                            setUpgradeModalReason("pro");
                            setUpgradeModalOpen(true);
                          }}
                        />
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="players-out" className="border-none">
                      <AccordionTrigger className="py-2.5 text-xs font-semibold text-slate-700 dark:text-white/70 hover:no-underline">
                        <span className="flex items-center justify-between w-full pr-4">
                          <span className="flex items-center gap-1.5">
                            <span>Players Out</span>
                            <InfoTooltip content="Select active players to sideline or remove from the matches." />
                            <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded-md border bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/20 dark:bg-neon-2/10 dark:text-neon-2 dark:border-neon-2/20 shrink-0 select-none">
                              Pro
                            </span>
                            {playersOut.length > 0 && (
                              <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold dark:bg-rose-500/20 dark:text-rose-400">
                                {playersOut.length}
                              </span>
                            )}
                          </span>
                          {!canEditPlayerAvailability && <Lock className="w-3 h-3 text-amber-500" />}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-3">
                        <PlayerBucketCompact
                          players={getTeamPlayers(selectedTeam.code).slice(0, 12)}
                          activeIds={playersOut}
                          disabled={!canEditPlayerAvailability}
                          onToggle={(playerId) => togglePlayerSelection("out", playerId)}
                          onLockedClick={() => {
                            setUpgradeModalReason("pro");
                            setUpgradeModalOpen(true);
                          }}
                        />
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  <button
                    type="button"
                    onClick={handleRunSimulationClick}
                    disabled={isSimulating || !isInitialized}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0a8a45] via-[#2c7c87] to-[#af3fd1] px-5 text-sm font-black text-white shadow-[0_10px_25px_rgba(44,124,135,0.2)] transition hover:opacity-95 active:scale-[0.98] disabled:opacity-50 mt-3"
                  >
                    <Sparkles className="h-4 w-4" />
                    Run Customized Simulation
                  </button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Right main analysis panel */}
        <div className="space-y-6 min-w-0">
          {/* Header Team info & progression stats: Premium glass card */}
          <Accordion
            type="multiple"
            defaultValue={["team-overview"]}
            className="rounded-[2.25rem] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)] relative dark:border-white/10 dark:bg-slate-900"
          >
            <AccordionItem value="team-overview" className="border-none">
              <AccordionTrigger className="px-6 pt-6 pb-3 hover:no-underline">
                <div>
                  <div className="font-display text-xl font-extrabold text-foreground">Team Overview</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Profile, champion odds, and stage progression</div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="relative">
                  <div className="absolute -right-16 -top-16 w-56 h-56 bg-emerald-100/70 rounded-full filter blur-3xl pointer-events-none dark:bg-neon/10" />
                  <div className="absolute -left-16 -bottom-16 w-56 h-56 bg-fuchsia-100/70 rounded-full filter blur-3xl pointer-events-none dark:bg-neon-2/10" />
                  <div className="flex flex-col xl:flex-row justify-between items-stretch gap-6 border-b border-slate-200 pb-6 mb-6 dark:border-white/5">
                    {/* Team Profile Basic Details */}
                    <div className="flex flex-col justify-between flex-grow gap-4 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                        <div className="flex items-center gap-5 min-w-0">
                          <div className="filter transition-transform duration-300 hover:scale-105 shrink-0">
                            <CountryFlag
                              code={selectedTeam.code}
                              flag={selectedTeam.flag}
                              name={selectedTeam.name}
                              className="h-16 w-20 drop-shadow-lg"
                              emojiClassName="text-7xl drop-shadow-lg leading-none select-none"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[10px] uppercase tracking-[0.25em] text-slate-600 dark:text-muted-foreground font-extrabold flex items-center gap-1.5 truncate">
                              <span>FIFA Rank #{selectedTeam.rank}</span>
                              <span className="text-slate-300 dark:text-white/20">&bull;</span>
                              <span className="text-fuchsia-600 dark:text-neon-2">Group {selectedGroup}</span>
                            </div>
                            <div className="mt-1 flex items-center gap-2">
                              <h2 className="text-4xl font-extrabold font-display text-slate-950 dark:text-foreground tracking-tight truncate">
                                {selectedTeam.name}
                              </h2>
                              <button
                                type="button"
                                onClick={() => document.getElementById("country-simulation-lab")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition hover:border-cyan-400 hover:text-cyan-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/65 dark:hover:border-neon dark:hover:text-neon shrink-0"
                                title="Edit simulation settings"
                              >
                                <PencilLine className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Save Projections Action Button */}
                        {simResults && (
                          <div className="flex items-center self-start sm:self-auto gap-2 shrink-0">
                            {session ? (
                              <button
                                onClick={handleSavePrediction}
                                disabled={isSaving || isSimulating}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${saveSuccess
                                  ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                                  : "bg-slate-100 border border-slate-200 hover:bg-slate-200 hover:border-slate-300 text-slate-900 active:scale-95 disabled:opacity-50 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 dark:hover:border-white/25 dark:text-white"
                                  }`}
                              >
                                {isSaving ? (
                                  <>
                                    <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin dark:border-white/20 dark:border-t-white" />
                                    <span>Saving...</span>
                                  </>
                                ) : saveSuccess ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-400 animate-in zoom-in duration-300" />
                                    <span>Saved!</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-3.5 h-3.5 text-neon" />
                                    <span>Save to Predictions</span>
                                  </>
                                )}
                              </button>
                            ) : (
                              <button
                                onClick={() => openAuthModal("signin")}
                                className="flex items-center gap-2 bg-gradient-to-r from-cyan-50 to-fuchsia-50 border border-cyan-300 hover:from-cyan-100 hover:to-fuchsia-100 text-slate-900 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 dark:from-neon/20 dark:to-neon-2/20 dark:border-neon/30 dark:hover:from-neon/30 dark:hover:to-neon-2/30 dark:text-white"
                              >
                                <User className="w-3.5 h-3.5 text-neon-2" />
                                <span>Sign In to Save</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Core Attributes Mini Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-2">
                        <div className="min-w-0 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-3 sm:p-4 transition-colors dark:border-white/5 dark:bg-white/[0.02] dark:hover:border-white/10">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-medium truncate">Elo Rating</span>
                          <span className="text-xl font-bold font-mono text-slate-950 dark:text-foreground mt-1 block truncate">{Math.round(customElo)}</span>
                        </div>
                        <div className="min-w-0 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-3 sm:p-4 transition-colors dark:border-white/5 dark:bg-white/[0.02] dark:hover:border-white/10">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-medium truncate">Power Index</span>
                          <span className="text-xl font-bold font-mono text-slate-950 dark:text-foreground mt-1 block truncate">{selectedTeam.power || 70}</span>
                        </div>
                        <div className="min-w-0 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-3 sm:p-4 transition-colors dark:border-white/5 dark:bg-white/[0.02] dark:hover:border-white/10">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-medium truncate">Squad Value</span>
                          <span className="text-xl font-bold font-mono text-slate-950 dark:text-foreground mt-1 block truncate">
                            {selectedTeam.squadValueM ? `€${selectedTeam.squadValueM}M` : "N/A"}
                          </span>
                        </div>
                        <div className="min-w-0 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-3 sm:p-4 transition-colors dark:border-white/5 dark:bg-white/[0.02] dark:hover:border-white/10">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-medium truncate">Attack / Defense</span>
                          <span className="text-xl font-bold font-mono text-slate-950 dark:text-foreground mt-1 block truncate">{customAttack} / {customDefense}</span>
                        </div>
                        <div className="min-w-0 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-3 sm:p-4 transition-colors dark:border-white/5 dark:bg-white/[0.02] dark:hover:border-white/10">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-medium truncate">Top Player</span>
                          <span className="text-xs font-bold text-emerald-700 mt-1.5 block truncate dark:text-neon" title={getTopPlayer(selectedTeam.code)}>
                            {getTopPlayer(selectedTeam.code)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Circular Gauge for Champion Probability */}
                    <div className="flex flex-col items-center justify-center rounded-[2rem] border border-slate-200 bg-slate-50 p-6 min-w-[200px] max-w-sm w-full mx-auto xl:mx-0 text-center shadow-sm relative group overflow-hidden dark:border-white/10 dark:bg-white/[0.02] dark:shadow-glass shrink-0">
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-cyan-100/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 dark:to-neon/5" />
                      <span className="text-[10px] uppercase tracking-wider text-slate-700 dark:text-muted-foreground font-extrabold relative z-10">
                        Championship Prob
                      </span>

                      <div className="relative flex items-center justify-center my-4 z-10">
                        <svg className="w-28 h-28 transform -rotate-90">
                          <circle
                            cx="56"
                            cy="56"
                            r="46"
                            stroke={activeTheme === "light" ? "rgba(15,23,42,0.12)" : "rgba(255,255,255,0.04)"}
                            strokeWidth="8"
                            fill="transparent"
                          />
                          <circle
                            cx="56"
                            cy="56"
                            r="46"
                            stroke="url(#neonGradient)"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray="289"
                            strokeDashoffset={289 - (289 * (simResults ? (simResults.stages.champion / 1000) : 0))}
                            className="transition-all duration-1000 ease-out"
                            strokeLinecap="round"
                          />
                          <defs>
                            <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="var(--color-neon)" />
                              <stop offset="100%" stopColor="var(--color-neon-2)" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute text-center">
                          <div className="text-2xl font-black font-mono text-slate-950 dark:text-foreground leading-none">
                            {championProbability.toFixed(1)}%
                          </div>
                        </div>
                      </div>

                      <span className="text-[11px] font-bold text-emerald-700 relative z-10 uppercase tracking-wider dark:text-neon">
                        {simResults ? (
                          championProbability > 12 ? "Contender" :
                            championProbability > 4 ? "Dark Horse" : "Underdog"
                        ) : "No Data"}
                      </span>
                    </div>
                  </div>

                  {/* Stages Progression Matrix */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-3">
                    {stageCards.map((s) => {
                      const count = simResults?.stages[s.key] || 0;
                      const pct = (count / 1000) * 100;
                      const active = pct > 0;
                      return (
                        <div
                          key={s.key}
                          className={`relative flex min-h-[144px] flex-col rounded-[1.75rem] border p-4 transition-all duration-300 overflow-hidden group ${active
                            ? "border-cyan-500/50 bg-gradient-to-br from-cyan-500/10 via-emerald-500/10 to-fuchsia-500/10 shadow-[0_0_30px_rgba(6,182,212,0.15)] dark:from-cyan-500/20 dark:via-emerald-500/10 dark:to-fuchsia-500/20"
                            : "border-slate-200 bg-white hover:border-cyan-500/30 hover:bg-slate-50 dark:border-white/5 dark:bg-slate-900/50 dark:hover:bg-slate-800/80"
                            }`}
                        >
                          <div className="absolute top-0 right-0 h-8 w-8 -mr-2 -mt-2 rounded-full bg-gradient-to-br from-cyan-200/80 to-transparent opacity-0 blur-md transition-opacity group-hover:opacity-100 dark:from-neon/10" />

                          <div className="flex items-start justify-between gap-3">
                            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-600 dark:text-muted-foreground leading-tight">
                              {s.label}
                            </span>
                            {s.icon === "🏆" ? (
                              <Trophy className={`h-4 w-4 shrink-0 ${active ? "text-yellow-500" : "text-muted-foreground"}`} />
                            ) : (
                              <span className="shrink-0 text-[11px] font-mono font-bold text-slate-400 dark:text-foreground/25">{s.icon}</span>
                            )}
                          </div>

                          <div className={`mt-5 text-[2rem] font-black font-mono tabular-nums leading-none ${active ? "text-slate-900 dark:text-foreground" : "text-slate-400 dark:text-muted-foreground"}`}>
                            {pct.toFixed(1)}%
                          </div>

                          <div className="mt-auto pt-5">
                            <div className="relative overflow-hidden rounded-full">
                              <div
                                className="h-2 w-full rounded-full"
                                style={{
                                  background:
                                    s.key === "champion"
                                      ? "linear-gradient(90deg, rgba(212,161,9,0.22), rgba(244,196,48,0.26))"
                                      : "linear-gradient(90deg, rgba(15,138,69,0.22), rgba(178,57,210,0.24))",
                                }}
                              />
                              <div
                                className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
                                style={{
                                  width: pct === 0 ? "0%" : `${pct}%`,
                                  background:
                                    s.key === "champion"
                                      ? "linear-gradient(90deg, #d4a109, #f4c430)"
                                      : "linear-gradient(90deg, #0f8a4b, #b239d2)",
                                  boxShadow:
                                    s.key === "champion"
                                      ? "0 0 16px rgba(244,196,48,0.28)"
                                      : "0 0 18px rgba(178,57,210,0.22)",
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Dual Charts Row */}
          <div className="grid items-stretch gap-6 md:grid-cols-2">
            {/* Radar Attributes Card */}
            <Accordion type="multiple" defaultValue={["performance-attributes"]} className="relative flex h-full flex-col rounded-[2rem] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-slate-900">
              <AccordionItem value="performance-attributes" className="flex h-full flex-col border-none">
                <AccordionTrigger className="px-6 pt-6 pb-3 hover:no-underline">
                  <div>
                    <div className="font-display font-bold text-lg text-foreground">Performance Attributes</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Statistical profile comparison vs model baseline</div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="flex-1 px-6 pb-6">
                  <div className="flex justify-end mb-6">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-full dark:text-neon dark:bg-neon/10 dark:border-neon/30">
                      Attributes
                    </span>
                  </div>
                  <div className="flex h-64 min-h-[280px] items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} outerRadius={85}>
                        <PolarGrid stroke={activeTheme === "light" ? "rgba(15,23,42,0.18)" : "rgba(255,255,255,0.14)"} />
                        <PolarAngleAxis dataKey="axis" tick={{ fill: activeTheme === "light" ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.6)", fontSize: 10, fontFamily: "var(--font-display)" }} />
                        <Radar dataKey="v" stroke="var(--color-neon)" fill="var(--color-neon)" fillOpacity={activeTheme === "light" ? 0.35 : 0.2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Squad Quality Tiers Card */}
            <Accordion type="multiple" defaultValue={["squad-quality"]} className="relative flex h-full flex-col rounded-[2rem] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-slate-900">
              <AccordionItem value="squad-quality" className="flex h-full flex-col border-none">
                <AccordionTrigger className="px-6 pt-6 pb-3 hover:no-underline">
                  <div>
                    <div className="font-display font-bold text-lg text-foreground">Squad Quality Tiers</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Distribution of squad players across rating tiers</div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="flex-1 px-6 pb-6">
                  <div className="flex justify-end mb-6">
                    <span className="self-start rounded-full border border-fuchsia-200 bg-fuchsia-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-fuchsia-700 dark:border-neon-2/30 dark:bg-neon-2/10 dark:text-neon-2">
                      Squad Profile
                    </span>
                  </div>

                  <div className="mt-6 flex flex-col gap-6">
                    <div className="flex min-h-[140px] w-full flex-col justify-center items-center rounded-[2rem] border border-slate-200 bg-slate-50 p-6 text-center shadow-sm dark:border-white/5 dark:bg-white/[0.02]">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Avg Rating</span>
                      <span className="mt-2 text-5xl font-black font-mono text-foreground">
                        {squadStats.avgRating || "--"}
                        {squadStats.avgRating ? <span className="text-2xl align-top">%</span> : null}
                      </span>
                      <span className="mt-3 text-sm font-semibold text-emerald-700 dark:text-neon">{squadStats.total} Players</span>
                    </div>

                    <div className="space-y-4 w-full">
                      {squadTiers.map((tier) => (
                        <div key={tier.label} className="flex items-center gap-3 w-full">
                          <div className="text-xs font-semibold text-foreground w-28 shrink-0 truncate">
                            {tier.label}
                          </div>
                          <div className="flex-1 h-3 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/8">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${tier.color} transition-all duration-700`}
                              style={{ width: `${Math.max(tier.pct, tier.count > 0 ? 4 : 0)}%` }}
                            />
                          </div>
                          <div className="w-20 shrink-0 text-right font-mono text-xs font-bold tabular-nums text-foreground">
                            {tier.count}
                            <span className="ml-1.5 text-[10px] text-muted-foreground font-medium">({tier.pct}%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <Accordion type="multiple" defaultValue={["expected-path"]} className="rounded-[2rem] bg-white border border-slate-200 shadow-[0_16px_40px_rgba(15,23,42,0.06)] relative dark:border-white/10 dark:bg-slate-900">
            <AccordionItem value="expected-path" className="border-none">
              <AccordionTrigger className="px-6 pt-6 pb-3 hover:no-underline">
                <div>
                  <div className="font-display font-bold text-xl text-foreground">Expected Path to Glory</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Calculated dynamically from the most common matchups and scores across all simulations.</div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="flex justify-end border-b border-slate-200 pb-5 mb-6 dark:border-white/5">
                  <div className="text-[10px] uppercase bg-cyan-50 border border-cyan-200 text-cyan-700 px-3.5 py-1.5 rounded-full font-bold self-start sm:self-auto shadow-sm dark:bg-neon/10 dark:border-neon/30 dark:text-neon">
                    Model: {formattedModelName}
                  </div>
                </div>

                {isSimulating ? (
                  <div className="flex flex-col justify-center items-center py-20 gap-4">
                    <div className="relative w-12 h-12">
                      <div className="absolute inset-0 rounded-full border-2 border-neon/20 animate-pulse" />
                      <div className="absolute inset-0 rounded-full border-t-2 border-neon animate-spin" />
                    </div>
                    <span className="text-xs text-muted-foreground font-semibold tracking-wider uppercase animate-pulse">
                      Running 1,000 Simulations...
                    </span>
                  </div>
                ) : (
                  <div className="overflow-x-auto overflow-y-hidden pb-4 scrollbar-custom [scrollbar-gutter:stable]">
                    <div className="flex items-stretch gap-4 min-w-max py-2 px-1">
                      {/* Start Node */}
                      <div className="flex flex-col justify-center items-center bg-gradient-to-br from-cyan-50 to-fuchsia-50 border border-cyan-200 rounded-[1.75rem] px-5 py-4 min-w-[140px] shadow-sm relative overflow-hidden group dark:from-neon/20 dark:to-neon-2/10 dark:border-neon/40 dark:shadow-glass">
                        <CountryFlag
                          code={selectedTeam.code}
                          flag={selectedTeam.flag}
                          name={selectedTeam.name}
                          className="h-10 w-14 drop-shadow-md transform transition-transform duration-300 group-hover:scale-110"
                          emojiClassName="text-4xl leading-none filter drop-shadow-md select-none transform group-hover:scale-110 transition-transform duration-300"
                        />
                        <span className="text-sm font-extrabold mt-2 text-foreground">{selectedTeam.name}</span>
                        <span className="text-[9px] uppercase tracking-[0.2em] font-extrabold text-cyan-700 mt-1 dark:text-neon">Start</span>
                      </div>

                      {/* Path Nodes */}
                      {pathStepInfo.map((p, idx) => {
                        if (!p.opponent) return null;

                        const isHighChance = p.winPct >= 60;
                        const isLowChance = p.winPct < 40;
                        const winPctColor = isHighChance
                          ? "text-emerald-400 bg-emerald-400/10 border-emerald-500/20"
                          : isLowChance
                            ? "text-rose-400 bg-rose-400/10 border-rose-500/20"
                            : "text-amber-400 bg-amber-400/10 border-amber-500/20";

                        return (
                          <div key={idx} className="flex items-center gap-4">
                            <ChevronRight className="w-5 h-5 text-slate-300 shrink-0 dark:text-white/20" />

                            <div className="flex flex-col justify-between bg-slate-50 border border-slate-200 p-4 rounded-[1.75rem] min-w-[195px] hover:border-slate-300 hover:bg-white transition-all duration-300 relative group shadow-sm dark:bg-white/[0.02] dark:border-white/5 dark:hover:border-white/20 dark:hover:bg-white/[0.04]">
                              <div className="absolute -top-1 right-3 text-[30px] font-black text-slate-200 select-none font-mono dark:text-white/[0.02]">
                                0{idx + 1}
                              </div>
                              <span className="text-[9px] uppercase font-extrabold text-muted-foreground tracking-wider leading-none mb-2.5">
                                {p.stage}
                              </span>

                              <div className="flex items-center gap-3 mb-3">
                                <CountryFlag
                                  code={p.opponent.code}
                                  flag={p.opponent.flag}
                                  name={p.opponent.name}
                                  className="h-8 w-10 drop-shadow-sm transform transition-transform group-hover:scale-105"
                                  emojiClassName="text-3xl leading-none filter drop-shadow-sm transform group-hover:scale-105 transition-transform"
                                />
                                <div className="min-w-0">
                                  <span className="text-sm font-extrabold text-foreground block truncate">{p.opponent.name}</span>
                                  <span className="text-[10px] font-mono text-muted-foreground">Elo {Math.round(p.opponent.elo)}</span>
                                </div>
                              </div>

                              <div className="flex justify-between items-center pt-2.5 border-t border-slate-200 mt-1 dark:border-white/5">
                                <div className="text-[10px] text-muted-foreground font-medium">
                                  Proj: <span className="font-mono font-bold text-foreground">{p.expectedScore}</span>
                                </div>
                                <div className={`text-[10px] font-bold border px-2 py-0.5 rounded-full ${winPctColor}`}>
                                  {p.winPct}% <span className="text-[8px] font-normal opacity-80">win</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      {/* Redesigned Full Mock Tournament Bracket */}
      <Accordion type="multiple" defaultValue={["path-to-glory"]} className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-[2rem] relative shadow-[0_18px_50px_rgba(15,23,42,0.08)] mt-8">
        <AccordionItem value="path-to-glory" className="border-none">
          <AccordionTrigger className="px-6 md:px-8 pt-6 md:pt-8 pb-3 hover:no-underline">
            <div>
              <div className="font-display font-extrabold text-2xl text-foreground dark:text-white tracking-tight">Path to Glory</div>
              <div className="text-xs text-[#00c6ff] mt-1 font-bold tracking-wider uppercase">Most likely path to lifting the trophy for {selectedTeam.name}</div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 md:px-8 pb-6 md:pb-8">
            <div className="relative">
              <div className="absolute right-0 top-0 w-96 h-96 bg-cyan-100/60 dark:bg-[#00c6ff]/5 rounded-full filter blur-3xl pointer-events-none" />

              {simResults?.mockTournament && (
                <>
                  {/* Zoom Controls */}
                  <div className="flex justify-end mb-6 relative z-20">
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setZoomScale(prev => Math.max(50, prev - 10))}
                        className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition cursor-pointer"
                        title="Zoom Out"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="text-xs font-mono font-bold w-12 text-center text-foreground dark:text-white">
                        {zoomScale}%
                      </span>
                      <button
                        type="button"
                        onClick={() => setZoomScale(prev => Math.min(150, prev + 10))}
                        className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition cursor-pointer"
                        title="Zoom In"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoomScale(85)}
                        className="text-[10px] font-bold px-2 py-1 rounded-md hover:bg-white dark:hover:bg-white/10 text-[#00c6ff] dark:text-neon transition cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  <div className="w-full overflow-x-auto scrollbar-custom pb-8 relative z-10">
                    {/* Header Row at the top of the bracket columns */}
                    <div className="flex items-center justify-start min-w-max gap-12 px-4 mb-6" style={{ zoom: zoomScale / 100 }}>
                      <div className="w-56 text-[10px] uppercase font-bold text-[#00c6ff] tracking-widest pb-2 border-b border-border dark:border-white/10">Round of 32</div>
                      <div className="w-56 text-[10px] uppercase font-bold text-[#00c6ff] tracking-widest pb-2 border-b border-border dark:border-white/10">Round of 16</div>
                      <div className="w-56 text-[10px] uppercase font-bold text-[#00c6ff] tracking-widest pb-2 border-b border-border dark:border-white/10">Quarter-Finals</div>
                      <div className="w-56 text-[10px] uppercase font-bold text-[#00c6ff] tracking-widest pb-2 border-b border-border dark:border-white/10">Semi-Finals</div>
                      <div className="w-56 text-[10px] uppercase font-bold text-yellow-600 dark:text-yellow-500 tracking-widest pb-2 border-b border-border dark:border-white/10 text-center">Finals & Champion</div>
                    </div>

                    {/* Bracket Content Row */}
                    <div 
                      className="flex items-start justify-start min-w-max gap-12 px-4 transition-transform duration-300 origin-top-left"
                      style={{ zoom: zoomScale / 100 }}
                    >
                    {/* R32 Column */}
                    <div className="flex flex-col shrink-0">
                      {simResults.mockTournament.r32.map((m: any, i: number) => {
                        const home = getTeam(m.home);
                        const away = getTeam(m.away);
                        const isHomeWinner = m.winner === m.home;
                        const isAwayWinner = m.winner === m.away;
                        const homeBg = getBracketRowClasses(m.home, isHomeWinner);
                        const awayBg = getBracketRowClasses(m.away, isAwayWinner);

                        return (
                          <div key={i} className="h-[130px] flex items-center justify-center relative group/match">
                            <div className="flex flex-col w-56 h-[120px] rounded-xl overflow-hidden shadow-sm dark:shadow-lg border border-border dark:border-white/10 bg-background dark:bg-[#070c1b] hover:border-[#00c6ff]/40 hover:scale-[1.02] transition-all duration-300 group shrink-0 relative">
                              <div className="bg-black/5 dark:bg-black/40 px-3 py-1.5 text-[9px] font-bold text-[#00c6ff] tracking-widest uppercase flex justify-between border-b border-border dark:border-white/5">
                                <span>MATCH {i + 1}</span>
                              </div>
                              <div className="flex flex-col p-1 gap-1">
                                <div className={`flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${homeBg}`}>
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <CountryFlag code={home.code} flag={home.flag} name={home.name} className="h-4 w-5 drop-shadow-md" emojiClassName="text-sm drop-shadow-md select-none" />
                                    <span className="text-[11px] font-bold text-foreground dark:text-white truncate w-24">{home.name}</span>
                                    {isHomeWinner && <Check className="w-3.5 h-3.5 text-[#00c6ff] shrink-0" />}
                                  </div>
                                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${getBracketScoreClasses(m.home)}`}>{m.hs}</span>
                                </div>
                                <div className={`flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${awayBg}`}>
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <CountryFlag code={away.code} flag={away.flag} name={away.name} className="h-4 w-5 drop-shadow-md" emojiClassName="text-sm drop-shadow-md select-none" />
                                    <span className="text-[11px] font-bold text-foreground dark:text-white truncate w-24">{away.name}</span>
                                    {isAwayWinner && <Check className="w-3.5 h-3.5 text-[#00c6ff] shrink-0" />}
                                  </div>
                                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${getBracketScoreClasses(m.away)}`}>{m.as}</span>
                                </div>
                              </div>
                            </div>
                            {/* Connectors */}
                            {(i % 2 === 0) ? (
                              <div className="absolute top-1/2 right-[-24px] w-6 h-[65px] border-t border-r border-border dark:border-white/10 group-hover/match:border-[#00c6ff]/30 rounded-tr-xl -z-10 transition-colors" />
                            ) : (
                              <div className="absolute bottom-1/2 right-[-24px] w-6 h-[65px] border-b border-r border-border dark:border-white/10 group-hover/match:border-[#00c6ff]/30 rounded-br-xl -z-10 transition-colors" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* R16 Column */}
                    <div className="flex flex-col shrink-0">
                      {simResults.mockTournament.r16.map((m: any, i: number) => {
                        const home = getTeam(m.home);
                        const away = getTeam(m.away);
                        const isHomeWinner = m.winner === m.home;
                        const isAwayWinner = m.winner === m.away;
                        const homeBg = getBracketRowClasses(m.home, isHomeWinner);
                        const awayBg = getBracketRowClasses(m.away, isAwayWinner);

                        return (
                          <div key={i} className="h-[260px] flex items-center justify-center relative group/match">
                            <div className="absolute top-1/2 left-[-24px] w-6 h-px bg-border dark:bg-white/10 group-hover/match:bg-[#00c6ff]/30 -z-10 transition-colors -translate-y-1/2" />
                            <div className="flex flex-col w-56 h-[120px] rounded-xl overflow-hidden shadow-sm dark:shadow-lg border border-border dark:border-white/10 bg-background dark:bg-[#070c1b] hover:border-[#00c6ff]/40 hover:scale-[1.02] transition-all duration-300 group shrink-0 relative">
                              <div className="bg-black/5 dark:bg-black/40 px-3 py-1.5 text-[9px] font-bold text-[#00c6ff] tracking-widest uppercase flex justify-between border-b border-border dark:border-white/5">
                                <span>R16 MATCH {i + 1}</span>
                              </div>
                              <div className="flex flex-col p-1 gap-1">
                                <div className={`flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${homeBg}`}>
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <CountryFlag code={home.code} flag={home.flag} name={home.name} className="h-4 w-5 drop-shadow-md" emojiClassName="text-sm drop-shadow-md select-none" />
                                    <span className="text-[11px] font-bold text-foreground dark:text-white truncate w-24">{home.name}</span>
                                    {isHomeWinner && <Check className="w-3.5 h-3.5 text-[#00c6ff] shrink-0" />}
                                  </div>
                                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${getBracketScoreClasses(m.home)}`}>{m.hs}</span>
                                </div>
                                <div className={`flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${awayBg}`}>
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <CountryFlag code={away.code} flag={away.flag} name={away.name} className="h-4 w-5 drop-shadow-md" emojiClassName="text-sm drop-shadow-md select-none" />
                                    <span className="text-[11px] font-bold text-foreground dark:text-white truncate w-24">{away.name}</span>
                                    {isAwayWinner && <Check className="w-3.5 h-3.5 text-[#00c6ff] shrink-0" />}
                                  </div>
                                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${getBracketScoreClasses(m.away)}`}>{m.as}</span>
                                </div>
                              </div>
                            </div>
                            {/* Connectors */}
                            {(i % 2 === 0) ? (
                              <div className="absolute top-1/2 right-[-24px] w-6 h-[130px] border-t border-r border-border dark:border-white/10 group-hover/match:border-[#00c6ff]/30 rounded-tr-xl -z-10 transition-colors" />
                            ) : (
                              <div className="absolute bottom-1/2 right-[-24px] w-6 h-[130px] border-b border-r border-border dark:border-white/10 group-hover/match:border-[#00c6ff]/30 rounded-br-xl -z-10 transition-colors" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* QF Column */}
                    <div className="flex flex-col shrink-0">
                      {simResults.mockTournament.qf.map((m: any, i: number) => {
                        const home = getTeam(m.home);
                        const away = getTeam(m.away);
                        const isHomeWinner = m.winner === m.home;
                        const isAwayWinner = m.winner === m.away;
                        const homeBg = getBracketRowClasses(m.home, isHomeWinner);
                        const awayBg = getBracketRowClasses(m.away, isAwayWinner);

                        return (
                          <div key={i} className="h-[520px] flex items-center justify-center relative group/match">
                            <div className="absolute top-1/2 left-[-24px] w-6 h-px bg-border dark:bg-white/10 group-hover/match:bg-[#00c6ff]/30 -z-10 transition-colors -translate-y-1/2" />
                            <div className="flex flex-col w-56 h-[120px] rounded-xl overflow-hidden shadow-sm dark:shadow-lg border border-border dark:border-white/10 bg-background dark:bg-[#070c1b] hover:border-[#00c6ff]/40 hover:scale-[1.02] transition-all duration-300 group shrink-0 relative">
                              <div className="bg-black/5 dark:bg-black/40 px-3 py-1.5 text-[9px] font-bold text-[#00c6ff] tracking-widest uppercase flex justify-between border-b border-border dark:border-white/5">
                                <span>QF MATCH {i + 1}</span>
                              </div>
                              <div className="flex flex-col p-1 gap-1">
                                <div className={`flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${homeBg}`}>
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <CountryFlag code={home.code} flag={home.flag} name={home.name} className="h-4 w-5 drop-shadow-md" emojiClassName="text-sm drop-shadow-md select-none" />
                                    <span className="text-[11px] font-bold text-foreground dark:text-white truncate w-24">{home.name}</span>
                                    {isHomeWinner && <Check className="w-3.5 h-3.5 text-[#00c6ff] shrink-0" />}
                                  </div>
                                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${getBracketScoreClasses(m.home)}`}>{m.hs}</span>
                                </div>
                                <div className={`flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${awayBg}`}>
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <CountryFlag code={away.code} flag={away.flag} name={away.name} className="h-4 w-5 drop-shadow-md" emojiClassName="text-sm drop-shadow-md select-none" />
                                    <span className="text-[11px] font-bold text-foreground dark:text-white truncate w-24">{away.name}</span>
                                    {isAwayWinner && <Check className="w-3.5 h-3.5 text-[#00c6ff] shrink-0" />}
                                  </div>
                                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${getBracketScoreClasses(m.away)}`}>{m.as}</span>
                                </div>
                              </div>
                            </div>
                            {/* Connectors */}
                            {(i % 2 === 0) ? (
                              <div className="absolute top-1/2 right-[-24px] w-6 h-[260px] border-t border-r border-border dark:border-white/10 group-hover/match:border-[#00c6ff]/30 rounded-tr-xl -z-10 transition-colors" />
                            ) : (
                              <div className="absolute bottom-1/2 right-[-24px] w-6 h-[260px] border-b border-r border-border dark:border-white/10 group-hover/match:border-[#00c6ff]/30 rounded-br-xl -z-10 transition-colors" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* SF Column */}
                    <div className="flex flex-col shrink-0">
                      {simResults.mockTournament.sf.map((m: any, i: number) => {
                        const home = getTeam(m.home);
                        const away = getTeam(m.away);
                        const isHomeWinner = m.winner === m.home;
                        const isAwayWinner = m.winner === m.away;
                        const homeBg = getBracketRowClasses(m.home, isHomeWinner);
                        const awayBg = getBracketRowClasses(m.away, isAwayWinner);

                        return (
                          <div key={i} className="h-[1040px] flex items-center justify-center relative group/match">
                            <div className="absolute top-1/2 left-[-24px] w-6 h-px bg-border dark:bg-white/10 group-hover/match:bg-[#00c6ff]/30 -z-10 transition-colors -translate-y-1/2" />
                            <div className="flex flex-col w-56 h-[120px] rounded-xl overflow-hidden shadow-sm dark:shadow-lg border border-border dark:border-white/10 bg-background dark:bg-[#070c1b] hover:border-[#00c6ff]/40 hover:scale-[1.02] transition-all duration-300 group shrink-0 relative">
                              <div className="bg-black/5 dark:bg-black/40 px-3 py-1.5 text-[9px] font-bold text-[#00c6ff] tracking-widest uppercase flex justify-between border-b border-border dark:border-white/5">
                                <span>SF MATCH {i + 1}</span>
                              </div>
                              <div className="flex flex-col p-1 gap-1">
                                <div className={`flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${homeBg}`}>
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <CountryFlag code={home.code} flag={home.flag} name={home.name} className="h-4 w-5 drop-shadow-md" emojiClassName="text-sm drop-shadow-md select-none" />
                                    <span className="text-[11px] font-bold text-foreground dark:text-white truncate w-24">{home.name}</span>
                                    {isHomeWinner && <Check className="w-3.5 h-3.5 text-[#00c6ff] shrink-0" />}
                                  </div>
                                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${getBracketScoreClasses(m.home)}`}>{m.hs}</span>
                                </div>
                                <div className={`flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${awayBg}`}>
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <CountryFlag code={away.code} flag={away.flag} name={away.name} className="h-4 w-5 drop-shadow-md" emojiClassName="text-sm drop-shadow-md select-none" />
                                    <span className="text-[11px] font-bold text-foreground dark:text-white truncate w-24">{away.name}</span>
                                    {isAwayWinner && <Check className="w-3.5 h-3.5 text-[#00c6ff] shrink-0" />}
                                  </div>
                                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${getBracketScoreClasses(m.away)}`}>{m.as}</span>
                                </div>
                              </div>
                            </div>
                            {/* Connectors */}
                            {(i % 2 === 0) ? (
                              <div className="absolute top-1/2 right-[-24px] w-6 h-[520px] border-t border-r border-border dark:border-white/10 group-hover/match:border-[#00c6ff]/30 rounded-tr-xl -z-10 transition-colors" />
                            ) : (
                              <div className="absolute bottom-1/2 right-[-24px] w-6 h-[520px] border-b border-r border-border dark:border-white/10 group-hover/match:border-[#00c6ff]/30 rounded-br-xl -z-10 transition-colors" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Final Column */}
                    <div className="h-[2080px] w-56 relative shrink-0">
                      {/* High fidelity Champion Showcase */}
                      <div className="absolute top-[780px] -translate-y-1/2 left-0 right-0 flex flex-col items-center p-8 bg-gradient-to-br from-[#1e1b4b]/20 dark:from-[#1e1b4b]/80 to-[#311042]/20 dark:to-[#311042]/80 rounded-3xl border border-yellow-500/20 shadow-[0_0_30px_rgba(234,179,8,0.1)] z-20 hover:border-yellow-500/50 transition-all duration-500 group">
                        <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl" />
                        <Trophy className="w-20 h-20 text-yellow-500 dark:text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)] mb-4 animate-float" />
                        <div className="text-[10px] font-bold text-yellow-600 dark:text-yellow-500 tracking-widest uppercase mb-2">World Cup Champion</div>
                        <div className="flex items-center gap-3 mt-2">
                          <CountryFlag
                            code={getTeam(simResults.mockTournament.final.winner).code}
                            flag={getTeam(simResults.mockTournament.final.winner).flag}
                            name={getTeam(simResults.mockTournament.final.winner).name}
                            className="h-10 w-14 drop-shadow-md"
                            emojiClassName="text-4xl drop-shadow-md select-none"
                          />
                          <span className="text-2xl font-black text-foreground dark:text-white tracking-tight">{getTeam(simResults.mockTournament.final.winner).name}</span>
                        </div>
                      </div>

                      {/* World Cup Final section positioned and centered at the midpoint */}
                      <div className="absolute top-[1040px] -translate-y-1/2 left-0 right-0 flex flex-col items-center">
                        <div className="absolute bottom-full mb-3 text-[10px] uppercase font-bold text-yellow-600 dark:text-yellow-500 tracking-widest pb-1 border-b border-border dark:border-white/10 text-center w-56">
                          World Cup Final
                        </div>

                        {/* Final Match Card wrapper that aligns perfectly with SF connector midpoint */}
                        <div className="relative group/match">
                          <div className="absolute top-1/2 left-[-24px] w-6 h-px bg-border dark:bg-white/10 -z-10 -translate-y-1/2" />

                          {/* Final Match Card */}
                          <div className="flex flex-col w-56 h-[120px] rounded-xl overflow-hidden shadow-sm dark:shadow-lg border border-yellow-500/30 bg-background dark:bg-[#070c1b] hover:border-yellow-500/60 hover:scale-[1.02] transition-all duration-300 group shrink-0 relative">
                            <div className="bg-black/5 dark:bg-black/60 px-3 py-1.5 text-[9px] font-bold text-yellow-600 dark:text-yellow-500 tracking-widest uppercase flex justify-between border-b border-border dark:border-white/5">
                              <span>FINAL</span>
                            </div>
                            <div className="flex flex-col p-1 gap-1">
                              <div className={`flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${getBracketRowClasses(simResults.mockTournament.final.home, simResults.mockTournament.final.winner === simResults.mockTournament.final.home, "gold")}`}>
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <CountryFlag code={getTeam(simResults.mockTournament.final.home).code} flag={getTeam(simResults.mockTournament.final.home).flag} name={getTeam(simResults.mockTournament.final.home).name} className="h-4 w-5 drop-shadow-md" emojiClassName="text-sm drop-shadow-md select-none" />
                                  <span className="text-[11px] font-bold text-foreground dark:text-white truncate w-24">{getTeam(simResults.mockTournament.final.home).name}</span>
                                  {simResults.mockTournament.final.winner === simResults.mockTournament.final.home && <Check className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400 shrink-0" />}
                                </div>
                                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${getBracketScoreClasses(simResults.mockTournament.final.home)}`}>{simResults.mockTournament.final.hs}</span>
                              </div>
                              <div className={`flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${getBracketRowClasses(simResults.mockTournament.final.away, simResults.mockTournament.final.winner === simResults.mockTournament.final.away, "gold")}`}>
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <CountryFlag code={getTeam(simResults.mockTournament.final.away).code} flag={getTeam(simResults.mockTournament.final.away).flag} name={getTeam(simResults.mockTournament.final.away).name} className="h-4 w-5 drop-shadow-md" emojiClassName="text-sm drop-shadow-md select-none" />
                                  <span className="text-[11px] font-bold text-foreground dark:text-white truncate w-24">{getTeam(simResults.mockTournament.final.away).name}</span>
                                  {simResults.mockTournament.final.winner === simResults.mockTournament.final.away && <Check className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400 shrink-0" />}
                                </div>
                                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${getBracketScoreClasses(simResults.mockTournament.final.away)}`}>{simResults.mockTournament.final.as}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                </>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Saved Projections & Comparison Accordion */}
      <Accordion
        type="multiple"
        defaultValue={["saved-comparison"]}
        className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-[2rem] relative shadow-[0_18px_50px_rgba(15,23,42,0.08)] mt-8"
      >
        <AccordionItem value="saved-comparison" className="border-none">
          <AccordionTrigger className="px-6 md:px-8 pt-6 md:pt-8 pb-3 hover:no-underline">
            <div>
              <div className="font-display font-extrabold text-2xl text-foreground dark:text-white tracking-tight">Saved Projections & Comparison</div>
              <div className="text-xs text-[#00c6ff] mt-1 font-bold tracking-wider uppercase">Load saved projections or select multiple to compare side-by-side</div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 md:px-8 pb-6 md:pb-8">
            {!session ? (
              <div className="text-center py-10">
                <p className="text-sm text-muted-foreground mb-4">Please sign in to view, load, and compare your saved predictions.</p>
                <button
                  onClick={() => openAuthModal("signin")}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 via-emerald-500 to-fuchsia-500 text-white px-5 py-3 rounded-2xl text-xs font-black shadow-md hover:scale-[1.02] transition-all cursor-pointer"
                >
                  <User className="w-4 h-4" />
                  <span>Sign In to Access</span>
                </button>
              </div>
            ) : isLoadingSaved ? (
              <div className="flex flex-col justify-center items-center py-12 gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
                <span className="text-xs text-muted-foreground">Fetching saved simulations...</span>
              </div>
            ) : savedPredictions.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground border border-dashed border-slate-200 dark:border-white/10 rounded-[1.75rem] p-6 bg-slate-50/50 dark:bg-white/[0.01]">
                <Sparkles className="w-8 h-8 text-cyan-500 mx-auto mb-3 opacity-60 animate-pulse" />
                <p className="font-bold text-foreground">No country projections saved yet.</p>
                <p className="text-xs mt-1.5 max-w-md mx-auto">Adjust team attributes in the Simulation Lab, run the simulator, and click &quot;Save to Predictions&quot; to begin building your comparison library.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="overflow-x-auto rounded-[1.5rem] border border-slate-200 dark:border-white/10 bg-slate-50/30 dark:bg-black/20">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.02] text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        <th className="py-3 px-4 w-12 text-center">Compare</th>
                        <th className="py-3 px-4 min-w-[150px]">Country</th>
                        <th className="py-3 px-4">Elo Rating</th>
                        <th className="py-3 px-4">Model Engine</th>
                        <th className="py-3 px-4">Championship Odds</th>
                        <th className="py-3 px-4">Saved On</th>
                        <th className="py-3 px-4 text-right pr-6">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                      {savedPredictions.map((p) => {
                        let data: any = null;
                        try {
                          data = readPredictionPayload(p.predictedPayload, p.predictedWinner);
                        } catch (e) {
                          console.error(e);
                        }

                        if (!data) return null;
                        const isChecked = selectedCompareIds.includes(p.id);
                        const isDisableCompare = !isChecked && selectedCompareIds.length >= 4;
                        const savedDate = new Date(p.updatedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        });

                        return (
                          <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                            <td className="py-3.5 px-4 text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isDisableCompare}
                                onChange={() => toggleCompareSelect(p.id)}
                                className="w-4.5 h-4.5 rounded border-slate-350 accent-cyan-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              />
                            </td>
                            <td className="py-3.5 px-4 font-bold">
                              <div className="flex items-center gap-2">
                                <CountryFlag code={data.code} flag={data.flag} name={data.name} className="h-5 w-7 shrink-0 rounded object-cover shadow-sm" emojiClassName="text-lg leading-none" />
                                <span className="text-foreground">{data.name}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-xs text-muted-foreground">
                              {Math.round(data.customElo ?? data.elo ?? 1500)}
                            </td>
                            <td className="py-3.5 px-4 text-xs font-semibold text-cyan-600 dark:text-neon uppercase">
                              {data.modelName || "base"}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-foreground">
                              {data.championProb}%
                            </td>
                            <td className="py-3.5 px-4 text-xs text-muted-foreground">
                              {savedDate}
                            </td>
                            <td className="py-3.5 px-4 text-right pr-6">
                              <div className="flex items-center justify-end gap-2.5">
                                <button
                                  onClick={() => handleLoadPrediction(p)}
                                  className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 hover:border-cyan-400 hover:text-cyan-500 bg-white hover:bg-slate-50 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 dark:text-white transition cursor-pointer"
                                  title="Load this simulation results and setup"
                                >
                                  Load
                                </button>
                                <button
                                  onClick={() => handleDeletePrediction(p.id, data.name)}
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition cursor-pointer"
                                  title="Delete saved projection"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Compare Section */}
                {selectedCompareIds.length < 2 ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 p-4 rounded-[1.25rem]">
                    <Info className="w-4.5 h-4.5 text-cyan-500 shrink-0" />
                    <span>Select at least 2 saved country projections above to compare their performance parameters and tournament outcomes side-by-side.</span>
                  </div>
                ) : (
                  <div className="border-t border-slate-200 dark:border-white/10 pt-6">
                    {(() => {
                      const lineColors = [
                        "#06b6d4", // Cyan
                        "#d946ef", // Fuchsia
                        "#10b981", // Emerald
                        "#f59e0b", // Amber
                        "#8b5cf6", // Violet
                        "#3b82f6", // Blue
                      ];

                      const parsedCompareData = savedPredictions
                        .filter(p => selectedCompareIds.includes(p.id))
                        .map((p, idx) => {
                          let data: any = null;
                          try {
                            data = readPredictionPayload(p.predictedPayload, p.predictedWinner);
                          } catch (e) {
                            console.error(e);
                          }
                          return { id: p.id, raw: p, data, color: lineColors[idx % lineColors.length] };
                        })
                        .filter(item => item.data !== null);

                      const progressionChartData = [
                        { stage: "Group Stage", ...parsedCompareData.reduce((acc, c) => ({ ...acc, [c.data.name]: 100 }), {}) },
                        { stage: "Round of 32", ...parsedCompareData.reduce((acc, c) => ({ ...acc, [c.data.name]: parseFloat(((c.data.stages?.r32 ?? 0) / 10).toFixed(1)) }), {}) },
                        { stage: "Round of 16", ...parsedCompareData.reduce((acc, c) => ({ ...acc, [c.data.name]: parseFloat(((c.data.stages?.r16 ?? 0) / 10).toFixed(1)) }), {}) },
                        { stage: "Quarter Final", ...parsedCompareData.reduce((acc, c) => ({ ...acc, [c.data.name]: parseFloat(((c.data.stages?.qf ?? 0) / 10).toFixed(1)) }), {}) },
                        { stage: "Semi Final", ...parsedCompareData.reduce((acc, c) => ({ ...acc, [c.data.name]: parseFloat(((c.data.stages?.sf ?? 0) / 10).toFixed(1)) }), {}) },
                        { stage: "Final", ...parsedCompareData.reduce((acc, c) => ({ ...acc, [c.data.name]: parseFloat(((c.data.stages?.final ?? 0) / 10).toFixed(1)) }), {}) },
                        { stage: "Champion", ...parsedCompareData.reduce((acc, c) => ({ ...acc, [c.data.name]: parseFloat(((c.data.stages?.champion ?? (c.data.championProb * 10 || 0)) / 10).toFixed(1)) }), {}) }
                      ];

                      const attributesChartData = [
                        {
                          attribute: "Elo Rating",
                          ...parsedCompareData.reduce((acc, c) => {
                            const rawElo = c.data.customElo ?? c.data.elo ?? 1500;
                            const scaledElo = Math.round((rawElo - 1300) / 6);
                            return {
                              ...acc,
                              [c.data.name]: Math.max(0, Math.min(100, scaledElo)),
                              [`${c.data.name}_raw`]: rawElo
                            };
                          }, {})
                        },
                        {
                          attribute: "Attack Rating",
                          ...parsedCompareData.reduce((acc, c) => {
                            const rawAttack = c.data.customAttack ?? 75;
                            return {
                              ...acc,
                              [c.data.name]: rawAttack,
                              [`${c.data.name}_raw`]: rawAttack
                            };
                          }, {})
                        },
                        {
                          attribute: "Defense Rating",
                          ...parsedCompareData.reduce((acc, c) => {
                            const rawDefense = c.data.customDefense ?? 75;
                            return {
                              ...acc,
                              [c.data.name]: rawDefense,
                              [`${c.data.name}_raw`]: rawDefense
                            };
                          }, {})
                        },
                        {
                          attribute: "Squad Value",
                          ...parsedCompareData.reduce((acc, c) => {
                            const rawSquadValue = c.data.squadValueM ?? appTeams.find(t => t.code === c.data.code)?.squadValueM ?? 100;
                            // Map 0 - 1500M squad value to 0-100
                            const scaledSquad = Math.round(rawSquadValue / 15);
                            return {
                              ...acc,
                              [c.data.name]: Math.max(0, Math.min(100, scaledSquad)),
                              [`${c.data.name}_raw`]: `€${rawSquadValue}M`
                            };
                          }, {})
                        },
                        {
                          attribute: "Championship Odds",
                          ...parsedCompareData.reduce((acc, c) => {
                            const ch = c.data.stages?.champion ?? (c.data.championProb * 10 || 0);
                            const rawChamp = parseFloat((ch / 10).toFixed(1));
                            return {
                              ...acc,
                              [c.data.name]: rawChamp,
                              [`${c.data.name}_raw`]: `${rawChamp}%`
                            };
                          }, {})
                        }
                      ];

                      return (
                        <>
                          {/* Line Chart Card */}
                          <div className="mb-8 p-5 rounded-[2rem] border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900 shadow-[0_16px_40px_rgba(15,23,42,0.04)]">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                              <div>
                                <h4 className="font-display font-extrabold text-base text-foreground flex items-center gap-2">
                                  <TrendingUp className="w-5 h-5 text-cyan-500" />
                                  <span>Comparison Metrics Projection</span>
                                </h4>
                                <p className="text-xs text-muted-foreground mt-0.5">Visualize side-by-side attributes or progression probabilities</p>
                              </div>
                              <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200/50 dark:border-white/5 self-stretch sm:self-auto justify-center">
                                <button
                                  type="button"
                                  onClick={() => setCompareChartTab("progression")}
                                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                    compareChartTab === "progression"
                                      ? "bg-white text-cyan-600 shadow-sm dark:bg-slate-800 dark:text-neon"
                                      : "text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  Progression Curve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCompareChartTab("attributes")}
                                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                    compareChartTab === "attributes"
                                      ? "bg-white text-cyan-600 shadow-sm dark:bg-slate-800 dark:text-neon"
                                      : "text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  Attribute Profile
                                </button>
                              </div>
                            </div>

                            <div className="h-80 w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                  data={compareChartTab === "progression" ? progressionChartData : attributesChartData}
                                  margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
                                >
                                  <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke={activeTheme === "light" ? "rgba(15,23,42,0.06)" : "rgba(255,255,255,0.05)"}
                                  />
                                  <XAxis
                                    dataKey={compareChartTab === "progression" ? "stage" : "attribute"}
                                    tick={{
                                      fill: activeTheme === "light" ? "rgba(15,23,42,0.6)" : "rgba(255,255,255,0.6)",
                                      fontSize: 10,
                                      fontFamily: "var(--font-display)",
                                      fontWeight: "bold"
                                    }}
                                    stroke={activeTheme === "light" ? "rgba(15,23,42,0.1)" : "rgba(255,255,255,0.1)"}
                                  />
                                  <YAxis
                                    domain={[0, 100]}
                                    tick={{
                                      fill: activeTheme === "light" ? "rgba(15,23,42,0.6)" : "rgba(255,255,255,0.6)",
                                      fontSize: 10,
                                      fontFamily: "var(--font-mono)"
                                    }}
                                    stroke={activeTheme === "light" ? "rgba(15,23,42,0.1)" : "rgba(255,255,255,0.1)"}
                                    tickFormatter={(val) => compareChartTab === "progression" ? `${val}%` : val}
                                  />
                                  <RechartsTooltip
                                    content={<CustomCompareTooltip mode={compareChartTab} />}
                                  />
                                  <Legend
                                    wrapperStyle={{
                                      fontSize: "11px",
                                      fontFamily: "var(--font-display)",
                                      fontWeight: "bold",
                                      paddingTop: "16px"
                                    }}
                                  />
                                  {parsedCompareData.map((c) => (
                                    <Line
                                      key={c.id}
                                      type="monotone"
                                      dataKey={c.data.name}
                                      stroke={c.color}
                                      activeDot={{ r: 6, strokeWidth: 0 }}
                                      strokeWidth={3}
                                      dot={{ r: 4, strokeWidth: 1.5, fill: "white" }}
                                    />
                                  ))}
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          {/* Side-by-Side Table Comparison */}
                          {(() => {
                            const compareLen = parsedCompareData.length;
                            const maxElo = compareLen > 0 ? Math.max(...parsedCompareData.map(c => Math.round(c.data.customElo ?? c.data.elo ?? 1500))) : 0;
                            const maxAttack = compareLen > 0 ? Math.max(...parsedCompareData.map(c => c.data.customAttack ?? 75)) : 0;
                            const maxDefense = compareLen > 0 ? Math.max(...parsedCompareData.map(c => c.data.customDefense ?? 75)) : 0;
                            const maxSquadValue = compareLen > 0 ? Math.max(...parsedCompareData.map(c => c.data.squadValueM ?? appTeams.find(t => t.code === c.data.code)?.squadValueM ?? 0)) : 0;
                            const maxChampionshipOdds = compareLen > 0 ? Math.max(...parsedCompareData.map(c => c.data.stages?.champion ?? (c.data.championProb * 10 || 0))) : 0;
                            const maxReachFinal = compareLen > 0 ? Math.max(...parsedCompareData.map(c => c.data.stages?.final ?? 0)) : 0;
                            const maxReachSF = compareLen > 0 ? Math.max(...parsedCompareData.map(c => c.data.stages?.sf ?? 0)) : 0;
                            const maxReachQF = compareLen > 0 ? Math.max(...parsedCompareData.map(c => c.data.stages?.qf ?? 0)) : 0;
                            const maxReachR16 = compareLen > 0 ? Math.max(...parsedCompareData.map(c => c.data.stages?.r16 ?? 0)) : 0;
                            const maxReachR32 = compareLen > 0 ? Math.max(...parsedCompareData.map(c => c.data.stages?.r32 ?? 0)) : 0;

                            const renderStageRow = (label: string, icon: ReactNode, stageKey: string, maxVal: number) => {
                              return (
                                <tr className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                  <td className="py-4 px-5 font-bold text-muted-foreground sticky left-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md z-10 border-r border-slate-200/60 dark:border-white/5 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.4)]">
                                    <div className="flex items-center gap-2">
                                      {icon}
                                      <span>{label}</span>
                                    </div>
                                  </td>
                                  {parsedCompareData.map((c) => {
                                    const rawVal = c.data.stages?.[stageKey] ?? 0;
                                    const prob = parseFloat((rawVal / 10).toFixed(1));
                                    const isBest = rawVal === maxVal && parsedCompareData.length > 1 && rawVal > 0;
                                    return (
                                      <td key={c.id} className={`py-4 px-5 transition-colors ${
                                        isBest ? "bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08]" : ""
                                      }`}>
                                        <div className="space-y-1.5 max-w-[180px]">
                                          <div className="flex items-center justify-between text-xs font-bold font-mono">
                                            <span className={isBest ? "text-emerald-600 dark:text-emerald-400 font-extrabold" : "text-foreground"}>
                                              {prob}%
                                            </span>
                                            {isBest && <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Best</span>}
                                          </div>
                                          <div className="w-full bg-slate-100 dark:bg-white/5 h-1.5 rounded-full overflow-hidden">
                                            <div 
                                              className={`h-full rounded-full transition-all duration-500 ${isBest ? "bg-emerald-500" : "bg-cyan-500"}`} 
                                              style={{ width: `${prob}%` }} 
                                            />
                                          </div>
                                        </div>
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            };

                            return (
                              <div className="mb-8 overflow-x-auto rounded-[2rem] border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900 shadow-[0_16px_40px_rgba(15,23,42,0.04)] scrollbar-custom relative">
                                <table className="w-full text-left border-separate border-spacing-0 text-xs md:text-sm">
                                  <thead>
                                    <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                                      <th className="py-4 px-5 font-display font-extrabold text-slate-700 dark:text-muted-foreground w-48 sticky left-0 bg-slate-50 dark:bg-slate-900 z-20 border-r border-b border-slate-200/65 dark:border-white/15 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.4)]">
                                        Parameter
                                      </th>
                                      {parsedCompareData.map((c) => (
                                        <th key={c.id} className="py-4 px-5 font-display font-extrabold text-foreground border-b border-slate-200 dark:border-white/10 min-w-[220px]">
                                          <div className="flex flex-col gap-2 p-3 rounded-2xl bg-slate-50/50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 relative overflow-hidden">
                                            {/* Accent color bar mapping to line chart */}
                                            <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: c.color }} />
                                            <div className="flex items-center gap-2 mt-1.5">
                                              <CountryFlag code={c.data.code} flag={c.data.flag} name={c.data.name} className="h-5 w-7 rounded object-cover shadow-md border border-slate-200/50 dark:border-white/10 shrink-0" emojiClassName="text-lg leading-none" />
                                              <span className="text-sm font-extrabold truncate text-foreground">{c.data.name}</span>
                                            </div>
                                          </div>
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {/* Elo Rating */}
                                    <tr className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                      <td className="py-4 px-5 font-bold text-muted-foreground sticky left-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md z-10 border-r border-slate-200/60 dark:border-white/5 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.4)]">
                                        <div className="flex items-center gap-2">
                                          <TrendingUp className="w-4 h-4 text-cyan-500 shrink-0" />
                                          <span>Elo Rating</span>
                                        </div>
                                      </td>
                                      {parsedCompareData.map((c) => {
                                        const elo = Math.round(c.data.customElo ?? c.data.elo ?? 1500);
                                        const isBest = elo === maxElo && parsedCompareData.length > 1;
                                        return (
                                          <td key={c.id} className={`py-4 px-5 border-b border-slate-100 dark:border-white/5 font-mono font-bold transition-colors ${
                                            isBest ? "bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08]" : ""
                                          }`}>
                                            <div className="flex items-center justify-between gap-1.5 max-w-[180px]">
                                              <span className={isBest ? "text-emerald-600 dark:text-emerald-400 font-extrabold" : "text-foreground"}>
                                                {elo}
                                              </span>
                                              {isBest && (
                                                <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-0.5">
                                                  <Trophy className="w-2.5 h-2.5" /> Best
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                        );
                                      })}
                                    </tr>

                                    {/* Attack Power */}
                                    <tr className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                      <td className="py-4 px-5 font-bold text-muted-foreground sticky left-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md z-10 border-r border-slate-200/60 dark:border-white/5 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.4)]">
                                        <div className="flex items-center gap-2">
                                          <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                                          <span>Attack Power</span>
                                        </div>
                                      </td>
                                      {parsedCompareData.map((c) => {
                                        const attack = c.data.customAttack ?? 75;
                                        const isBest = attack === maxAttack && parsedCompareData.length > 1;
                                        return (
                                          <td key={c.id} className={`py-4 px-5 border-b border-slate-100 dark:border-white/5 transition-colors ${
                                            isBest ? "bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08]" : ""
                                          }`}>
                                            <div className="space-y-1.5 max-w-[180px]">
                                              <div className="flex items-center justify-between text-xs font-bold font-mono">
                                                <span className={isBest ? "text-emerald-600 dark:text-emerald-400 font-extrabold" : "text-foreground"}>
                                                  {attack}
                                                </span>
                                                {isBest && <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Top</span>}
                                              </div>
                                              <div className="w-full bg-slate-100 dark:bg-white/5 h-1.5 rounded-full overflow-hidden">
                                                <div 
                                                  className={`h-full rounded-full transition-all duration-500 ${isBest ? "bg-emerald-500" : "bg-cyan-500"}`} 
                                                  style={{ width: `${attack}%` }} 
                                                />
                                              </div>
                                            </div>
                                          </td>
                                        );
                                      })}
                                    </tr>

                                    {/* Defense Strength */}
                                    <tr className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                      <td className="py-4 px-5 font-bold text-muted-foreground sticky left-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md z-10 border-r border-slate-200/60 dark:border-white/5 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.4)]">
                                        <div className="flex items-center gap-2">
                                          <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
                                          <span>Defense Strength</span>
                                        </div>
                                      </td>
                                      {parsedCompareData.map((c) => {
                                        const defense = c.data.customDefense ?? 75;
                                        const isBest = defense === maxDefense && parsedCompareData.length > 1;
                                        return (
                                          <td key={c.id} className={`py-4 px-5 border-b border-slate-100 dark:border-white/5 transition-colors ${
                                            isBest ? "bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08]" : ""
                                          }`}>
                                            <div className="space-y-1.5 max-w-[180px]">
                                              <div className="flex items-center justify-between text-xs font-bold font-mono">
                                                <span className={isBest ? "text-emerald-600 dark:text-emerald-400 font-extrabold" : "text-foreground"}>
                                                  {defense}
                                                </span>
                                                {isBest && <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Top</span>}
                                              </div>
                                              <div className="w-full bg-slate-100 dark:bg-white/5 h-1.5 rounded-full overflow-hidden">
                                                <div 
                                                  className={`h-full rounded-full transition-all duration-500 ${isBest ? "bg-emerald-500" : "bg-cyan-500"}`} 
                                                  style={{ width: `${defense}%` }} 
                                                />
                                              </div>
                                            </div>
                                          </td>
                                        );
                                      })}
                                    </tr>

                                    {/* Squad Value */}
                                    <tr className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                      <td className="py-4 px-5 font-bold text-muted-foreground sticky left-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md z-10 border-r border-slate-200/60 dark:border-white/5 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.4)]">
                                        <div className="flex items-center gap-2">
                                          <Coins className="w-4 h-4 text-yellow-500 shrink-0" />
                                          <span>Squad Value</span>
                                        </div>
                                      </td>
                                      {parsedCompareData.map((c) => {
                                        const squadVal = c.data.squadValueM ?? appTeams.find(t => t.code === c.data.code)?.squadValueM ?? 0;
                                        const isBest = squadVal === maxSquadValue && squadVal > 0 && parsedCompareData.length > 1;
                                        return (
                                          <td key={c.id} className={`py-4 px-5 border-b border-slate-100 dark:border-white/5 font-mono font-bold transition-colors ${
                                            isBest ? "bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08]" : ""
                                          }`}>
                                            <div className="flex items-center justify-between gap-1.5 max-w-[180px]">
                                              <span className={isBest ? "text-emerald-600 dark:text-emerald-400 font-extrabold" : "text-foreground"}>
                                                {squadVal ? `€${squadVal}M` : "N/A"}
                                              </span>
                                              {isBest && (
                                                <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/10">Highest</span>
                                              )}
                                            </div>
                                          </td>
                                        );
                                      })}
                                    </tr>

                                    {/* Model Engine */}
                                    <tr className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                      <td className="py-4 px-5 font-bold text-muted-foreground sticky left-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md z-10 border-r border-slate-200/60 dark:border-white/5 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.4)]">
                                        <div className="flex items-center gap-2">
                                          <Cpu className="w-4 h-4 text-purple-500 shrink-0" />
                                          <span>Model Engine</span>
                                        </div>
                                      </td>
                                      {parsedCompareData.map((c) => {
                                        const model = c.data.modelName || "base";
                                        let badgeClass = "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20";
                                        if (model === "advanced") {
                                          badgeClass = "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20";
                                        } else if (model === "pro") {
                                          badgeClass = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
                                        }
                                        return (
                                          <td key={c.id} className="py-4 px-5 border-b border-slate-100 dark:border-white/5">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${badgeClass}`}>
                                              {model}
                                            </span>
                                          </td>
                                        );
                                      })}
                                    </tr>

                                    {/* Championship Odds */}
                                    <tr className="border-b border-slate-200 dark:border-white/10 hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                      <td className="py-4 px-5 font-bold text-muted-foreground sticky left-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md z-10 border-r border-slate-200/60 dark:border-white/5 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.4)]">
                                        <div className="flex items-center gap-2">
                                          <Award className="w-4 h-4 text-rose-500 shrink-0" />
                                          <span>Championship Odds</span>
                                        </div>
                                      </td>
                                      {parsedCompareData.map((c) => {
                                        const ch = c.data.stages?.champion ?? (c.data.championProb * 10 || 0);
                                        const prob = parseFloat((ch / 10).toFixed(1));
                                        const isBest = ch === maxChampionshipOdds && parsedCompareData.length > 1;
                                        return (
                                          <td key={c.id} className={`py-4 px-5 border-b border-slate-200 dark:border-white/10 transition-colors ${
                                            isBest ? "bg-cyan-500/[0.08] dark:bg-neon/10" : "bg-cyan-500/[0.02] dark:bg-neon/5"
                                          }`}>
                                            <div className="space-y-1.5 max-w-[180px]">
                                              <div className="flex items-center justify-between text-xs font-black font-mono">
                                                <span className={isBest ? "text-cyan-600 dark:text-neon text-sm" : "text-foreground"}>
                                                  {prob}%
                                                </span>
                                                {isBest && (
                                                  <span className="text-[9px] font-extrabold text-cyan-600 dark:text-neon uppercase tracking-wide bg-cyan-500/15 dark:bg-neon/20 px-1 py-0.2 rounded flex items-center gap-0.5 animate-pulse">
                                                    <Trophy className="w-2.5 h-2.5" /> Favorite
                                                  </span>
                                                )}
                                              </div>
                                              <div className="w-full bg-slate-200 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                                                <div 
                                                  className={`h-full rounded-full transition-all duration-500 ${isBest ? "bg-cyan-500 dark:bg-neon" : "bg-cyan-400"}`} 
                                                  style={{ width: `${prob}%` }} 
                                                />
                                              </div>
                                            </div>
                                          </td>
                                        );
                                      })}
                                    </tr>

                                    {/* Reach Final */}
                                    {renderStageRow("Reach Final", <ChevronRight className="w-4 h-4 text-cyan-500 shrink-0" />, "final", maxReachFinal)}

                                    {/* Reach Semi-Final */}
                                    {renderStageRow("Reach Semi-Final", <ChevronRight className="w-4 h-4 text-cyan-500/80 shrink-0" />, "sf", maxReachSF)}

                                    {/* Reach Quarter-Final */}
                                    {renderStageRow("Reach Quarter-Final", <ChevronRight className="w-4 h-4 text-cyan-500/60 shrink-0" />, "qf", maxReachQF)}

                                    {/* Reach Round of 16 */}
                                    {renderStageRow("Reach Round of 16", <ChevronRight className="w-4 h-4 text-cyan-500/40 shrink-0" />, "r16", maxReachR16)}

                                    {/* Reach Round of 32 */}
                                    {renderStageRow("Reach Round of 32", <ChevronRight className="w-4 h-4 text-cyan-500/20 shrink-0" />, "r32", maxReachR32)}

                                    {/* Expected Path */}
                                    <tr className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                      <td className="py-4 px-5 font-bold text-muted-foreground sticky left-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md z-10 border-r border-slate-200/60 dark:border-white/5 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.4)]">
                                        <div className="flex items-center gap-2">
                                          <Route className="w-4 h-4 text-pink-500 shrink-0" />
                                          <span>Expected Path</span>
                                        </div>
                                      </td>
                                      {parsedCompareData.map((c) => (
                                        <td key={c.id} className="py-4 px-5">
                                          <div className="relative pl-4 border-l border-slate-200 dark:border-white/10 space-y-3.5 my-1 max-w-[220px] ml-2">
                                            {c.data.path?.map((step: any, sidx: number) => {
                                              const stageShort = step.stage
                                                .replace("Round of 32", "R32")
                                                .replace("Round of 16", "R16")
                                                .replace("Quarter Final", "QF")
                                                .replace("Semi Final", "SF")
                                                .replace("Final", "Final");
                                              return (
                                                <div key={sidx} className="relative text-[11px]">
                                                  {/* Timeline Bullet Node centered on parent border-l */}
                                                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-cyan-500 border-2 border-white dark:border-slate-900 shadow-sm" />
                                                  <div className="flex flex-col gap-0.5">
                                                    <span className="font-extrabold text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                                      {stageShort}
                                                    </span>
                                                    <div className="flex items-center gap-1.5">
                                                      <span className="font-bold text-foreground truncate max-w-[120px]" title={step.opponentName}>
                                                        {step.opponentFlag} {step.opponentName}
                                                      </span>
                                                      <span className="font-mono font-bold text-cyan-600 dark:text-neon text-[10px] bg-cyan-500/10 px-1 py-0.2 rounded shrink-0">
                                                        {step.winPct}%
                                                      </span>
                                                    </div>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </td>
                                      ))}
                                    </tr>

                                    {/* Actions */}
                                    <tr className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                      <td className="py-4 px-5 font-bold text-muted-foreground sticky left-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md z-10 border-r border-slate-200/60 dark:border-white/5 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.4)]">
                                        <div className="flex items-center gap-2">
                                          <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
                                          <span>Actions</span>
                                        </div>
                                      </td>
                                      {parsedCompareData.map((c) => (
                                        <td key={c.id} className="py-4 px-5">
                                          <div className="flex gap-2">
                                            <button
                                              type="button"
                                              onClick={() => handleLoadPrediction(c.raw)}
                                              className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-cyan-500/10 text-cyan-700 hover:bg-cyan-500/20 dark:bg-neon/10 dark:text-neon dark:hover:bg-neon/20 transition cursor-pointer"
                                            >
                                              Load Settings
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => toggleCompareSelect(c.id)}
                                              className="text-[11px] font-bold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition cursor-pointer"
                                            >
                                              Remove
                                            </button>
                                          </div>
                                        </td>
                                      ))}
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            );
                          })()}

                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Confirmation Dialog: Futuristic Styled Modal */}
      <Dialog open={showConfirmPopup} onOpenChange={(open) => {
        if (!isSimulating) setShowConfirmPopup(open);
      }}>
        <DialogContent className={`${isSimulating ? "max-w-md border-none bg-transparent shadow-none p-0 [&>button]:hidden" : "max-w-2xl rounded-[2rem] border border-slate-200 bg-white text-foreground shadow-[0_24px_80px_rgba(15,23,42,0.22)] overflow-hidden p-0 dark:border-white/10 dark:bg-slate-900"} `}>
          {!isSimulating && <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-100/80 rounded-full filter blur-xl pointer-events-none dark:bg-neon/10" />}
          <div className={`relative z-10 ${isSimulating ? "" : "p-6"}`}>
            {!isSimulating && (
              <DialogHeader>
                <DialogTitle className="text-xl font-display font-extrabold flex items-center gap-3 text-slate-950 dark:text-white">
                  <AlertCircle className="w-6 h-6 text-emerald-600 dark:text-neon" />
                  <span>Ready to run the simulation?</span>
                </DialogTitle>
              </DialogHeader>
            )}
            <div className={`space-y-4 ${isSimulating ? "" : "pt-4"}`}>
              {isSimulating ? (
                <div className="flex w-full flex-col items-center justify-center gap-4 py-2">
                  <img
                    src="/lottie/World Cup!.svg"
                    alt="Simulation loading"
                    className="h-80 w-80 object-contain"
                  />
                  <div className="w-full max-w-xs rounded-full bg-transparent p-2 shadow-none backdrop-blur-0 dark:bg-transparent">
                    <div className="mb-2 text-center text-2xl font-mono font-black text-cyan-700 dark:text-neon">
                      {simProgress}%
                    </div>
                    <Progress value={simProgress} className="h-2.5 bg-slate-200/90 dark:bg-white/10" />
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-700 dark:text-muted-foreground leading-relaxed">
                    We&rsquo;re about to simulate <span className="font-extrabold text-slate-950 dark:text-white">{selectedTeam.name}&rsquo;s</span> most likely path to lifting the trophy.
                  </p>
                  <div className="flex gap-3 items-start text-xs text-amber-700 bg-amber-50 p-4.5 rounded-[1.75rem] border border-amber-200 dark:text-yellow-500/90 dark:bg-yellow-500/5 dark:border-yellow-500/15">
                    <Sparkles className="w-5 h-5 shrink-0 text-amber-500 mt-0.5 animate-pulse dark:text-yellow-500" />
                    <div>
                      <span className="font-bold block text-amber-600 mb-0.5 dark:text-yellow-400">Path to glory simulation</span>
                      We&rsquo;ll run 1,000 tournament paths to estimate {selectedTeam.name}&rsquo;s chances of going all the way and lifting the trophy.
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-5 border-t border-slate-200 mt-6 dark:border-white/5 w-full">
                    <div className="text-left">
                      {session ? (
                        (subscriptionTier === "free" || session.user.subscriptionTier === "free") && (
                          <span className="text-xs font-semibold text-slate-500 dark:text-muted-foreground">
                            Free Sims Used: <strong className="text-emerald-600 dark:text-neon">{creditsUsed}</strong> / 5
                          </span>
                        )
                      ) : (
                        <span className="text-xs font-semibold text-slate-500 dark:text-muted-foreground">
                          Guest Sims Used: <strong className="text-emerald-600 dark:text-neon">{guestCreditsUsed}</strong> / 3
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowConfirmPopup(false)}
                        className="px-5 py-2.5 rounded-xl text-sm font-bold border border-sky-500 text-sky-600 hover:bg-sky-50 transition-all dark:border-white/10 dark:hover:bg-white/5 dark:hover:border-white/20 dark:text-white"
                        disabled={isSimulating}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          const allowed = await consumeCredit();
                          if (allowed) {
                            runSimulations();
                          }
                        }}
                        disabled={isSimulating}
                        className="px-5 py-2.5 rounded-xl text-sm font-black bg-gradient-to-r from-[#0a8a45] via-[#2c7c87] to-[#af3fd1] text-white hover:scale-[1.02] active:scale-95 transition-all shadow-md disabled:opacity-50"
                      >
                        Run Simulation
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        reason={upgradeModalReason}
      />
    </div>
  );
}

function LabField({
  label,
  value,
  onChange,
  min,
  max,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  disabled?: boolean;
}) {
  return (
    <div className={`rounded-[1.25rem] border p-3 ${disabled ? "border-slate-200/70 bg-slate-100/70 opacity-70 dark:border-white/10 dark:bg-white/[0.03]" : "border-slate-200 bg-slate-50/80 dark:border-white/10 dark:bg-white/[0.03]"}`}>
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold text-center">{label}</div>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(clampRating(Number(e.target.value || min), min, max))}
        className="mt-2 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-mono font-bold text-slate-950 outline-none transition focus:border-cyan-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
      />
    </div>
  );
}

function PlayerBucket({
  title,
  description,
  players,
  activeIds,
  disabled,
  onToggle,
  onLockedClick,
}: {
  title: string;
  description: string;
  players: PlayerStats[];
  activeIds: string[];
  disabled?: boolean;
  onToggle: (playerId: string) => void;
  onLockedClick: () => void;
}) {
  return (
    <div className={`rounded-[1.4rem] border p-4 ${disabled ? "border-amber-200 bg-amber-50/60 dark:border-amber-500/20 dark:bg-amber-500/5" : "border-slate-200 bg-slate-50/80 dark:border-white/10 dark:bg-white/[0.03]"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-bold text-slate-950 dark:text-white">{title}</div>
          <div className="text-xs text-slate-500 dark:text-white/55">{description}</div>
        </div>
        {disabled ? (
          <button
            type="button"
            onClick={onLockedClick}
            className="rounded-full border border-amber-300 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700 dark:border-amber-500/30 dark:text-amber-300"
          >
            Pro
          </button>
        ) : null}
      </div>

      <div className="mt-4 flex max-h-[220px] flex-wrap gap-2 overflow-y-auto pr-1 scrollbar-custom">
        {players.map((player) => {
          const playerId = `${player["Team Code"]}-${player["Player Name"]}`;
          const active = activeIds.includes(playerId);

          return (
            <button
              key={playerId}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(playerId)}
              className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${active
                ? "border-cyan-400 bg-cyan-500/10 text-cyan-700 dark:text-neon"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70 dark:hover:border-white/20"
                }`}
            >
              {player["Name on Shirt"] || player["Player Name"]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function cleanPlayerName(name: string) {
  if (!name) return "";
  return name
    .replace(/MARTNEZ/g, "MARTÍNEZ")
    .replace(/ALVAREZ/g, "ÁLVAREZ")
    .replace(/GONZALEZ/g, "GONZÁLEZ")
    .replace(/DI MARA/g, "DI MARÍA")
    .replace(/FERNANDEZ/g, "FERNÁNDEZ")
    // Fix Croatia / Balkan names corrupted by encoding issues (replacing both ? and replacement chars)
    .replace(/KOVA[?\uFFFD]I[?\uFFFD]/gi, "KOVACIC")
    .replace(/STANI[?\uFFFD]I[?\uFFFD]/gi, "STANISIC")
    .replace(/PONGRA[?\uFFFD]I[?\uFFFD]/gi, "PONGRACIC")
    .replace(/MODRI[?\uFFFD]/gi, "MODRIC")
    .replace(/[?\uFFFD]ALETA-CAR/gi, "CALETA-CAR")
    .replace(/PA[?\uFFFD]ALI[?\uFFFD]/gi, "PASALIC")
    .replace(/P\.\s*SU[?\uFFFD]I[?\uFFFD]/gi, "P. SUCIC")
    .replace(/[?\uFFFD]UTALO/gi, "SUTALO")
    .replace(/VLA[?\uFFFD]I[?\uFFFD]/gi, "VLASIC")
    .replace(/PERI[?\uFFFD]I[?\uFFFD]/gi, "PERISIC")
    .replace(/KRAMARI[?\uFFFD]/gi, "KRAMARIC")
    .replace(/LIVAKOVI[?\uFFFD]/gi, "LIVAKOVIC")
    .replace(/PJA[?\uFFFD]A/gi, "PJACA")
    .replace(/SU[?\uFFFD]I[?\uFFFD]/gi, "SUCIC")
    .replace(/GON[?\uFFFD]LEZ/gi, "GONZALEZ")
    .replace(/MART[?\uFFFD]NEZ/gi, "MARTINEZ")
    .replace(/ALV[?\uFFFD]H?REZ/gi, "ALVAREZ")
    .replace(/DI MAR[?\uFFFD]A/gi, "DI MARIA")
    .replace(/FERN[?\uFFFD]NDEZ/gi, "FERNANDEZ")
    .replace(/S[?\uFFFD]NCHEZ/gi, "SANCHEZ")
    .replace(/GIM[?\uFFFD]NEZ/gi, "GIMENEZ")
    .replace(/NU[?\uFFFD]EZ/gi, "NUNEZ")
    .replace(/VI[?\uFFFD]A/gi, "VINA")
    .replace(/R[?\uFFFD]DIGER/gi, "RUDIGER")
    .replace(/GRO[?\uFFFD]/gi, "GROSS")
    .replace(/SAN[?\uFFFD]/gi, "SANE")
    .replace(/N[?\uFFFD]BEL/gi, "NUBEL")
    .replace(/KONAT[?\uFFFD]/gi, "KONATE")
    .replace(/ZA[?\uFFFD]RE-EMERY/gi, "ZAIRE-EMERY")
    .replace(/[\uFFFD]/g, "")
    .replace(/\?/g, "");
}

function PlayerBucketCompact({
  players,
  activeIds,
  disabled,
  onToggle,
  onLockedClick,
}: {
  players: PlayerStats[];
  activeIds: string[];
  disabled?: boolean;
  onToggle: (playerId: string) => void;
  onLockedClick: () => void;
}) {
  return (
    <div
      className="flex max-h-[160px] flex-wrap gap-1.5 overflow-y-auto pr-1 scrollbar-custom"
      onClick={() => {
        if (disabled) onLockedClick();
      }}
    >
      {players.map((player) => {
        const playerId = `${player["Team Code"]}-${player["Player Name"]}`;
        const active = activeIds.includes(playerId);
        const name = cleanPlayerName(player["Name on Shirt"] || player["Player Name"] || "");

        return (
          <button
            key={playerId}
            type="button"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(playerId);
            }}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition cursor-pointer select-none ${active
              ? "border-cyan-400 bg-cyan-500/10 text-cyan-700 dark:text-neon"
              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70 dark:hover:border-white/20"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}
