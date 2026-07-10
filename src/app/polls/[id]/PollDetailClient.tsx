"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { formatDistanceToNowStrict, format } from "date-fns";
import { useSession } from "next-auth/react";
import {
  CheckCircle2,
  Loader2,
  Vote,
  ArrowLeft,
  BarChart3,
  Clock,
  Users,
  AlertTriangle,
  Trophy,
  Share2,
  TrendingUp,
  Flame,
  MessageSquare,
  Send,
  Filter,
  ThumbsUp,
  CornerDownRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Flag,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { ShareLinkDialog } from "@/components/ui/share-link-dialog";

type PollOption = {
  id: string;
  label: string;
  shortLabel?: string | null;
  imageUrl?: string | null;
  accentColor?: string | null;
  votes: number;
  percentage: number;
};

type PollData = {
  id: string;
  question: string;
  description?: string | null;
  status: "LIVE" | "UPCOMING" | "COMPLETED" | "ARCHIVED";
  opensAt?: string | null;
  closesAt?: string | null;
  totalVotes: number;
  userOptionId?: string | null;
  options: PollOption[];
};

const DEFAULT_GRADIENTS = [
  "from-[#0a8a45] to-[#2c7c87]",
  "from-[#2c7c87] to-[#af3fd1]",
  "from-[#af3fd1] to-[#f97316]",
  "from-[#0ea5e9] to-[#0a8a45]",
  "from-[#ec4899] to-[#8b5cf6]",
  "from-[#14b8a6] to-[#3b82f6]",
  "from-[#f59e0b] to-[#ef4444]",
  "from-[#6366f1] to-[#ec4899]",
];

const SOLID_COLORS = ["#10B981", "#F43F5E", "#8B5CF6", "#0EA5E9", "#F59E0B", "#EF4444", "#6366F1", "#14B8A6"];

interface PollDetailClientProps {
  pollId: string;
}

export default function PollDetailClient({ pollId }: PollDetailClientProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id || null;

  const [poll, setPoll] = useState<PollData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [confirmOption, setConfirmOption] = useState<PollOption | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  // Comments state
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentSort, setCommentSort] = useState("Newest");
  const [visibleCommentsLimit, setVisibleCommentsLimit] = useState(10);
  const [newCommentText, setNewCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [collapsedComments, setCollapsedComments] = useState<Record<string, boolean>>({});

  const isLocked = poll ? poll.status !== "LIVE" : true;
  const hasVoted = poll ? Boolean(poll.userOptionId) : false;

  // Fetch poll data
  const fetchPoll = useCallback(async () => {
    try {
      const res = await fetch(`/api/custom-polls/${pollId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Poll not found.");
      setPoll(data.poll);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load poll.");
    } finally {
      setLoading(false);
    }
  }, [pollId]);

  // Fetch comments (reuses the matchId-based comments system with poll ID)
  const fetchComments = useCallback(async (silent = false) => {
    if (!silent) setLoadingComments(true);
    try {
      const res = await fetch(`/api/matches/poll-${pollId}/comments?sort=${commentSort}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) setComments(data.comments);
      }
    } catch (e) {
      console.error("Failed to load comments:", e);
    } finally {
      if (!silent) setLoadingComments(false);
    }
  }, [pollId, commentSort]);

  useEffect(() => { fetchPoll(); }, [fetchPoll]);
  useEffect(() => { fetchComments(); }, [fetchComments]);

  // Voting
  const submitVote = useCallback(async (optionId: string) => {
    setSubmittingId(optionId);
    try {
      const res = await fetch(`/api/custom-polls/${pollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to submit vote.");
      setPoll(data.poll);
      toast.success("Vote submitted successfully.");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Unable to submit vote.");
    } finally {
      setSubmittingId(null);
    }
  }, [pollId]);

  const handleVoteClick = (option: PollOption) => {
    if (submittingId || hasVoted || isLocked) return;
    setConfirmOption(option);
  };

  const handleConfirmVote = async () => {
    if (!confirmOption) return;
    const optionId = confirmOption.id;
    setConfirmOption(null);
    await submitVote(optionId);
  };

  // Comments
  const handlePostComment = async () => {
    if (!currentUserId) { toast.error("Please sign in to join the conversation."); return; }
    if (!newCommentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/matches/poll-${pollId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newCommentText }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNewCommentText("");
        toast.success("Comment posted!");
        fetchComments(true);
      } else {
        toast.error(data.error || "Failed to post comment");
      }
    } catch (e) {
      console.error(e);
      toast.error("An error occurred.");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handlePostReply = async (commentId: string, parentReplyId?: string) => {
    if (!currentUserId) { toast.error("Please sign in to reply."); return; }
    if (!replyText.trim()) return;
    try {
      const res = await fetch(`/api/comments/${parentReplyId || commentId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyText, commentId, parentId: parentReplyId || null }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReplyText("");
        setReplyTargetId(null);
        toast.success("Reply posted!");
        fetchComments(true);
      } else {
        toast.error(data.error || "Failed to submit reply");
      }
    } catch (e) { console.error(e); toast.error("An error occurred."); }
  };

  const handleLike = async (id: string, type: "COMMENT" | "REPLY") => {
    if (!currentUserId) { toast.error("Please sign in to like comments."); return; }
    try {
      const res = await fetch(`/api/comments/${id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (res.ok && data.success) fetchComments(true);
    } catch (e) { console.error(e); }
  };

  const handleReport = async () => {
    if (!currentUserId) return;
    toast.success("Comment has been reported for review.");
  };

  const toggleCollapse = (id: string) => {
    setCollapsedComments(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleShare = () => {
    setShareUrl(window.location.href);
    setShareModalOpen(true);
  };

  // Computed stats
  const statusConfig = useMemo(() => {
    if (!poll) return { label: "", color: "", dot: false };
    if (poll.status === "LIVE") return {
      label: "Live Now",
      color: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
      dot: true,
    };
    if (poll.status === "UPCOMING") {
      const label = poll.opensAt ? `Opens in ${formatDistanceToNowStrict(new Date(poll.opensAt))}` : "Upcoming";
      return { label, color: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20", dot: false };
    }
    return { label: "Completed", color: "bg-slate-50 text-slate-600 ring-slate-200 dark:bg-white/5 dark:text-slate-400 dark:ring-white/10", dot: false };
  }, [poll]);

  const leadingOption = useMemo(() => {
    if (!poll || poll.totalVotes === 0) return null;
    return [...poll.options].sort((a, b) => b.votes - a.votes)[0];
  }, [poll]);

  const sentimentStats = useMemo(() => {
    if (!poll) return null;
    const total = poll.totalVotes;
    const leader = leadingOption?.label || "None";
    const diff = leadingOption ? leadingOption.percentage - (100 / poll.options.length) : 0;
    let confidence = "TIGHT RACE";
    if (diff > 30) confidence = "STRONG VERDICT";
    else if (diff > 15) confidence = "CLEAR FAVORITE";
    else if (diff > 5) confidence = "MODERATE LEAN";
    return { total, leader, confidenceLabel: confidence, confidenceIndex: Math.round(Math.abs(diff)) };
  }, [poll, leadingOption]);

  // Loading
  if (loading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
          <span className="text-sm font-bold text-slate-400 dark:text-slate-500">Loading poll...</span>
        </div>
      </div>
    );
  }

  // Error
  if (error || !poll) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="rounded-full bg-rose-50 p-4 dark:bg-rose-500/10">
          <AlertTriangle className="h-8 w-8 text-rose-500" />
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Poll Not Found</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">{error || "This poll doesn't exist or has been archived."}</p>
        <Link href="/" className="mt-2 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto px-4 space-y-8">
        {/* Back */}
        <div className="flex">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>
        </div>

        {/* RICH HEADER BANNER */}
        <div className="relative overflow-hidden bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-[#1E293B] dark:to-slate-900 rounded-[2.5rem] p-6 md:p-10 text-slate-900 dark:text-white shadow-xl border border-slate-200 dark:border-white/10">
          {/* Decorative blobs */}
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-indigo-200 to-purple-200 opacity-40 blur-3xl dark:from-indigo-500/15 dark:to-purple-500/15 pointer-events-none" />
          <div className="absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-gradient-to-tr from-cyan-200 to-emerald-200 opacity-30 blur-3xl dark:from-cyan-500/10 dark:to-emerald-500/10 pointer-events-none" />

          <div className="relative space-y-6">
            {/* Status badges */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                <Vote className="h-3.5 w-3.5" />
                Fans Prediction
              </span>
              <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest ring-1 ${statusConfig.color}`}>
                {statusConfig.dot && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                {statusConfig.label}
              </span>
            </div>

            {/* Question */}
            <h1 className="text-2xl font-black leading-tight sm:text-3xl md:text-4xl font-display tracking-tight">
              {poll.question}
            </h1>
            {poll.description && (
              <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400 max-w-2xl">
                {poll.description}
              </p>
            )}

            {/* Meta Row */}
            <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-200 dark:border-white/10 text-xs font-medium text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-indigo-500" />
                {poll.totalVotes} total votes
              </div>
              <div className="flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-indigo-500" />
                {poll.options.length} options
              </div>
              {poll.closesAt && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-indigo-500" />
                  {poll.status === "COMPLETED"
                    ? `Closed ${format(new Date(poll.closesAt), "MMM d, yyyy")}`
                    : `Closes ${format(new Date(poll.closesAt), "MMM d, h:mm a")}`}
                </div>
              )}
              <button
                onClick={handleShare}
                className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share
              </button>
            </div>
          </div>
        </div>

        {/* TWO COLUMN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* LEFT COLUMN - Chart, Insights, Comments */}
          <div className="lg:col-span-8 space-y-8 min-w-0">

            {/* VOTE DISTRIBUTION CHART */}
            <div className="bg-white dark:bg-[#16181D] rounded-3xl border border-slate-200 dark:border-white/5 p-6 shadow-md space-y-5">
              <div className="space-y-1">
                <div className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  VOTE DISTRIBUTION
                </div>
                <h3 className="font-display font-black text-lg tracking-tight text-slate-900 dark:text-white">
                  Fans Sentiment
                </h3>
              </div>

              {poll.totalVotes === 0 ? (
                <div className="h-48 flex flex-col justify-center items-center text-center space-y-3 bg-slate-50/50 dark:bg-white/[0.01] rounded-2xl border border-dashed border-slate-200 dark:border-white/5 p-6">
                  <BarChart3 className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                  <h4 className="font-display font-extrabold text-sm text-slate-600 dark:text-slate-300">No votes yet</h4>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Be the first to vote and see the Fans's sentiment!
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Visual bars for each option */}
                  {poll.options.map((option, index) => {
                    const isSelected = poll.userOptionId === option.id;
                    const color = option.accentColor || SOLID_COLORS[index % SOLID_COLORS.length];
                    const gradientClass = DEFAULT_GRADIENTS[index % DEFAULT_GRADIENTS.length];
                    const showResults = hasVoted || poll.status === "COMPLETED";

                    return (
                      <div key={option.id} className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {option.imageUrl ? (
                              <img src={option.imageUrl} alt={option.label} className="h-8 w-8 rounded-lg object-cover shadow-sm ring-1 ring-slate-200/50 dark:ring-white/10" />
                            ) : (
                              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${gradientClass} text-xs font-black text-white shadow-sm`}>
                                {(option.shortLabel || option.label).slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <span className="text-sm font-bold text-slate-800 dark:text-white truncate">{option.label}</span>
                            {isSelected && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {showResults && (
                              <>
                                <span className="text-lg font-black tabular-nums text-slate-900 dark:text-white">{option.percentage}%</span>
                                <span className="text-[10px] font-bold text-slate-400">({option.votes})</span>
                              </>
                            )}
                          </div>
                        </div>
                        {showResults ? (
                          <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                            <div
                              className="h-full rounded-full transition-all duration-1000 ease-out"
                              style={{ width: `${option.percentage}%`, backgroundColor: color }}
                            />
                          </div>
                        ) : (
                          <div className="h-3 rounded-full bg-slate-100 dark:bg-white/5" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* COMMUNITY INSIGHTS */}
            {sentimentStats && poll.totalVotes > 0 && (hasVoted || poll.status === "COMPLETED") && (
              <div className="bg-white dark:bg-[#16181D] rounded-3xl border border-slate-200 dark:border-white/5 p-6 shadow-md grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Total Votes</div>
                  <div className="text-xl font-black text-slate-800 dark:text-white font-mono">{sentimentStats.total}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Current Leader</div>
                  <div className="text-sm font-black text-slate-800 dark:text-white truncate flex items-center gap-1.5">
                    <Flame className="h-3.5 w-3.5 text-amber-500" />
                    {sentimentStats.leader}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Confidence</div>
                  <div className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-indigo-500" />
                    {sentimentStats.confidenceLabel}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Lead Margin</div>
                  <div className="text-xl font-black text-slate-800 dark:text-white font-mono">{sentimentStats.confidenceIndex}%</div>
                </div>
              </div>
            )}

            {/* DISCUSSION SECTION */}
            <div className="bg-white dark:bg-[#16181D] rounded-3xl border border-slate-200 dark:border-white/5 p-6 shadow-sm space-y-6">
              {/* Comment Composer */}
              <div className="space-y-3">
                <div className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest flex items-center gap-1.5">
                  {/* <MessageSquare className="w-3.5 h-3.5" /> */}
                  {/* DISCUSSION */}
                </div>
                <textarea
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value.slice(0, 1000))}
                  placeholder="Share your thoughts on this poll..."
                  className="w-full h-20 p-3 bg-transparent border-b border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition resize-none"
                />
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400">{newCommentText.length}/1000 characters</span>
                  <div className="flex gap-2">
                    {newCommentText && (
                      <button onClick={() => setNewCommentText("")} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                        Cancel
                      </button>
                    )}
                    <button
                      onClick={handlePostComment}
                      disabled={submittingComment || !newCommentText.trim()}
                      className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer select-none transition shadow-md"
                    >
                      {submittingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Post Comment
                    </button>
                  </div>
                </div>
              </div>

              {/* Sort */}
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-white/5 pb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{comments.length} Comments</span>
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={commentSort}
                    onChange={(e) => setCommentSort(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-600 dark:text-slate-300 focus:outline-none cursor-pointer"
                  >
                    {["Newest", "Oldest", "Most Liked", "Most Replies", "Trending"].map((opt) => (
                      <option key={opt} value={opt} className="dark:bg-slate-900">{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Comment Stream */}
              {loadingComments ? (
                <div className="h-24 flex justify-center items-center">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No comments posted yet. Be the first to share your thoughts!
                </div>
              ) : (
                <div className="space-y-6">
                  {comments.slice(0, visibleCommentsLimit).map((comment) => (
                    <CommentNode
                      key={comment.id}
                      comment={comment}
                      depth={0}
                      currentUserId={currentUserId}
                      onLike={handleLike}
                      onReport={handleReport}
                      replyTargetId={replyTargetId}
                      setReplyTargetId={setReplyTargetId}
                      replyText={replyText}
                      setReplyText={setReplyText}
                      onPostReply={handlePostReply}
                      collapsedComments={collapsedComments}
                      toggleCollapse={toggleCollapse}
                    />
                  ))}
                  {comments.length > visibleCommentsLimit && (
                    <div className="flex justify-center pt-2">
                      <button
                        onClick={() => setVisibleCommentsLimit(prev => prev + 10)}
                        className="px-4 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl transition cursor-pointer select-none"
                      >
                        Show More
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN — Sticky voting panel */}
          <div className="lg:col-span-4 space-y-8 lg:sticky lg:top-24">
            {/* Voting Panel */}
            <div className="bg-white dark:bg-[#16181D] rounded-3xl border border-slate-200 dark:border-white/5 p-6 shadow-xl space-y-5">
              <div className="space-y-1 border-b border-slate-100 dark:border-white/5 pb-4">
                <h3 className="font-display font-black text-lg text-slate-800 dark:text-white tracking-tight flex items-center gap-1.5">
                  <Vote className="w-5 h-5 text-indigo-500" />
                  Cast Your Vote
                </h3>
                <p className="text-xs text-slate-400">
                  {hasVoted ? "You've already voted. Results are shown." : isLocked ? "Voting is currently closed." : "Select an option below to participate."}
                </p>
              </div>

              <div className="space-y-3">
                {poll.options.map((option, index) => {
                  const isSelected = poll.userOptionId === option.id;
                  const gradientClass = DEFAULT_GRADIENTS[index % DEFAULT_GRADIENTS.length];

                  return (
                    <button
                      key={option.id}
                      onClick={() => handleVoteClick(option)}
                      disabled={Boolean(submittingId) || hasVoted || isLocked}
                      className={`group w-full rounded-2xl border px-4 py-3.5 text-left transition-all duration-200 ${
                        isSelected
                          ? "border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                          : "border-slate-200 bg-slate-50/50 hover:border-indigo-200 hover:bg-indigo-50/40 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-indigo-500/20"
                      } disabled:cursor-not-allowed`}
                    >
                      <div className="flex items-center gap-3">
                        {option.imageUrl ? (
                          <img src={option.imageUrl} alt={option.label} className="h-11 w-11 rounded-xl object-cover shadow-sm ring-1 ring-slate-200/50 dark:ring-white/10" />
                        ) : (
                          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradientClass} text-sm font-black text-white shadow-sm`}>
                            {(option.shortLabel || option.label).slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-bold text-slate-900 dark:text-white">{option.label}</span>
                            {submittingId === option.id && <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />}
                            {isSelected && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                          </div>
                          {(hasVoted || poll.status === "COMPLETED") && (
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                              {option.percentage}% • {option.votes} votes
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Status footer */}
              <div className="rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 p-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {hasVoted ? "✓ Your vote is recorded" : isLocked ? "Voting is closed" : "Vote to unlock results"}
                </p>
              </div>
            </div>

            {/* Leading option card */}
            {leadingOption && (hasVoted || poll.status === "COMPLETED") && (
              <div className="bg-white dark:bg-[#16181D] rounded-3xl border border-slate-200 dark:border-white/5 p-6 shadow-md space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                  <Trophy className="h-4 w-4" />
                  Leading Choice
                </div>
                <div className="flex items-center gap-3">
                  {leadingOption.imageUrl ? (
                    <img src={leadingOption.imageUrl} alt={leadingOption.label} className="h-12 w-12 rounded-xl object-cover shadow-sm" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-lg font-black text-white shadow-sm">
                      {(leadingOption.shortLabel || leadingOption.label).slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="text-base font-black text-slate-900 dark:text-white">{leadingOption.label}</div>
                    <div className="text-xs font-bold text-slate-500">{leadingOption.percentage}% • {leadingOption.votes} votes</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Vote Confirmation Dialog */}
      {confirmOption && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setConfirmOption(null)}>
          <div className="mx-4 w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#1a1d24] animate-in zoom-in-95 slide-in-from-bottom-4 duration-300" onClick={(e) => e.stopPropagation()}>
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
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Your selection</p>
              <div className="flex items-center gap-3">
                {confirmOption.imageUrl ? (
                  <img src={confirmOption.imageUrl} alt={confirmOption.label} className="h-10 w-10 rounded-xl object-cover shadow-sm" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-black text-white shadow-sm">
                    {(confirmOption.shortLabel || confirmOption.label).slice(0, 2).toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-bold text-slate-900 dark:text-white">{confirmOption.label}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setConfirmOption(null)} className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10">
                Cancel
              </button>
              <button onClick={handleConfirmVote} className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
                Submit Vote
              </button>
            </div>
          </div>
        </div>
      )}

      <ShareLinkDialog
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        url={shareUrl}
        title="Share This Poll"
        description="Anyone with this link can view this prediction poll and follow the Fans sentiment results in read-only mode."
        xText={`Check out this WC26 fan poll: ${poll.question}`}
        whatsappText={`Check out this WC26 fan poll: ${poll.question}`}
        copySuccessMessage="Poll link copied to clipboard!"
      />
    </>
  );
}


// RECURSIVE COMMENT NODE — same pattern as Match detail page
interface CommentNodeProps {
  comment: any;
  depth: number;
  currentUserId: string | null;
  onLike: (id: string, type: "COMMENT" | "REPLY") => void;
  onReport: (id: string, type: "COMMENT" | "REPLY") => void;
  replyTargetId: string | null;
  setReplyTargetId: (id: string | null) => void;
  replyText: string;
  setReplyText: (text: string) => void;
  onPostReply: (commentId: string, parentReplyId?: string) => void;
  collapsedComments: Record<string, boolean>;
  toggleCollapse: (id: string) => void;
}

function CommentNode({
  comment, depth, currentUserId, onLike, onReport,
  replyTargetId, setReplyTargetId, replyText, setReplyText,
  onPostReply, collapsedComments, toggleCollapse,
}: CommentNodeProps) {
  const isCollapsed = collapsedComments[comment.id] || false;
  const isLiked = comment.likes?.some((like: any) => like.userId === currentUserId);
  const likesCount = comment.likes ? comment.likes.length : 0;
  const isReply = depth > 0;
  const showReplies = comment.replies && comment.replies.length > 0 && !isCollapsed;

  return (
    <div className={`space-y-3 ${isReply ? "pl-5 border-l border-slate-200 dark:border-white/5 mt-3" : "border-b border-slate-50 dark:border-white/[0.02] pb-6"}`}>
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-white/5 flex items-center justify-center text-xs font-black text-slate-500 uppercase">
            {comment.user?.name ? comment.user.name.charAt(0) : "U"}
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{comment.user?.name || "Guest"}</span>
              {comment.user?.role === "admin" && <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />}
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              {format(new Date(comment.createdAt), "PPpp")}
            </span>
          </div>
        </div>
        {comment.replies && comment.replies.length > 0 && (
          <button onClick={() => toggleCollapse(comment.id)} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer select-none">
            {isCollapsed ? (<><ChevronDown className="w-3 h-3" /> Expand ({comment.replies.length})</>) : (<><ChevronUp className="w-3 h-3" /> Collapse</>)}
          </button>
        )}
      </div>

      {!isCollapsed && (
        <div className="space-y-2 w-full overflow-hidden">
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium break-words">{comment.content}</p>
          <div className="flex items-center gap-4 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 pt-1">
            <button onClick={() => onLike(comment.id, isReply ? "REPLY" : "COMMENT")} className={`flex items-center gap-1 hover:text-indigo-500 cursor-pointer select-none transition ${isLiked ? "text-indigo-500" : ""}`}>
              <ThumbsUp className="w-3 h-3" /> Like ({likesCount})
            </button>
            <button onClick={() => { setReplyTargetId(comment.id); setReplyText(""); }} className="flex items-center gap-1 hover:text-indigo-500 cursor-pointer select-none">
              <CornerDownRight className="w-3 h-3" /> Reply
            </button>
            <button onClick={() => onReport(comment.id, isReply ? "REPLY" : "COMMENT")} className="flex items-center gap-1 hover:text-rose-500 cursor-pointer select-none opacity-50 hover:opacity-100 ml-auto">
              <Flag className="w-3 h-3" /> Report
            </button>
          </div>

          {replyTargetId === comment.id && (
            <div className="bg-slate-50 dark:bg-white/[0.01] border border-slate-200 dark:border-white/5 rounded-2xl p-3 space-y-2.5 mt-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value.slice(0, 500))}
                placeholder={`Replying to ${comment.user?.name || "Guest"}...`}
                className="w-full h-16 p-2 bg-transparent text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none resize-none"
              />
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold text-slate-400">{replyText.length}/500</span>
                <div className="flex gap-2">
                  <button onClick={() => setReplyTargetId(null)} className="px-3 py-1.5 text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">Cancel</button>
                  <button
                    onClick={() => onPostReply(isReply ? comment.commentId : comment.id, comment.id)}
                    disabled={!replyText.trim()}
                    className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-black text-[10px] rounded-lg cursor-pointer select-none transition"
                  >
                    Send Reply
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showReplies && (
        <div className="space-y-1">
          {comment.replies.map((reply: any) => (
            <CommentNode
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              currentUserId={currentUserId}
              onLike={onLike}
              onReport={onReport}
              replyTargetId={replyTargetId}
              setReplyTargetId={setReplyTargetId}
              replyText={replyText}
              setReplyText={setReplyText}
              onPostReply={onPostReply}
              collapsedComments={collapsedComments}
              toggleCollapse={toggleCollapse}
            />
          ))}
        </div>
      )}
    </div>
  );
}
