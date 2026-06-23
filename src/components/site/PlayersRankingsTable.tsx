"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { PlayerStats } from "@/lib/store/simulationStore";
import { useSession } from "next-auth/react";
import { UpgradeModal } from "@/components/site/UpgradeModal";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

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
  const { data: session } = useSession();
  const subTier = session?.user?.subscriptionTier || "free";
  const [upgradeOpen, setUpgradeOpen] = useState(false);

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

  const columns: { key: SortKey; label: string; tooltip: string; render: (player: RankedPlayer) => React.ReactNode }[] = [
    { key: "position", label: "Pos", tooltip: "Player Field Position", render: (player) => player.position },
    { key: "age", label: "Age", tooltip: "Player Age in years", render: (player) => player.age.toFixed(1) },
    { key: "overallRating", label: "OVR", tooltip: "Overall Skill Rating", render: (player) => player.overallRatingLabel },
    { key: "baseQuality", label: "Base", tooltip: "Base Quality (fundamental talent baseline)", render: (player) => player.baseQuality },
    { key: "recentForm", label: "Form", tooltip: "Recent Performance Form rating", render: (player) => player.recentForm },
    { key: "internationalExperience", label: "Intl", tooltip: "International Experience rating", render: (player) => player.internationalExperience },
    { key: "attackingImpact", label: "Att", tooltip: "Attacking Impact rating", render: (player) => player.attackingImpact },
    { key: "defensiveImpact", label: "Def", tooltip: "Defensive Impact rating", render: (player) => player.defensiveImpact },
    { key: "passingCreativity", label: "Pass", tooltip: "Passing & Creativity quality", render: (player) => player.passingCreativity },
    { key: "fitnessAvailability", label: "Fit", tooltip: "Fitness & Availability rating", render: (player) => player.fitnessAvailability },
    { key: "disciplineRisk", label: "Disc", tooltip: "Discipline Risk (card frequency)", render: (player) => player.disciplineRisk },
    { key: "matchImportance", label: "Imp", tooltip: "Match Importance weighting", render: (player) => player.matchImportance },
    { key: "ratingTier", label: "Tier", tooltip: "Rating Tier Category", render: (player) => player.ratingTier },
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
        <table className="w-full text-left text-[11px] sm:text-xs table-auto">
          <thead className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-cyan-50/40 text-[9px] sm:text-[10px] uppercase tracking-[0.14em] text-slate-600 dark:border-white/10 dark:bg-[linear-gradient(90deg,rgba(255,255,255,0.04),rgba(6,182,212,0.05),rgba(255,255,255,0.04))] dark:text-slate-300">
            <tr>
              <th className="w-10 px-1.5 py-3 font-semibold whitespace-nowrap">#</th>
              <th className="w-[140px] sm:w-[180px] px-1.5 py-3 font-semibold whitespace-nowrap">
                <button onClick={() => toggleSort("playerName")} className="flex items-center gap-1 whitespace-nowrap">
                  <span>Player</span>{renderSortIcon("playerName")}
                </button>
              </th>
              <th className="w-[100px] sm:w-[130px] px-1.5 py-3 font-semibold whitespace-nowrap">
                <button 
                  onClick={subTier === "free" ? (e) => { e.stopPropagation(); setUpgradeOpen(true); } : () => toggleSort("team")} 
                  className="flex items-center gap-1 whitespace-nowrap"
                >
                  <span>Team</span>{renderSortIcon("team")}
                </button>
              </th>
              {columns.map((column) => (
                <th key={column.key} className="px-1 py-3 font-semibold whitespace-nowrap">
                  <button 
                    onClick={subTier === "free" ? (e) => { e.stopPropagation(); setUpgradeOpen(true); } : () => toggleSort(column.key)} 
                    className="flex items-center gap-1 whitespace-nowrap"
                  >
                    <TableHeaderCell tooltip={column.tooltip}>{column.label}</TableHeaderCell>
                    {renderSortIcon(column.key)}
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
                <td className="px-1.5 py-2">
                  <span className="inline-flex min-w-6 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono text-[10px] text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                    {(currentPage - 1) * pageSize + index + 1}
                  </span>
                </td>
                <td className="px-1.5 py-2">
                  <div className="min-w-0 max-w-[120px] sm:max-w-[180px] truncate" title={player.playerName}>
                    <div className="truncate text-xs sm:text-[13px] font-semibold text-slate-950 dark:text-white">{player.playerName}</div>
                    <div className="text-[9px] uppercase tracking-wider text-slate-550 dark:text-slate-400 truncate">#{player.squadNo} {player.shirtName}</div>
                  </div>
                </td>
                <td 
                  className={`px-1.5 py-2 ${subTier === "free" ? "cursor-pointer hover:bg-slate-200/50 dark:hover:bg-white/10" : ""}`}
                  onClick={subTier === "free" ? (e) => { e.stopPropagation(); setUpgradeOpen(true); } : undefined}
                >
                  <div className={`flex items-center gap-1.5 min-w-0 max-w-[90px] sm:max-w-[130px] truncate ${subTier === "free" ? "blur-[5px] select-none pointer-events-none" : ""}`} title={player.team}>
                    <CountryFlag code={player.teamCode} flag={flagMap[player.teamCode]} name={player.team} className="h-4.5 w-6 shrink-0 rounded object-cover" emojiClassName="text-base leading-none" />
                    <div className="min-w-0 truncate">
                      <div className="truncate font-semibold text-slate-900 dark:text-white text-xs sm:text-[13px]">{player.team}</div>
                      <div className="text-[9px] tracking-wider text-slate-500 dark:text-slate-400 truncate">{player.position}</div>
                    </div>
                  </div>
                </td>
                {columns.map((column) => (
                  <td 
                    key={column.key} 
                    className={`px-1 py-2 font-mono tabular-nums text-slate-800 dark:text-slate-100 text-[10px] sm:text-xs ${subTier === "free" ? "cursor-pointer hover:bg-slate-200/50 dark:hover:bg-white/10" : ""}`}
                    onClick={subTier === "free" ? (e) => { e.stopPropagation(); setUpgradeOpen(true); } : undefined}
                  >
                    <span className={subTier === "free" ? "blur-[5px] select-none pointer-events-none" : ""}>
                      {column.key === "overallRating" ? (
                        <span className="inline-flex rounded-full bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
                          {column.render(player)}
                        </span>
                      ) : column.key === "position" ? (
                        <span className="inline-flex rounded-full bg-sky-50 px-1.5 py-0.5 font-semibold text-sky-700 ring-1 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20">
                          {column.render(player)}
                        </span>
                      ) : column.key === "ratingTier" ? (
                        <span className="inline-flex rounded-full bg-fuchsia-50 px-1.5 py-0.5 font-semibold text-fuchsia-700 ring-1 ring-fuchsia-200 dark:bg-fuchsia-500/10 dark:text-fuchsia-300 dark:ring-fuchsia-500/20">
                          {column.render(player)}
                        </span>
                      ) : (
                        <span className="font-semibold">{column.render(player)}</span>
                      )}
                    </span>
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
      <UpgradeModal isOpen={upgradeOpen} onClose={() => setUpgradeOpen(false)} reason="plus" />
    </div>
  );
}
