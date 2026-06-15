"use client";

import { useEffect, useState, useMemo } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { useSession, signIn } from "next-auth/react";
import { toast } from "sonner";
import { useSimulationStore, PlayerStats, TeamStats } from "@/lib/store/simulationStore";
import { useTeams, useGroupsConfig } from "@/components/TeamsProvider";
import { getMatchExpectedGoals, SimTeam } from "@/lib/simulation/model";
import { Trophy, Search, ChevronRight, User, TrendingUp, Sparkles, AlertCircle, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";

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

export default function CountryPredictionsClient({
  initialTeams,
  initialPlayers,
  flagMap
}: {
  initialTeams: TeamStats[],
  initialPlayers: PlayerStats[],
  flagMap: Record<string, string>
}) {
  const { isInitialized, initializeData, players, selectedModel } = useSimulationStore();
  const appTeams = useTeams();
  const GROUPS_CONFIG = useGroupsConfig();
  const { theme } = useTheme();
  const { data: session } = useSession();

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

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

  // Simulation results state
  const [simResults, setSimResults] = useState<{
    stages: Record<string, number>;
    opponents: Record<string, Record<string, { count: number; gfSum: number; gaSum: number; wins: number }>>;
    mockTournament?: any;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
    initializeData(initialTeams, initialPlayers);
  }, [initializeData, initialTeams, initialPlayers]);

  const getTeam = (code: string): SimTeam => {
    const appTeam = appTeams.find((t) => t.code === code);
    if (appTeam) {
      return {
        code: appTeam.code,
        name: appTeam.name,
        flag: appTeam.flag,
        elo: appTeam.elo,
        attack: appTeam.attack,
        defense: appTeam.defense,
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

  const getTeamPlayers = (teamCode: string) => {
    return Object.values(players)
      .filter((p) => p["Team Code"] === teamCode)
      .sort((a, b) => {
        const ratingA = parseInt(a["Overall Rating"]?.replace("%", "") || "0", 10);
        const ratingB = parseInt(b["Overall Rating"]?.replace("%", "") || "0", 10);
        return ratingB - ratingA;
      });
  };

  const getTopPlayer = (teamCode: string) => {
    const teamPlayers = getTeamPlayers(teamCode);
    const topPlayer = teamPlayers[0];
    const name = topPlayer ? (topPlayer["Name on Shirt"] || topPlayer["Player Name"]) : "";
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
        if (team !== selectedCode) return;
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
        const { homeLambda, awayLambda } = getMatchExpectedGoals(homeTeam, awayTeam, players, selectedModel);
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
            const { homeLambda, awayLambda } = getMatchExpectedGoals(t1, t2, players, selectedModel);
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

        const getWinner = (g: string) => groupStandings[g][0].code;
        const getRunner = (g: string) => groupStandings[g][1].code;
        const getThird = (idx: number) => bestThirds[idx]?.code || "ARG";

        // Generate R32 pairings
        const r32Pairings = [
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

        // Check if selected country is in R32
        const inR32 = r32Pairings.some(p => p.home === selectedCode || p.away === selectedCode);
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
        const inR16 = r16Teams.includes(selectedCode);
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
        const inQF = qfTeams.includes(selectedCode);
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
        const inSF = sfTeams.includes(selectedCode);
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
        const inFinal = finalTeams.includes(selectedCode);
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

        if (winner === selectedCode) {
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
    } catch (err) {
      console.error(err);
      toast.error("Error saving prediction. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Trigger confirmation popup whenever the selected country or the prediction model changes
  useEffect(() => {
    if (mounted && isInitialized) {
      setShowConfirmPopup(true);
      setSaveSuccess(false);
    }
  }, [selectedCode, selectedModel, mounted, isInitialized]);

  // Sort and filter teams list in sidebar
  const sortedTeams = useMemo(() => {
    return [...appTeams].sort((a, b) => b.elo - a.elo);
  }, [appTeams]);

  const filteredTeams = useMemo(() => {
    if (!searchQuery) return sortedTeams;
    const q = searchQuery.toLowerCase();
    return sortedTeams.filter(t => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q));
  }, [searchQuery, sortedTeams]);

  const selectedTeam = appTeams.find((t) => t.code === selectedCode) || appTeams[0];

  // Dynamic calculations for Radar chart
  const radarData = useMemo(() => {
    if (!selectedTeam) return [];
    return [
      { axis: "Attack", v: selectedTeam.attack > 10 ? selectedTeam.attack : Math.round(selectedTeam.attack * 80) },
      { axis: "Defense", v: selectedTeam.defense > 10 ? selectedTeam.defense : Math.round(selectedTeam.defense * 80) },
      { axis: "Power", v: selectedTeam.power || 70 },
      { axis: "Form", v: Math.min(99, (selectedTeam.power || 70) + 4) },
      { axis: "Squad", v: Math.min(99, 50 + (selectedTeam.squadValueM || 500) / 15) },
      { axis: "Elo", v: Math.round(((selectedTeam.elo || 1500) - 1300) / 6) },
    ];
  }, [selectedTeam]);

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
  }, [selectedCode, players, selectedTeam]);


  // Extract most likely path to success (most common opponent at each stage)
  const pathStepInfo = useMemo(() => {
    if (!simResults) return [];
    const stagesOrdered = [
      { key: "group", label: "Group Stage" },
      { key: "r32", label: "Round of 32" },
      { key: "r16", label: "Round of 16" },
      { key: "qf", label: "Quarter Final" },
      { key: "sf", label: "Semi Final" },
      { key: "final", label: "Final" }
    ];

    return stagesOrdered.map((stage) => {
      const opps = simResults.opponents[stage.key];
      const items = Object.entries(opps).sort((a, b) => b[1].count - a[1].count);
      const topOppEntry = items[0];

      if (!topOppEntry) {
        return {
          stage: stage.label,
          opponent: null,
          winPct: 0,
          expectedScore: "-:-"
        };
      }

      const oppCode = topOppEntry[0];
      const stats = topOppEntry[1];
      const opp = getTeam(oppCode);

      const winPct = Math.round((stats.wins / stats.count) * 100);
      const avgGf = (stats.gfSum / stats.count).toFixed(1);
      const avgGa = (stats.gaSum / stats.count).toFixed(1);

      return {
        stage: stage.label,
        opponent: opp,
        winPct,
        expectedScore: `${avgGf} - ${avgGa}`
      };
    });
  }, [simResults]);

  if (!mounted) return null;

  return (
    <div className="mx-auto max-w-[1600px] w-full px-4 py-8 md:px-8 animate-in fade-in duration-700">
      {/* Premium Dashboard Header */}
      <div className="relative mb-10 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] p-8 backdrop-blur-md shadow-glass">
        <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-neon/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 h-60 w-60 rounded-full bg-neon-2/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-neon flex items-center gap-2 font-bold mb-2">
              <Sparkles className="w-4 h-4 text-neon animate-pulse" />
              Predictive Intelligence Platform
            </div>
            <h1 className="font-display text-4xl font-black sm:text-5xl text-gradient tracking-tight">
              Path to Glory Explorer
            </h1>
            <p className="mt-2 text-muted-foreground text-sm max-w-2xl leading-relaxed">
              Simulate the entire tournament 1,000 times dynamically based on the active model. Compare predictions across different ELO and form weights.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <div className="flex flex-col items-end bg-black/40 border border-white/10 rounded-2xl px-5 py-3 shadow-glass">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Simulation Engine</span>
              <span className="text-lg font-bold font-display text-neon mt-0.5">{selectedModel}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr] mb-6">
        {/* Left list of countries: Futuristic Sidebar Control */}
        <div className="glass-strong rounded-3xl p-5 flex flex-col h-[750px] border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background to-transparent pointer-events-none z-10" />
          
          <div className="relative mb-5 group">
            <Search className="absolute inset-y-0 left-3.5 h-4 w-4 my-auto text-muted-foreground group-focus-within:text-neon transition-colors" />
            <Input
              placeholder="Search country..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 bg-white/5 border-white/10 text-foreground text-sm focus-visible:ring-neon focus-visible:border-neon focus-visible:bg-white/[0.08] rounded-xl h-11 transition-all"
            />
          </div>

          <div className="flex-grow overflow-y-auto space-y-1.5 pr-1.5 scrollbar-custom pb-16">
            {filteredTeams.map((t) => {
              const active = t.code === selectedCode;
              return (
                <button
                  key={t.code}
                  onClick={() => setSelectedCode(t.code)}
                  className={`w-full flex items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-left text-sm transition-all duration-300 border relative overflow-hidden group ${
                    active
                      ? "bg-gradient-to-r from-neon/10 to-neon-2/10 border-neon/30 text-white shadow-[0_0_15px_rgba(6,182,212,0.1)] font-bold"
                      : "border-white/5 bg-white/[0.01] hover:bg-white/5 text-muted-foreground hover:text-white"
                  }`}
                >
                  {active && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-neon to-neon-2" />
                  )}
                  <div className="flex items-center gap-3 min-w-0 z-10">
                    <span className="text-2xl shrink-0 drop-shadow-md group-hover:scale-110 transition-transform duration-300 select-none">
                      {t.flag}
                    </span>
                    <span className="truncate tracking-wide">{t.name}</span>
                  </div>
                  <div className="text-xs font-mono font-bold text-neon-2 text-right z-10 opacity-90">
                    {Math.round(t.elo)}
                  </div>
                </button>
              );
            })}
            {filteredTeams.length === 0 && (
              <div className="text-center py-12 text-xs text-muted-foreground">
                No country matches "{searchQuery}"
              </div>
            )}
          </div>
        </div>

        {/* Right main analysis panel */}
        <div className="space-y-6 min-w-0">
          {/* Header Team info & progression stats: Premium glass card */}
          <div className="glass-strong rounded-3xl p-6 relative overflow-hidden border border-white/10 shadow-xl">
            <div className="absolute -right-16 -top-16 w-56 h-56 bg-neon/10 rounded-full filter blur-3xl pointer-events-none" />
            <div className="absolute -left-16 -bottom-16 w-56 h-56 bg-neon-2/10 rounded-full filter blur-3xl pointer-events-none" />
            <div className="flex flex-col lg:flex-row justify-between items-stretch gap-6 border-b border-white/5 pb-6 mb-6">
              {/* Team Profile Basic Details */}
              <div className="flex flex-col justify-between flex-grow gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div className="flex items-center gap-5">
                    <div className="text-7xl drop-shadow-lg leading-none select-none filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:scale-105 transition-transform duration-300">
                      {selectedTeam.flag}
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-extrabold flex items-center gap-1.5">
                        <span>FIFA Rank #{selectedTeam.rank}</span>
                        <span className="text-white/20">&bull;</span>
                        <span className="text-neon-2">Group {Object.entries(GROUPS_CONFIG).find(([_, list]) => list.includes(selectedCode))?.[0] || "-"}</span>
                      </div>
                      <h2 className="text-4xl font-extrabold font-display text-foreground mt-1 tracking-tight">
                        {selectedTeam.name}
                      </h2>
                    </div>
                  </div>

                  {/* Save Projections Action Button */}
                  {simResults && (
                    <div className="flex items-center self-start sm:self-auto gap-2">
                      {session ? (
                        <button
                          onClick={handleSavePrediction}
                          disabled={isSaving || isSimulating}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                            saveSuccess
                              ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400"
                              : "bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/25 text-white active:scale-95 disabled:opacity-50"
                          }`}
                        >
                          {isSaving ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
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
                          onClick={() => signIn()}
                          className="flex items-center gap-2 bg-gradient-to-r from-neon/20 to-neon-2/20 border border-neon/30 hover:from-neon/30 hover:to-neon-2/30 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                        >
                          <User className="w-3.5 h-3.5 text-neon-2" />
                          <span>Sign In to Save</span>
                        </button>
                      )}
                    </div>
                  )}
                 </div>

                {/* Core Attributes Mini Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-colors">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-medium">FIFA Elo Rating</span>
                    <span className="text-xl font-bold font-mono text-foreground mt-1 block">{Math.round(selectedTeam.elo)}</span>
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-colors">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-medium">Power Index</span>
                    <span className="text-xl font-bold font-mono text-foreground mt-1 block">{selectedTeam.power || 70}</span>
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-colors">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-medium">Squad Value</span>
                    <span className="text-xl font-bold font-mono text-foreground mt-1 block">
                      {selectedTeam.squadValueM ? `€${selectedTeam.squadValueM}M` : "N/A"}
                    </span>
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-colors">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-medium">Top Player</span>
                    <span className="text-xs font-bold text-neon mt-1.5 block truncate" title={getTopPlayer(selectedTeam.code)}>
                      {getTopPlayer(selectedTeam.code)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Circular Gauge for Champion Probability */}
              <div className="flex flex-col items-center justify-center bg-white/[0.02] border border-white/10 rounded-2xl p-6 min-w-[200px] text-center shadow-glass relative group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-neon/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-extrabold relative z-10">
                  Championship Prob
                </span>
                
                <div className="relative flex items-center justify-center my-4 z-10">
                  <svg className="w-28 h-28 transform -rotate-90">
                    <circle
                      cx="56"
                      cy="56"
                      r="46"
                      stroke="rgba(255,255,255,0.04)"
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
                    <div className="text-2xl font-black font-mono text-foreground leading-none">
                      {simResults ? ((simResults.stages.champion / 1000) * 100).toFixed(1) : "0.0"}%
                    </div>
                  </div>
                </div>
                
                <span className="text-[11px] font-bold text-neon relative z-10 uppercase tracking-wider">
                  {simResults ? (
                    ((simResults.stages.champion / 1000) * 100) > 12 ? "Contender" : 
                    ((simResults.stages.champion / 1000) * 100) > 4 ? "Dark Horse" : "Underdog"
                  ) : "No Data"}
                </span>
              </div>
            </div>

            {/* Stages Progression Matrix */}
            <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
              {[
                { key: "group", label: "Group Stage", icon: "G" },
                { key: "r32", label: "Round of 32", icon: "32" },
                { key: "r16", label: "Round of 16", icon: "16" },
                { key: "qf", label: "Quarter Final", icon: "QF" },
                { key: "sf", label: "Semi Final", icon: "SF" },
                { key: "final", label: "Final", icon: "F" },
                { key: "champion", label: "Champion", icon: "🏆" }
              ].map((s) => {
                const count = simResults?.stages[s.key] || 0;
                const pct = (count / 1000) * 100;
                const active = pct > 0;
                return (
                  <div 
                    key={s.key} 
                    className={`border rounded-2xl p-3.5 transition-all duration-300 relative overflow-hidden group ${
                      active 
                        ? "bg-white/[0.02] border-white/10 hover:border-neon/30 hover:bg-white/[0.04]" 
                        : "bg-black/[0.1] border-white/5 opacity-30"
                    }`}
                  >
                    <div className="absolute top-0 right-0 w-8 h-8 -mr-2 -mt-2 bg-gradient-to-br from-neon/10 to-transparent rounded-full filter blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="flex justify-between items-start gap-1">
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold leading-tight">
                        {s.label}
                      </span>
                      {s.icon === "🏆" ? (
                        <Trophy className={`w-3.5 h-3.5 ${active ? "text-yellow-400" : "text-muted-foreground"}`} />
                      ) : (
                        <span className="text-[10px] font-mono font-bold text-foreground/20">{s.icon}</span>
                      )}
                    </div>
                    <div className={`mt-2 text-xl font-black font-mono tabular-nums leading-none ${active ? "text-foreground" : "text-muted-foreground"}`}>
                      {pct.toFixed(1)}%
                    </div>
                    
                    <div className="mt-3 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{ 
                          width: `${pct}%`,
                          background: s.key === "champion" 
                            ? "linear-gradient(90deg, var(--color-gold), #fbbf24)" 
                            : "linear-gradient(90deg, var(--color-neon), var(--color-neon-2))"
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dual Charts Row */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Radar Attributes Card */}
            <div className="glass-strong rounded-3xl p-6 relative overflow-hidden border border-white/10 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-display font-bold text-lg text-foreground">Performance Attributes</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Statistical profile comparison vs model baseline</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neon bg-neon/10 border border-neon/30 px-2 py-0.5 rounded-full">
                    Attributes
                  </span>
                </div>
                <div className="h-64 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} outerRadius={85}>
                      <PolarGrid stroke={activeTheme === "light" ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.08)"} />
                      <PolarAngleAxis dataKey="axis" tick={{ fill: activeTheme === "light" ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.6)", fontSize: 10, fontFamily: "var(--font-display)" }} />
                      <Radar dataKey="v" stroke="var(--color-neon)" fill="var(--color-neon)" fillOpacity={activeTheme === "light" ? 0.35 : 0.2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Squad Quality Tiers Card */}
            <div className="glass-strong rounded-3xl p-6 relative overflow-hidden border border-white/10 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-display font-bold text-lg text-foreground">Squad Quality Tiers</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Distribution of squad players across rating tiers</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neon-2 bg-neon-2/10 border border-neon-2/30 px-2 py-0.5 rounded-full">
                    Squad Profile
                  </span>
                </div>
                
                <div className="grid grid-cols-[100px_1fr] gap-6 items-center mt-4 h-52">
                  {/* Large circular stat */}
                  <div className="flex flex-col items-center justify-center bg-white/[0.02] border border-white/5 rounded-2xl py-6 px-3 text-center h-full">
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Avg Rating</span>
                    <span className="text-3xl font-black text-foreground mt-2 font-mono">{squadStats.avgRating}%</span>
                    <span className="text-[9px] text-neon mt-2 font-bold">{squadStats.total} Players</span>
                  </div>
                  
                  {/* Horizontal Progress Bars */}
                  <div className="space-y-4">
                    {[
                      { label: "Elite", count: squadStats.elite, color: "bg-cyan-400" },
                      { label: "Very Strong", count: squadStats.veryStrong, color: "bg-purple-400" },
                      { label: "Strong", count: squadStats.strong, color: "bg-amber-400" },
                      { label: "Good/Average", count: squadStats.average + squadStats.weak, color: "bg-slate-400" },
                    ].map((tier) => {
                      const pct = squadStats.total > 0 ? (tier.count / squadStats.total) * 100 : 0;
                      return (
                        <div key={tier.label} className="space-y-1">
                          <div className="flex justify-between text-[11px] font-bold">
                            <span className="text-muted-foreground">{tier.label}</span>
                            <span className="text-foreground font-mono">{tier.count} <span className="text-[9px] text-muted-foreground">({Math.round(pct)}%)</span></span>
                          </div>
                          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${tier.color} transition-all duration-500`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-strong rounded-3xl p-6 border border-white/10 shadow-lg relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b border-white/5 pb-5 mb-6">
              <div>
                <h3 className="font-display font-bold text-xl text-foreground flex items-center gap-2">
                  <TrendingUp className="text-neon" />
                  Expected Path to Glory
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Calculated dynamically from the most common matchups and scores across all simulations.
                </p>
              </div>
              <div className="text-[10px] uppercase bg-neon/10 border border-neon/30 text-neon px-3.5 py-1.5 rounded-full font-bold self-start sm:self-auto shadow-sm">
                Model: {selectedModel}
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
              <div className="overflow-x-auto pb-4 scrollbar-custom">
                <div className="flex items-stretch gap-4 min-w-max py-2 px-1">
                  {/* Start Node */}
                  <div className="flex flex-col justify-center items-center bg-gradient-to-br from-neon/20 to-neon-2/10 border border-neon/40 rounded-2xl px-5 py-4 min-w-[140px] shadow-glass relative overflow-hidden group">
                    <span className="text-4xl leading-none filter drop-shadow-md select-none transform group-hover:scale-110 transition-transform duration-300">
                      {selectedTeam.flag}
                    </span>
                    <span className="text-sm font-extrabold mt-2 text-foreground">{selectedTeam.name}</span>
                    <span className="text-[9px] uppercase tracking-[0.2em] font-extrabold text-neon mt-1">Start</span>
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
                        <ChevronRight className="w-5 h-5 text-white/20 shrink-0" />
                        
                        <div className="flex flex-col justify-between bg-white/[0.02] border border-white/5 p-4 rounded-2xl min-w-[195px] hover:border-white/20 hover:bg-white/[0.04] transition-all duration-300 relative group shadow-sm">
                          <div className="absolute -top-1 right-3 text-[30px] font-black text-white/[0.02] select-none font-mono">
                            0{idx + 1}
                          </div>
                          <span className="text-[9px] uppercase font-extrabold text-muted-foreground tracking-wider leading-none mb-2.5">
                            {p.stage}
                          </span>
                          
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-3xl leading-none filter drop-shadow-sm transform group-hover:scale-105 transition-transform">{p.opponent.flag}</span>
                            <div className="min-w-0">
                              <span className="text-sm font-extrabold text-foreground block truncate">{p.opponent.name}</span>
                              <span className="text-[10px] font-mono text-muted-foreground">Elo {Math.round(p.opponent.elo)}</span>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center pt-2.5 border-t border-white/5 mt-1">
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
          </div>
        </div>
      </div>

      {/* Redesigned Full Mock Tournament Bracket */}
      <div className="w-full bg-card dark:bg-[#070b1e] border border-border dark:border-white/10 rounded-3xl p-6 md:p-8 overflow-hidden relative shadow-sm dark:shadow-[0_0_50px_rgba(0,198,255,0.06)] mt-8">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.05)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
        <div className="absolute right-0 top-0 w-96 h-96 bg-[#00c6ff]/5 rounded-full filter blur-3xl pointer-events-none" />
        
        <div className="border-b border-border dark:border-white/10 pb-5 mb-8 relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="font-display font-extrabold text-2xl text-foreground dark:text-white tracking-tight">
              Full Simulated Tournament Bracket
            </h3>
            <p className="text-xs text-[#00c6ff] mt-1 font-bold tracking-wider uppercase">
              Best-Case Path to Glory Scenario for {selectedTeam.name}
            </p>
          </div>
        </div>

        {simResults?.mockTournament && (
          <div className="w-full overflow-x-auto scrollbar-custom pb-8 relative z-10">
            <div className="flex items-start justify-start min-w-max gap-12 px-4 py-4">
               {/* R32 Column */}
               <div className="flex flex-col gap-4 shrink-0">
                  <div className="text-[10px] uppercase font-bold text-[#00c6ff] tracking-widest pb-2 border-b border-border dark:border-white/10 mb-2">Round of 32</div>
                  {simResults.mockTournament.r32.map((m: any, i: number) => {
                    const home = getTeam(m.home);
                    const away = getTeam(m.away);
                    const isHomeWinner = m.winner === m.home;
                    const isAwayWinner = m.winner === m.away;
                    const homeBg = isHomeWinner ? "bg-gradient-to-r from-blue-500/10 to-blue-500/25 border border-blue-500/35" : "bg-black/[0.02] dark:bg-white/[0.02] border border-transparent opacity-60";
                    const awayBg = isAwayWinner ? "bg-gradient-to-r from-blue-500/10 to-blue-500/25 border border-blue-500/35" : "bg-black/[0.02] dark:bg-white/[0.02] border border-transparent opacity-60";

                    return (
                      <div key={i} className="relative group/match">
                         <div className="flex flex-col w-56 rounded-xl overflow-hidden shadow-sm dark:shadow-lg border border-border dark:border-white/10 bg-background dark:bg-[#070c1b] hover:border-[#00c6ff]/40 hover:scale-[1.02] transition-all duration-300 group shrink-0 relative">
                            <div className="bg-black/5 dark:bg-black/40 px-3 py-1.5 text-[9px] font-bold text-[#00c6ff] tracking-widest uppercase flex justify-between border-b border-border dark:border-white/5">
                               <span>MATCH {i + 1}</span>
                            </div>
                            <div className="flex flex-col p-1 gap-1">
                               <div className={`flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${homeBg}`}>
                                  <div className="flex items-center gap-2 overflow-hidden">
                                     <span className="text-sm drop-shadow-md select-none">{home.flag}</span>
                                     <span className="text-[11px] font-bold text-foreground dark:text-white truncate w-24">{home.name}</span>
                                     {isHomeWinner && <Check className="w-3.5 h-3.5 text-[#00c6ff] shrink-0" />}
                                  </div>
                                  <span className="text-xs font-mono font-bold text-foreground dark:text-white bg-black/5 dark:bg-black/60 px-2 py-0.5 rounded">{m.hs}</span>
                               </div>
                               <div className={`flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${awayBg}`}>
                                  <div className="flex items-center gap-2 overflow-hidden">
                                     <span className="text-sm drop-shadow-md select-none">{away.flag}</span>
                                     <span className="text-[11px] font-bold text-foreground dark:text-white truncate w-24">{away.name}</span>
                                     {isAwayWinner && <Check className="w-3.5 h-3.5 text-[#00c6ff] shrink-0" />}
                                  </div>
                                  <span className="text-xs font-mono font-bold text-foreground dark:text-white bg-black/5 dark:bg-black/60 px-2 py-0.5 rounded">{m.as}</span>
                               </div>
                            </div>
                         </div>
                         {/* Connectors */}
                         {(i % 2 === 0) ? (
                            <div className="absolute top-[60%] right-[-24px] w-6 h-[calc(50%+8px)] border-t border-r border-border dark:border-white/10 group-hover/match:border-[#00c6ff]/30 rounded-tr-xl -z-10 transition-colors" />
                         ) : (
                            <div className="absolute bottom-[60%] right-[-24px] w-6 h-[calc(50%+8px)] border-b border-r border-border dark:border-white/10 group-hover/match:border-[#00c6ff]/30 rounded-br-xl -z-10 transition-colors" />
                         )}
                      </div>
                    );
                  })}
               </div>

               {/* R16 Column */}
               <div className="flex flex-col justify-around gap-4 py-8 shrink-0">
                  <div className="text-[10px] uppercase font-bold text-[#00c6ff] tracking-widest pb-2 border-b border-border dark:border-white/10 mb-2 mt-[-32px]">Round of 16</div>
                  {simResults.mockTournament.r16.map((m: any, i: number) => {
                    const home = getTeam(m.home);
                    const away = getTeam(m.away);
                    const isHomeWinner = m.winner === m.home;
                    const isAwayWinner = m.winner === m.away;
                    const homeBg = isHomeWinner ? "bg-gradient-to-r from-blue-500/10 to-blue-500/25 border border-blue-500/35" : "bg-black/[0.02] dark:bg-white/[0.02] border border-transparent opacity-60";
                    const awayBg = isAwayWinner ? "bg-gradient-to-r from-blue-500/10 to-blue-500/25 border border-blue-500/35" : "bg-black/[0.02] dark:bg-white/[0.02] border border-transparent opacity-60";

                    return (
                      <div key={i} className="relative group/match">
                         <div className="absolute top-[60%] left-[-24px] w-6 h-px bg-border dark:bg-white/10 group-hover/match:bg-[#00c6ff]/30 -z-10 transition-colors" />
                         <div className="flex flex-col w-56 rounded-xl overflow-hidden shadow-sm dark:shadow-lg border border-border dark:border-white/10 bg-background dark:bg-[#070c1b] hover:border-[#00c6ff]/40 hover:scale-[1.02] transition-all duration-300 group shrink-0 relative">
                            <div className="bg-black/5 dark:bg-black/40 px-3 py-1.5 text-[9px] font-bold text-[#00c6ff] tracking-widest uppercase flex justify-between border-b border-border dark:border-white/5">
                               <span>R16 MATCH {i + 1}</span>
                            </div>
                            <div className="flex flex-col p-1 gap-1">
                               <div className={`flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${homeBg}`}>
                                  <div className="flex items-center gap-2 overflow-hidden">
                                     <span className="text-sm drop-shadow-md select-none">{home.flag}</span>
                                     <span className="text-[11px] font-bold text-foreground dark:text-white truncate w-24">{home.name}</span>
                                     {isHomeWinner && <Check className="w-3.5 h-3.5 text-[#00c6ff] shrink-0" />}
                                  </div>
                                  <span className="text-xs font-mono font-bold text-foreground dark:text-white bg-black/5 dark:bg-black/60 px-2 py-0.5 rounded">{m.hs}</span>
                               </div>
                               <div className={`flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${awayBg}`}>
                                  <div className="flex items-center gap-2 overflow-hidden">
                                     <span className="text-sm drop-shadow-md select-none">{away.flag}</span>
                                     <span className="text-[11px] font-bold text-foreground dark:text-white truncate w-24">{away.name}</span>
                                     {isAwayWinner && <Check className="w-3.5 h-3.5 text-[#00c6ff] shrink-0" />}
                                  </div>
                                  <span className="text-xs font-mono font-bold text-foreground dark:text-white bg-black/5 dark:bg-black/60 px-2 py-0.5 rounded">{m.as}</span>
                               </div>
                            </div>
                         </div>
                         {/* Connectors */}
                         {(i % 2 === 0) ? (
                            <div className="absolute top-[60%] right-[-24px] w-6 h-[calc(50%+24px)] border-t border-r border-border dark:border-white/10 group-hover/match:border-[#00c6ff]/30 rounded-tr-xl -z-10 transition-colors" />
                         ) : (
                            <div className="absolute bottom-[40%] right-[-24px] w-6 h-[calc(50%+24px)] border-b border-r border-border dark:border-white/10 group-hover/match:border-[#00c6ff]/30 rounded-br-xl -z-10 transition-colors" />
                         )}
                      </div>
                    );
                  })}
               </div>

               {/* QF Column */}
               <div className="flex flex-col justify-around gap-8 py-24 shrink-0">
                  <div className="text-[10px] uppercase font-bold text-[#00c6ff] tracking-widest pb-2 border-b border-border dark:border-white/10 mb-2 mt-[-96px]">Quarter-Finals</div>
                  {simResults.mockTournament.qf.map((m: any, i: number) => {
                    const home = getTeam(m.home);
                    const away = getTeam(m.away);
                    const isHomeWinner = m.winner === m.home;
                    const isAwayWinner = m.winner === m.away;
                    const homeBg = isHomeWinner ? "bg-gradient-to-r from-blue-500/10 to-blue-500/25 border border-blue-500/35" : "bg-black/[0.02] dark:bg-white/[0.02] border border-transparent opacity-60";
                    const awayBg = isAwayWinner ? "bg-gradient-to-r from-blue-500/10 to-blue-500/25 border border-blue-500/35" : "bg-black/[0.02] dark:bg-white/[0.02] border border-transparent opacity-60";

                    return (
                      <div key={i} className="relative group/match">
                         <div className="absolute top-[60%] left-[-24px] w-6 h-px bg-border dark:bg-white/10 group-hover/match:bg-[#00c6ff]/30 -z-10 transition-colors" />
                         <div className="flex flex-col w-56 rounded-xl overflow-hidden shadow-sm dark:shadow-lg border border-border dark:border-white/10 bg-background dark:bg-[#070c1b] hover:border-[#00c6ff]/40 hover:scale-[1.02] transition-all duration-300 group shrink-0 relative">
                            <div className="bg-black/5 dark:bg-black/40 px-3 py-1.5 text-[9px] font-bold text-[#00c6ff] tracking-widest uppercase flex justify-between border-b border-border dark:border-white/5">
                               <span>QF MATCH {i + 1}</span>
                            </div>
                            <div className="flex flex-col p-1 gap-1">
                               <div className={`flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${homeBg}`}>
                                  <div className="flex items-center gap-2 overflow-hidden">
                                     <span className="text-sm drop-shadow-md select-none">{home.flag}</span>
                                     <span className="text-[11px] font-bold text-foreground dark:text-white truncate w-24">{home.name}</span>
                                     {isHomeWinner && <Check className="w-3.5 h-3.5 text-[#00c6ff] shrink-0" />}
                                  </div>
                                  <span className="text-xs font-mono font-bold text-foreground dark:text-white bg-black/5 dark:bg-black/60 px-2 py-0.5 rounded">{m.hs}</span>
                               </div>
                               <div className={`flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${awayBg}`}>
                                  <div className="flex items-center gap-2 overflow-hidden">
                                     <span className="text-sm drop-shadow-md select-none">{away.flag}</span>
                                     <span className="text-[11px] font-bold text-foreground dark:text-white truncate w-24">{away.name}</span>
                                     {isAwayWinner && <Check className="w-3.5 h-3.5 text-[#00c6ff] shrink-0" />}
                                  </div>
                                  <span className="text-xs font-mono font-bold text-foreground dark:text-white bg-black/5 dark:bg-black/60 px-2 py-0.5 rounded">{m.as}</span>
                               </div>
                            </div>
                         </div>
                         {/* Connectors */}
                         {(i % 2 === 0) ? (
                            <div className="absolute top-[60%] right-[-24px] w-6 h-[calc(50%+64px)] border-t border-r border-border dark:border-white/10 group-hover/match:border-[#00c6ff]/30 rounded-tr-xl -z-10 transition-colors" />
                         ) : (
                            <div className="absolute bottom-[40%] right-[-24px] w-6 h-[calc(50%+64px)] border-b border-r border-border dark:border-white/10 group-hover/match:border-[#00c6ff]/30 rounded-br-xl -z-10 transition-colors" />
                         )}
                      </div>
                    );
                  })}
               </div>

               {/* SF Column */}
               <div className="flex flex-col justify-around gap-16 py-48 shrink-0">
                  <div className="text-[10px] uppercase font-bold text-[#00c6ff] tracking-widest pb-2 border-b border-border dark:border-white/10 mb-2 mt-[-192px]">Semi-Finals</div>
                  {simResults.mockTournament.sf.map((m: any, i: number) => {
                    const home = getTeam(m.home);
                    const away = getTeam(m.away);
                    const isHomeWinner = m.winner === m.home;
                    const isAwayWinner = m.winner === m.away;
                    const homeBg = isHomeWinner ? "bg-gradient-to-r from-blue-500/10 to-blue-500/25 border border-blue-500/35" : "bg-black/[0.02] dark:bg-white/[0.02] border border-transparent opacity-60";
                    const awayBg = isAwayWinner ? "bg-gradient-to-r from-blue-500/10 to-blue-500/25 border border-blue-500/35" : "bg-black/[0.02] dark:bg-white/[0.02] border border-transparent opacity-60";

                    return (
                      <div key={i} className="relative group/match">
                         <div className="absolute top-[60%] left-[-24px] w-6 h-px bg-border dark:bg-white/10 group-hover/match:bg-[#00c6ff]/30 -z-10 transition-colors" />
                         <div className="flex flex-col w-56 rounded-xl overflow-hidden shadow-sm dark:shadow-lg border border-border dark:border-white/10 bg-background dark:bg-[#070c1b] hover:border-[#00c6ff]/40 hover:scale-[1.02] transition-all duration-300 group shrink-0 relative">
                            <div className="bg-black/5 dark:bg-black/40 px-3 py-1.5 text-[9px] font-bold text-[#00c6ff] tracking-widest uppercase flex justify-between border-b border-border dark:border-white/5">
                               <span>SF MATCH {i + 1}</span>
                            </div>
                            <div className="flex flex-col p-1 gap-1">
                               <div className={`flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${homeBg}`}>
                                  <div className="flex items-center gap-2 overflow-hidden">
                                     <span className="text-sm drop-shadow-md select-none">{home.flag}</span>
                                     <span className="text-[11px] font-bold text-foreground dark:text-white truncate w-24">{home.name}</span>
                                     {isHomeWinner && <Check className="w-3.5 h-3.5 text-[#00c6ff] shrink-0" />}
                                  </div>
                                  <span className="text-xs font-mono font-bold text-foreground dark:text-white bg-black/5 dark:bg-black/60 px-2 py-0.5 rounded">{m.hs}</span>
                               </div>
                               <div className={`flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${awayBg}`}>
                                  <div className="flex items-center gap-2 overflow-hidden">
                                     <span className="text-sm drop-shadow-md select-none">{away.flag}</span>
                                     <span className="text-[11px] font-bold text-foreground dark:text-white truncate w-24">{away.name}</span>
                                     {isAwayWinner && <Check className="w-3.5 h-3.5 text-[#00c6ff] shrink-0" />}
                                  </div>
                                  <span className="text-xs font-mono font-bold text-foreground dark:text-white bg-black/5 dark:bg-black/60 px-2 py-0.5 rounded">{m.as}</span>
                               </div>
                            </div>
                         </div>
                         {/* Connectors */}
                         {(i % 2 === 0) ? (
                            <div className="absolute top-[60%] right-[-24px] w-6 h-[calc(50%+160px)] border-t border-r border-border dark:border-white/10 group-hover/match:border-[#00c6ff]/30 rounded-tr-xl -z-10 transition-colors" />
                         ) : (
                            <div className="absolute bottom-[40%] right-[-24px] w-6 h-[calc(50%+160px)] border-b border-r border-border dark:border-white/10 group-hover/match:border-[#00c6ff]/30 rounded-br-xl -z-10 transition-colors" />
                         )}
                      </div>
                    );
                  })}
               </div>

               {/* Final Column */}
               <div className="flex flex-col justify-center gap-8 relative shrink-0">
                  <div className="absolute top-1/2 left-[-24px] w-6 h-px bg-border dark:bg-white/10 -z-10" />
                  
                  {/* High fidelity Champion Showcase */}
                  <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-[#1e1b4b]/20 dark:from-[#1e1b4b]/80 to-[#311042]/20 dark:to-[#311042]/80 rounded-3xl border border-yellow-500/20 shadow-[0_0_30px_rgba(234,179,8,0.1)] relative z-20 hover:border-yellow-500/50 transition-all duration-500 group">
                     <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl" />
                     <Trophy className="w-20 h-20 text-yellow-500 dark:text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)] mb-4 animate-float" />
                     <div className="text-[10px] font-bold text-yellow-600 dark:text-yellow-500 tracking-widest uppercase mb-2">World Cup Champion</div>
                     <div className="flex items-center gap-3 mt-2">
                        <span className="text-4xl drop-shadow-md select-none">{getTeam(simResults.mockTournament.final.winner).flag}</span>
                        <span className="text-2xl font-black text-foreground dark:text-white tracking-tight">{getTeam(simResults.mockTournament.final.winner).name}</span>
                     </div>
                  </div>

                  <div className="mt-8 relative">
                     <div className="text-[10px] uppercase font-bold text-yellow-600 dark:text-yellow-500 tracking-widest pb-2 border-b border-border dark:border-white/10 mb-4 text-center">World Cup Final</div>
                     
                     {/* Final Match Card */}
                     <div className="flex flex-col w-56 rounded-xl overflow-hidden shadow-sm dark:shadow-lg border border-yellow-500/30 bg-background dark:bg-[#070c1b] hover:border-yellow-500/60 hover:scale-[1.02] transition-all duration-300 group shrink-0 relative">
                        <div className="bg-black/5 dark:bg-black/60 px-3 py-1.5 text-[9px] font-bold text-yellow-600 dark:text-yellow-500 tracking-widest uppercase flex justify-between border-b border-border dark:border-white/5">
                           <span>FINAL</span>
                        </div>
                        <div className="flex flex-col p-1 gap-1">
                           <div className={`flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${simResults.mockTournament.final.winner === simResults.mockTournament.final.home ? "bg-gradient-to-r from-yellow-500/10 to-yellow-500/25 border border-yellow-500/40" : "bg-black/[0.02] dark:bg-white/[0.02] border border-transparent opacity-60"}`}>
                              <div className="flex items-center gap-2 overflow-hidden">
                                 <span className="text-sm drop-shadow-md select-none">{getTeam(simResults.mockTournament.final.home).flag}</span>
                                 <span className="text-[11px] font-bold text-foreground dark:text-white truncate w-24">{getTeam(simResults.mockTournament.final.home).name}</span>
                                 {simResults.mockTournament.final.winner === simResults.mockTournament.final.home && <Check className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400 shrink-0" />}
                              </div>
                              <span className="text-xs font-mono font-bold text-foreground dark:text-white bg-black/5 dark:bg-black/60 px-2 py-0.5 rounded">{simResults.mockTournament.final.hs}</span>
                           </div>
                           <div className={`flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${simResults.mockTournament.final.winner === simResults.mockTournament.final.away ? "bg-gradient-to-r from-yellow-500/10 to-yellow-500/25 border border-yellow-500/40" : "bg-black/[0.02] dark:bg-white/[0.02] border border-transparent opacity-60"}`}>
                              <div className="flex items-center gap-2 overflow-hidden">
                                 <span className="text-sm drop-shadow-md select-none">{getTeam(simResults.mockTournament.final.away).flag}</span>
                                 <span className="text-[11px] font-bold text-foreground dark:text-white truncate w-24">{getTeam(simResults.mockTournament.final.away).name}</span>
                                 {simResults.mockTournament.final.winner === simResults.mockTournament.final.away && <Check className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400 shrink-0" />}
                              </div>
                              <span className="text-xs font-mono font-bold text-foreground dark:text-white bg-black/5 dark:bg-black/60 px-2 py-0.5 rounded">{simResults.mockTournament.final.as}</span>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog: Futuristic Styled Modal */}
      <Dialog open={showConfirmPopup} onOpenChange={(open) => {
        if (!isSimulating) setShowConfirmPopup(open);
      }}>
        <DialogContent className="glass-strong border-white/10 text-foreground max-w-md rounded-3xl shadow-2xl overflow-hidden p-0">
          <div className="absolute top-0 right-0 w-32 h-32 bg-neon/10 rounded-full filter blur-xl pointer-events-none" />
          <div className="p-6 relative z-10">
            <DialogHeader>
              <DialogTitle className="text-xl font-display font-extrabold flex items-center gap-3 text-white">
                {isSimulating ? (
                   <Sparkles className="w-6 h-6 text-neon animate-pulse" />
                ) : (
                   <AlertCircle className="w-6 h-6 text-neon" />
                )}
                <span>{isSimulating ? "Running Simulation..." : "Confirm Simulation Setup"}</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {isSimulating ? (
                <div className="flex flex-col gap-4 py-4">
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-bold text-white">Processing paths for {selectedTeam.name}</span>
                    <span className="text-xl font-mono text-neon font-bold">{simProgress}%</span>
                  </div>
                  <Progress value={simProgress} className="h-3" />
                  <p className="text-xs text-muted-foreground mt-2">
                    Running Monte Carlo engine ({simProgress * 10} / 1000 iterations)...
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    You are about to launch <span className="font-extrabold text-white">{selectedTeam.name}'s</span> path to glory projection metrics.
                  </p>
                  <div className="flex gap-3 items-start text-xs text-yellow-500/90 bg-yellow-500/5 p-4.5 rounded-2xl border border-yellow-500/15">
                    <Sparkles className="w-5 h-5 shrink-0 text-yellow-500 mt-0.5 animate-pulse" />
                    <div>
                      <span className="font-bold block text-yellow-400 mb-0.5">Computational Processing Required</span>
                      This runs 1,000 complete tournament paths based on model settings to yield exact statistical outcomes.
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-5 border-t border-white/5 mt-6">
                    <button 
                      onClick={() => setShowConfirmPopup(false)}
                      className="px-5 py-2.5 rounded-xl text-sm font-bold border border-white/10 hover:bg-white/5 hover:border-white/20 transition-all text-white"
                      disabled={isSimulating}
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => {
                        runSimulations();
                      }}
                      disabled={isSimulating}
                      className="px-5 py-2.5 rounded-xl text-sm font-black bg-gradient-to-r from-neon to-neon-2 text-black hover:scale-[1.02] active:scale-95 transition-all shadow-md disabled:opacity-50"
                    >
                      Run Simulation
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
