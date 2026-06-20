import { prisma } from "@/lib/prisma";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { StatsCard } from "@/components/admin/StatsCard";
import { Users, Trophy, Target, CreditCard, Activity, Clock } from "lucide-react";
import Link from "next/link";

export default async function AdminDashboard() {
  // Fetch stats
  const [userCount, matchCount, predictionCount, paidUsers, recentUsers, recentPredictions] =
    await Promise.all([
      prisma.user.count(),
      prisma.match.count(),
      prisma.prediction.count(),
      prisma.user.count({
        where: { subscriptionTier: { not: "free" } },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.prediction.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          user: { select: { name: true, email: true } },
          match: {
            select: {
              homeTeam: { select: { shortName: true } },
              awayTeam: { select: { shortName: true } },
            },
          },
        },
      }),
    ]);

  return (
    <>
      <AdminHeader
        title="Dashboard"
        description="Overview of WC26 Predict platform"
      />

      <div className="flex-1 overflow-y-auto p-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatsCard
            title="Total Users"
            value={userCount.toLocaleString()}
            change="+12 this week"
            changeType="positive"
            icon={Users}
            iconColor="text-violet-600"
            iconBg="bg-violet-50"
          />
          <StatsCard
            title="Total Matches"
            value={matchCount.toLocaleString()}
            icon={Trophy}
            iconColor="text-amber-600"
            iconBg="bg-amber-50"
          />
          <StatsCard
            title="Predictions Made"
            value={predictionCount.toLocaleString()}
            change="Active"
            changeType="positive"
            icon={Target}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-50"
          />
          <StatsCard
            title="Paid Subscribers"
            value={paidUsers.toLocaleString()}
            icon={CreditCard}
            iconColor="text-fuchsia-600"
            iconBg="bg-fuchsia-50"
          />
        </div>

        {/* Two-Column Content */}
        <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* Recent Users */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-violet-500" />
                <h2 className="text-sm font-semibold text-slate-800">
                  Recent Users
                </h2>
              </div>
              <Link
                href="/admin/users"
                className="text-xs text-violet-500 hover:text-violet-700 transition-colors"
              >
                View all →
              </Link>
            </div>
            <div className="space-y-3">
              {recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-100 to-fuchsia-100 text-xs font-bold text-violet-600 border border-violet-200/50">
                      {user.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-700">
                        {user.name || "Unknown"}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {user.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.role === "admin" && (
                      <span className="rounded-md bg-violet-100 border border-violet-200 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-600">
                        Admin
                      </span>
                    )}
                    <span className="text-[11px] text-slate-300">
                      {user.createdAt.toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
              {recentUsers.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">No users yet</p>
              )}
            </div>
          </div>

          {/* Recent Predictions */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-500" />
                <h2 className="text-sm font-semibold text-slate-800">
                  Recent Predictions
                </h2>
              </div>
              <Link
                href="/admin/predictions"
                className="text-xs text-violet-500 hover:text-violet-700 transition-colors"
              >
                View all →
              </Link>
            </div>
            <div className="space-y-3">
              {recentPredictions.map((pred) => (
                <div
                  key={pred.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 transition-colors hover:bg-slate-50"
                >
                  <div>
                    <div className="text-sm font-medium text-slate-700">
                      {pred.user?.name || "Anonymous"}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {pred.match?.homeTeam?.shortName || "TBD"} vs{" "}
                      {pred.match?.awayTeam?.shortName || "TBD"} ·{" "}
                      {pred.predictedHomeScore ?? "?"} - {pred.predictedAwayScore ?? "?"}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="rounded-md bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 uppercase">
                      {pred.type.replace("_", " ")}
                    </span>
                    <div className="mt-1 text-[10px] text-slate-300">
                      {pred.createdAt.toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
              {recentPredictions.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">No predictions yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Link
              href="/admin/sync"
              className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-5 text-center transition-all hover:bg-violet-50 hover:border-violet-200"
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 border border-violet-200/50">
                <Activity className="h-5 w-5 text-violet-600" />
              </div>
              <span className="text-xs font-medium text-slate-600">Sync Data</span>
            </Link>
            <Link
              href="/admin/users"
              className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-5 text-center transition-all hover:bg-fuchsia-50 hover:border-fuchsia-200"
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-fuchsia-100 border border-fuchsia-200/50">
                <Users className="h-5 w-5 text-fuchsia-600" />
              </div>
              <span className="text-xs font-medium text-slate-600">Manage Users</span>
            </Link>
            <Link
              href="/admin/matches"
              className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-5 text-center transition-all hover:bg-amber-50 hover:border-amber-200"
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 border border-amber-200/50">
                <Trophy className="h-5 w-5 text-amber-600" />
              </div>
              <span className="text-xs font-medium text-slate-600">View Matches</span>
            </Link>
            <Link
              href="/admin/predictions"
              className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-5 text-center transition-all hover:bg-emerald-50 hover:border-emerald-200"
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 border border-emerald-200/50">
                <Target className="h-5 w-5 text-emerald-600" />
              </div>
              <span className="text-xs font-medium text-slate-600">Predictions</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
