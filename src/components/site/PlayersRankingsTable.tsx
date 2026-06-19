"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { PlayerStats } from "@/lib/store/simulationStore";

type RankedPlayer = {
  id: string;
  teamCode: string;
  team: string;
  playerName: string;
  shirtName: string;
  squadNo: string;
  position: string;
  positionCode: string;
  age: number;
  overallRating: number;
  overallRatingLabel: string;
  baseQuality: number;
  recentForm: number;
  internationalExperience: number;
  attackingImpact: number;
  defensiveImpact: number;
  passingCreativity: number;
  fitnessAvailability: number;
  disciplineRisk: number;
  matchImportance: number;
  ratingTier: string;
};

type SortKey =
  | "playerName"
  | "team"
  | "position"
  | "age"
  | "overallRating"
  | "baseQuality"
  | "recentForm"
  | "internationalExperience"
  | "attackingImpact"
  | "defensiveImpact"
  | "passingCreativity"
  | "fitnessAvailability"
  | "disciplineRisk"
  | "matchImportance"
  | "ratingTier";

const PAGE_SIZES = [25, 50, 100];

const parseNumber = (value: string | undefined, fallback = 0) => {
  const cleaned = String(value || "").replace("%", "").trim();
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function PlayersRankingsTable({
  initialPlayers,
  flagMap,
}: {
  initialPlayers: PlayerStats[];
  flagMap: Record<string, string>;
}) {
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("ALL");
  const [positionFilter, setPositionFilter] = useState("ALL");
  const [tierFilter, setTierFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({
    key: "overallRating",
    direction: "desc",
  });

  const players = useMemo<RankedPlayer[]>(() => {
    return initialPlayers.map((player) => ({
      id: `${player["Team Code"]}-${player["Player Name"]}`,
      teamCode: player["Team Code"],
      team: player.Team,
      playerName: player["Player Name"],
      shirtName: player["Name on Shirt"] || player["Player Name"],
      squadNo: player["Squad No."],
      position: player.Position,
      positionCode: player["Position Code"],
      age: parseNumber(player["Age on 2026-06-11"]),
      overallRating: parseNumber(player["Overall Rating"]),
      overallRatingLabel: player["Overall Rating"] || "0%",
      baseQuality: parseNumber(player["Base Quality"]),
      recentForm: parseNumber(player["Recent Form"]),
      internationalExperience: parseNumber(player["International Experience"]),
      attackingImpact: parseNumber(player["Attacking Impact"]),
      defensiveImpact: parseNumber(player["Defensive Impact"]),
      passingCreativity: parseNumber(player["Passing / Creativity"]),
      fitnessAvailability: parseNumber(player["Fitness / Availability"]),
      disciplineRisk: parseNumber(player["Discipline Risk"]),
      matchImportance: parseNumber(player["Match Importance"]),
      ratingTier: player["Rating Tier"] || "Unknown",
    }));
  }, [initialPlayers]);

  const teamOptions = useMemo(
    () => [
      { value: "ALL", label: "All Teams" },
      ...Array.from(new Map(players.map((player) => [player.teamCode, player.team])).entries())
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    ],
    [players],
  );
  const positionOptions = useMemo(
    () => [
      { value: "ALL", label: "All Positions" },
      ...Array.from(new Map(players.map((player) => [player.positionCode, player.position])).entries())
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    ],
    [players],
  );
  const tierOptions = useMemo(
    () => ["ALL", ...Array.from(new Set(players.map((player) => player.ratingTier))).sort()],
    [players],
  );

  const filteredPlayers = useMemo(() => {
    const loweredSearch = search.toLowerCase();
    return players.filter((player) => {
      if (
        loweredSearch &&
        !player.playerName.toLowerCase().includes(loweredSearch) &&
        !player.team.toLowerCase().includes(loweredSearch) &&
        !player.position.toLowerCase().includes(loweredSearch)
      ) {
        return false;
      }
      if (teamFilter !== "ALL" && player.teamCode !== teamFilter) return false;
      if (positionFilter !== "ALL" && player.positionCode !== positionFilter) return false;
      if (tierFilter !== "ALL" && player.ratingTier !== tierFilter) return false;
      return true;
    });
  }, [players, search, teamFilter, positionFilter, tierFilter]);

  const sortedPlayers = useMemo(() => {
    return [...filteredPlayers].sort((a, b) => {
      const direction = sort.direction === "asc" ? 1 : -1;
      const aValue = a[sort.key];
      const bValue = b[sort.key];
      if (typeof aValue === "string" && typeof bValue === "string") {
        return aValue.localeCompare(bValue) * direction;
      }
      return ((aValue as number) > (bValue as number) ? 1 : (aValue as number) < (bValue as number) ? -1 : 0) * direction;
    });
  }, [filteredPlayers, sort]);

  const totalPages = Math.max(1, Math.ceil(sortedPlayers.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedPlayers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedPlayers.slice(start, start + pageSize);
  }, [sortedPlayers, currentPage, pageSize]);

  const setAndResetPage = (fn: () => void) => {
    fn();
    setPage(1);
  };

  const toggleSort = (key: SortKey) => {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: key === "playerName" || key === "team" || key === "position" || key === "ratingTier" ? "asc" : "desc" },
    );
  };

  const renderSortIcon = (key: SortKey) => {
    if (sort.key !== key) return <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />;
    return sort.direction === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
    );
  };

  const columns: { key: SortKey; label: string; render: (player: RankedPlayer) => React.ReactNode }[] = [
    { key: "position", label: "Position", render: (player) => player.position },
    { key: "age", label: "Age", render: (player) => player.age.toFixed(1) },
    { key: "overallRating", label: "Overall", render: (player) => player.overallRatingLabel },
    { key: "baseQuality", label: "Base Quality", render: (player) => player.baseQuality },
    { key: "recentForm", label: "Recent Form", render: (player) => player.recentForm },
    { key: "internationalExperience", label: "Intl Exp", render: (player) => player.internationalExperience },
    { key: "attackingImpact", label: "Attack Impact", render: (player) => player.attackingImpact },
    { key: "defensiveImpact", label: "Defense Impact", render: (player) => player.defensiveImpact },
    { key: "passingCreativity", label: "Passing/Creativity", render: (player) => player.passingCreativity },
    { key: "fitnessAvailability", label: "Fitness", render: (player) => player.fitnessAvailability },
    { key: "disciplineRisk", label: "Discipline Risk", render: (player) => player.disciplineRisk },
    { key: "matchImportance", label: "Match Importance", render: (player) => player.matchImportance },
    { key: "ratingTier", label: "Rating Tier", render: (player) => player.ratingTier },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-[0_20px_50px_rgba(15,23,42,0.08)] md:grid-cols-2 xl:grid-cols-5 dark:border-white/10 dark:bg-slate-950">
        <div className="relative xl:col-span-2">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>
          <Input
            type="text"
            placeholder="Search players, teams, clubs..."
            value={search}
            onChange={(e) => setAndResetPage(() => setSearch(e.target.value))}
            className="h-12 rounded-xl border-slate-200 bg-white pl-10 text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:ring-cyan-500 dark:border-white/10 dark:bg-white/[0.04] dark:focus-visible:ring-neon"
          />
        </div>
        <select
          value={teamFilter}
          onChange={(e) => setAndResetPage(() => setTeamFilter(e.target.value))}
          className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm text-foreground shadow-sm outline-none focus:border-cyan-500 dark:border-white/10 dark:bg-white/[0.04]"
        >
          {teamOptions.map((team) => <option key={team.value} value={team.value}>{team.label}</option>)}
        </select>
        <select
          value={positionFilter}
          onChange={(e) => setAndResetPage(() => setPositionFilter(e.target.value))}
          className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm text-foreground shadow-sm outline-none focus:border-cyan-500 dark:border-white/10 dark:bg-white/[0.04]"
        >
          {positionOptions.map((position) => <option key={position.value} value={position.value}>{position.label}</option>)}
        </select>
        <select
          value={tierFilter}
          onChange={(e) => setAndResetPage(() => setTierFilter(e.target.value))}
          className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm text-foreground shadow-sm outline-none focus:border-cyan-500 dark:border-white/10 dark:bg-white/[0.04]"
        >
          <option value="ALL">All Tiers</option>
          {tierOptions.filter((v) => v !== "ALL").map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto scrollbar-custom rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-950">
        <table className="w-full min-w-[1500px] text-left text-[13px]">
          <thead className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-cyan-50/40 text-[10px] uppercase tracking-[0.14em] text-slate-600 dark:border-white/10 dark:bg-[linear-gradient(90deg,rgba(255,255,255,0.04),rgba(6,182,212,0.05),rgba(255,255,255,0.04))] dark:text-slate-300">
            <tr>
              <th className="w-12 px-3 py-3 font-semibold whitespace-nowrap">#</th>
              <th className="w-[260px] px-3 py-3 font-semibold whitespace-nowrap">
                <button onClick={() => toggleSort("playerName")} className="flex items-center gap-1 whitespace-nowrap">
                  <span>Player</span>{renderSortIcon("playerName")}
                </button>
              </th>
              <th className="w-[180px] px-3 py-3 font-semibold whitespace-nowrap">
                <button onClick={() => toggleSort("team")} className="flex items-center gap-1 whitespace-nowrap">
                  <span>Team</span>{renderSortIcon("team")}
                </button>
              </th>
              {columns.map((column) => (
                <th key={column.key} className="px-2.5 py-3 font-semibold whitespace-nowrap">
                  <button onClick={() => toggleSort(column.key)} className="flex items-center gap-1 whitespace-nowrap">
                    <span>{column.label}</span>{renderSortIcon(column.key)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedPlayers.map((player, index) => (
              <tr
                key={player.id}
                className="border-b border-slate-100 transition-colors hover:bg-gradient-to-r hover:from-cyan-50/50 hover:to-fuchsia-50/40 dark:border-white/5 dark:hover:bg-[linear-gradient(90deg,rgba(6,182,212,0.08),rgba(217,70,239,0.05))]"
              >
                <td className="px-3 py-3">
                  <span className="inline-flex min-w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                    {(currentPage - 1) * pageSize + index + 1}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-semibold text-slate-950 dark:text-white">{player.playerName}</div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">#{player.squadNo} {player.shirtName}</div>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <CountryFlag code={player.teamCode} flag={flagMap[player.teamCode]} name={player.team} className="h-5 w-7 shrink-0 rounded object-cover" emojiClassName="text-xl leading-none" />
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-900 dark:text-white">{player.team}</div>
                        <div className="text-[10px] tracking-wider text-slate-500 dark:text-slate-400">{player.position}</div>
                      </div>
                    </div>
                  </td>
                {columns.map((column) => (
                  <td key={column.key} className="px-2.5 py-3 font-mono tabular-nums text-slate-800 dark:text-slate-100">
                    {column.key === "overallRating" ? (
                      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
                        {column.render(player)}
                      </span>
                    ) : column.key === "position" ? (
                      <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-0.5 font-semibold text-sky-700 ring-1 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20">
                        {column.render(player)}
                      </span>
                    ) : column.key === "ratingTier" ? (
                      <span className="inline-flex rounded-full bg-fuchsia-50 px-2.5 py-0.5 font-semibold text-fuchsia-700 ring-1 ring-fuchsia-200 dark:bg-fuchsia-500/10 dark:text-fuchsia-300 dark:ring-fuchsia-500/20">
                        {column.render(player)}
                      </span>
                    ) : (
                      <span className="font-semibold">{column.render(player)}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {paginatedPlayers.length === 0 && <div className="py-20 text-center text-muted-foreground">No players match your current filters.</div>}
      </div>

      <div className="flex flex-col gap-4 rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 shadow-sm md:flex-row md:items-center md:justify-between dark:border-white/10 dark:bg-slate-950">
        <div className="text-sm text-slate-600 dark:text-slate-300">
          Showing <span className="font-semibold text-slate-950 dark:text-white">{sortedPlayers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> to <span className="font-semibold text-slate-950 dark:text-white">{Math.min(currentPage * pageSize, sortedPlayers.length)}</span> of <span className="font-semibold text-slate-950 dark:text-white">{sortedPlayers.length}</span> players
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Rows</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-foreground shadow-sm outline-none focus:border-cyan-500 dark:border-white/10 dark:bg-white/[0.04]"
            >
              {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((v) => Math.max(1, v - 1))}
              disabled={currentPage === 1}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
            >
              Previous
            </button>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200">
              Page {currentPage} of {totalPages}
            </div>
            <button
              onClick={() => setPage((v) => Math.min(totalPages, v + 1))}
              disabled={currentPage === totalPages}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
