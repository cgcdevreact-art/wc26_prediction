import { prisma } from "@/lib/prisma";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { StatsCard } from "@/components/admin/StatsCard";
import { Users, Trophy, Target, CreditCard, Activity, Clock } from "lucide-react";
import Link from "next/link";
import { DashboardCharts } from "@/components/admin/DashboardCharts";

export default async function AdminDashboard() {
  // Fetch stats
  const [userCount, matchCount, predictionCount, paidUsers, recentUsers, allUsers, allMatches, allPredictions] =
    await Promise.all([
      prisma.user.count(),
      prisma.match.count(),
      prisma.prediction.count(),
      prisma.user.count({
        where: { subscriptionTier: { not: "free" } },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      prisma.user.findMany({ select: { createdAt: true, subscriptionTier: true } }),
      prisma.match.findMany({ select: { createdAt: true } }),
      prisma.prediction.findMany({ select: { createdAt: true } })
    ]);

  const now = new Date();
  
  const getCountsUpTo = (dateEnd: Date) => {
    return {
      users: allUsers.filter(u => u.createdAt <= dateEnd).length,
      subscribers: allUsers.filter(u => u.subscriptionTier !== 'free' && u.createdAt <= dateEnd).length,
      matches: allMatches.filter(m => m.createdAt <= dateEnd).length,
      predictions: allPredictions.filter(p => p.createdAt <= dateEnd).length,
    }
  }

  const dataDays = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(23, 59, 59, 999);
    dataDays.push({
      date: d.toLocaleDateString('en-US', { weekday: 'short' }),
      ...getCountsUpTo(d)
    });
  }

  const dataMonths = [];
  for (let i = 3; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - (i * 7));
    d.setHours(23, 59, 59, 999);
    dataMonths.push({
      date: `Week ${4-i}`,
      ...getCountsUpTo(d)
    });
  }

  const dataYears = [];
  for (let i = 3; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    d.setDate(0); 
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    d.setHours(23, 59, 59, 999);
    dataYears.push({
      date: d.toLocaleDateString('en-US', { month: 'short' }),
      ...getCountsUpTo(d)
    });
  }

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

        {/* Charts */}
        <DashboardCharts 
          dataDays={dataDays} 
          dataMonths={dataMonths} 
          dataYears={dataYears} 
        />

        {/* Content Blocks */}
        <div className="mt-8 grid grid-cols-1 gap-6">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

          {/* Predictions In Progress Placeholder */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center p-6 min-h-[300px]">
            <div className="text-center space-y-3">
              <div className="mx-auto w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center mb-4">
                <Target className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-700">Prediction Module</h3>
              <p className="text-sm font-semibold text-violet-600 uppercase tracking-widest px-4 py-2 bg-violet-100 rounded-full inline-block">
                In Progress
              </p>
              <p className="text-xs text-slate-500 mt-2 max-w-[250px] mx-auto">
                The prediction features are currently being upgraded and will return shortly.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
