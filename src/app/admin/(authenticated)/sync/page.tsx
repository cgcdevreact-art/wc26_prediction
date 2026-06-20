"use client";

import { useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Database,
  Trophy,
  Users,
  BarChart3,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

interface SyncResult {
  success: boolean;
  competition?: any;
  teams?: any;
  matches?: any;
  standings?: any;
  seeded?: number;
  error?: string;
}

const SYNC_ENDPOINTS = [
  {
    key: "full",
    label: "Full Sync",
    description: "Sync competitions, teams, matches, standings & seed probabilities",
    icon: Database,
    color: "violet",
    endpoint: "/api/admin/sync",
  },
  {
    key: "competitions",
    label: "Competitions",
    description: "Sync competition data from football-data.org",
    icon: Trophy,
    color: "amber",
    endpoint: "/api/admin/sync/competitions",
  },
  {
    key: "teams",
    label: "Teams",
    description: "Sync team rosters and data",
    icon: Users,
    color: "emerald",
    endpoint: "/api/admin/sync/teams",
  },
  {
    key: "matches",
    label: "Matches",
    description: "Sync match schedules and results",
    icon: Calendar,
    color: "blue",
    endpoint: "/api/admin/sync/matches",
  },
  {
    key: "standings",
    label: "Standings",
    description: "Sync current standings and table data",
    icon: BarChart3,
    color: "fuchsia",
    endpoint: "/api/admin/sync/standings",
  },
  {
    key: "fixtures",
    label: "Fixtures Cache",
    description: "Sync and cache fixture data",
    icon: Calendar,
    color: "cyan",
    endpoint: "/api/admin/sync/fixtures",
  },
];

export default function AdminSyncPage() {
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, SyncResult | null>>({});

  const handleSync = async (key: string, endpoint: string) => {
    setSyncing((prev) => ({ ...prev, [key]: true }));
    setResults((prev) => ({ ...prev, [key]: null }));

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${window.location.origin}`, // Will use session auth instead
        },
      });
      const data = await res.json();

      if (res.ok) {
        setResults((prev) => ({ ...prev, [key]: { success: true, ...data } }));
        toast.success(`${key} sync completed successfully`);
      } else {
        setResults((prev) => ({
          ...prev,
          [key]: { success: false, error: data.error || "Sync failed" },
        }));
        toast.error(`${key} sync failed: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      setResults((prev) => ({
        ...prev,
        [key]: { success: false, error: "Network error" },
      }));
      toast.error(`${key} sync failed: Network error`);
    } finally {
      setSyncing((prev) => ({ ...prev, [key]: false }));
    }
  };

  const colorMap: Record<string, string> = {
    violet: "bg-white border-violet-100 shadow-sm shadow-violet-100 hover:border-violet-200 hover:shadow-md hover:shadow-violet-200/50",
    amber: "bg-white border-amber-100 shadow-sm shadow-amber-100 hover:border-amber-200 hover:shadow-md hover:shadow-amber-200/50",
    emerald: "bg-white border-emerald-100 shadow-sm shadow-emerald-100 hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-200/50",
    blue: "bg-white border-blue-100 shadow-sm shadow-blue-100 hover:border-blue-200 hover:shadow-md hover:shadow-blue-200/50",
    fuchsia: "bg-white border-fuchsia-100 shadow-sm shadow-fuchsia-100 hover:border-fuchsia-200 hover:shadow-md hover:shadow-fuchsia-200/50",
    cyan: "bg-white border-cyan-100 shadow-sm shadow-cyan-100 hover:border-cyan-200 hover:shadow-md hover:shadow-cyan-200/50",
  };

  const iconBgMap: Record<string, string> = {
    violet: "bg-violet-50 border-violet-100",
    amber: "bg-amber-50 border-amber-100",
    emerald: "bg-emerald-50 border-emerald-100",
    blue: "bg-blue-50 border-blue-100",
    fuchsia: "bg-fuchsia-50 border-fuchsia-100",
    cyan: "bg-cyan-50 border-cyan-100",
  };

  const iconColorMap: Record<string, string> = {
    violet: "text-violet-600",
    amber: "text-amber-600",
    emerald: "text-emerald-600",
    blue: "text-blue-600",
    fuchsia: "text-fuchsia-600",
    cyan: "text-cyan-600",
  };

  const btnColorMap: Record<string, string> = {
    violet: "bg-violet-600 hover:bg-violet-700 shadow-violet-500/20",
    amber: "bg-amber-600 hover:bg-amber-700 shadow-amber-500/20",
    emerald: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20",
    blue: "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20",
    fuchsia: "bg-fuchsia-600 hover:bg-fuchsia-700 shadow-fuchsia-500/20",
    cyan: "bg-cyan-600 hover:bg-cyan-700 shadow-cyan-500/20",
  };

  return (
    <>
      <AdminHeader
        title="Data Sync"
        description="Sync football data from external APIs"
      />

      <div className="flex-1 overflow-y-auto p-8">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {SYNC_ENDPOINTS.map((item) => {
            const Icon = item.icon;
            const result = results[item.key];
            const isSyncing = syncing[item.key];

            return (
              <div
                key={item.key}
                className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${
                  colorMap[item.color]
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className={`grid h-11 w-11 place-items-center rounded-xl border ${iconBgMap[item.color]}`}>
                      <Icon
                        className={`h-5 w-5 ${iconColorMap[item.color]}`}
                      />
                    </div>
                    {result && (
                      <div>
                        {result.success ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>

                  <h3 className="mt-4 text-base font-semibold text-slate-900">
                    {item.label}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    {item.description}
                  </p>

                  {result && (
                    <div
                      className={`mt-3 rounded-lg px-3 py-2 text-[11px] ${
                        result.success
                          ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                          : "bg-red-50 border border-red-200 text-red-700"
                      }`}
                    >
                      {result.success
                        ? "✓ Sync completed successfully"
                        : `✗ ${result.error}`}
                    </div>
                  )}

                  <button
                    onClick={() => handleSync(item.key, item.endpoint)}
                    disabled={isSyncing}
                    className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold text-white shadow-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
                      btnColorMap[item.color]
                    }`}
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3.5 w-3.5" />
                        Sync Now
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
