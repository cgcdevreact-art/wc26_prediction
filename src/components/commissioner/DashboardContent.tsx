"use client";

import { useState, useEffect } from "react";
import { StatsCard } from "@/components/commissioner/StatsCard";
import { Users, Trophy, Target, CreditCard, Activity } from "lucide-react";
import Link from "next/link";
import { DashboardCharts } from "@/components/commissioner/DashboardCharts";

export function DashboardContent() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/commissioner/stats")
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="flex-1 p-8 text-center text-red-500">
        Failed to load dashboard data.
      </div>
    );
  }

  const { overview, charts } = data;

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="Total Users"
          value={overview.totalUsers.toLocaleString()}
          change={`+${overview.newUsers} this week`}
          changeType="positive"
          icon={Users}
          iconColor="text-violet-600"
          iconBg="bg-violet-50"
        />
        <StatsCard
          title="Total Matches"
          value={overview.totalMatches.toLocaleString()}
          change={`+${overview.newMatches} this week`}
          changeType="neutral"
          icon={Trophy}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <StatsCard
          title="Predictions Made"
          value={overview.totalPredictions.toLocaleString()}
          change={`+${overview.newPredictions} this week`}
          changeType="positive"
          icon={Target}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatsCard
          title="Paid Subscribers"
          value={overview.paidSubscribers.toLocaleString()}
          change={`+${overview.newPaid} this week`}
          changeType="positive"
          icon={CreditCard}
          iconColor="text-fuchsia-600"
          iconBg="bg-fuchsia-50"
        />
      </div>

      {/* Charts */}
      <DashboardCharts 
        dataDays={charts.dataDays} 
        dataMonths={charts.dataMonths} 
        dataYears={charts.dataYears} 
        planDistribution={data.planDistribution}
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
              href="/commissioner/users"
              className="text-xs text-violet-500 hover:text-violet-700 transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-100 bg-slate-50/50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">User</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Role</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overview.recentUsers.map((user: any) => (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-100 to-fuchsia-100 text-xs font-bold text-violet-600 border border-violet-200/50">
                          {user.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <div className="font-medium text-slate-700">
                            {user.name || "Unknown"}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {user.role === "admin" ? (
                        <span className="inline-flex items-center rounded-md bg-violet-100 border border-violet-200 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-600">
                          Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                          User
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {overview.recentUsers.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-sm text-slate-400">
                      No users yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
  );
}
