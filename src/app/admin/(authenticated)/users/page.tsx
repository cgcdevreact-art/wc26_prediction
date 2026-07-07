"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import {
  Search,
  Shield,
  ShieldOff,
  ChevronLeft,
  ChevronRight,
  Crown,
  Loader2,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { toast } from "sonner";

interface UserData {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  subscriptionTier: string;
  createdAt: string;
  isBlocked: boolean;
  _count: { predictions: number };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [tempTier, setTempTier] = useState<string>("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [roleFilter, setRoleFilter] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [blockConfirmUser, setBlockConfirmUser] = useState<UserData | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", password: "", role: "user", subscriptionTier: "free" });
  const limit = 10;

  useEffect(() => {
    if (selectedUser) {
      setTempTier(selectedUser.subscriptionTier);
      setShowConfirm(false);
    }
  }, [selectedUser]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sort: sortBy,
        order: sortOrder,
        ...(search && { search }),
        ...(roleFilter && { role: roleFilter }),
        ...(tierFilter && { tier: tierFilter }),
        ...(statusFilter && { status: statusFilter }),
        ...(dateFilter && dateFilter !== "all" && { dateFilter }),
      });
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch {
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, [page, search, sortBy, sortOrder, roleFilter, tierFilter, statusFilter, dateFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create user");
      }
      
      toast.success("User created successfully");
      setShowCreateModal(false);
      setCreateForm({ name: "", email: "", password: "", role: "user", subscriptionTier: "free" });
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setCreating(false);
    }
  };

  const updateUser = async (userId: string, updates: Record<string, string>) => {
    setUpdating(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...updates }),
      });
      if (res.ok) {
        toast.success("User updated");
        fetchUsers();
      } else {
        toast.error("Failed to update user");
      }
    } catch {
      toast.error("Failed to update user");
    } finally {
      setUpdating(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  const tierColors: Record<string, string> = {
    free: "bg-slate-100 border-slate-200 text-slate-500",
    plus: "bg-blue-50 border-blue-200 text-blue-600",
    pro: "bg-purple-50 border-purple-200 text-purple-600",
  };

  const tierNames: Record<string, string> = {
    free: "Free",
    plus: "Advanced Predictor",
    pro: "Expert Predictor",
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
      <AdminHeader title="Users" description={`${total} registered users`} />

      <div className="flex-1 overflow-y-auto p-8">
        {/* Search */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
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
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
            >
              <option value="">All Roles</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="internal">Internal</option>
            </select>
            
            <select
              value={tierFilter}
              onChange={(e) => {
                setTierFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
            >
              <option value="">All Tiers</option>
              <option value="free">Free</option>
              <option value="plus">Advanced</option>
              <option value="pro">Expert</option>
            </select>
            
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
            </select>
            
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
            >
              <option value="all">Joined All Time</option>
              <option value="1d">Past 24 Hours</option>
              <option value="1w">Past 1 Week</option>
              <option value="1m">Past 1 Month</option>
              <option value="3m">Past 3 Months</option>
            </select>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition shadow-sm whitespace-nowrap"
            >
              + Create User
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto overflow-y-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full whitespace-nowrap min-w-max">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th 
                  className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer hover:bg-slate-100 transition"
                  onClick={() => handleSort("name")}
                >
                  User <SortIcon column="name" />
                </th>
                <th 
                  className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer hover:bg-slate-100 transition"
                  onClick={() => handleSort("role")}
                >
                  Role <SortIcon column="role" />
                </th>
                <th 
                  className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer hover:bg-slate-100 transition"
                  onClick={() => handleSort("subscriptionTier")}
                >
                  Tier <SortIcon column="subscriptionTier" />
                </th>
                <th 
                  className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer hover:bg-slate-100 transition"
                  onClick={() => handleSort("predictions")}
                >
                  Predictions <SortIcon column="predictions" />
                </th>
                <th 
                  className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer hover:bg-slate-100 transition"
                  onClick={() => handleSort("createdAt")}
                >
                  Joined <SortIcon column="createdAt" />
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Status
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
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-16 text-center text-sm text-slate-500"
                  >
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-slate-100 transition-colors hover:bg-slate-50"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-100 to-fuchsia-100 text-xs font-bold text-violet-600 border border-violet-200/50">
                          {user.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-800">
                            {user.name || "Unknown"}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                          user.role === "admin"
                            ? "bg-violet-50 border-violet-200 text-violet-600"
                            : "bg-slate-100 border-slate-200 text-slate-500"
                        }`}
                      >
                        {user.role === "admin" && (
                          <Shield className="h-3 w-3" />
                        )}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                          tierColors[user.subscriptionTier] || tierColors.free
                        }`}
                      >
                        {user.subscriptionTier === "pro" && (
                          <Crown className="h-3 w-3" />
                        )}
                        {tierNames[user.subscriptionTier] || user.subscriptionTier}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-600">
                      {user._count.predictions}
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-slate-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                        user.isBlocked 
                          ? "bg-red-50 border-red-200 text-red-600" 
                          : "bg-green-50 border-green-200 text-green-600"
                      }`}>
                        {user.isBlocked ? "Blocked" : "Active"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 transition-all duration-200 cursor-pointer"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => setBlockConfirmUser(user)}
                          disabled={updating === user.id}
                          className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition-all duration-200 disabled:opacity-50 ${
                            user.isBlocked
                              ? "border-green-200 bg-green-50 text-green-600 hover:bg-green-100"
                              : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                          }`}
                          title={user.isBlocked ? "Unblock User" : "Block User"}
                        >
                          {updating === user.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : user.isBlocked ? (
                            "Unblock"
                          ) : (
                            "Block"
                          )}
                        </button>
                        {/* Make Admin functionality commented out per user request
                        <button
                          onClick={() =>
                            updateUser(user.id, {
                              role: user.role === "admin" ? "user" : "admin",
                            })
                          }
                          disabled={updating === user.id}
                          className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition-all duration-200 disabled:opacity-50 ${
                            user.role === "admin"
                              ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                              : "border-violet-200 bg-violet-50 text-violet-600 hover:bg-violet-100"
                          }`}
                          title={
                            user.role === "admin"
                              ? "Remove admin role"
                              : "Make admin"
                          }
                        >
                          {updating === user.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : user.role === "admin" ? (
                            <ShieldOff className="h-3.5 w-3.5" />
                          ) : (
                            <Shield className="h-3.5 w-3.5" />
                          )}
                        </button>
                        */}
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

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900">User Details</h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {showConfirm && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm p-6 text-center animate-in fade-in duration-200">
                  <h4 className="text-sm font-bold text-slate-800">Confirm Plan Change</h4>
                  <p className="mt-2 text-xs text-slate-500 max-w-xs leading-relaxed">
                    Are you sure you want to change the subscription plan for <strong>{selectedUser.name || selectedUser.email}</strong> to <strong>{tierNames[tempTier] || tempTier}</strong>?
                  </p>
                  <div className="mt-5 flex gap-3">
                    <button
                      onClick={async () => {
                        setShowConfirm(false);
                        await updateUser(selectedUser.id, { subscriptionTier: tempTier });
                        setSelectedUser(prev => prev ? { ...prev, subscriptionTier: tempTier } : null);
                      }}
                      className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 transition cursor-pointer"
                    >
                      Yes, Change Plan
                    </button>
                    <button
                      onClick={() => setShowConfirm(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-100 text-base font-bold text-violet-600 border border-violet-200/50">
                  {selectedUser.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">{selectedUser.name || "Unknown"}</h4>
                  <p className="text-xs text-slate-500">{selectedUser.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-xs">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">User ID</span>
                  <p className="font-mono text-slate-600 mt-0.5 truncate" title={selectedUser.id}>{selectedUser.id}</p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Joined</span>
                  <p className="font-medium text-slate-600 mt-0.5">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Role</span>
                  <p className="font-semibold text-slate-700 mt-0.5 capitalize">{selectedUser.role}</p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Predictions</span>
                  <p className="font-semibold text-slate-700 mt-0.5">{selectedUser._count.predictions}</p>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Subscription Tier
                </label>
                <select
                  value={tempTier}
                  disabled={updating !== null}
                  onChange={(e) => setTempTier(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-violet-400 focus:ring-1 focus:ring-violet-400 disabled:opacity-50 cursor-pointer font-bold"
                >
                  <option value="free">Free</option>
                  <option value="plus">Advanced Predictor</option>
                  <option value="pro">Expert Predictor</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              {tempTier !== selectedUser.subscriptionTier && !showConfirm && (
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={updating !== null}
                  className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 transition cursor-pointer shadow-sm disabled:opacity-50"
                >
                  Save Plan
                </button>
              )}
              <button
                onClick={() => setSelectedUser(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block Confirmation Modal */}
      {blockConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setBlockConfirmUser(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95 fade-in">
            <button
              onClick={() => setBlockConfirmUser(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
              <ShieldOff className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-slate-800">
              {blockConfirmUser.isBlocked ? "Unblock User" : "Block User"}
            </h3>
            <p className="mb-6 text-sm text-slate-600 leading-relaxed">
              Are you sure you want to {blockConfirmUser.isBlocked ? "unblock" : "block"} <span className="font-semibold text-slate-800">{blockConfirmUser.name || blockConfirmUser.email}</span>?
              {!blockConfirmUser.isBlocked && " They will be immediately signed out and unable to log back in."}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setBlockConfirmUser(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  updateUser(blockConfirmUser.id, { isBlocked: !blockConfirmUser.isBlocked } as any);
                  setBlockConfirmUser(null);
                }}
                className={`rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${
                  blockConfirmUser.isBlocked 
                    ? "bg-green-600 hover:bg-green-700" 
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {blockConfirmUser.isBlocked ? "Yes, unblock" : "Yes, block user"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !creating && setShowCreateModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95 fade-in">
            <button
              onClick={() => !creating && setShowCreateModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition"
              disabled={creating}
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="mb-6 text-xl font-bold text-slate-800">Create New User</h3>
            
            <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Name</label>
                <input
                  type="text"
                  required
                  disabled={creating}
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-1 focus:ring-violet-400 disabled:opacity-50"
                  placeholder="Full name"
                />
              </div>
              
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  disabled={creating}
                  value={createForm.email}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-1 focus:ring-violet-400 disabled:opacity-50"
                  placeholder="email@example.com"
                />
              </div>
              
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  disabled={creating}
                  minLength={6}
                  value={createForm.password}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-1 focus:ring-violet-400 disabled:opacity-50"
                  placeholder="Minimum 6 characters"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Role</label>
                  <select
                    disabled={creating}
                    value={createForm.role}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-1 focus:ring-violet-400 disabled:opacity-50"
                  >
                    <option value="user">User</option>
                    <option value="internal">Internal</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Tier</label>
                  <select
                    disabled={creating}
                    value={createForm.subscriptionTier}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, subscriptionTier: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-1 focus:ring-violet-400 disabled:opacity-50"
                  >
                    <option value="free">Free</option>
                    <option value="plus">Advanced</option>
                    <option value="pro">Expert</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={creating}
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex min-w-[120px] items-center justify-center rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-50"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
