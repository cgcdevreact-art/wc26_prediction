"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ChevronLeft, ChevronRight, Loader2, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface PredictionData {
  id: string;
  type: string;
  predictedHomeScore: number | null;
  predictedAwayScore: number | null;
  predictedWinner: string | null;
  createdAt: string;
  user: { name: string | null; email: string | null } | null;
  match: {
    homeTeam: { shortName: string | null; tla: string | null } | null;
    awayTeam: { shortName: string | null; tla: string | null } | null;
    utcDate: string;
  } | null;
  points: { points: number } | null;
}

export default function AdminPredictionsPage() {
  const [predictions, setPredictions] = useState<PredictionData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const limit = 20;

  const fetchPredictions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search && { search }),
        ...(type && { type }),
      });
      const res = await fetch(`/api/admin/predictions?${params}`);
      const data = await res.json();
      setPredictions(data.predictions || []);
      setTotal(data.total || 0);
    } catch {
      toast.error("Failed to fetch predictions");
    } finally {
      setLoading(false);
    }
  }, [page, search, type]);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  const deletePrediction = async (id: string) => {
    if (!confirm("Are you sure you want to delete this prediction?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/predictions?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Prediction deleted successfully");
        fetchPredictions();
      } else {
        toast.error("Failed to delete prediction");
      }
    } catch {
      toast.error("Failed to delete prediction");
    } finally {
      setDeleting(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <>
      <AdminHeader
        title="Predictions"
        description={`${total} predictions across all users`}
      />

      <div className="flex-1 overflow-y-auto p-8">
        {/* Search & Filter */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by user or team..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
            />
          </div>

          <div className="w-full sm:w-56">
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-850 outline-none transition focus:border-violet-400 focus:ring-1 focus:ring-violet-400 cursor-pointer font-medium"
            >
              <option value="">All Types</option>
              <option value="MATCH_SCORE">Match Score</option>
              <option value="TOURNAMENT_CHAMPION">Tournament Champion</option>
              <option value="COUNTRY_PROJECTION">Country Projection</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  User
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Match
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Prediction
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Type
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Points
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Date
                </th>
                <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-violet-500" />
                  </td>
                </tr>
              ) : predictions.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-16 text-center text-sm text-slate-500"
                  >
                    No predictions found
                  </td>
                </tr>
              ) : (
                predictions.map((pred) => (
                  <tr
                    key={pred.id}
                    className="border-b border-slate-100 transition-colors hover:bg-slate-50"
                  >
                    <td className="px-5 py-3.5">
                      <div>
                        <div className="text-sm font-medium text-slate-800">
                          {pred.user?.name || "Anonymous"}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {pred.user?.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-600">
                      {pred.match
                        ? `${pred.match.homeTeam?.shortName || pred.match.homeTeam?.tla || "TBD"} vs ${pred.match.awayTeam?.shortName || pred.match.awayTeam?.tla || "TBD"}`
                        : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      {pred.predictedHomeScore !== null &&
                      pred.predictedAwayScore !== null ? (
                        <span className="text-sm font-semibold text-slate-700">
                          {pred.predictedHomeScore} – {pred.predictedAwayScore}
                        </span>
                      ) : pred.predictedWinner ? (
                        <span className="text-sm text-slate-500">
                          {pred.predictedWinner.replace("_", " ")}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex rounded-md bg-violet-50 border border-violet-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-600">
                        {pred.type.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {pred.points ? (
                        <span className="text-sm font-semibold text-emerald-600">
                          +{pred.points.points}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-slate-400">
                      {new Date(pred.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => deletePrediction(pred.id)}
                        disabled={deleting === pred.id}
                        className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-650 hover:bg-red-100 transition disabled:opacity-50 cursor-pointer"
                        title="Delete prediction"
                      >
                        {deleting === pred.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
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
