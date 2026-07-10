"use client";

import { useMemo, useState, useCallback } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { CheckCircle2, Loader2, Vote, ExternalLink, AlertTriangle, Users, TrendingUp, Flame } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

type CustomPollOption = {
  id: string;
  label: string;
  shortLabel?: string | null;
  imageUrl?: string | null;
  accentColor?: string | null;
  votes: number;
  percentage: number;
};

export type CustomPollCardData = {
  id: string;
  question: string;
  description?: string | null;
  status: "LIVE" | "UPCOMING" | "COMPLETED" | "ARCHIVED";
  opensAt?: string | null;
  closesAt?: string | null;
  totalVotes: number;
  userOptionId?: string | null;
  options: CustomPollOption[];
};

interface CustomVotingCardProps {
  poll: CustomPollCardData;
}

const DEFAULT_GRADIENTS = [
  "from-[#0a8a45] to-[#2c7c87]",
  "from-[#2c7c87] to-[#af3fd1]",
  "from-[#af3fd1] to-[#f97316]",
  "from-[#0ea5e9] to-[#0a8a45]",
];

const SOLID_COLORS = ["#0a8a45", "#2c7c87", "#af3fd1", "#0ea5e9"];

export function CustomVotingCard({ poll }: CustomVotingCardProps) {
  const [state, setState] = useState(poll);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [confirmOption, setConfirmOption] = useState<CustomPollOption | null>(null);

  const isLocked = state.status !== "LIVE";
  const hasVoted = Boolean(state.userOptionId);

  const statusLabel = useMemo(() => {
    if (state.status === "UPCOMING" && state.opensAt) {
      return `In ${formatDistanceToNowStrict(new Date(state.opensAt))}`;
    }

    if (state.status === "COMPLETED") {
      return "Completed";
    }

    return state.status === "LIVE" ? "Live now" : "Upcoming";
  }, [state.opensAt, state.status]);

  const leadingOption = useMemo(() => {
    if (state.totalVotes === 0) return null;
    return [...state.options].sort((a, b) => b.votes - a.votes)[0];
  }, [state.options, state.totalVotes]);

  const hasOverflowOptions = state.options.length > 2;

  const submitVote = useCallback(async (optionId: string) => {
    setSubmittingId(optionId);

    try {
      const res = await fetch(`/api/custom-polls/${state.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to submit vote.");
      }

      setState(data.poll);
      toast.success("Vote submitted successfully.");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to submit vote.");
    } finally {
      setSubmittingId(null);
    }
  }, [state.id]);

  const handleVoteClick = (option: CustomPollOption) => {
    if (submittingId || hasVoted || isLocked) {
      return;
    }
    setConfirmOption(option);
  };

  const handleConfirmVote = async () => {
    if (!confirmOption) return;
    const optionId = confirmOption.id;
    setConfirmOption(null);
    await submitVote(optionId);
  };

  return (
    <>
      <div className="min-w-[280px] self-stretch md:min-w-[320px] bg-white dark:bg-[#16181D] rounded-2xl border border-slate-200 dark:border-white/5 p-5 shadow-lg flex h-full min-h-[360px] flex-col justify-between hover:shadow-xl hover:border-slate-300/80 dark:hover:border-white/10 transition-all duration-300 relative overflow-hidden">
        {/* Decorative gradient blob */}
        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-200 to-purple-200 opacity-30 blur-2xl dark:from-indigo-500/20 dark:to-purple-500/20 pointer-events-none" />
        <div className="absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-gradient-to-tr from-cyan-200 to-emerald-200 opacity-20 blur-2xl dark:from-cyan-500/15 dark:to-emerald-500/15 pointer-events-none" />

        <div className="relative space-y-4">
          {/* Status Row */}
          <div className="flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-wider">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
              <Vote className="h-3 w-3" />
              Fans Prediction
            </span>
            <span
              className={`flex items-center gap-1 ${state.status === "LIVE"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-slate-400 dark:text-slate-500"
                }`}
            >
              {state.status === "LIVE" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
              {statusLabel}
            </span>
          </div>

          {/* Question */}
          <div className="space-y-2">
            <h4 className="text-lg font-black leading-tight text-slate-900 dark:text-white">
              {state.question}
            </h4>
            {state.description ? (
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {state.description}
              </p>
            ) : null}
          </div>

          {/* Quick Stats Bar */}
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] px-3 py-2 border border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
              <Users className="h-3 w-3" />
              {state.totalVotes} votes
            </div>
            <div className="h-3 w-px bg-slate-200 dark:bg-white/10" />
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
              <TrendingUp className="h-3 w-3" />
              {state.options.length} options
            </div>
            {leadingOption && state.totalVotes > 0 && (hasVoted || state.status === "COMPLETED") && (
              <>
                <div className="h-3 w-px bg-slate-200 dark:bg-white/10" />
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  <Flame className="h-3 w-3" />
                  {leadingOption.label} leads
                </div>
              </>
            )}
          </div>

          {/* Mini Distribution Bar (always visible) */}
          {state.totalVotes > 0 && (
            <div className="space-y-1.5">
              <div className="h-2 flex overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                {state.options.map((option, index) => (
                  <div
                    key={option.id}
                    className="transition-all duration-700"
                    style={{
                      width: `${option.percentage}%`,
                      backgroundColor: option.accentColor || SOLID_COLORS[index % SOLID_COLORS.length],
                      opacity: hasVoted || state.status === "COMPLETED" ? 1 : 0.4,
                    }}
                  />
                ))}
              </div>
              {(hasVoted || state.status === "COMPLETED") && (
                <div className="flex items-center gap-2 flex-wrap">
                  {state.options.map((option, index) => (
                    <span
                      key={option.id}
                      className="flex items-center gap-1 text-[9px] font-bold text-slate-500 dark:text-slate-400"
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: option.accentColor || SOLID_COLORS[index % SOLID_COLORS.length] }}
                      />
                      {option.shortLabel || option.label.slice(0, 6)} {option.percentage}%
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Voting Options */}
          <div
            className={`space-y-2.5 ${hasOverflowOptions ? "max-h-[10.5rem] overflow-y-auto pr-1 scrollbar-custom" : ""}`}
          >
            {state.options.map((option, index) => {
              const isSelected = state.userOptionId === option.id;
              const gradientClass = DEFAULT_GRADIENTS[index % DEFAULT_GRADIENTS.length];
              const showResults = hasVoted || state.status === "COMPLETED";

              return (
                <button
                  key={option.id}
                  onClick={() => handleVoteClick(option)}
                  disabled={Boolean(submittingId) || hasVoted || isLocked}
                  className={`group relative w-full overflow-hidden rounded-2xl border px-4 py-3 text-left transition-all duration-200 ${isSelected
                      ? "border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:ring-emerald-500/20"
                      : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/30 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-indigo-500/20 dark:hover:bg-indigo-500/5"
                    } disabled:cursor-not-allowed`}
                >
                  {/* Background fill for results */}
                  {showResults && (
                    <div
                      className={`absolute inset-y-0 left-0 bg-gradient-to-r ${gradientClass} opacity-[0.06] transition-all duration-700`}
                      style={{ width: `${option.percentage}%` }}
                    />
                  )}

                  <div className="relative flex items-center gap-3">
                    {option.imageUrl ? (
                      <img
                        src={option.imageUrl}
                        alt={option.label}
                        className="h-10 w-10 rounded-xl object-cover shadow-sm ring-1 ring-slate-200/50 dark:ring-white/10"
                      />
                    ) : (
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradientClass} text-sm font-black text-white shadow-sm`}
                      >
                        {(option.shortLabel || option.label).slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-bold text-slate-900 dark:text-white">
                          {option.label}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {submittingId === option.id && (
                            <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                          )}
                          {isSelected && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          )}
                          {showResults && (
                            <span className="text-xs font-black tabular-nums text-slate-700 dark:text-slate-300">
                              {option.percentage}%
                            </span>
                          )}
                        </div>
                      </div>

                      {showResults && (
                        <div className="mt-1.5">
                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${gradientClass} transition-all duration-700`}
                              style={{ width: `${option.percentage}%` }}
                            />
                          </div>
                          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-0.5 block">
                            {option.votes} votes
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="relative mt-4 border-t border-slate-100 pt-3 dark:border-white/5">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {hasVoted ? "Fans Prediction results unlocked" : isLocked ? "Voting unavailable" : "Tap an option to vote"}
              <div className="mt-0.5 text-slate-500 dark:text-slate-400 font-bold normal-case text-[10px]">
                {state.totalVotes} votes cast
              </div>
            </div>
            <Link
              href={`/polls/${state.id}`}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 transition hover:bg-indigo-100 hover:text-indigo-700 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
            >
              Details
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Vote Confirmation Dialog */}
      {confirmOption && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setConfirmOption(null)}>
          <div
            className="mx-4 w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#1a1d24] animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-500/10">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Confirm Your Vote</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">This action cannot be undone</p>
              </div>
            </div>

            <div className="mb-5 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/[0.03]">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Your selection
              </p>
              <div className="flex items-center gap-3">
                {confirmOption.imageUrl ? (
                  <img
                    src={confirmOption.imageUrl}
                    alt={confirmOption.label}
                    className="h-10 w-10 rounded-xl object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-black text-white shadow-sm">
                    {(confirmOption.shortLabel || confirmOption.label).slice(0, 2).toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-bold text-slate-900 dark:text-white">{confirmOption.label}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmOption(null)}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmVote}
                className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                Submit Vote
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
