"use client";

import { useState, useEffect, useCallback } from "react";
import { CommissionerHeader } from "@/components/commissioner/CommissionerHeader";
import { Search, Loader2, Target, Calendar, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";

interface PredictionData {
  id: string;
  type: string;
  predictedHomeScore: number | null;
  predictedAwayScore: number | null;
  predictedWinner: string | null;
  createdAt: string;
  user: {
    name: string | null;
    email: string | null;
    subscriptionTier?: string;
  };
  match: {
    homeTeam: { name: string } | null;
    awayTeam: { name: string } | null;
  } | null;
  points: { points: number } | null;
}

export default function CommissionerPredictionsPage() {
  const [predictions, setPredictions] = useState<PredictionData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const limit = 15;

  const fetchPredictions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy,
        sortOrder,
        ...(search && { search }),
        ...(typeFilter && { type: typeFilter }),
        ...(dateFilter && dateFilter !== "all" && { dateFilter }),
      });
      const res = await fetch(`/api/commissioner/predictions?${params}`);
      const data = await res.json();
      setPredictions(data.predictions || []);
      setTotal(data.total || 0);
    } catch {
      toast.error("Failed to fetch predictions");
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, dateFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

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

  const totalPages = Math.ceil(total / limit);

  return (
    <>
      <CommissionerHeader title="Predictions" description={`${total} total predictions made`} />

      <div className="flex-1 overflow-y-auto p-8">
        {/* Search & Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by user name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
            >
              <option value="">All Types</option>
              <option value="MATCH_SCORE">Match Score</option>
              <option value="TOURNAMENT_CHAMPION">Champion</option>
              <option value="GROUP_WINNER">Group Winner</option>
              <option value="TOP_SCORER">Top Scorer</option>
              <option value="FINALIST">Finalist</option>
              <option value="SEMI_FINALIST">Semi Finalist</option>
              <option value="QUARTER_FINALIST">Quarter Finalist</option>
              <option value="STAGE_EXIT">Stage Exit</option>
            </select>
            
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
            >
              <option value="all">All Time</option>
              <option value="1d">Past 24 Hours</option>
              <option value="1w">Past 1 Week</option>
              <option value="1m">Past 1 Month</option>
              <option value="3m">Past 3 Months</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th 
                  className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer hover:bg-slate-100 transition"
                  onClick={() => handleSort("user.name")}
                >
                  User <SortIcon column="user.name" />
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  User Plan
                </th>
                <th 
                  className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer hover:bg-slate-100 transition"
                  onClick={() => handleSort("type")}
                >
                  Type <SortIcon column="type" />
                </th>
                <th 
                  className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer hover:bg-slate-100 transition"
                  onClick={() => handleSort("createdAt")}
                >
                  Date <SortIcon column="createdAt" />
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-violet-500" />
                  </td>
                </tr>
              ) : predictions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-sm text-slate-500">
                    No predictions found
                  </td>
                </tr>
              ) : (
                predictions.map((pred) => (
                  <tr
                    key={pred.id}
                    className="border-b border-slate-100 transition-colors hover:bg-slate-50"
                  >
                    {/* User */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-100 to-fuchsia-100 text-xs font-bold text-violet-600 border border-violet-200/50">
                          {pred.user.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-800">
                            {pred.user.name || "Unknown"}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {pred.user.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* User Plan */}
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                        pred.user.subscriptionTier === "pro" ? "bg-amber-50 border-amber-200 text-amber-600" :
                        pred.user.subscriptionTier === "plus" ? "bg-blue-50 border-blue-200 text-blue-600" :
                        "bg-slate-50 border-slate-200 text-slate-500"
                      }`}>
                        {pred.user.subscriptionTier === "pro" ? "Expert" :
                         pred.user.subscriptionTier === "plus" ? "Advanced" : 
                         "Free"}
                      </span>
                    </td>

                    {/* Type Badge */}
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 border border-slate-200">
                        <Target className="h-3 w-3 text-slate-400" />
                        {pred.type.replace(/_/g, " ")}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                        <Calendar className="h-3 w-3" />
                        {new Date(pred.createdAt).toLocaleDateString()}
                      </div>
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
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
