"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ChevronLeft, ChevronRight, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";

interface MatchData {
  id: number;
  utcDate: string;
  status: string;
  matchday: number | null;
  stage: string | null;
  group: string | null;
  scoreHomeFullTime: number | null;
  scoreAwayFullTime: number | null;
  winner: string | null;
  homeTeam: { name: string; shortName: string | null; tla: string | null; crest: string | null } | null;
  awayTeam: { name: string; shortName: string | null; tla: string | null; crest: string | null } | null;
}

export default function AdminMatchesPage() {
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("utcDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState("");
  const limit = 20;

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sort: sortBy,
        order: sortOrder,
        ...(statusFilter && { status: statusFilter }),
      });
      const res = await fetch(`/api/admin/matches?${params}`);
      const data = await res.json();
      setMatches(data.matches || []);
      setTotal(data.total || 0);
    } catch {
      toast.error("Failed to fetch matches");
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, sortOrder, statusFilter]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const totalPages = Math.ceil(total / limit);

  const statusColors: Record<string, string> = {
    FINISHED: "bg-emerald-50 border-emerald-200 text-emerald-600",
    SCHEDULED: "bg-blue-50 border-blue-200 text-blue-600",
    TIMED: "bg-blue-50 border-blue-200 text-blue-600",
    IN_PLAY: "bg-amber-50 border-amber-200 text-amber-600",
    PAUSED: "bg-amber-50 border-amber-200 text-amber-600",
    POSTPONED: "bg-red-50 border-red-200 text-red-600",
    CANCELLED: "bg-red-50 border-red-200 text-red-600",
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return <ArrowUpDown className="ml-1 inline-block h-3 w-3 text-slate-300" />;
    return sortOrder === "asc" ? (
      <ArrowUp className="ml-1 inline-block h-3 w-3 text-violet-500" />
    ) : (
      <ArrowDown className="ml-1 inline-block h-3 w-3 text-violet-500" />
    );
  };

  return (
    <>
      <AdminHeader title="Matches" description={`${total} matches synced`} />

      <div className="flex-1 overflow-y-auto p-8">
        {/* Filters */}
        <div className="mb-6 flex items-center gap-4">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
          >
            <option value="">All Statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="TIMED">Timed</option>
            <option value="IN_PLAY">In Play</option>
            <option value="PAUSED">Paused</option>
            <option value="FINISHED">Finished</option>
            <option value="POSTPONED">Postponed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th 
                  className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer hover:bg-slate-100 transition"
                  onClick={() => handleSort("homeTeam")}
                >
                  Match <SortIcon column="homeTeam" />
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Score
                </th>
                <th 
                  className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer hover:bg-slate-100 transition"
                  onClick={() => handleSort("status")}
                >
                  Status <SortIcon column="status" />
                </th>
                <th 
                  className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer hover:bg-slate-100 transition"
                  onClick={() => handleSort("stage")}
                >
                  Stage <SortIcon column="stage" />
                </th>
                <th 
                  className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer hover:bg-slate-100 transition"
                  onClick={() => handleSort("utcDate")}
                >
                  Date <SortIcon column="utcDate" />
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-violet-500" />
                  </td>
                </tr>
              ) : matches.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-16 text-center text-sm text-slate-500"
                  >
                    No matches found. Try syncing data first.
                  </td>
                </tr>
              ) : (
                matches.map((match) => (
                  <tr
                    key={match.id}
                    className="border-b border-slate-100 transition-colors hover:bg-slate-50"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="text-sm">
                          <span className="font-medium text-slate-800">
                            {match.homeTeam?.shortName || match.homeTeam?.tla || "TBD"}
                          </span>
                          <span className="mx-2 text-slate-400">vs</span>
                          <span className="font-medium text-slate-800">
                            {match.awayTeam?.shortName || match.awayTeam?.tla || "TBD"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {match.status === "FINISHED" ? (
                        <span className="text-sm font-semibold text-slate-700">
                          {match.scoreHomeFullTime} – {match.scoreAwayFullTime}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">— – —</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                          statusColors[match.status] || "bg-slate-100 border-slate-200 text-slate-500"
                        }`}
                      >
                        {match.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-slate-500">
                        {match.stage || match.group || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-slate-400">
                      {new Date(match.utcDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-5 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Showing {(page - 1) * limit + 1}–
              {Math.min(page * limit, total)} of {total}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-slate-500">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
