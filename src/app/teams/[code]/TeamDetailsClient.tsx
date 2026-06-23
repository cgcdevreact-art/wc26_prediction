"use client";

import { useEffect, useState, useMemo } from "react";
import { useSimulationStore, PlayerStats, TeamStats } from "@/lib/store/simulationStore";
import { ArrowLeft, User, Image as ImageIcon, Save } from "lucide-react";
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
    return Object.values(players)
      .filter(p => p["Team Code"] === teamCode)
      .sort((a, b) => {
        const ratingA = parseInt(a["Overall Rating"]?.replace("%", "") || "0");
        const ratingB = parseInt(b["Overall Rating"]?.replace("%", "") || "0");
        return ratingB - ratingA;
      });
  }, [players, teamCode]);

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
        <Link href="/teams" className="mt-4 inline-block text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
          &larr; Back to Teams
        </Link>
      </div>
    );
  }
  const topPlayerName = topPlayer ? (topPlayer["Name on Shirt"] || topPlayer["Player Name"]) : "";
  const topPlayerRating = topPlayer ? (topPlayer["Overall Rating"] || "") : "";
  const topPlayerDisp = topPlayerName ? `${topPlayerName} (${topPlayerRating})` : "N/A";

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      <Link href="/teams" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Teams
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
              className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 ${
                hasChanges && canEditTeam
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

        {(!session?.user?.id || !canEditTeam) && (
          <div className="mt-6 p-3 rounded-lg bg-[#a855f7]/10 border border-[#a855f7]/20 text-[#c084fc] text-xs flex items-center justify-between">
            <span className="flex items-center">
              {!session?.user?.id 
                ? "⚠️ You are not signed in. Any rating overrides will not be saved to the database. Sign in to customize."
                : "⚠️ Team rating customization is restricted on the Advanced plan. Upgrade to Pro/Expert for full editing."}
            </span>
            {session?.user?.id && !canEditTeam && (
              <Link href="/subscription" className="bg-[#a855f7]/20 hover:bg-[#a855f7]/30 border border-[#a855f7]/40 px-3 py-1 rounded-full text-[10px] font-bold text-white transition-all uppercase tracking-wide">
                Upgrade to Pro
              </Link>
            )}
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
        <DialogContent className="glass-strong max-w-2xl border border-slate-200/80 text-foreground dark:border-white/10">
          {selectedPlayer && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-display font-bold flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-full bg-background/80 overflow-hidden flex items-center justify-center border-2 border-neon/50">
                    {selectedPlayer.ImageUrl ? (
                      <img src={selectedPlayer.ImageUrl} alt={selectedPlayer["Player Name"]} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <div className="text-gradient">{selectedPlayer["Player Name"]}</div>
                    <div className="text-sm font-sans font-normal text-muted-foreground mt-1 tracking-wide uppercase">
                      {selectedPlayer.Position} &bull; {selectedPlayer.Club}
                    </div>
                  </div>
                </DialogTitle>
              </DialogHeader>
              
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

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
                          <Input 
                            value={selectedPlayer["Rating Tier"] || ""} 
                            onChange={(e) => handlePlayerEdit("Rating Tier", e.target.value)}
                            disabled={!canEditPlayer}
                            className="bg-background/50 border-white/10 text-foreground focus-visible:ring-neon"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-white/10">
                    <button
                      onClick={() => setShowAllStats(!showAllStats)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10"
                    >
                      <span>{showAllStats ? "Show Less" : "Show All Stats"}</span>
                    </button>

                    <button
                      onClick={handleSavePlayer}
                      disabled={isSavingPlayer || !canEditPlayer}
                      className="px-5 py-2 rounded-full font-bold text-sm bg-gradient-to-r from-neon via-cyan-500 to-blue-600 text-white shadow-[0_0_12px_rgba(0,255,255,0.3)] hover:shadow-[0_0_20px_rgba(0,255,255,0.5)] transition-all duration-300 disabled:opacity-50 flex items-center space-x-2"
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
