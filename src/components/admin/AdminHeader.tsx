"use client";

import { useSession, signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AdminHeaderProps {
  title: string;
  description?: string;
}

export function AdminHeader({ title, description }: AdminHeaderProps) {
  const { data: session } = useSession();

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description && (
          <p className="mt-0.5 text-sm text-slate-400">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 cursor-pointer hover:bg-slate-50 transition-colors">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-500 text-xs font-bold text-white shadow-md shadow-violet-500/20">
                {session?.user?.name?.charAt(0)?.toUpperCase() || "A"}
              </div>
              <div className="leading-tight text-left">
                <div className="text-sm font-semibold text-slate-700">
                  {session?.user?.name || "Admin"}
                </div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-violet-500">
                  Administrator
                </div>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl border-slate-200 bg-white p-2 shadow-lg">
            <DropdownMenuItem 
              onClick={() => signOut({ callbackUrl: "/admin/login" })}
              className="flex cursor-pointer items-center gap-2 rounded-lg p-2 text-sm text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-700"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
