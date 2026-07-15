"use client";

import { useEffect, useState, useMemo } from "react";
import { useSimulationStore, PlayerStats, TeamStats } from "@/lib/store/simulationStore";
import { ArrowLeft, User, Image as ImageIcon, Save, Check, X, Info, Lock, Brain, Cpu, Sparkles, ChevronDown, ChevronUp, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTeams } from "@/components/TeamsProvider";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { UpgradeModal } from "@/components/site/UpgradeModal";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function TeamDetailsClient({
  teamCode,
  flagMap,
  initialTeams,
  initialPlayers
}: {
  teamCode: string,
  flagMap: Record<string, string>,
  initialTeams: TeamStats[],
  initialPlayers: PlayerStats[]
}) {
  const { isInitialized, teams, players, updateTeam, updatePlayer, initializeData } = useSimulationStore();
  const appTeams = useTeams();
  const [mounted, setMounted] = useState(false);
  const [capabilitiesExpanded, setCapabilitiesExpanded] = useState(false);

  // State for the Player Edit Modal
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [showAllStats, setShowAllStats] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<"plus" | "pro">("plus");

  // States for Editable Team Ratings
  const [elo, setElo] = useState<number>(0);
  const [attack, setAttack] = useState<number>(0);
  const [defense, setDefense] = useState<number>(0);
  const [isSavingTeam, setIsSavingTeam] = useState(false);
  const [isSavingPlayer, setIsSavingPlayer] = useState(false);
  const { data: session } = useSession();
  const subTier = session?.user?.subscriptionTier || "free";
  const router = useRouter();

  const canEditTeam = subTier === "free" || subTier === "plus" || subTier === "pro";

  const appTeam = appTeams.find((t) => t.code === teamCode);

  const formatRating = (val: number | undefined | null) => {
    if (val === undefined || val === null) return "-";
    if (val < 10) {
      const minM = 0.75;
      const maxM = 1.10;
      const minR = 50;
      const maxR = 95;
      const rating = ((val - minM) / (maxM - minM)) * (maxR - minR) + minR;
      return Math.max(15, Math.min(99, Math.round(rating)));
    }
    return Math.round(val);
  };

  useEffect(() => {
    setMounted(true);
    initializeData(initialTeams, initialPlayers);
  }, [initializeData, initialTeams, initialPlayers]);

  useEffect(() => {
    if (appTeam) {
      setElo(Math.round(appTeam.elo));
      // Get the formatted representation (integer 15-99 scale)
      const initialAttack = appTeam.attack >= 10 ? Math.round(appTeam.attack) : Number(formatRating(appTeam.attack));
      const initialDefense = appTeam.defense >= 10 ? Math.round(appTeam.defense) : Number(formatRating(appTeam.defense));
      setAttack(initialAttack);
      setDefense(initialDefense);
    }
  }, [appTeam]);

  const team = teams[teamCode];

  const teamPlayers = useMemo(() => {
    const sourcePlayers = Object.keys(players).length > 0 ? Object.values(players) : initialPlayers;
    return sourcePlayers
      .filter(p => p["Team Code"] === teamCode)
      .sort((a, b) => {
        const ratingA = parseInt(a["Overall Rating"]?.replace("%", "") || "0");
        const ratingB = parseInt(b["Overall Rating"]?.replace("%", "") || "0");
        return ratingB - ratingA;
      });
  }, [players, teamCode, initialPlayers]);

  const topPlayer = teamPlayers[0];

  const hasChanges = appTeam ? (
    elo !== Math.round(appTeam.elo) ||
    attack !== (appTeam.attack >= 10 ? Math.round(appTeam.attack) : Number(formatRating(appTeam.attack))) ||
    defense !== (appTeam.defense >= 10 ? Math.round(appTeam.defense) : Number(formatRating(appTeam.defense)))
  ) : false;

  const handleSaveTeam = async () => {
    if (!session?.user?.id) {
      toast.error("Please sign in to save your progress!");
      return;
    }

    setIsSavingTeam(true);
    try {
      const response = await fetch("/api/user/save-team", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teamCode,
          elo,
          attack,
          defense,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save team progress");
      }
      updateTeam(teamCode, "elo" as any, String(elo));
      updateTeam(teamCode, "attack" as any, String(attack));
      updateTeam(teamCode, "defense" as any, String(defense));
      updateTeam(teamCode, "isCustom" as any, true as any);

      toast.success("Team ratings saved successfully!");
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Something went wrong while saving team ratings.");
    } finally {
      setIsSavingTeam(false);
    }
  };

  const selectedPlayer = selectedPlayerId ? players[selectedPlayerId] : null;
  const isTopPlayer = selectedPlayer && topPlayer && (selectedPlayer["Player Name"] === topPlayer["Player Name"] && selectedPlayer["Team Code"] === topPlayer["Team Code"]);
  const canEditPlayer = subTier === "pro" || (subTier === "plus" && isTopPlayer);

  const handleSavePlayer = async () => {
    if (!selectedPlayer) return;
    if (!session?.user?.id) {
      toast.error("Please sign in to save player ratings!");
      return;
    }

    setIsSavingPlayer(true);
    try {
      const playerKey = `${selectedPlayer["Team Code"]}-${selectedPlayer["Player Name"]}`;
      const response = await fetch("/api/user/save-player", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerKey,
          overallRating: selectedPlayer["Overall Rating"] || "0",
          baseQuality: selectedPlayer["Base Quality"] || "0",
          recentForm: selectedPlayer["Recent Form"] || "0",
          intlExperience: selectedPlayer["International Experience"] || "0",
          attackingImpact: selectedPlayer["Attacking Impact"] || "0",
          defensiveImpact: selectedPlayer["Defensive Impact"] || "0",
          passingCreativity: selectedPlayer["Passing / Creativity"] || "0",
          fitnessAvailability: selectedPlayer["Fitness / Availability"] || "0",
          disciplineRisk: selectedPlayer["Discipline Risk"] || "0",
          matchImportance: selectedPlayer["Match Importance"] || "0",
          ratingTier: selectedPlayer["Rating Tier"] || "0",
          imageUrl: selectedPlayer.ImageUrl || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save player progress");
      }

      toast.success(`${selectedPlayer["Player Name"]} stats saved successfully!`);
      setSelectedPlayerId(null);
      setShowAllStats(false);
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Something went wrong while saving player ratings.");
    } finally {
      setIsSavingPlayer(false);
    }
  };

  const handlePlayerEdit = (field: keyof PlayerStats, value: string) => {
    if (selectedPlayerId) {
      updatePlayer(selectedPlayerId, field, value);
    }
  };

  if (!mounted || !isInitialized) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-foreground">Team not found</h2>
        <Link
          href="/teams"
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-700 shadow-[0_6px_18px_rgba(15,23,42,0.08)] transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Link>
      </div>
    );
  }
  const topPlayerName = topPlayer ? (topPlayer["Name on Shirt"] || topPlayer["Player Name"]) : "";
  const topPlayerRating = topPlayer ? (topPlayer["Overall Rating"] || "") : "";
  const topPlayerDisp = topPlayerName ? `${topPlayerName} (${topPlayerRating})` : "N/A";

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      <Link
        href="/teams"
        className="mb-8 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-700 shadow-[0_6px_18px_rgba(15,23,42,0.08)] transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back</span>
      </Link>

      {/* Team Header & Editable Stats */}
      <div className="glass-strong rounded-2xl p-8 mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-8">
          <div className="flex items-center space-x-6">
            <CountryFlag
              code={teamCode}
              flag={flagMap[teamCode]}
              name={team.Team}
              className="h-12 w-18 rounded-md shadow-md object-cover flex-shrink-0"
              emojiClassName="text-6xl leading-none drop-shadow-lg"
            />
            <div>
              <h1 className="text-4xl font-extrabold text-foreground tracking-tight">{team.Team}</h1>
              <p className="text-lg text-muted-foreground">{team["Team Code"]} &bull; {team.Players} Players</p>
            </div>
          </div>
          <div>
            <button
              onClick={handleSaveTeam}
              disabled={isSavingTeam || !canEditTeam}
              className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 ${hasChanges && canEditTeam
                  ? "bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:shadow-[0_0_25px_rgba(239,68,68,0.6)]"
                  : "bg-gradient-to-r from-neon via-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(0,255,255,0.4)] hover:shadow-[0_0_25px_rgba(0,255,255,0.6)]"
                }`}
            >
              {isSavingTeam ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{hasChanges ? "Save Changes" : "Save Team Progress"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-background/30 p-4 rounded-xl border border-white/5 space-y-2">
            <Label htmlFor="team-elo" className="text-[10px] uppercase tracking-wider text-muted-foreground">Elo Rating</Label>
            <Input
              id="team-elo"
              type="number"
              value={elo || ""}
              onChange={(e) => setElo(Number(e.target.value))}
              disabled={!canEditTeam}
              className="bg-background/50 border-white/10 text-2xl font-bold text-foreground font-mono h-12 focus-visible:ring-neon"
            />
          </div>
          <div className="bg-background/30 p-4 rounded-xl border border-white/5 space-y-2">
            <Label htmlFor="team-attack" className="text-[10px] uppercase tracking-wider text-muted-foreground">Attack Rating (Att)</Label>
            <Input
              id="team-attack"
              type="number"
              value={attack || ""}
              onChange={(e) => setAttack(Number(e.target.value))}
              disabled={!canEditTeam}
              className="bg-background/50 border-white/10 text-2xl font-bold text-foreground font-mono h-12 focus-visible:ring-neon"
            />
          </div>
          <div className="bg-background/30 p-4 rounded-xl border border-white/5 space-y-2">
            <Label htmlFor="team-defense" className="text-[10px] uppercase tracking-wider text-muted-foreground">Defense Rating (Def)</Label>
            <Input
              id="team-defense"
              type="number"
              value={defense || ""}
              onChange={(e) => setDefense(Number(e.target.value))}
              disabled={!canEditTeam}
              className="bg-background/50 border-white/10 text-2xl font-bold text-foreground font-mono h-12 focus-visible:ring-neon"
            />
          </div>
          <div className="bg-background/30 p-4 rounded-xl border border-white/5 space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Top Rated Player</div>
            <div className="flex items-center gap-3 pt-2">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-background/80 dark:border-white/10">
                {topPlayer?.ImageUrl ? (
                  <img
                    src={topPlayer.ImageUrl}
                    alt={topPlayer["Player Name"]}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <div className="truncate text-lg font-bold text-neon" title={topPlayerDisp}>
                  {topPlayerName || "N/A"}{" "}
                  {topPlayerRating && (
                    <span className="text-xs text-muted-foreground font-sans">({topPlayerRating})</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {topPlayer?.Club || "Top squad rating"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {!session?.user?.id && (
          <div className="mt-6 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-center justify-between">
            <span className="flex items-center">
              ⚠️ You are not signed in. Any rating overrides will not be saved to the database. Sign in to customize.
            </span>
          </div>
        )}
      </div>

      {/* Plan Capabilities Accordion */}
      <div className="rounded-[2rem] border border-slate-200/80 bg-white/80 shadow-[0_20px_50px_rgba(15,23,42,0.06)] backdrop-blur-md dark:border-white/5 dark:bg-slate-900/60 overflow-hidden mb-12 animate-in fade-in duration-500">
        <button
          onClick={() => setCapabilitiesExpanded(!capabilitiesExpanded)}
          className="w-full p-5 text-left transition-colors hover:bg-slate-500/[0.01] sm:p-6"
        >
          <div className="flex flex-col gap-4 min-[500px]:flex-row min-[500px]:items-start min-[500px]:justify-between">
            <div className="flex flex-col gap-3 min-[500px]:flex-row min-[500px]:items-start">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/15 text-cyan-650 dark:text-neon border border-cyan-500/20">
                <Info className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-lg font-black text-slate-900 dark:text-white">
                  Plan Customization & Simulation Capabilities
                </h3>
                <p className="max-w-xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  Compare what you can edit, view, and simulate across Free, Advanced, and Expert Predictor tiers
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 w-full min-[500px]:w-auto min-[500px]:justify-end">
              <div className="min-w-0 min-[500px]:text-right">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase block tracking-wider">Current Plan</span>
                <span className={`mt-1 inline-flex max-w-full items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${subTier === "pro"
                  ? "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950/60 dark:text-fuchsia-400 border border-fuchsia-500/20 shadow-[0_0_12px_rgba(217,70,239,0.15)]"
                  : subTier === "plus"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.15)]"
                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                  }`}>
                  {subTier === "pro" ? "Expert Predictor" : subTier === "plus" ? "Advanced Predictor" : "Free Predictor"}
                </span>
              </div>
              {capabilitiesExpanded ? (
                <ChevronUp className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              )}
            </div>
          </div>
        </button>

        {capabilitiesExpanded && (
          <div className="border-t border-slate-200/60 dark:border-white/5 p-6 bg-slate-500/[0.01] animate-in slide-in-from-top duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Free Predictor Column */}
              <div className={`group relative overflow-hidden rounded-[2rem] border p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-lg ${subTier === "free"
                  ? "border-emerald-500/40 bg-emerald-50/25 dark:border-emerald-500/30 dark:bg-emerald-500/[0.04] shadow-[0_0_30px_rgba(16,185,129,0.12)] hover:border-emerald-500/55"
                  : "border-emerald-200/60 bg-emerald-50/[0.08] dark:border-emerald-500/10 dark:bg-emerald-500/[0.01] hover:border-emerald-500/30 hover:bg-emerald-50/15 dark:hover:bg-emerald-500/[0.02] hover:shadow-lg hover:shadow-emerald-500/[0.02]"
                }`}>
                {/* Background Watermark */}
                <span className="absolute -right-4 -bottom-6 font-display text-9xl font-black text-emerald-500/[0.04] dark:text-emerald-500/[0.02] select-none pointer-events-none">
                  01
                </span>

                <div className="relative z-10">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-450">
                        Free
                      </span>
                      {subTier === "free" && (
                        <span className="text-[9px] font-black uppercase bg-emerald-500 text-white px-2 py-0.5 rounded-full shadow-sm animate-pulse">Active</span>
                      )}
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <Cpu className="h-5 w-5" />
                    </div>
                  </div>

                  <h3 className="mt-3 font-display text-xl font-bold text-slate-900 dark:text-white">
                    Free Predictor
                  </h3>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Basic team-level ratings edits and base match predictions.
                  </p>

                  <div className="mt-6 space-y-3">
                    <div className="flex flex-col gap-2 p-3 rounded-xl bg-white/40 dark:bg-slate-950/40 border border-slate-200/40 dark:border-white/[0.02] shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-450">
                          <Check className="h-3 w-3" />
                        </span>
                        <strong className="text-xs font-bold text-slate-900 dark:text-slate-250">Team Rating Edits</strong>
                      </div>
                      <ul className="pl-5.5 space-y-1 text-slate-500 dark:text-slate-400 text-[11px] list-none leading-relaxed">
                        <li className="flex items-start gap-1.5">
                          <ChevronRight className="h-3 w-3 text-emerald-500/70 dark:text-emerald-400/80 shrink-0 mt-0.5" />
                          <span>Edit Elo ratings</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <ChevronRight className="h-3 w-3 text-emerald-500/70 dark:text-emerald-400/80 shrink-0 mt-0.5" />
                          <span>Edit Attack ratings (Att)</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <ChevronRight className="h-3 w-3 text-emerald-500/70 dark:text-emerald-400/80 shrink-0 mt-0.5" />
                          <span>Edit Defense ratings (Def)</span>
                        </li>
                      </ul>
                    </div>

                    <div className="flex flex-col gap-2 p-3 rounded-xl bg-white/40 dark:bg-slate-950/40 border border-slate-200/40 dark:border-white/[0.02] shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-455">
                          <Check className="h-3 w-3" />
                        </span>
                        <strong className="text-xs font-bold text-slate-900 dark:text-slate-250">Standard Visibility</strong>
                      </div>
                      <ul className="pl-5.5 space-y-1 text-slate-500 dark:text-slate-400 text-[11px] list-none leading-relaxed">
                        <li className="flex items-start gap-1.5">
                          <ChevronRight className="h-3 w-3 text-emerald-500/70 dark:text-emerald-400/80 shrink-0 mt-0.5" />
                          <span>Access team rankings</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <ChevronRight className="h-3 w-3 text-emerald-500/70 dark:text-emerald-400/80 shrink-0 mt-0.5" />
                          <span>Access player rankings</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <ChevronRight className="h-3 w-3 text-emerald-500/70 dark:text-emerald-400/80 shrink-0 mt-0.5" />
                          <span>Detailed player profiles are blurred</span>
                        </li>
                      </ul>
                    </div>

                    <div className="flex flex-col gap-2 p-3 rounded-xl bg-white/40 dark:bg-slate-950/40 border border-slate-200/40 dark:border-white/[0.02] shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-455">
                          <Check className="h-3 w-3" />
                        </span>
                        <strong className="text-xs font-bold text-slate-900 dark:text-slate-250">Base Simulation Engine</strong>
                      </div>
                      <ul className="pl-5.5 space-y-1 text-slate-500 dark:text-slate-400 text-[11px] list-none leading-relaxed">
                        <li className="flex items-start gap-1.5">
                          <ChevronRight className="h-3 w-3 text-emerald-500/70 dark:text-emerald-400/80 shrink-0 mt-0.5" />
                          <span>Base simulation model access</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <ChevronRight className="h-3 w-3 text-emerald-500/70 dark:text-emerald-400/80 shrink-0 mt-0.5" />
                          <span>Capped at 5 free runs total</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced Predictor Column */}
              <div className={`group relative overflow-hidden rounded-[2rem] border p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-lg ${subTier === "plus"
                  ? "border-blue-500/40 bg-blue-50/25 dark:border-blue-500/30 dark:bg-blue-500/[0.04] shadow-[0_0_30px_rgba(59,130,246,0.12)] hover:border-blue-500/55"
                  : "border-blue-200/60 bg-blue-50/[0.08] dark:border-blue-500/10 dark:bg-blue-500/[0.01] hover:border-blue-500/30 hover:bg-blue-50/15 dark:hover:bg-blue-500/[0.02] hover:shadow-lg hover:shadow-blue-500/[0.02]"
                }`}>
                {/* Background Watermark */}
                <span className="absolute -right-4 -bottom-6 font-display text-9xl font-black text-blue-500/[0.04] dark:text-blue-500/[0.02] select-none pointer-events-none">
                  02
                </span>

                <div className="relative z-10">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                        Advanced
                      </span>
                      <span className="text-[9px] font-bold uppercase bg-blue-150/40 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/10">
                        Free features included
                      </span>
                      {subTier === "plus" && (
                        <span className="text-[9px] font-black uppercase bg-blue-500 text-white px-2 py-0.5 rounded-full shadow-sm animate-pulse">Active</span>
                      )}
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      <Brain className="h-5 w-5" />
                    </div>
                  </div>

                  <h3 className="mt-3 font-display text-xl font-bold text-slate-900 dark:text-white">
                    Advanced Predictor
                  </h3>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Squad averages adjustments and Top Player override controls.
                  </p>

                  <div className="mt-6 space-y-3">
                    <div className="flex flex-col gap-2 p-3 rounded-xl bg-white/40 dark:bg-slate-950/40 border border-slate-200/40 dark:border-white/[0.02] shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                          <Check className="h-3 w-3" />
                        </span>
                        <strong className="text-xs font-bold text-slate-900 dark:text-slate-255">Top Player Overrides</strong>
                      </div>
                      <ul className="pl-5.5 space-y-1 text-slate-500 dark:text-slate-400 text-[11px] list-none leading-relaxed">
                        <li className="flex items-start gap-1.5">
                          <ChevronRight className="h-3 w-3 text-blue-500/70 dark:text-blue-400/80 shrink-0 mt-0.5" />
                          <span>Edit overall rating</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <ChevronRight className="h-3 w-3 text-blue-500/70 dark:text-blue-400/80 shrink-0 mt-0.5" />
                          <span>Edit form shifts</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <ChevronRight className="h-3 w-3 text-blue-500/70 dark:text-blue-400/80 shrink-0 mt-0.5" />
                          <span>Edit player stats</span>
                        </li>
                        {/* <li className="flex items-start gap-1.5">
                          <ChevronRight className="h-3 w-3 text-blue-500/70 dark:text-blue-400/80 shrink-0 mt-0.5" />
                          <span>Edit profile image URL</span>
                        </li> */}
                      </ul>
                    </div>

                    <div className="flex flex-col gap-2 p-3 rounded-xl bg-white/40 dark:bg-slate-950/40 border border-slate-200/40 dark:border-white/[0.02] shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-650 dark:bg-blue-500/20 dark:text-blue-400">
                          <Check className="h-3 w-3" />
                        </span>
                        <strong className="text-xs font-bold text-slate-900 dark:text-slate-255">Full Data Visibility</strong>
                      </div>
                      <ul className="pl-5.5 space-y-1 text-slate-500 dark:text-slate-400 text-[11px] list-none leading-relaxed">
                        <li className="flex items-start gap-1.5">
                          <ChevronRight className="h-3 w-3 text-blue-500/70 dark:text-blue-400/80 shrink-0 mt-0.5" />
                          <span>Unblurred player profile stats</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <ChevronRight className="h-3 w-3 text-blue-500/70 dark:text-blue-400/80 shrink-0 mt-0.5" />
                          <span>Detailed player rating summaries</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <ChevronRight className="h-3 w-3 text-blue-500/70 dark:text-blue-400/80 shrink-0 mt-0.5" />
                          <span>Unrestricted team/player lists</span>
                        </li>
                      </ul>
                    </div>

                    <div className="flex flex-col gap-2 p-3 rounded-xl bg-white/40 dark:bg-slate-950/40 border border-slate-200/40 dark:border-white/[0.02] shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-655 dark:bg-blue-500/20 dark:text-blue-400">
                          <Check className="h-3 w-3" />
                        </span>
                        <strong className="text-xs font-bold text-slate-900 dark:text-slate-255">Advanced Engine</strong>
                      </div>
                      <ul className="pl-5.5 space-y-1 text-slate-500 dark:text-slate-400 text-[11px] list-none leading-relaxed">
                        <li className="flex items-start gap-1.5">
                          <ChevronRight className="h-3 w-3 text-blue-500/70 dark:text-blue-400/80 shrink-0 mt-0.5" />
                          <span>Squad analytics integration</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <ChevronRight className="h-3 w-3 text-blue-500/70 dark:text-blue-400/80 shrink-0 mt-0.5" />
                          <span>Unlimited bracket simulations</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expert Predictor Column */}
              <div className={`group relative overflow-hidden rounded-[2rem] border p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-lg ${subTier === "pro"
                  ? "border-fuchsia-500/40 bg-fuchsia-50/25 dark:border-fuchsia-500/30 dark:bg-fuchsia-500/[0.04] shadow-[0_0_30px_rgba(217,70,239,0.12)] hover:border-fuchsia-500/55"
                  : "border-fuchsia-200/60 bg-fuchsia-50/[0.08] dark:border-fuchsia-500/10 dark:bg-fuchsia-500/[0.01] hover:border-fuchsia-500/30 hover:bg-fuchsia-50/15 dark:hover:bg-fuchsia-500/[0.02] hover:shadow-lg hover:shadow-fuchsia-500/[0.02]"
                }`}>
                {/* Background Watermark */}
                <span className="absolute -right-4 -bottom-6 font-display text-9xl font-black text-fuchsia-500/[0.04] dark:text-fuchsia-500/[0.02] select-none pointer-events-none">
                  03
                </span>

                <div className="relative z-10">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-fuchsia-600 dark:text-fuchsia-400">
                        Expert
                      </span>
                      <span className="text-[9px] font-bold uppercase bg-fuchsia-150/40 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-300 px-2 py-0.5 rounded-full border border-fuchsia-500/10">
                        Free + Advanced features
                      </span>
                      {subTier === "pro" && (
                        <span className="text-[9px] font-black uppercase bg-fuchsia-500 text-white px-2 py-0.5 rounded-full shadow-sm animate-pulse">Active</span>
                      )}
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-fuchsia-500/10 dark:bg-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-400 border border-fuchsia-500/20">
                      <Sparkles className="h-5 w-5" />
                    </div>
                  </div>

                  <h3 className="mt-3 font-display text-xl font-bold text-slate-900 dark:text-white">
                    Expert Predictor
                  </h3>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Complete squad control, active line-up edits, and Pro model simulations.
                  </p>

                  <div className="mt-6 space-y-3">
                    <div className="flex flex-col gap-2 p-3 rounded-xl bg-white/40 dark:bg-slate-950/40 border border-slate-200/40 dark:border-white/[0.02] shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/10 text-fuchsia-600 dark:bg-fuchsia-500/20 dark:text-fuchsia-400">
                          <Check className="h-3 w-3" />
                        </span>
                        <strong className="text-xs font-bold text-slate-900 dark:text-slate-255">Full Roster Control</strong>
                      </div>
                      <ul className="pl-5.5 space-y-1 text-slate-500 dark:text-slate-400 text-[11px] list-none leading-relaxed">
                        <li className="flex items-start gap-1.5">
                          <ChevronRight className="h-3 w-3 text-fuchsia-500/70 dark:text-fuchsia-400/80 shrink-0 mt-0.5" />
                          <span>Edit ratings for all roster players</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <ChevronRight className="h-3 w-3 text-fuchsia-500/70 dark:text-fuchsia-400/80 shrink-0 mt-0.5" />
                          <span>Edit form shifts for all players</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <ChevronRight className="h-3 w-3 text-fuchsia-500/70 dark:text-fuchsia-400/80 shrink-0 mt-0.5" />
                          <span>Edit profile images for all players</span>
                        </li>
                      </ul>
                    </div>

                    <div className="flex flex-col gap-2 p-3 rounded-xl bg-white/40 dark:bg-slate-950/40 border border-slate-200/40 dark:border-white/[0.02] shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/10 text-fuchsia-600 dark:bg-fuchsia-500/20 dark:text-fuchsia-400">
                          <Check className="h-3 w-3" />
                        </span>
                        <strong className="text-xs font-bold text-slate-900 dark:text-slate-255">Full Parameter Control</strong>
                      </div>
                      <ul className="pl-5.5 space-y-1 text-slate-500 dark:text-slate-400 text-[11px] list-none leading-relaxed">
                        <li className="flex items-start gap-1.5">
                          <ChevronRight className="h-3 w-3 text-fuchsia-500/70 dark:text-fuchsia-400/80 shrink-0 mt-0.5" />
                          <span>Edit overall rating, base quality, form, and intl experience</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <ChevronRight className="h-3 w-3 text-fuchsia-500/70 dark:text-fuchsia-400/80 shrink-0 mt-0.5" />
                          <span>Customize attacking/defending impact, passing, and discipline risk</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <ChevronRight className="h-3 w-3 text-fuchsia-500/70 dark:text-fuchsia-400/80 shrink-0 mt-0.5" />
                          <span>Modify match importance, rating tier, and active roster selections (in/out)</span>
                        </li>
                      </ul>
                    </div>

                    <div className="flex flex-col gap-2 p-3 rounded-xl bg-white/40 dark:bg-slate-950/40 border border-slate-200/40 dark:border-white/[0.02] shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/10 text-fuchsia-600 dark:bg-fuchsia-500/20 dark:text-fuchsia-400">
                          <Check className="h-3 w-3" />
                        </span>
                        <strong className="text-xs font-bold text-slate-900 dark:text-slate-255">Pro Simulation Engine</strong>
                      </div>
                      <ul className="pl-5.5 space-y-1 text-slate-500 dark:text-slate-400 text-[11px] list-none leading-relaxed">
                        <li className="flex items-start gap-1.5">
                          <ChevronRight className="h-3 w-3 text-fuchsia-500/70 dark:text-fuchsia-400/80 shrink-0 mt-0.5" />
                          <span>Pro simulation model access</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <ChevronRight className="h-3 w-3 text-fuchsia-500/70 dark:text-fuchsia-400/80 shrink-0 mt-0.5" />
                          <span>Factor in tactical changes & fitness</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <ChevronRight className="h-3 w-3 text-fuchsia-500/70 dark:text-fuchsia-400/80 shrink-0 mt-0.5" />
                          <span>Unlimited bracket simulations</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Glossary & Legend Card */}
      <div className="glass-strong rounded-2xl border border-slate-200/80 p-6 text-sm text-foreground dark:border-white/10 dark:text-white/90 mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Acronyms Glossary */}
        <div>
          <h3 className="mb-4 flex items-center font-display text-base font-extrabold tracking-tight text-foreground dark:text-white">
            📖 Acronyms Glossary
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1.5">
              <div><strong className="text-neon">Elo</strong>: Team overall strength rating</div>
              <div><strong className="text-neon">Att</strong>: Team Attack rating (scoring potential)</div>
              <div><strong className="text-neon">Def</strong>: Team Defense rating (conceding potential)</div>
              <div><strong className="text-neon">Pos</strong>: Player position code</div>
            </div>
            <div className="space-y-1.5">
              <div><strong className="text-neon">Overall</strong>: Overall player rating (15-99 scale)</div>
              <div><strong className="text-neon">Base Qly</strong>: Player base quality (15-99 scale)</div>
              <div><strong className="text-neon">Form</strong>: Player recent form metric (15-99 scale)</div>
              <div><strong className="text-neon">Intl Exp</strong>: Player international experience rating</div>
            </div>
          </div>
        </div>

        {/* Color Legend */}
        <div>
          <h3 className="mb-4 flex items-center font-display text-base font-extrabold tracking-tight text-foreground dark:text-white">
            🎨 Color Key Legend
          </h3>
          <div className="space-y-3.5 text-xs">
            {/* Ratings Color scale */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground font-semibold">Ratings:</span>
              <span className="bg-green-700 text-green-50 border border-green-600 px-2 py-0.5 rounded font-bold text-[10px]">Elite (80+)</span>
              <span className="bg-green-600/80 text-green-50 border border-green-500/80 px-2 py-0.5 rounded font-bold text-[10px]">Strong (70-79)</span>
              <span className="bg-yellow-600 text-yellow-50 border border-yellow-500 px-2 py-0.5 rounded font-bold text-[10px]">Average (60-69)</span>
              <span className="bg-red-700 text-red-50 border border-red-600 px-2 py-0.5 rounded font-bold text-[10px]">Weak (&lt;60)</span>
            </div>
            {/* Positions Color scale */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground font-semibold">Positions:</span>
              <span className="bg-purple-700 text-purple-50 border border-purple-500 px-2.5 py-0.5 rounded font-bold text-[10px]">Goalkeeper</span>
              <span className="bg-red-700 text-red-50 border border-red-500 px-2.5 py-0.5 rounded font-bold text-[10px]">Defender</span>
              <span className="bg-blue-700 text-blue-50 border border-blue-500 px-2.5 py-0.5 rounded font-bold text-[10px]">Midfielder</span>
              <span className="bg-emerald-700 text-emerald-50 border border-emerald-500 px-2.5 py-0.5 rounded font-bold text-[10px]">Forward</span>
            </div>
          </div>
        </div>
      </div>

      {/* Player Roster */}
      <h2 className="text-2xl font-display font-bold mb-6 flex items-center text-foreground">
        <User className="mr-3 text-neon" />
        Squad Roster
      </h2>

      <div className="glass overflow-x-auto rounded-xl border border-slate-200/80 dark:border-white/10">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="border-b border-slate-200/80 bg-slate-100/80 text-[10px] uppercase tracking-wider text-slate-600 dark:border-white/10 dark:bg-black/40 dark:text-muted-foreground">
            <tr>
              <th className="px-4 py-3 rounded-tl-xl font-medium">Player</th>
              <th className="px-2 py-3 text-center font-medium">Pos</th>
              <th className="px-2 py-3 text-center font-medium">Overall</th>
              <th className="px-2 py-3 text-center font-medium">Base Qly</th>
              <th className="px-2 py-3 text-center font-medium">Form</th>
              <th className="px-2 py-3 text-center font-medium">Intl Exp</th>
              <th className="px-2 py-3 text-center font-medium">Attack</th>
              <th className="px-2 py-3 text-center rounded-tr-xl font-medium">Defense</th>
            </tr>
          </thead>
          <tbody>
            {teamPlayers.map((player) => {
              const pId = `${player["Team Code"]}-${player["Player Name"]}`;

              const getStatColor = (valueStr: string) => {
                const val = parseInt(valueStr?.replace("%", "") || "0");
                if (val >= 80) return "bg-green-700 text-green-50 border-green-600";
                if (val >= 70) return "bg-green-600/80 text-green-50 border-green-500/80";
                if (val >= 60) return "bg-yellow-600 text-yellow-50 border-yellow-500";
                return "bg-red-700 text-red-50 border-red-600";
              };

              const getPositionColor = (pos: string) => {
                if (pos === "GK") return "bg-purple-700 text-purple-50 border-purple-500";
                if (pos === "DEF") return "bg-red-700 text-red-50 border-red-500";
                if (pos === "MID") return "bg-blue-700 text-blue-50 border-blue-500";
                return "bg-emerald-700 text-emerald-50 border-emerald-500"; // FWD
              };

              return (
                <tr
                  key={pId}
                  className="border-b border-slate-200/70 transition-colors dark:border-white/5"
                >
                  <td
                    onClick={() => setSelectedPlayerId(pId)}
                    className="px-4 py-2 flex items-center space-x-3 cursor-pointer hover:bg-slate-100/70 dark:hover:bg-white/5"
                  >
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-background/80 dark:border-white/10">
                      {player.ImageUrl ? (
                        <img src={player.ImageUrl} alt={player["Player Name"]} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-foreground">{player["Name on Shirt"] || player["Player Name"]}</div>
                      <div className="text-[10px] text-muted-foreground">{player.Club}</div>
                    </div>
                  </td>
                  <td
                    onClick={subTier === "free" ? (e) => { e.stopPropagation(); setUpgradeReason("plus"); setUpgradeOpen(true); } : () => setSelectedPlayerId(pId)}
                    className={`px-2 py-2 text-center ${subTier === "free" ? "cursor-pointer hover:bg-slate-200/50 dark:hover:bg-white/10" : "cursor-pointer hover:bg-slate-100/70 dark:hover:bg-white/5"}`}
                  >
                    <span className={`inline-block w-12 py-1 text-[10px] font-bold rounded shadow-sm border ${getPositionColor(player["Position Code"])} ${subTier === "free" ? "blur-[5px] select-none pointer-events-none" : ""}`}>
                      {player["Position Code"]}
                    </span>
                  </td>
                  <td
                    onClick={subTier === "free" ? (e) => { e.stopPropagation(); setUpgradeReason("plus"); setUpgradeOpen(true); } : () => setSelectedPlayerId(pId)}
                    className={`px-2 py-2 text-center ${subTier === "free" ? "cursor-pointer hover:bg-slate-200/50 dark:hover:bg-white/10" : "cursor-pointer hover:bg-slate-100/70 dark:hover:bg-white/5"}`}
                  >
                    <span className={`inline-block w-12 py-1 text-[10px] font-bold rounded shadow-sm border ${getStatColor(player["Overall Rating"])} ${subTier === "free" ? "blur-[5px] select-none pointer-events-none" : ""}`}>
                      {player["Overall Rating"]}
                    </span>
                  </td>
                  <td
                    onClick={subTier === "free" ? (e) => { e.stopPropagation(); setUpgradeReason("plus"); setUpgradeOpen(true); } : () => setSelectedPlayerId(pId)}
                    className={`px-2 py-2 text-center ${subTier === "free" ? "cursor-pointer hover:bg-slate-200/50 dark:hover:bg-white/10" : "cursor-pointer hover:bg-slate-100/70 dark:hover:bg-white/5"}`}
                  >
                    <span className={`inline-block w-12 py-1 text-[10px] font-bold rounded shadow-sm border ${getStatColor(player["Base Quality"])} ${subTier === "free" ? "blur-[5px] select-none pointer-events-none" : ""}`}>
                      {player["Base Quality"]}
                    </span>
                  </td>
                  <td
                    onClick={subTier === "free" ? (e) => { e.stopPropagation(); setUpgradeReason("plus"); setUpgradeOpen(true); } : () => setSelectedPlayerId(pId)}
                    className={`px-2 py-2 text-center ${subTier === "free" ? "cursor-pointer hover:bg-slate-200/50 dark:hover:bg-white/10" : "cursor-pointer hover:bg-slate-100/70 dark:hover:bg-white/5"}`}
                  >
                    <span className={`inline-block w-12 py-1 text-[10px] font-bold rounded shadow-sm border ${getStatColor(player["Recent Form"])} ${subTier === "free" ? "blur-[5px] select-none pointer-events-none" : ""}`}>
                      {player["Recent Form"]}
                    </span>
                  </td>
                  <td
                    onClick={subTier === "free" ? (e) => { e.stopPropagation(); setUpgradeReason("plus"); setUpgradeOpen(true); } : () => setSelectedPlayerId(pId)}
                    className={`px-2 py-2 text-center ${subTier === "free" ? "cursor-pointer hover:bg-slate-200/50 dark:hover:bg-white/10" : "cursor-pointer hover:bg-slate-100/70 dark:hover:bg-white/5"}`}
                  >
                    <span className={`inline-block w-12 py-1 text-[10px] font-bold rounded shadow-sm border ${getStatColor(player["International Experience"])} ${subTier === "free" ? "blur-[5px] select-none pointer-events-none" : ""}`}>
                      {player["International Experience"]}
                    </span>
                  </td>
                  <td
                    onClick={subTier === "free" ? (e) => { e.stopPropagation(); setUpgradeReason("plus"); setUpgradeOpen(true); } : () => setSelectedPlayerId(pId)}
                    className={`px-2 py-2 text-center ${subTier === "free" ? "cursor-pointer hover:bg-slate-200/50 dark:hover:bg-white/10" : "cursor-pointer hover:bg-slate-100/70 dark:hover:bg-white/5"}`}
                  >
                    <span className={`inline-block w-12 py-1 text-[10px] font-bold rounded shadow-sm border ${getStatColor(player["Attacking Impact"])} ${subTier === "free" ? "blur-[5px] select-none pointer-events-none" : ""}`}>
                      {player["Attacking Impact"]}
                    </span>
                  </td>
                  <td
                    onClick={subTier === "free" ? (e) => { e.stopPropagation(); setUpgradeReason("plus"); setUpgradeOpen(true); } : () => setSelectedPlayerId(pId)}
                    className={`px-2 py-2 text-center ${subTier === "free" ? "cursor-pointer hover:bg-slate-200/50 dark:hover:bg-white/10" : "cursor-pointer hover:bg-slate-100/70 dark:hover:bg-white/5"}`}
                  >
                    <span className={`inline-block w-12 py-1 text-[10px] font-bold rounded shadow-sm border ${getStatColor(player["Defensive Impact"])} ${subTier === "free" ? "blur-[5px] select-none pointer-events-none" : ""}`}>
                      {player["Defensive Impact"]}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {teamPlayers.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No players found for this team.
          </div>
        )}
      </div>

      {/* Player Details & Edit Modal */}
      <Dialog open={!!selectedPlayerId} onOpenChange={(open) => {
        if (!open) {
          setSelectedPlayerId(null);
          setShowAllStats(false);
        }
      }}>
        <DialogContent className="glass-strong max-h-[90vh] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto border border-slate-200/80 p-4 text-foreground dark:border-white/10 sm:w-full sm:p-6">
          {selectedPlayer && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-col items-start gap-4 text-2xl font-display font-bold sm:flex-row sm:items-center sm:space-x-4 sm:gap-0">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-neon/50 bg-background/80">
                    {selectedPlayer.ImageUrl ? (
                      <img src={selectedPlayer.ImageUrl} alt={selectedPlayer["Player Name"]} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-gradient">{selectedPlayer["Player Name"]}</div>
                    <div className="mt-1 text-sm font-normal uppercase tracking-wide text-muted-foreground font-sans">
                      {selectedPlayer.Position} &bull; {selectedPlayer.Club}
                    </div>
                  </div>
                </DialogTitle>
              </DialogHeader>

              {/* Contextual Tier Notice */}
              <div className="mt-4">
                {subTier === "free" && (
                  <div className="flex flex-col gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400 sm:flex-row sm:items-center sm:justify-between">
                    <span className="flex items-start gap-2">
                      <Lock className="h-3.5 w-3.5 shrink-0" />
                      <span><strong>Player customization locked:</strong> Upgrade to Advanced Predictor or Expert Predictor to edit player ratings and stats.</span>
                    </span>
                    <button
                      onClick={() => { setUpgradeReason("plus"); setUpgradeOpen(true); }}
                      className="bg-rose-500 hover:bg-rose-600 px-3 py-1 rounded-full text-[10px] font-black text-white transition-all uppercase tracking-wide shrink-0"
                    >
                      Upgrade
                    </button>
                  </div>
                )}
                {subTier === "plus" && (
                  isTopPlayer ? (
                    <div className="flex flex-col gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300 sm:flex-row sm:items-center sm:justify-between">
                      <span className="flex items-start gap-2">
                        <Sparkles className="h-3.5 w-3.5 shrink-0" />
                        <span><strong>Top Player unlocked:</strong> You have edit access to this player under the Advanced Predictor plan.</span>
                      </span>
                      <button
                        onClick={() => { setUpgradeReason("pro"); setUpgradeOpen(true); }}
                        className="bg-emerald-600 hover:bg-emerald-700 px-3 py-1 rounded-full text-[10px] font-black text-white transition-all uppercase tracking-wide shrink-0"
                      >
                        Upgrade to Edit More
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300 sm:flex-row sm:items-center sm:justify-between">
                      <span className="flex items-start gap-2">
                        <Lock className="h-3.5 w-3.5 shrink-0" />
                        <span><strong>Roster locked:</strong> Customizing other players requires Expert Predictor. Only the Top Player is unlocked on Advanced Predictor.</span>
                      </span>
                      <button
                        onClick={() => { setUpgradeReason("pro"); setUpgradeOpen(true); }}
                        className="bg-emerald-600 hover:bg-emerald-700 px-3 py-1 rounded-full text-[10px] font-black text-white transition-all uppercase tracking-wide shrink-0"
                      >
                        Upgrade to Expert
                      </button>
                    </div>
                  )
                )}
                {subTier === "pro" && (
                  <div className="p-3 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-400 text-xs flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 shrink-0 animate-pulse" />
                    <span><strong>Full Access:</strong> You can edit ratings and stats for all players under the Expert Predictor plan.</span>
                  </div>
                )}
              </div>

              <div className="mt-6 relative">
                {subTier === "free" && (
                  <div
                    className="absolute inset-0 z-10 cursor-pointer bg-transparent"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUpgradeReason("plus");
                      setUpgradeOpen(true);
                    }}
                  />
                )}
                <div className={`space-y-6 ${subTier === "free" ? "blur-[5px] select-none pointer-events-none" : ""}`}>
                  <div className="bg-background/30 p-4 rounded-xl border border-white/5">
                    <Label className="text-muted-foreground flex items-center mb-2">
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Player Image URL
                    </Label>
                    <Input
                      placeholder="https://example.com/image.jpg"
                      value={selectedPlayer.ImageUrl || ""}
                      onChange={(e) => handlePlayerEdit("ImageUrl", e.target.value)}
                      disabled={!canEditPlayer}
                      className="bg-background/60 border-white/10 text-foreground font-mono text-sm focus-visible:ring-neon"
                    />
                    <p className="text-xs text-muted-foreground mt-2 opacity-70">Paste a direct link to an image to replace the placeholder.</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-[10px] uppercase tracking-wider">Overall Rating</Label>
                      <Input
                        value={selectedPlayer["Overall Rating"] || ""}
                        onChange={(e) => handlePlayerEdit("Overall Rating", e.target.value)}
                        disabled={!canEditPlayer}
                        className="bg-background/50 border-white/10 text-foreground font-bold focus-visible:ring-neon"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-[10px] uppercase tracking-wider">Base Quality</Label>
                      <Input
                        value={selectedPlayer["Base Quality"] || ""}
                        onChange={(e) => handlePlayerEdit("Base Quality", e.target.value)}
                        disabled={!canEditPlayer}
                        className="bg-background/50 border-white/10 text-foreground focus-visible:ring-neon"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-[10px] uppercase tracking-wider">Recent Form</Label>
                      <Input
                        value={selectedPlayer["Recent Form"] || ""}
                        onChange={(e) => handlePlayerEdit("Recent Form", e.target.value)}
                        disabled={!canEditPlayer}
                        className="bg-background/50 border-white/10 text-foreground focus-visible:ring-neon"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-[10px] uppercase tracking-wider">Intl Experience</Label>
                      <Input
                        value={selectedPlayer["International Experience"] || ""}
                        onChange={(e) => handlePlayerEdit("International Experience", e.target.value)}
                        disabled={!canEditPlayer}
                        className="bg-background/50 border-white/10 text-foreground focus-visible:ring-neon"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-[10px] uppercase tracking-wider">Attacking Impact</Label>
                      <Input
                        value={selectedPlayer["Attacking Impact"] || ""}
                        onChange={(e) => handlePlayerEdit("Attacking Impact", e.target.value)}
                        disabled={!canEditPlayer}
                        className="bg-background/50 border-white/10 text-foreground focus-visible:ring-neon"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-[10px] uppercase tracking-wider">Defensive Impact</Label>
                      <Input
                        value={selectedPlayer["Defensive Impact"] || ""}
                        onChange={(e) => handlePlayerEdit("Defensive Impact", e.target.value)}
                        disabled={!canEditPlayer}
                        className="bg-background/50 border-white/10 text-foreground focus-visible:ring-neon"
                      />
                    </div>

                    {showAllStats && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-muted-foreground text-[10px] uppercase tracking-wider">Passing / Creativity</Label>
                          <Input
                            value={selectedPlayer["Passing / Creativity"] || ""}
                            onChange={(e) => handlePlayerEdit("Passing / Creativity", e.target.value)}
                            disabled={!canEditPlayer}
                            className="bg-background/50 border-white/10 text-foreground focus-visible:ring-neon"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-muted-foreground text-[10px] uppercase tracking-wider">Fitness / Availability</Label>
                          <Input
                            value={selectedPlayer["Fitness / Availability"] || ""}
                            onChange={(e) => handlePlayerEdit("Fitness / Availability", e.target.value)}
                            disabled={!canEditPlayer}
                            className="bg-background/50 border-white/10 text-foreground focus-visible:ring-neon"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-muted-foreground text-[10px] uppercase tracking-wider">Discipline Risk</Label>
                          <Input
                            value={selectedPlayer["Discipline Risk"] || ""}
                            onChange={(e) => handlePlayerEdit("Discipline Risk", e.target.value)}
                            disabled={!canEditPlayer}
                            className="bg-background/50 border-white/10 text-foreground focus-visible:ring-neon"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-muted-foreground text-[10px] uppercase tracking-wider">Match Importance</Label>
                          <Input
                            value={selectedPlayer["Match Importance"] || ""}
                            onChange={(e) => handlePlayerEdit("Match Importance", e.target.value)}
                            disabled={!canEditPlayer}
                            className="bg-background/50 border-white/10 text-foreground focus-visible:ring-neon"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-muted-foreground text-[10px] uppercase tracking-wider">Rating Tier</Label>
                          <select
                            value={selectedPlayer["Rating Tier"] || ""}
                            onChange={(e) => handlePlayerEdit("Rating Tier", e.target.value)}
                            disabled={!canEditPlayer}
                            className="flex h-10 w-full rounded-md border border-white/10 bg-background/50 px-3 py-2 text-sm text-foreground outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:border-neon dark:focus:ring-neon"
                          >
                            <option value="">Select tier</option>
                            <option value="Elite">Elite</option>
                            <option value="Very Strong">Very Strong</option>
                            <option value="Strong">Strong</option>
                            <option value="Good/Average">Good/Average</option>
                            <option value="Developing">Developing</option>
                            <option value="Unknown">Unknown</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      onClick={() => setShowAllStats(!showAllStats)}
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                    >
                      <span>{showAllStats ? "Show Less" : "Show All Stats"}</span>
                    </button>

                    <button
                      onClick={handleSavePlayer}
                      disabled={isSavingPlayer || !canEditPlayer}
                      className="flex w-full items-center justify-center space-x-2 rounded-full bg-gradient-to-r from-neon via-cyan-500 to-blue-600 px-5 py-2 text-sm font-bold text-white shadow-[0_0_12px_rgba(0,255,255,0.3)] transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,255,255,0.5)] disabled:opacity-50 sm:w-auto"
                    >
                      {isSavingPlayer ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Save Player Progress</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <UpgradeModal isOpen={upgradeOpen} onClose={() => setUpgradeOpen(false)} reason={upgradeReason} />
    </div>
  );
}
