"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTeams } from "@/components/TeamsProvider";
import { UpgradeModal } from "@/components/site/UpgradeModal";
import { PlayersRankingsTable } from "@/components/site/PlayersRankingsTable";
import { useSimulationStore, TeamStats, PlayerStats } from "@/lib/store/simulationStore";
import { CountryFlag } from "@/components/ui/CountryFlag";

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
};

type RankingSortKey =
  | "playersCount"
  | "eliteCount"
  | "strongCount"
  // | "winProbability"
  | "rank"
  | "elo"
  | "attack"
  | "defense"
  | "squadValueM"
  | "avgAge"
  | "goalsPerMatch";

export default function TeamsClient({
  initialTeams,
  initialPlayers,
  flagMap,
}: {
  initialTeams: TeamStats[];
  initialPlayers: PlayerStats[];
  flagMap: Record<string, string>;
}) {
  const { isInitialized, initializeData, teams, players } = useSimulationStore();
  const appTeams = useTeams();
  const router = useRouter();
  const { data: session } = useSession();

  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalReason, setModalReason] = useState<"plus" | "pro" | "credits" | "guest">("plus");
  const [rankingSearch, setRankingSearch] = useState("");
  const [rankingSort, setRankingSort] = useState<{ key: RankingSortKey; direction: "asc" | "desc" }>({
    key: "rank",
    direction: "asc",
  });

  const subTier = session?.user?.subscriptionTier || "free";

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
      };
    });
  }, [appTeams, flagMap, teams, players]);

  const filteredRankingTeams = useMemo(() => {
    if (!rankingSearch) return rankingTeams;
    const lowerSearch = rankingSearch.toLowerCase();
    return rankingTeams.filter(
      (team) =>
        team.name.toLowerCase().includes(lowerSearch) ||
        team.code.toLowerCase().includes(lowerSearch),
    );
  }, [rankingSearch, rankingTeams]);

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
    align?: "left" | "center" | "right";
    render: (team: RankingTeam) => string;
  }[] = [
    { key: "playersCount", label: "Players", render: (team) => String(team.playersCount) },
    { key: "eliteCount", label: "Elite", render: (team) => String(team.eliteCount) },
    { key: "strongCount", label: "Strong", render: (team) => String(team.strongCount) },
    { key: "rank", label: "FIFA Rank", render: (team) => `#${team.rank}` },
    { key: "elo", label: "Elo", render: (team) => team.elo.toFixed(2) },
    { key: "attack", label: "Attack", render: (team) => String(team.attack) },
    { key: "defense", label: "Defense", render: (team) => String(team.defense) },
    { key: "squadValueM", label: "Squad Value", render: (team) => `€${Math.round(team.squadValueM)}M` },
    { key: "avgAge", label: "Avg Age", render: (team) => team.avgAge.toFixed(1) },
    { key: "goalsPerMatch", label: "Goals/Match", render: (team) => team.goalsPerMatch.toFixed(2) },
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
    if (subTier === "free") {
      setModalReason("plus");
      setModalOpen(true);
      return;
    }
    router.push(`/teams/${teamCode}`);
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
                  <th className="w-14 rounded-tl-[1.75rem] px-4 py-3.5 text-left font-semibold whitespace-nowrap">Rk</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Team</th>
                  <th className="px-3 py-3.5 text-center font-semibold whitespace-nowrap">Players</th>
                  {subTier !== "free" && (
                    <>
                      <th className="px-3 py-3.5 text-center font-semibold whitespace-nowrap">Elite</th>
                      <th className="px-3 py-3.5 text-center font-semibold whitespace-nowrap">Strong</th>
                    </>
                  )}
                  <th className="w-16 px-3 py-3.5 text-center font-semibold whitespace-nowrap">Elo</th>
                  <th className="w-14 px-3 py-3.5 text-center font-semibold whitespace-nowrap">Att</th>
                  <th className="w-14 px-3 py-3.5 text-center font-semibold whitespace-nowrap">Def</th>
                  <th className="w-44 rounded-tr-[1.75rem] px-4 py-3.5 text-right font-semibold whitespace-nowrap">Top Player</th>
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
                      <td className="px-4 py-3.5">
                        <span className="inline-flex min-w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <CountryFlag
                            code={team["Team Code"]}
                            flag={flagMap[team["Team Code"]] || appTeam?.flag}
                            name={team.Team}
                            className="h-6 w-8 shrink-0 rounded object-cover drop-shadow-md"
                            emojiClassName="text-2xl leading-none drop-shadow-md"
                          />
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate font-bold text-slate-950 transition-colors group-hover:text-cyan-700 dark:text-white dark:group-hover:text-neon">
                              {team.Team}
                            </span>
                            <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">{team["Team Code"]}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <span className="inline-flex min-w-10 items-center justify-center rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-slate-700 ring-1 ring-slate-200 dark:bg-white/[0.05] dark:text-slate-200 dark:ring-white/10">
                          {team.Players}
                        </span>
                      </td>
                      {subTier !== "free" && (
                        <>
                          <td className="px-3 py-3.5 text-center">
                            <span className="inline-flex min-w-10 items-center justify-center rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-slate-700 ring-1 ring-slate-200 dark:bg-white/[0.05] dark:text-slate-200 dark:ring-white/10">
                              {team.Elite || "0"}
                            </span>
                          </td>
                          <td className="px-3 py-3.5 text-center">
                            <span className="inline-flex min-w-10 items-center justify-center rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-slate-700 ring-1 ring-slate-200 dark:bg-white/[0.05] dark:text-slate-200 dark:ring-white/10">
                              {team["Very Strong"] || "0"}
                            </span>
                          </td>
                        </>
                      )}
                      <td className="px-3 py-3.5 text-center font-mono tabular-nums text-foreground/80 dark:text-white/80">
                        <span className="font-semibold text-slate-800 dark:text-slate-100">
                          {appTeam?.elo ? Math.round(appTeam.elo) : "-"}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-center font-mono tabular-nums text-foreground/80 dark:text-white/80">
                        <span className="inline-flex min-w-12 items-center justify-center rounded-full bg-fuchsia-50 px-2.5 py-0.5 font-semibold text-fuchsia-700 ring-1 ring-fuchsia-200 dark:bg-fuchsia-500/10 dark:text-fuchsia-300 dark:ring-fuchsia-500/20">
                          {formatRating(appTeam?.attack)}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-center font-mono tabular-nums text-foreground/80 dark:text-white/80">
                        <span className="inline-flex min-w-12 items-center justify-center rounded-full bg-fuchsia-50 px-2.5 py-0.5 font-semibold text-fuchsia-700 ring-1 ring-fuchsia-200 dark:bg-fuchsia-500/10 dark:text-fuchsia-300 dark:ring-fuchsia-500/20">
                          {formatRating(appTeam?.defense)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-50 to-cyan-50 px-2.5 py-1 ring-1 ring-emerald-200 dark:from-emerald-500/10 dark:to-cyan-500/10 dark:ring-emerald-500/20">
                          <span className="truncate font-semibold text-emerald-700 dark:text-neon">
                            {topPlayerName || "N/A"}
                          </span>
                          {topPlayerRating && (
                            <span className="shrink-0 text-[11px] text-slate-500 dark:text-slate-300">
                              ({topPlayerRating})
                            </span>
                          )}
                        </div>
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
            <div className="relative max-w-md">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <Input
                type="text"
                placeholder="Search rankings..."
                value={rankingSearch}
                onChange={(e) => setRankingSearch(e.target.value)}
                className="h-12 rounded-xl border-slate-200 bg-white pl-10 text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:ring-cyan-500 dark:border-white/10 dark:bg-white/[0.04] dark:focus-visible:ring-neon"
              />
            </div>

            <div className="overflow-x-auto rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-950">
              <table className="w-full text-left text-[13px]">
                <thead className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-cyan-50/40 text-[10px] uppercase tracking-[0.14em] text-slate-600 dark:border-white/10 dark:bg-[linear-gradient(90deg,rgba(255,255,255,0.04),rgba(6,182,212,0.05),rgba(255,255,255,0.04))] dark:text-slate-300">
                  <tr>
                    <th className="w-12 px-3 py-3 font-semibold whitespace-nowrap">#</th>
                    <th className="w-[180px] px-3 py-3 font-semibold whitespace-nowrap">Team</th>
                    {rankingColumns.map((column) => (
                      <th key={column.key} className="px-2.5 py-3 font-semibold whitespace-nowrap">
                        <button
                          onClick={() => toggleRankingSort(column.key)}
                          className="flex items-center gap-1 whitespace-nowrap text-left transition hover:text-slate-950 dark:hover:text-white"
                        >
                          <span>{column.label}</span>
                          {renderSortIcon(column.key)}
                        </button>
                      </th>
                    ))}
                    <th className="w-[170px] px-3 py-3 text-right font-semibold whitespace-nowrap">Top Player</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRankingTeams.map((team, index) => (
                    <tr
                      key={team.code}
                      onClick={() => openTeam(team.code)}
                      className="group cursor-pointer border-b border-slate-100 transition-colors hover:bg-gradient-to-r hover:from-cyan-50/50 hover:to-fuchsia-50/40 dark:border-white/5 dark:hover:bg-[linear-gradient(90deg,rgba(6,182,212,0.08),rgba(217,70,239,0.05))]"
                    >
                      <td className="px-3 py-3">
                        <span className="inline-flex min-w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <CountryFlag
                            code={team.code}
                            flag={team.flag}
                            name={team.name}
                            className="h-5 w-7 shrink-0 rounded object-cover"
                            emojiClassName="text-xl leading-none"
                          />
                          <div className="min-w-0">
                            <div className="truncate text-[15px] font-semibold text-slate-950 group-hover:text-cyan-700 dark:text-white dark:group-hover:text-neon">
                              {team.name}
                            </div>
                            <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">{team.code}</div>
                          </div>
                        </div>
                      </td>
                      {rankingColumns.map((column) => (
                        <td
                          key={column.key}
                          className="px-2.5 py-3 font-mono tabular-nums text-slate-800 dark:text-slate-100"
                        >
                          {column.key === "rank" ? (
                            <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-0.5 font-semibold text-sky-700 ring-1 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20">
                              {column.render(team)}
                            </span>
                          ) : column.key === "attack" || column.key === "defense" ? (
                            <span className="inline-flex min-w-10 items-center justify-center rounded-full bg-fuchsia-50 px-2 py-0.5 font-semibold text-fuchsia-700 ring-1 ring-fuchsia-200 dark:bg-fuchsia-500/10 dark:text-fuchsia-300 dark:ring-fuchsia-500/20">
                              {column.render(team)}
                            </span>
                          ) : column.key === "playersCount" || column.key === "eliteCount" || column.key === "strongCount" ? (
                            <span className="inline-flex min-w-9 items-center justify-center rounded-full bg-slate-100 px-2 py-0.5 text-slate-700 ring-1 ring-slate-200 dark:bg-white/[0.05] dark:text-slate-200 dark:ring-white/10">
                              {column.render(team)}
                            </span>
                          ) : (
                            <span className="font-semibold">{column.render(team)}</span>
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-3 text-right">
                        <div className="inline-flex max-w-full items-center gap-1 rounded-full bg-gradient-to-r from-emerald-50 to-cyan-50 px-2 py-0.5 ring-1 ring-emerald-200 dark:from-emerald-500/10 dark:to-cyan-500/10 dark:ring-emerald-500/20">
                          <span className="truncate text-[13px] font-semibold text-emerald-700 dark:text-neon">
                            {team.topPlayerName}
                          </span>
                          {team.topPlayerRating && (
                            <span className="shrink-0 text-[10px] text-slate-500 dark:text-slate-300">
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
    </div>
  );
}
