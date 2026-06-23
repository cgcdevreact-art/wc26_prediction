"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search, Eye, Save, Brain, Cpu, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTeams, useGroupsConfig } from "@/components/TeamsProvider";
import { UpgradeModal } from "@/components/site/UpgradeModal";
import { useSimulationStore, TeamStats, PlayerStats } from "@/lib/store/simulationStore";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { PlayersRankingsTable } from "@/components/site/PlayersRankingsTable";
import { toast } from "sonner";

type RankingTeam = {
  code: string;
  name: string;
  flag: string;
  playersCount: number;
  eliteCount: number;
  strongCount: number;
  topPlayerName: string;
  topPlayerRating: string;
  rank: number;
  winProbability: number;
  elo: number;
  attack: number;
  defense: number;
  squadValueM: number;
  avgAge: number;
  goalsPerMatch: number;
  confederation: string;
  group: string;
};

type RankingSortKey =
  | "playersCount"
  | "eliteCount"
  | "strongCount"
  | "winProbability"
  | "rank"
  | "elo"
  | "attack"
  | "defense"
  | "squadValueM"
  | "avgAge"
  | "goalsPerMatch";

function TableHeaderCell({ label, tooltip, children }: { label?: string; tooltip: string; children?: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help underline decoration-dotted decoration-muted-foreground/45 hover:decoration-foreground/60 transition-colors">
            {children || label}
          </span>
        </TooltipTrigger>
        <TooltipContent className="bg-slate-900 text-white dark:bg-slate-950 px-2.5 py-1.5 text-xs font-normal normal-case tracking-normal max-w-xs shadow-xl border border-white/10 rounded-lg z-50">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function TeamsClient({
  initialTeams,
  initialPlayers,
  flagMap,
}: {
  initialTeams: TeamStats[];
  initialPlayers: PlayerStats[];
  flagMap: Record<string, string>;
}) {
  const { isInitialized, initializeData, teams, players, selectedModel } = useSimulationStore();
  const appTeams = useTeams();
  const groupsConfig = useGroupsConfig();
  const router = useRouter();
  const { data: session } = useSession();

  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalReason, setModalReason] = useState<"plus" | "pro" | "credits" | "guest">("plus");
  const [rankingSearch, setRankingSearch] = useState("");
  const [rankingTeamFilter, setRankingTeamFilter] = useState("ALL");
  const [rankingGroupFilter, setRankingGroupFilter] = useState("ALL");
  const [rankingSort, setRankingSort] = useState<{ key: RankingSortKey; direction: "asc" | "desc" }>({
    key: "winProbability",
    direction: "desc",
  });

  // State for inline stats editor modal (for free users)
  const [editStatsModalOpen, setEditStatsModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<{
    code: string;
    name: string;
    flag?: string;
    elo: number;
    attack: number;
    defense: number;
  } | null>(null);
  const [isSavingStats, setIsSavingStats] = useState(false);

  const getTeamGroup = (teamCode: string) => {
    for (const [group, codes] of Object.entries(groupsConfig)) {
      if (codes.includes(teamCode)) return group;
    }
    return "";
  };

  const subTier = session?.user?.subscriptionTier || "free";
  const currentModelLabel =
    selectedModel === "advanced" ? "Advanced Model" : selectedModel === "pro" ? "Pro Model" : "Base Model";
  const CurrentModelIcon =
    selectedModel === "advanced" ? Brain : selectedModel === "pro" ? Sparkles : Cpu;

  useEffect(() => {
    setMounted(true);
    initializeData(initialTeams, initialPlayers);
  }, [initializeData, initialTeams, initialPlayers]);

  const formatRating = (val: number | undefined | null) => {
    if (val === undefined || val === null) return 0;
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

  const sortedTeams = useMemo(() => {
    const teamsList = Object.values(teams);
    return teamsList.sort((a, b) => {
      const appTeamA = appTeams.find((t) => t.code === a["Team Code"]);
      const appTeamB = appTeams.find((t) => t.code === b["Team Code"]);
      const eloA = appTeamA?.elo || 0;
      const eloB = appTeamB?.elo || 0;
      return eloB - eloA;
    });
  }, [teams, appTeams]);

  const filteredTeams = useMemo(() => {
    if (!search) return sortedTeams;
    const lowerSearch = search.toLowerCase();
    return sortedTeams.filter(
      (t) =>
        t.Team.toLowerCase().includes(lowerSearch) ||
        t["Team Code"].toLowerCase().includes(lowerSearch),
    );
  }, [search, sortedTeams]);

  const getTeamPlayers = (teamCode: string) => {
    return Object.values(players)
      .filter((p) => p["Team Code"] === teamCode)
      .sort((a, b) => {
        const ratingA = parseInt(a["Overall Rating"]?.replace("%", "") || "0", 10);
        const ratingB = parseInt(b["Overall Rating"]?.replace("%", "") || "0", 10);
        return ratingB - ratingA;
      });
  };

  const rankingTeams = useMemo<RankingTeam[]>(() => {
    return appTeams.map((team) => {
      const teamRecord = teams[team.code];
      const teamPlayers = getTeamPlayers(team.code);
      const topPlayer = teamPlayers[0];

      return {
        code: team.code,
        name: team.name,
        flag: team.flag || flagMap[team.code] || "🏳️",
        playersCount: teamPlayers.length || Number(teamRecord?.Players || 0),
        eliteCount: Number(teamRecord?.Elite || 0),
        strongCount: Number(teamRecord?.["Very Strong"] || 0),
        topPlayerName: topPlayer ? topPlayer["Name on Shirt"] || topPlayer["Player Name"] || "N/A" : "N/A",
        topPlayerRating: topPlayer?.["Overall Rating"] || "",
        rank: team.rank,
        winProbability: team.prob.champion,
        elo: team.elo,
        attack: formatRating(team.attack),
        defense: formatRating(team.defense),
        squadValueM: team.squadValueM,
        avgAge: team.avgAge,
        goalsPerMatch: team.goalsPerMatch,
        confederation: team.confederation,
        group: getTeamGroup(team.code),
      };
    });
  }, [appTeams, flagMap, teams, players, groupsConfig]);

  const rankingTeamOptions = useMemo(
    () => [
      { code: "ALL", name: "All Teams" },
      ...rankingTeams
        .map((team) => ({ code: team.code, name: team.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    ],
    [rankingTeams],
  );

  const rankingGroupOptions = useMemo(
    () => [
      "ALL",
      ...Array.from(new Set(rankingTeams.map((team) => team.group).filter(Boolean))).sort(),
    ],
    [rankingTeams],
  );

  const formatGroupLabel = (group: string) => {
    if (group === "ALL") return "All Groups";
    return `Group ${group}`;
  };

  const filteredRankingTeams = useMemo(() => {
    const lowerSearch = rankingSearch.toLowerCase();
    return rankingTeams.filter((team) => {
      if (
        lowerSearch &&
        !team.name.toLowerCase().includes(lowerSearch) &&
        !team.code.toLowerCase().includes(lowerSearch)
      ) {
        return false;
      }
      if (rankingTeamFilter !== "ALL" && team.code !== rankingTeamFilter) {
        return false;
      }
      if (rankingGroupFilter !== "ALL" && team.group !== rankingGroupFilter) {
        return false;
      }
      return true;
    });
  }, [rankingSearch, rankingTeamFilter, rankingGroupFilter, rankingTeams]);

  const sortedRankingTeams = useMemo(() => {
    return [...filteredRankingTeams].sort((a, b) => {
      const direction = rankingSort.direction === "asc" ? 1 : -1;
      const aValue = a[rankingSort.key];
      const bValue = b[rankingSort.key];
      return (aValue > bValue ? 1 : aValue < bValue ? -1 : 0) * direction;
    });
  }, [filteredRankingTeams, rankingSort]);

  const rankingColumns: {
    key: RankingSortKey;
    label: string;
    tooltip: string;
    align?: "left" | "center" | "right";
    render: (team: RankingTeam) => string;
  }[] = [
      { key: "eliteCount", label: "Elite", tooltip: "Elite Players (overall rating 90+)", render: (team) => String(team.eliteCount) },
      { key: "strongCount", label: "Strong", tooltip: "Strong Players (overall rating 85-89)", render: (team) => String(team.strongCount) },
      { key: "winProbability", label: "Win %", tooltip: "Championship Win Probability", render: (team) => `${team.winProbability.toFixed(1)}%` },
      { key: "rank", label: "FIFA", tooltip: "Official FIFA World Ranking position", render: (team) => `#${team.rank}` },
      { key: "elo", label: "Elo", tooltip: "Elo rating of team strength based on historic match results", render: (team) => team.elo.toFixed(2) },
      { key: "attack", label: "Att", tooltip: "Attack rating (average goals scored index)", render: (team) => String(team.attack) },
      { key: "defense", label: "Def", tooltip: "Defense rating (average goals conceded index)", render: (team) => String(team.defense) },
      { key: "squadValueM", label: "Value", tooltip: "Total squad market value in millions of Euros", render: (team) => `€${Math.round(team.squadValueM)}M` },
      { key: "avgAge", label: "Age", tooltip: "Average age of players in the squad", render: (team) => team.avgAge.toFixed(1) },
      { key: "goalsPerMatch", label: "Goals/M", tooltip: "Average goals scored per match by this team", render: (team) => team.goalsPerMatch.toFixed(2) },
    ];

  const toggleRankingSort = (key: RankingSortKey) => {
    setRankingSort((current) => (
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: key === "rank" || key === "avgAge" ? "asc" : "desc" }
    ));
  };

  const renderSortIcon = (key: RankingSortKey) => {
    if (rankingSort.key !== key) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />;
    }
    return rankingSort.direction === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
    );
  };

  const openTeam = (teamCode: string) => {
    router.push(`/teams/${teamCode}`);
  };

  const handleSaveStats = async () => {
    if (!editingTeam) return;
    if (!session?.user?.id) {
      toast.error("Please sign in to save your progress!");
      return;
    }

    setIsSavingStats(true);
    try {
      const response = await fetch("/api/user/save-team", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teamCode: editingTeam.code,
          elo: editingTeam.elo,
          attack: editingTeam.attack,
          defense: editingTeam.defense,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save team progress");
      }

      toast.success(`${editingTeam.name} ratings saved successfully!`);
      setEditStatsModalOpen(false);
      setEditingTeam(null);
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Something went wrong while saving team ratings.");
    } finally {
      setIsSavingStats(false);
    }
  };

  if (!mounted || !isInitialized) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-neon"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Tabs defaultValue="list" className="space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <TabsList className="h-auto rounded-full border border-slate-200 bg-white p-1.5 shadow-[0_12px_30px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
            <TabsTrigger
              value="list"
              className="rounded-full px-6 py-2.5 text-sm font-semibold text-slate-600 transition data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#0a8a45] data-[state=active]:via-[#2c7c87] data-[state=active]:to-[#af3fd1] data-[state=active]:text-white data-[state=active]:shadow-[0_12px_30px_rgba(44,124,135,0.24)] dark:text-slate-300"
            >
              Teams List
            </TabsTrigger>
            <TabsTrigger
              value="rankings"
              className="rounded-full px-6 py-2.5 text-sm font-semibold text-slate-600 transition data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#0a8a45] data-[state=active]:via-[#2c7c87] data-[state=active]:to-[#af3fd1] data-[state=active]:text-white data-[state=active]:shadow-[0_12px_30px_rgba(44,124,135,0.24)] dark:text-slate-300"
            >
              Team Rankings
            </TabsTrigger>
            <TabsTrigger
              value="players"
              className="rounded-full px-6 py-2.5 text-sm font-semibold text-slate-600 transition data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#0a8a45] data-[state=active]:via-[#2c7c87] data-[state=active]:to-[#af3fd1] data-[state=active]:text-white data-[state=active]:shadow-[0_12px_30px_rgba(44,124,135,0.24)] dark:text-slate-300"
            >
              Player Rankings
            </TabsTrigger>
          </TabsList>

          <div className="xl:ml-auto">
            <div className="flex items-center gap-3 rounded-[1.6rem] border border-slate-200 bg-white px-4 py-3 shadow-[0_14px_36px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-950">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
                <CurrentModelIcon className="h-5.5 w-5.5" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-950 dark:text-white">
                  Simulation Engine
                </div>
                <div className="mt-0.5 text-xl font-display font-bold text-slate-900 dark:text-white">
                  {currentModelLabel}
                </div>
              </div>
            </div>
          </div>
        </div>

        <TabsContent value="list" className="space-y-8">
          <div className="relative max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <Input
              type="text"
              placeholder="Search teams..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="glass h-12 rounded-xl pl-10 text-foreground placeholder-muted-foreground focus-visible:ring-neon"
            />
          </div>

          <div className="overflow-x-auto rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-950">
            <table className="w-full whitespace-nowrap text-left text-sm">
              <thead className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-cyan-50/40 text-[11px] uppercase tracking-[0.16em] text-slate-600 dark:border-white/10 dark:bg-[linear-gradient(90deg,rgba(255,255,255,0.04),rgba(6,182,212,0.05),rgba(255,255,255,0.04))] dark:text-slate-300">
                <tr>
                  <th className="w-16 rounded-tl-[1.75rem] px-5 py-4 text-left font-semibold whitespace-nowrap">Rk</th>
                  <th className="px-5 py-4 font-semibold whitespace-nowrap">Team</th>
                  <th className="px-4 py-4 text-center font-semibold whitespace-nowrap">
                    <TableHeaderCell tooltip="Elite Players (overall rating 90+)">Elite (90+)</TableHeaderCell>
                  </th>
                  <th className="px-4 py-4 text-center font-semibold whitespace-nowrap">
                    <TableHeaderCell tooltip="Strong Players (overall rating 85-89)">Strong (85-89)</TableHeaderCell>
                  </th>
                  <th className="w-20 px-4 py-4 text-center font-semibold whitespace-nowrap">
                    <TableHeaderCell tooltip="Elo rating of team strength based on historic match results">Elo</TableHeaderCell>
                  </th>
                  <th className="w-16 px-4 py-4 text-center font-semibold whitespace-nowrap">
                    <TableHeaderCell tooltip="Attack rating (average goals scored index)">Att</TableHeaderCell>
                  </th>
                  <th className="w-16 px-4 py-4 text-center font-semibold whitespace-nowrap">
                    <TableHeaderCell tooltip="Defense rating (average goals conceded index)">Def</TableHeaderCell>
                  </th>
                  <th className="w-56 px-5 py-4 text-right font-semibold whitespace-nowrap">Top Player</th>
                  <th className="w-32 rounded-tr-[1.75rem] px-5 py-4 text-right font-semibold whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeams.map((team, index) => {
                  const appTeam = appTeams.find((t) => t.code === team["Team Code"]);
                  const teamPlayers = getTeamPlayers(team["Team Code"]);
                  const topPlayer = teamPlayers[0];
                  const topPlayerName = topPlayer ? topPlayer["Name on Shirt"] || topPlayer["Player Name"] : "";
                  const topPlayerRating = topPlayer ? topPlayer["Overall Rating"] || "" : "";

                  return (
                    <tr
                      key={team["Team Code"]}
                      onClick={() => openTeam(team["Team Code"])}
                      className="group cursor-pointer border-b border-slate-100 transition-colors hover:bg-gradient-to-r hover:from-cyan-50/50 hover:to-fuchsia-50/40 dark:border-white/5 dark:hover:bg-[linear-gradient(90deg,rgba(6,182,212,0.08),rgba(217,70,239,0.05))]"
                    >
                      <td className="px-5 py-4">
                        <span className="inline-flex min-w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <CountryFlag
                            code={team["Team Code"]}
                            flag={flagMap[team["Team Code"]] || appTeam?.flag}
                            name={team.Team}
                            className="h-7 w-9 shrink-0 rounded object-cover drop-shadow-md"
                            emojiClassName="text-2xl leading-none drop-shadow-md"
                          />
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate font-bold text-slate-950 transition-colors group-hover:text-cyan-700 dark:text-white dark:group-hover:text-neon">
                              {team.Team}
                            </span>
                            <span className="text-[11px] uppercase tracking-wider text-slate-550 dark:text-slate-400">{team["Team Code"]}</span>
                          </div>
                        </div>
                      </td>
                      <td
                        className={`px-4 py-3 text-center ${subTier === "free" ? "cursor-pointer hover:bg-slate-200/50 dark:hover:bg-white/10" : ""}`}
                        onClick={subTier === "free" ? (e) => {
                          e.stopPropagation();
                          setModalReason("plus");
                          setModalOpen(true);
                        } : undefined}
                      >
                        <span className={`inline-flex min-w-12 items-center justify-center rounded-full bg-slate-100 px-3 py-1 font-mono text-slate-700 ring-1 ring-slate-200 dark:bg-white/[0.05] dark:text-slate-200 dark:ring-white/10 ${subTier === "free" ? "blur-[5px] select-none pointer-events-none" : ""}`}>
                          {team.Elite || "0"}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-3 text-center ${subTier === "free" ? "cursor-pointer hover:bg-slate-200/50 dark:hover:bg-white/10" : ""}`}
                        onClick={subTier === "free" ? (e) => {
                          e.stopPropagation();
                          setModalReason("plus");
                          setModalOpen(true);
                        } : undefined}
                      >
                        <span className={`inline-flex min-w-12 items-center justify-center rounded-full bg-slate-100 px-3 py-1 font-mono text-slate-700 ring-1 ring-slate-200 dark:bg-white/[0.05] dark:text-slate-200 dark:ring-white/10 ${subTier === "free" ? "blur-[5px] select-none pointer-events-none" : ""}`}>
                          {team["Very Strong"] || "0"}
                        </span>
                      </td>
                      <td
                        onClick={subTier === "free" ? (e) => {
                          e.stopPropagation();
                          const appTeam = appTeams.find((t) => t.code === team["Team Code"]);
                          if (appTeam) {
                            setEditingTeam({
                              code: team["Team Code"],
                              name: team.Team,
                              flag: flagMap[team["Team Code"]] || appTeam.flag,
                              elo: Math.round(appTeam.elo),
                              attack: appTeam.attack >= 10 ? Math.round(appTeam.attack) : Number(formatRating(appTeam.attack)),
                              defense: appTeam.defense >= 10 ? Math.round(appTeam.defense) : Number(formatRating(appTeam.defense)),
                            });
                            setEditStatsModalOpen(true);
                          }
                        } : undefined}
                        className={`px-3 py-3 text-center font-mono tabular-nums text-slate-800 dark:text-slate-100 ${subTier === "free"
                          ? "cursor-pointer hover:bg-slate-100 hover:text-cyan-600 dark:hover:bg-white/5 dark:hover:text-cyan-400 transition-colors"
                          : ""
                          }`}
                      >
                        <span className="font-semibold text-slate-800 dark:text-slate-100">
                          {appTeam?.elo ? Math.round(appTeam.elo) : "-"}
                        </span>
                      </td>
                      <td
                        onClick={subTier === "free" ? (e) => {
                          e.stopPropagation();
                          const appTeam = appTeams.find((t) => t.code === team["Team Code"]);
                          if (appTeam) {
                            setEditingTeam({
                              code: team["Team Code"],
                              name: team.Team,
                              flag: flagMap[team["Team Code"]] || appTeam.flag,
                              elo: Math.round(appTeam.elo),
                              attack: appTeam.attack >= 10 ? Math.round(appTeam.attack) : Number(formatRating(appTeam.attack)),
                              defense: appTeam.defense >= 10 ? Math.round(appTeam.defense) : Number(formatRating(appTeam.defense)),
                            });
                            setEditStatsModalOpen(true);
                          }
                        } : undefined}
                        className={`px-3 py-3 text-center font-mono tabular-nums text-foreground/80 dark:text-white/80 ${subTier === "free"
                          ? "cursor-pointer hover:bg-slate-100 hover:text-cyan-600 dark:hover:bg-white/5 dark:hover:text-cyan-400 transition-colors"
                          : ""
                          }`}
                      >
                        <span className="inline-flex min-w-14 items-center justify-center rounded-full bg-fuchsia-50 px-3 py-1 font-semibold text-fuchsia-700 ring-1 ring-fuchsia-200 dark:bg-fuchsia-500/10 dark:text-fuchsia-300 dark:ring-fuchsia-500/20">
                          {formatRating(appTeam?.attack)}
                        </span>
                      </td>
                      <td
                        onClick={subTier === "free" ? (e) => {
                          e.stopPropagation();
                          const appTeam = appTeams.find((t) => t.code === team["Team Code"]);
                          if (appTeam) {
                            setEditingTeam({
                              code: team["Team Code"],
                              name: team.Team,
                              flag: flagMap[team["Team Code"]] || appTeam.flag,
                              elo: Math.round(appTeam.elo),
                              attack: appTeam.attack >= 10 ? Math.round(appTeam.attack) : Number(formatRating(appTeam.attack)),
                              defense: appTeam.defense >= 10 ? Math.round(appTeam.defense) : Number(formatRating(appTeam.defense)),
                            });
                            setEditStatsModalOpen(true);
                          }
                        } : undefined}
                        className={`px-3 py-3 text-center font-mono tabular-nums text-foreground/80 dark:text-white/80 ${subTier === "free"
                          ? "cursor-pointer hover:bg-slate-100 hover:text-cyan-600 dark:hover:bg-white/5 dark:hover:text-cyan-400 transition-colors"
                          : ""
                          }`}
                      >
                        <span className="inline-flex min-w-14 items-center justify-center rounded-full bg-fuchsia-50 px-3 py-1 font-semibold text-fuchsia-700 ring-1 ring-fuchsia-200 dark:bg-fuchsia-500/10 dark:text-fuchsia-300 dark:ring-fuchsia-500/20">
                          {formatRating(appTeam?.defense)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-gradient-to-r from-emerald-50 to-cyan-50 px-3 py-1.5 ring-1 ring-emerald-200 dark:from-emerald-500/10 dark:to-cyan-500/10 dark:ring-emerald-500/20">
                          <span className="truncate font-semibold text-emerald-700 dark:text-neon">
                            {topPlayerName || "N/A"}
                          </span>
                          {topPlayerRating && (
                            <span className="shrink-0 text-[11px] text-slate-550 dark:text-slate-300">
                              ({topPlayerRating})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openTeam(team["Team Code"]);
                          }}
                          className="p-2 rounded-full border border-slate-200 dark:border-white/10 text-slate-650 dark:text-slate-350 transition hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white inline-flex items-center justify-center"
                          title="View Team Details"
                        >
                          <Eye className="w-4.5 h-4.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredTeams.length === 0 && (
              <div className="py-20 text-center text-muted-foreground">
                No teams found matching "{search}"
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="rankings" className="space-y-6">
          <div className="space-y-5">
            <div className="grid gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-[0_20px_50px_rgba(15,23,42,0.08)] md:grid-cols-2 xl:grid-cols-5 dark:border-white/10 dark:bg-slate-950">
              <div className="relative xl:col-span-3">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-5 w-5 text-muted-foreground" />
                </div>
                <Input
                  type="text"
                  placeholder="Search rankings, teams..."
                  value={rankingSearch}
                  onChange={(e) => setRankingSearch(e.target.value)}
                  className="h-12 rounded-xl border-slate-200 bg-white pl-10 text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:ring-cyan-500 dark:border-white/10 dark:bg-white/[0.04] dark:focus-visible:ring-neon"
                />
              </div>
              <select
                value={rankingTeamFilter}
                onChange={(e) => setRankingTeamFilter(e.target.value)}
                className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm text-foreground shadow-sm outline-none focus:border-cyan-500 dark:border-white/10 dark:bg-white/[0.04]"
              >
                {rankingTeamOptions.map((team) => (
                  <option key={team.code} value={team.code}>
                    {team.name}
                  </option>
                ))}
              </select>
              <select
                value={rankingGroupFilter}
                onChange={(e) => setRankingGroupFilter(e.target.value)}
                className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm text-foreground shadow-sm outline-none focus:border-cyan-500 dark:border-white/10 dark:bg-white/[0.04]"
              >
                {rankingGroupOptions.map((group) => (
                  <option key={group} value={group}>
                    {formatGroupLabel(group)}
                  </option>
                ))}
              </select>
            </div>
            <div className="overflow-x-auto rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-950">
              <table className="w-full text-left text-[11px] table-auto">
                <thead className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-cyan-50/40 text-[9px] uppercase tracking-[0.12em] text-slate-600 dark:border-white/10 dark:bg-[linear-gradient(90deg,rgba(255,255,255,0.04),rgba(6,182,212,0.05),rgba(255,255,255,0.04))] dark:text-slate-300">
                  <tr>
                    <th className="w-8 px-1 py-3 font-semibold whitespace-nowrap">#</th>
                    <th className="min-w-[90px] px-1 py-3 font-semibold whitespace-nowrap">Team</th>
                    {rankingColumns.map((column) => {
                      const isRestricted = (
                        column.key === "eliteCount" ||
                        column.key === "strongCount" ||
                        column.key === "winProbability" ||
                        column.key === "squadValueM" ||
                        column.key === "avgAge" ||
                        column.key === "goalsPerMatch"
                      ) && subTier === "free";
                      return (
                        <th key={column.key} className="px-1 py-3 font-semibold whitespace-nowrap">
                          <button
                            onClick={isRestricted ? (e) => {
                              e.stopPropagation();
                              setModalReason("plus");
                              setModalOpen(true);
                            } : () => toggleRankingSort(column.key)}
                            className="flex items-center gap-1 whitespace-nowrap text-left transition hover:text-slate-950 dark:hover:text-white"
                          >
                            <TableHeaderCell tooltip={column.tooltip}>{column.label}</TableHeaderCell>
                            {renderSortIcon(column.key)}
                          </button>
                        </th>
                      );
                    })}
                    <th className="min-w-[90px] px-1 py-3 text-right font-semibold whitespace-nowrap">Top Player</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRankingTeams.map((team, index) => (
                    <tr
                      key={team.code}
                      onClick={() => openTeam(team.code)}
                      className="group cursor-pointer border-b border-slate-100 transition-colors hover:bg-gradient-to-r hover:from-cyan-50/50 hover:to-fuchsia-50/40 dark:border-white/5 dark:hover:bg-[linear-gradient(90deg,rgba(6,182,212,0.08),rgba(217,70,239,0.05))]"
                    >
                      <td className="px-1 py-2">
                        <span className="inline-flex min-w-6 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono text-[10px] text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-1 py-2">
                        <div className="flex items-center gap-1.5 min-w-0 max-w-[80px] sm:max-w-[120px] truncate" title={team.name}>
                          <CountryFlag
                            code={team.code}
                            flag={team.flag}
                            name={team.name}
                            className="h-4.5 w-6 shrink-0 rounded object-cover"
                            emojiClassName="text-base leading-none"
                          />
                          <div className="min-w-0 truncate">
                            <div className="truncate font-semibold text-slate-950 group-hover:text-cyan-700 dark:text-white dark:group-hover:text-neon">
                              {team.name}
                            </div>
                            <div className="text-[9px] uppercase tracking-wider text-slate-550 dark:text-slate-400">{team.code}</div>
                          </div>
                        </div>
                      </td>
                      {rankingColumns.map((column) => {
                        const isRestricted = (
                          column.key === "eliteCount" ||
                          column.key === "strongCount" ||
                          column.key === "winProbability" ||
                          column.key === "squadValueM" ||
                          column.key === "avgAge" ||
                          column.key === "goalsPerMatch"
                        ) && subTier === "free";
                        const isEditableField = (
                          column.key === "elo" ||
                          column.key === "attack" ||
                          column.key === "defense"
                        ) && subTier === "free";
                        return (
                          <td
                            key={column.key}
                            className={`px-1 py-2 font-mono tabular-nums text-slate-800 dark:text-slate-100 ${isRestricted
                              ? "cursor-pointer hover:bg-slate-200/50 dark:hover:bg-white/10"
                              : isEditableField
                                ? "cursor-pointer hover:bg-slate-100 hover:text-cyan-600 dark:hover:bg-white/5 dark:hover:text-cyan-400 transition-colors"
                                : ""
                              }`}
                            onClick={isRestricted ? (e) => {
                              e.stopPropagation();
                              setModalReason("plus");
                              setModalOpen(true);
                            } : isEditableField ? (e) => {
                              e.stopPropagation();
                              const appTeam = appTeams.find((t) => t.code === team.code);
                              if (appTeam) {
                                setEditingTeam({
                                  code: team.code,
                                  name: team.name,
                                  flag: team.flag,
                                  elo: Math.round(appTeam.elo),
                                  attack: appTeam.attack >= 10 ? Math.round(appTeam.attack) : Number(formatRating(appTeam.attack)),
                                  defense: appTeam.defense >= 10 ? Math.round(appTeam.defense) : Number(formatRating(appTeam.defense)),
                                });
                                setEditStatsModalOpen(true);
                              }
                            } : undefined}
                          >
                            <span className={isRestricted ? "blur-[5px] select-none pointer-events-none" : ""}>
                              {column.key === "winProbability" ? (
                                <span className="inline-flex rounded-full bg-emerald-50 px-1 py-0.5 font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
                                  {column.render(team)}
                                </span>
                              ) : column.key === "rank" ? (
                                <span className="inline-flex rounded-full bg-sky-50 px-1 py-0.5 font-semibold text-sky-700 ring-1 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20">
                                  {column.render(team)}
                                </span>
                              ) : column.key === "attack" || column.key === "defense" ? (
                                <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-fuchsia-50 px-1 py-0.5 font-semibold text-fuchsia-700 ring-1 ring-fuchsia-200 dark:bg-fuchsia-500/10 dark:text-fuchsia-300 dark:ring-fuchsia-500/20">
                                  {column.render(team)}
                                </span>
                              ) : column.key === "playersCount" || column.key === "eliteCount" || column.key === "strongCount" ? (
                                <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-slate-100 px-1 py-0.5 text-slate-700 ring-1 ring-slate-200 dark:bg-white/[0.05] dark:text-slate-200 dark:ring-white/10">
                                  {column.render(team)}
                                </span>
                              ) : (
                                <span className="font-semibold">{column.render(team)}</span>
                              )}
                            </span>
                          </td>
                        );
                      })}
                      <td className="px-1 py-2 text-right">
                        <div className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-50 to-cyan-50 px-1.5 py-0.5 ring-1 ring-emerald-200 dark:from-emerald-500/10 dark:to-cyan-500/10 dark:ring-emerald-500/20">
                          <span className="font-semibold text-emerald-700 dark:text-neon truncate max-w-[60px] sm:max-w-[90px]" title={team.topPlayerName}>
                            {team.topPlayerName}
                          </span>
                          {team.topPlayerRating && (
                            <span className="text-[9px] text-slate-500 dark:text-slate-300 shrink-0">
                              ({team.topPlayerRating})
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sortedRankingTeams.length === 0 && (
                <div className="py-20 text-center text-muted-foreground">
                  No ranked teams found matching "{rankingSearch}"
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="players" className="space-y-6">
          <PlayersRankingsTable initialPlayers={initialPlayers} flagMap={flagMap} />
        </TabsContent>
      </Tabs>

      <UpgradeModal isOpen={modalOpen} onClose={() => setModalOpen(false)} reason={modalReason} />

      {/* Inline Stats Editing Modal for Free Plan Users */}
      <Dialog open={editStatsModalOpen} onOpenChange={(open) => {
        if (!open) {
          setEditStatsModalOpen(false);
          setEditingTeam(null);
        }
      }}>
        <DialogContent className="glass-strong max-w-md border border-slate-200/80 text-foreground dark:border-white/10">
          {editingTeam && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-display font-bold flex items-center space-x-3">
                  <CountryFlag
                    code={editingTeam.code}
                    flag={editingTeam.flag}
                    name={editingTeam.name}
                    className="h-6 w-9 shrink-0 rounded object-cover shadow-sm"
                    emojiClassName="text-2xl leading-none"
                  />
                  <div>
                    <span className="text-slate-900 dark:text-white">Edit Ratings: {editingTeam.name}</span>
                    <span className="ml-2 text-xs font-mono font-normal text-muted-foreground uppercase">
                      ({editingTeam.code})
                    </span>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-elo" className="text-xs font-semibold text-muted-foreground flex justify-between">
                    <span>Elo Rating</span>
                    {/* <span className="font-normal font-mono opacity-80">(Historic Strength)</span> */}
                  </Label>
                  <Input
                    id="edit-elo"
                    type="number"
                    value={editingTeam.elo}
                    onChange={(e) => setEditingTeam({ ...editingTeam, elo: Number(e.target.value) })}
                    className="bg-background/50 border-slate-200 dark:border-white/10 text-lg font-bold text-foreground font-mono h-11 focus-visible:ring-neon"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-attack" className="text-xs font-semibold text-muted-foreground flex justify-between">
                    <span>Attack rating (Att)</span>
                    {/* <span className="font-normal font-mono opacity-80">(Scale: 15 - 99)</span> */}
                  </Label>
                  <Input
                    id="edit-attack"
                    type="number"
                    min={15}
                    max={99}
                    value={editingTeam.attack}
                    onChange={(e) => setEditingTeam({ ...editingTeam, attack: Number(e.target.value) })}
                    className="bg-background/50 border-slate-200 dark:border-white/10 text-lg font-bold text-foreground font-mono h-11 focus-visible:ring-neon"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-defense" className="text-xs font-semibold text-muted-foreground flex justify-between">
                    <span>Defense rating (Def)</span>
                    {/* <span className="font-normal font-mono opacity-80">(Scale: 15 - 99)</span> */}
                  </Label>
                  <Input
                    id="edit-defense"
                    type="number"
                    min={15}
                    max={99}
                    value={editingTeam.defense}
                    onChange={(e) => setEditingTeam({ ...editingTeam, defense: Number(e.target.value) })}
                    className="bg-background/50 border-slate-200 dark:border-white/10 text-lg font-bold text-foreground font-mono h-11 focus-visible:ring-neon"
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-6 border-t border-slate-200/60 dark:border-white/10">
                  <button
                    onClick={() => {
                      setEditStatsModalOpen(false);
                      setEditingTeam(null);
                    }}
                    className="px-4.5 py-2 rounded-full text-xs font-bold text-red-600 hover:text-red-700 border border-red-200 bg-red-50 hover:bg-red-100 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/15 dark:hover:text-red-200 transition-all"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleSaveStats}
                    disabled={isSavingStats}
                    className="px-5 py-2 rounded-full font-bold text-xs bg-gradient-to-r from-neon via-cyan-500 to-blue-600 text-white shadow-[0_0_12px_rgba(0,255,255,0.3)] hover:shadow-[0_0_20px_rgba(0,255,255,0.5)] transition-all duration-300 disabled:opacity-50 flex items-center space-x-2"
                  >
                    {isSavingStats ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-t border-white"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Ratings</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
