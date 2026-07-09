"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Loader2, Plus, Pencil, Archive, BarChart3, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type AdminPollOption = {
  id: string;
  label: string;
  shortLabel?: string | null;
  imageUrl?: string | null;
  accentColor?: string | null;
  sortOrder: number;
  _count: {
    responses: number;
  };
};

type AdminPoll = {
  id: string;
  question: string;
  description?: string | null;
  status: string;
  opensAt?: string | null;
  closesAt?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    name?: string | null;
    email?: string | null;
  } | null;
  options: AdminPollOption[];
  _count: {
    responses: number;
  };
};

type PollFormState = {
  question: string;
  description: string;
  status: string;
  opensAt: string;
  closesAt: string;
  options: Array<{
    id?: string;
    label: string;
    shortLabel: string;
    imageUrl: string;
    accentColor: string;
  }>;
};

const EMPTY_FORM: PollFormState = {
  question: "",
  description: "",
  status: "UPCOMING",
  opensAt: "",
  closesAt: "",
  options: [
    { label: "", shortLabel: "", imageUrl: "", accentColor: "" },
    { label: "", shortLabel: "", imageUrl: "", accentColor: "" },
  ],
};

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  const pad = (input: number) => String(input).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AdminCustomPollsPage() {
  const [polls, setPolls] = useState<AdminPoll[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPollId, setEditingPollId] = useState<string | null>(null);
  const [form, setForm] = useState<PollFormState>(EMPTY_FORM);

  const activePoll = useMemo(
    () => polls.find((poll) => poll.id === editingPollId) || null,
    [editingPollId, polls]
  );

  const loadPolls = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/custom-polls");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load custom polls.");
      }
      setPolls(data.polls || []);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to load custom polls.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolls();
  }, []);

  const resetForm = () => {
    setEditingPollId(null);
    setForm(EMPTY_FORM);
  };

  const startEdit = (poll: AdminPoll) => {
    setEditingPollId(poll.id);
    setForm({
      question: poll.question,
      description: poll.description || "",
      status: poll.status,
      opensAt: toDateTimeLocal(poll.opensAt),
      closesAt: toDateTimeLocal(poll.closesAt),
      options: poll.options.map((option) => ({
        id: option.id,
        label: option.label,
        shortLabel: option.shortLabel || "",
        imageUrl: option.imageUrl || "",
        accentColor: option.accentColor || "",
      })),
    });
  };

  const updateOption = (
    index: number,
    field: keyof PollFormState["options"][number],
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      options: prev.options.map((option, optionIndex) =>
        optionIndex === index ? { ...option, [field]: value } : option
      ),
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    try {
      const payload = {
        question: form.question,
        description: form.description,
        status: form.status,
        opensAt: form.opensAt || null,
        closesAt: form.closesAt || null,
        options: form.options.map((option, index) => ({
          id: option.id,
          label: option.label,
          shortLabel: option.shortLabel || null,
          imageUrl: option.imageUrl || null,
          accentColor: option.accentColor || null,
          sortOrder: index,
        })),
      };

      const url = editingPollId ? `/api/admin/custom-polls/${editingPollId}` : "/api/admin/custom-polls";
      const method = editingPollId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Unable to save poll.");
      }

      toast.success(editingPollId ? "Poll updated." : "Poll created.");
      resetForm();
      await loadPolls();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to save poll.");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (pollId: string) => {
    try {
      const res = await fetch(`/api/admin/custom-polls/${pollId}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Unable to archive poll.");
      }

      toast.success("Poll archived.");
      if (editingPollId === pollId) {
        resetForm();
      }
      await loadPolls();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to archive poll.");
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="relative mt-5 overflow-hidden rounded-[2rem] bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-100">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-cyan-100 to-fuchsia-100 opacity-50 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="bg-gradient-to-br from-slate-900 to-slate-600 bg-clip-text text-3xl font-black tracking-tight text-transparent">
              Custom Voting Manager
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Create non-match questions, control when they open, and publish them into the public voting carousel.
            </p>
          </div>
          <button
            onClick={loadPolls}
            className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-slate-200"
          >
            <RefreshCw className="h-4 w-4 transition-transform group-hover:rotate-180" />
            Refresh Polls
          </button>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.3fr_0.7fr]">
        {/* Left Column: Polls List */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between px-2">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Existing Polls</h2>
              <p className="text-sm text-slate-500">Manage and monitor active votes.</p>
            </div>
            <div className="flex items-center justify-center rounded-xl bg-cyan-50 px-4 py-1.5 text-sm font-bold text-cyan-700 ring-1 ring-cyan-100">
              {polls.length} Total
            </div>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center rounded-[2rem] border border-slate-100 bg-white shadow-sm">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
                <span className="text-sm font-bold text-slate-400">Loading polls...</span>
              </div>
            </div>
          ) : polls.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-[2rem] border border-dashed border-slate-200 bg-slate-50/50 text-center">
              <div className="rounded-full bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <Archive className="h-6 w-6 text-slate-400" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-600">No custom polls yet</p>
                <p className="text-xs text-slate-400">Create your first question on the right.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {polls.map((poll) => (
                <div
                  key={poll.id}
                  className="group relative overflow-hidden rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:ring-1 hover:ring-cyan-100"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent to-slate-50/50 opacity-0 transition-opacity group-hover:opacity-100" />

                  <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ring-1 ${poll.status === 'LIVE' ? 'bg-emerald-50 text-emerald-600 ring-emerald-200' : poll.status === 'UPCOMING' ? 'bg-blue-50 text-blue-600 ring-blue-200' : 'bg-slate-50 text-slate-600 ring-slate-200'}`}>
                          {poll.status}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 ring-1 ring-slate-200">
                          <BarChart3 className="h-3 w-3" />
                          {poll._count.responses} votes
                        </span>
                      </div>

                      <div>
                        <h3 className="text-lg font-black text-slate-900">{poll.question}</h3>
                        {poll.description && (
                          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{poll.description}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        {poll.options.map((option) => (
                          <span
                            key={option.id}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200/60"
                          >
                            {option.label}
                            <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-black text-slate-400 shadow-sm ring-1 ring-slate-100">
                              {option._count.responses}
                            </span>
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-3 pt-2 text-[11px] font-medium text-slate-400">
                        <div className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
                          Opens: {poll.opensAt ? format(new Date(poll.opensAt), "MMM d, h:mm a") : "Now"}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
                          Closes: {poll.closesAt ? format(new Date(poll.closesAt), "MMM d, h:mm a") : "Manual"}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(poll)}
                        className="inline-flex h-9 items-center gap-2 rounded-xl bg-white px-4 text-xs font-bold text-slate-600 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleArchive(poll.id)}
                        className="inline-flex h-9 items-center gap-2 rounded-xl bg-rose-50 px-4 text-xs font-bold text-rose-600 shadow-sm ring-1 ring-rose-200/60 transition-all hover:bg-rose-100 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                      >
                        <Archive className="h-3.5 w-3.5" />
                        Archive
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Poll Form */}
        <div className="sticky top-8 self-start">
          <div className="relative overflow-hidden rounded-[2rem] bg-white p-8 shadow-[0_20px_50px_rgba(15,23,42,0.06)] ring-1 ring-slate-100">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 to-transparent" />
            <div className="relative">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {activePoll ? "Edit Poll" : "Create Poll"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Configure questions, timing, and options.
                  </p>
                </div>
                {activePoll && (
                  <button
                    onClick={resetForm}
                    className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-200"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2.5">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500">
                    Question
                  </label>
                  <input
                    value={form.question}
                    onChange={(event) => setForm((prev) => ({ ...prev, question: event.target.value }))}
                    className="w-full rounded-2xl border-0 bg-slate-50 p-4 text-sm font-medium text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-inset focus:ring-cyan-500"
                    placeholder="Who will win the Golden Boot?"
                    required
                  />
                </div>

                <div className="space-y-2.5">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                    className="min-h-[100px] w-full resize-none rounded-2xl border-0 bg-slate-50 p-4 text-sm font-medium text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-inset focus:ring-cyan-500"
                    placeholder="Optional context or instructions..."
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2.5">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500">
                      Status
                    </label>
                    <select
                      value={form.status}
                      onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                      className="w-full appearance-none rounded-xl border-0 bg-slate-50 p-3 text-sm font-medium text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-inset focus:ring-cyan-500"
                    >
                      <option value="UPCOMING">Upcoming</option>
                      <option value="LIVE">Live</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </div>

                  <div className="space-y-2.5">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500">
                      Opens
                    </label>
                    <input
                      type="datetime-local"
                      value={form.opensAt}
                      onChange={(event) => setForm((prev) => ({ ...prev, opensAt: event.target.value }))}
                      className="w-full rounded-xl border-0 bg-slate-50 p-3 text-xs font-medium text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-inset focus:ring-cyan-500"
                    />
                  </div>

                  <div className="space-y-2.5">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500">
                      Closes
                    </label>
                    <input
                      type="datetime-local"
                      value={form.closesAt}
                      onChange={(event) => setForm((prev) => ({ ...prev, closesAt: event.target.value }))}
                      className="w-full rounded-xl border-0 bg-slate-50 p-3 text-xs font-medium text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-inset focus:ring-cyan-500"
                    />
                  </div>
                </div>

                <div className="my-6 h-px w-full bg-slate-100" />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500">
                      Poll Options
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          options: [...prev.options, { label: "", shortLabel: "", imageUrl: "", accentColor: "" }],
                        }))
                      }
                      disabled={form.options.length >= 8}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-50 px-2.5 py-1.5 text-xs font-bold text-cyan-700 transition hover:bg-cyan-100 disabled:opacity-50"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Option
                    </button>
                  </div>

                  <div className="space-y-3">
                    {form.options.map((option, index) => (
                      <div key={option.id || index} className="group relative rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all focus-within:ring-2 focus-within:ring-cyan-500 hover:border-slate-200">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-black text-slate-500">
                            {index + 1}
                          </span>
                          {form.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  options: prev.options.filter((_, optionIndex) => optionIndex !== index),
                                }))
                              }
                              className="text-[10px] font-bold uppercase tracking-wider text-rose-500 opacity-0 transition-opacity group-hover:opacity-100"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <div className="grid gap-3">
                          <input
                            value={option.label}
                            onChange={(event) => updateOption(index, "label", event.target.value)}
                            className="w-full rounded-xl border-0 bg-slate-50 p-3 text-sm font-medium text-slate-900 ring-1 ring-inset ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-inset focus:ring-cyan-500"
                            placeholder="Option Label (e.g., Messi)"
                            required
                          />
                          <div className="grid gap-3 sm:grid-cols-2">
                            <input
                              value={option.shortLabel}
                              onChange={(event) => updateOption(index, "shortLabel", event.target.value)}
                              className="w-full rounded-xl border-0 bg-slate-50 p-3 text-sm font-medium text-slate-900 ring-1 ring-inset ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-inset focus:ring-cyan-500"
                              placeholder="Short Label (e.g., MES)"
                            />
                            <input
                              value={option.imageUrl}
                              onChange={(event) => updateOption(index, "imageUrl", event.target.value)}
                              className="w-full rounded-xl border-0 bg-slate-50 p-3 text-sm font-medium text-slate-900 ring-1 ring-inset ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-inset focus:ring-cyan-500"
                              placeholder="Image URL"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-slate-900 px-6 py-4 text-sm font-black text-white shadow-xl transition-all hover:-translate-y-0.5 hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 opacity-0 transition-opacity duration-500 group-hover:opacity-20" />
                  {saving ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Plus className="h-5 w-5 transition-transform group-hover:scale-110" />
                  )}
                  {activePoll ? "Save Changes" : "Create Poll"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
