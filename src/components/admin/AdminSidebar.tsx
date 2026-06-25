"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Trophy,
  Target,
  RefreshCw,
  LogOut,
  ArrowLeft,
  Shield,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/matches", label: "Matches", icon: Trophy },
  { href: "/admin/predictions", label: "Predictions", icon: Target },
  { href: "/admin/sync", label: "Data Sync", icon: RefreshCw },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 z-30 border-b border-slate-200 bg-white lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col lg:border-b-0 lg:border-r">
      {/* Logo area */}
      <div className="flex items-center gap-3 px-4 py-4 lg:h-16 lg:border-b lg:border-slate-200 lg:px-5 lg:py-0">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 shadow-lg shadow-violet-500/20">
          <Shield className="h-5 w-5 text-white" strokeWidth={2.4} />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold tracking-wide text-slate-900">
            WC26 <span className="bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">ADMIN</span>
          </div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
            Control Panel
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="overflow-x-auto px-3 py-3 lg:flex-1 lg:overflow-y-auto lg:px-3 lg:py-4">
        <div className="mb-2 hidden px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 lg:block">
          Management
        </div>
        <div className="flex gap-2 lg:flex-col lg:gap-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? "bg-violet-50 text-violet-700 shadow-sm border border-violet-100"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-transparent"
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    isActive
                      ? "text-violet-600"
                      : "text-slate-400 group-hover:text-slate-500"
                  }`}
                />
                <span>{item.label}</span>
                {isActive && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-500" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom */}
      <div className="flex flex-wrap gap-2 border-t border-slate-200 p-3 lg:block lg:space-y-1">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span>Back to Site</span>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
