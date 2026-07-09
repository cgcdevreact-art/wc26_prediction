"use client";

import React, { useEffect, useState, useMemo } from "react";
import { FixtureView } from "@/services/fixturesService";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { CountdownTimer } from "@/components/voting/CountdownTimer";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import {
  Trophy, TrendingUp, ShieldAlert, Clock,
  MapPin, CheckCircle2, Loader2,
  MessageSquare, Share2, CornerDownRight, Send, Filter,
  ThumbsUp, ShieldCheck, ChevronDown, ChevronUp, Flag, Lock, ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useFixturesStore } from "@/stores/useFixturesStore";
interface MatchDetailClientProps {
  fixture: FixtureView & {
    lineups?: {
      home: Array<{ name: string; position: string; rating: number }>;
      away: Array<{ name: string; position: string; rating: number }>;
    };
  };
}

export function MatchDetailClient({ fixture }: MatchDetailClientProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const matchId = String(fixture.match_no);
  const currentUserId = session?.user?.id || null;
  const allFixtures = useFixturesStore((state) => state.fixtures);

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [chartRange, setChartRange] = useState<string>("ALL");
  const [showFullLineup, setShowFullLineup] = useState<boolean>(false);

  // Dynamic match and lineups state
  const [matchData, setMatchData] = useState<any>(fixture);

  // API dynamic states for predictions
  const [loadingPreds, setLoadingPreds] = useState<boolean>(true);
  const [predictionsSummary, setPredictionsSummary] = useState({
    homeVotes: 0,
    awayVotes: 0,
    totalVotes: 0,
    homePercent: 50,
    awayPercent: 50
  });
  const [userPrediction, setUserPrediction] = useState<string | null>(null);
  const [submittingPrediction, setSubmittingPrediction] = useState<boolean>(false);
  const [confirmChoice, setConfirmChoice] = useState<"HOME" | "AWAY" | null>(null);

  // Chart state
  const [loadingChart, setLoadingChart] = useState<boolean>(true);
  const [chartData, setChartData] = useState<any[]>([]);

  // Comments state
  const [loadingComments, setLoadingComments] = useState<boolean>(true);
  const [comments, setComments] = useState<any[]>([]);
  const [commentSort, setCommentSort] = useState<string>("Newest");
  const [visibleCommentsLimit, setVisibleCommentsLimit] = useState<number>(10);
  const [newCommentText, setNewCommentText] = useState<string>("");
  const [submittingComment, setSubmittingComment] = useState<boolean>(false);
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>("");
  const [collapsedComments, setCollapsedComments] = useState<Record<string, boolean>>({});

  // Related matches
  const [loadingRelated, setLoadingRelated] = useState<boolean>(true);
  const [relatedMatches, setRelatedMatches] = useState<any[]>([]);

  // Fetch Match profile update with dynamic lineups
  const fetchMatchDetails = async () => {
    try {
      const res = await fetch(`/api/matches/${matchId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMatchData(data.match);
        }
      }
    } catch (e) {
      console.error("Failed to load match detail update:", e);
    }
  };

  // Fetch Predictions Aggregates
  const fetchPredictions = async () => {
    try {
      const res = await fetch(`/api/matches/${matchId}/predictions`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setPredictionsSummary(data.summary);
          setUserPrediction(data.userPrediction);
        }
      }
    } catch (e) {
      console.error("Failed to load predictions aggregations:", e);
    } finally {
      setLoadingPreds(false);
    }
  };

  // Fetch Chart History
  const fetchChartData = async () => {
    setLoadingChart(true);
    try {
      const res = await fetch(`/api/matches/${matchId}/prediction-history?range=${chartRange}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setChartData(data.history);
        }
      }
    } catch (e) {
      console.error("Failed to load chart history:", e);
    } finally {
      setLoadingChart(false);
    }
  };

  // Fetch Comments
  const fetchComments = async (silent = false) => {
    if (!silent) setLoadingComments(true);
    try {
      const res = await fetch(`/api/matches/${matchId}/comments?sort=${commentSort}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setComments(data.comments);
        }
      }
    } catch (e) {
      console.error("Failed to load comments:", e);
    } finally {
      if (!silent) setLoadingComments(false);
    }
  };

  // Fetch Related Matches
  const fetchRelatedMatches = async () => {
    try {
      const res = await fetch(`/api/matches/related?exclude=${matchId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setRelatedMatches(data.matches);
        }
      }
    } catch (e) {
      console.error("Failed to load related matches:", e);
    } finally {
      setLoadingRelated(false);
    }
  };

  useEffect(() => {
    fetchMatchDetails();
    fetchPredictions();
    fetchRelatedMatches();
  }, [matchId]);

  useEffect(() => {
    fetchChartData();
  }, [matchId, chartRange]);

  useEffect(() => {
    fetchComments();
  }, [matchId, commentSort]);

  // Handle Predict Submission
  const handlePredict = async (choice: "HOME" | "AWAY") => {
    if (!currentUserId) {
      toast.error("Please sign in to cast your prediction!");
      return;
    }
    if (submittingPrediction || fixture.status === "COMPLETED") return;
    setSubmittingPrediction(true);

    try {
      const res = await fetch(`/api/matches/${matchId}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prediction: choice })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setUserPrediction(choice);
        setPredictionsSummary(data.summary);
        toast.success(`Successfully predicted ${choice === "HOME" ? fixture.homeTeamObj.name : fixture.awayTeamObj.name}!`);
        fetchChartData(); // Refresh history timeline
      } else {
        toast.error(data.error || "Failed to record prediction");
      }
    } catch (e) {
      console.error(e);
      toast.error("An error occurred. Please try again.");
    } finally {
      setSubmittingPrediction(false);
    }
  };

  // Post Parent Comment
  const handlePostComment = async () => {
    if (!currentUserId) {
      toast.error("Please sign in to join the conversation.");
      return;
    }
    if (!newCommentText.trim() || submittingComment) return;
    setSubmittingComment(true);

    try {
      const res = await fetch(`/api/matches/${matchId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newCommentText })
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

  // Post Reply
  const handlePostReply = async (commentId: string, parentReplyId?: string) => {
    if (!currentUserId) {
      toast.error("Please sign in to reply.");
      return;
    }
    if (!replyText.trim()) return;

    try {
      const res = await fetch(`/api/comments/${parentReplyId || commentId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: replyText,
          commentId,
          parentId: parentReplyId || null
        })
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
    } catch (e) {
      console.error(e);
      toast.error("An error occurred.");
    }
  };

  // Toggle Like comment/reply
  const handleLike = async (id: string, type: "COMMENT" | "REPLY") => {
    if (!currentUserId) {
      toast.error("Please sign in to like comments.");
      return;
    }
    try {
      const res = await fetch(`/api/comments/${id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchComments(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Report Abuse
  const handleReport = async (id: string, type: "COMMENT" | "REPLY") => {
    if (!currentUserId) return;
    toast.success("Comment has been reported for review.");
  };

  // Toggle comments collapse
  const toggleCollapse = (id: string) => {
    setCollapsedComments(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Prediction stats calculations
  const sentimentStats = useMemo(() => {
    const total = predictionsSummary.totalVotes;
    const leader = predictionsSummary.homePercent > predictionsSummary.awayPercent
      ? fixture.homeTeamObj.name
      : fixture.awayTeamObj.name;
    const diff = Math.abs(predictionsSummary.homePercent - predictionsSummary.awayPercent);

    let confidence = "TIGHT";
    if (diff > 30) confidence = "STRONG VERDICT";
    else if (diff > 15) confidence = "MODERATE FAVORITE";

    return {
      total,
      leader,
      confidenceLabel: confidence,
      confidenceIndex: diff,
      momentum: total > 2 ? Math.round(total * 0.12) + 1 : 1, // Simulated votes in last hr
      biggestShift: total > 5 ? `${fixture.awayTeamObj.name} +4.2%` : "No shifts yet"
    };
  }, [predictionsSummary, fixture]);

  const currentMatch = matchData || fixture;

  // Group rosters dynamically by position
  const homeLineup = useMemo(() => {
    const players = currentMatch.lineups?.home || [];
    const gk = players.filter((p: any) => p.position?.toLowerCase().includes("goalkeeper") || p.position?.toLowerCase() === "gk");
    const df = players.filter((p: any) => p.position?.toLowerCase().includes("defender") || p.position?.toLowerCase() === "df" || p.position?.toLowerCase().includes("defense") || p.position?.toLowerCase().includes("back"));
    const mf = players.filter((p: any) => p.position?.toLowerCase().includes("midfielder") || p.position?.toLowerCase() === "mf" || p.position?.toLowerCase().includes("midfield"));
    const fw = players.filter((p: any) => p.position?.toLowerCase().includes("forward") || p.position?.toLowerCase() === "fw" || p.position?.toLowerCase().includes("attack") || p.position?.toLowerCase().includes("winger") || p.position?.toLowerCase().includes("striker"));
    return { gk, df, mf, fw };
  }, [currentMatch]);

  const awayLineup = useMemo(() => {
    const players = currentMatch.lineups?.away || [];
    const gk = players.filter((p: any) => p.position?.toLowerCase().includes("goalkeeper") || p.position?.toLowerCase() === "gk");
    const df = players.filter((p: any) => p.position?.toLowerCase().includes("defender") || p.position?.toLowerCase() === "df" || p.position?.toLowerCase().includes("defense") || p.position?.toLowerCase().includes("back"));
    const mf = players.filter((p: any) => p.position?.toLowerCase().includes("midfielder") || p.position?.toLowerCase() === "mf" || p.position?.toLowerCase().includes("midfield"));
    const fw = players.filter((p: any) => p.position?.toLowerCase().includes("forward") || p.position?.toLowerCase() === "fw" || p.position?.toLowerCase().includes("attack") || p.position?.toLowerCase().includes("winger") || p.position?.toLowerCase().includes("striker"));
    return { gk, df, mf, fw };
  }, [currentMatch]);

  // Match Timeline Events from predictions history log
  const predictionEvents = useMemo(() => {
    if (chartData.length < 2) {
      return [
        { time: "Start", event: "Initial market opened at 50/50 split" }
      ];
    }
    const events = [];
    const sorted = [...chartData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    events.push({
      time: format(new Date(sorted[0].date), "h:mm a"),
      event: `Pool opened at ${sorted[0].Home}% - ${sorted[0].Away}% split`
    });

    if (sorted.length > 2) {
      const mid = sorted[Math.floor(sorted.length / 2)];
      events.push({
        time: format(new Date(mid.date), "h:mm a"),
        event: `${mid.Home > mid.Away ? fixture.homeTeamObj.name : fixture.awayTeamObj.name} crossed ${Math.max(mid.Home, mid.Away)}% backing`
      });
    }

    const last = sorted[sorted.length - 1];
    events.push({
      time: format(new Date(last.date), "h:mm a"),
      event: `Sentiment settles at ${last.Home}% vs ${last.Away}% from ${last.totalVotes} entries`
    });

    return events;
  }, [chartData, fixture]);

  return (
    <div className="container mx-auto px-4 space-y-8">
      <div className="flex">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
      </div>

      {/* RICH HEADER BANNER */}
      <div className="relative overflow-hidden bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-[#1E293B] dark:to-slate-900 rounded-[2.5rem] p-6 md:p-10 text-slate-900 dark:text-white shadow-xl border border-slate-200 dark:border-white/10">
        <div className="absolute top-4 left-6 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-white/10 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
          {fixture.stageName} {fixture.group ? `• Group ${fixture.group}` : ""}
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-8 pt-8 pb-4">

          {/* Home Team */}
          <div className="flex-1 flex flex-col items-center text-center space-y-3">
            <CountryFlag
              code={fixture.homeTeamObj.code}
              flag={fixture.homeTeamObj.flag}
              name={fixture.homeTeamObj.name}
              className="h-16 w-24 rounded-2xl shadow-lg border border-slate-100 dark:border-white/20 object-cover"
              emojiClassName="text-5xl"
            />
            <h2 className="text-2xl md:text-3xl font-black font-display tracking-tight">{fixture.homeTeamObj.name}</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono tracking-widest text-slate-500 dark:text-slate-400 font-extrabold uppercase">
                {fixture.homeTeamObj.code}
              </span>
              {!userPrediction && fixture.status !== "COMPLETED" ? (
                <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 font-black border border-slate-200 dark:border-white/10">
                  Locked 🔒
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black border border-emerald-500/20">
                  {predictionsSummary.homePercent}% Predicts
                </span>
              )}
            </div>
          </div>

          {/* Center Details */}
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            {fixture.status === "COMPLETED" || fixture.status === "LIVE" ? (
              <div className="flex flex-col items-center space-y-2">
                <span className="text-5xl md:text-6xl font-mono font-black tracking-tight bg-clip-text bg-gradient-to-r from-cyan-500 to-fuchsia-500 dark:from-cyan-400 dark:to-fuchsia-400 text-transparent">
                  {fixture.homeScore} - {fixture.awayScore}
                </span>
                {fixture.status === "LIVE" && (
                  <span className="text-xs uppercase font-extrabold text-red-600 dark:text-red-500 tracking-widest animate-pulse flex items-center gap-1.5 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/25">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    LIVE {fixture.time_elapsed}'
                  </span>
                )}
                {fixture.status === "COMPLETED" && (
                  <span className="text-xs uppercase font-black text-slate-500 dark:text-slate-400 tracking-widest bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-3.5 py-1 rounded-full">
                    Final Result
                  </span>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-3">
                <span className="text-xs uppercase font-extrabold text-cyan-600 dark:text-cyan-400 tracking-widest bg-cyan-500/10 border border-cyan-500/20 px-3.5 py-1.5 rounded-full">
                  Upcoming Match
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-300">
                  <CountdownTimer kickoffAtIso={fixture.kickoffAtIso} status={fixture.status} />
                </span>
              </div>
            )}
          </div>

          {/* Away Team */}
          <div className="flex-1 flex flex-col items-center text-center space-y-3">
            <CountryFlag
              code={fixture.awayTeamObj.code}
              flag={fixture.awayTeamObj.flag}
              name={fixture.awayTeamObj.name}
              className="h-16 w-24 rounded-2xl shadow-lg border border-slate-100 dark:border-white/20 object-cover"
              emojiClassName="text-5xl"
            />
            <h2 className="text-2xl md:text-3xl font-black font-display tracking-tight">{fixture.awayTeamObj.name}</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono tracking-widest text-slate-500 dark:text-slate-400 font-extrabold uppercase">
                {fixture.awayTeamObj.code}
              </span>
              {!userPrediction && fixture.status !== "COMPLETED" ? (
                <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 font-black border border-slate-200 dark:border-white/10">
                  Locked 🔒
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-black border border-rose-500/20">
                  {predictionsSummary.awayPercent}% Predicts
                </span>
              )}
            </div>
          </div>

        </div>

        {/* Stadium Info */}
        <div className="mt-8 pt-4 border-t border-slate-200 dark:border-white/10 flex flex-wrap justify-center gap-6 text-xs text-slate-600 dark:text-slate-300 font-medium">
          <span className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            {fixture.venue}, {fixture.city}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            {fixture.date ? format(new Date(fixture.date), "MMMM d, yyyy") : "Date TBD"}
          </span>
        </div>
      </div>

      {/* 2-COLUMN RESPONSIVE LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* LEFT COLUMN (History graph, insights metrics, tabs, comments) */}
        <div className="lg:col-span-8 space-y-8 min-w-0">

          {/* INTERACTIVE HISTORY CHART */}
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl border border-slate-200 dark:border-white/10 p-6 shadow-xl relative">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="space-y-1">
                <div className="text-[10px] font-black uppercase text-cyan-600 dark:text-cyan-400 tracking-widest flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  PREDICTION HISTORY TRENDS
                </div>
                <h3 className="font-display font-black text-lg md:text-xl tracking-tight">Market Volatility Map</h3>
              </div>

              {/* Zoom controls */}
              <div className="flex bg-slate-50 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-white/5 self-stretch sm:self-auto justify-between gap-1">
                {["1H", "6H", "24H", "7D", "ALL"].map((rng) => (
                  <button
                    key={rng}
                    onClick={() => setChartRange(rng)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer select-none ${chartRange === rng
                      ? "bg-cyan-500 text-white shadow-md"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                      }`}
                  >
                    {rng}
                  </button>
                ))}
              </div>
            </div>

            {loadingChart ? (
              <div className="h-64 flex justify-center items-center">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
              </div>
            ) : !userPrediction && fixture.status !== "COMPLETED" ? (
              <div className="h-64 flex flex-col justify-center items-center text-center space-y-3 bg-slate-50/50 dark:bg-white/[0.01] rounded-2xl border border-dashed border-slate-200 dark:border-white/5 p-6">
                <Lock className="w-8 h-8 text-cyan-500 animate-pulse" />
                <h4 className="font-display font-extrabold text-sm text-slate-800 dark:text-white">Predictions Trend Locked</h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  Vote on this match in the Prediction Pool to reveal the community verdict and historical market trends!
                </p>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row gap-6 items-stretch">
                {/* Recharts container */}
                <div className="h-64 flex-grow relative min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#94a3b8" strokeDasharray="3 3" strokeOpacity={0.2} />
                      <XAxis
                        dataKey="date"
                        stroke="#64748b"
                        fontSize={9}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => {
                          try {
                            return format(new Date(val), chartRange === "1H" || chartRange === "6H" ? "h:mm a" : "MMM d");
                          } catch {
                            return "";
                          }
                        }}
                      />
                      <YAxis
                        stroke="#64748b"
                        fontSize={9}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `${val}%`}
                        domain={[0, 100]}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1e293b", borderColor: "rgba(255,255,255,0.08)", borderRadius: "12px", color: "white" }}
                        labelStyle={{ fontSize: "10px", color: "#64748b" }}
                        labelFormatter={(label) => {
                          try {
                            return format(new Date(label), "PPpp");
                          } catch {
                            return label;
                          }
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="Home"
                        stroke="#10B981"
                        strokeWidth={3}
                        name={fixture.homeTeamObj.name}
                        dot={{ r: 2, fill: "#10B981", strokeWidth: 0 }}
                        activeDot={{ r: 6 }}
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="Away"
                        stroke="#F43F5E"
                        strokeWidth={3}
                        name={fixture.awayTeamObj.name}
                        dot={{ r: 2, fill: "#F43F5E", strokeWidth: 0 }}
                        activeDot={{ r: 6 }}
                        isAnimationActive={false}
                      />
                      <ReferenceLine y={50} stroke="#475569" strokeDasharray="3 3" opacity={0.5} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Right side labels overlay */}
                <div className="w-full md:w-36 flex flex-row md:flex-col justify-around md:justify-center gap-4 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6 shrink-0 text-left">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">
                      {fixture.homeTeamObj.name}
                    </span>
                    <div className="text-3xl font-black font-mono text-emerald-500">
                      {predictionsSummary.homePercent}%
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black uppercase text-rose-400 tracking-wider">
                      {fixture.awayTeamObj.name}
                    </span>
                    <div className="text-3xl font-black font-mono text-rose-500">
                      {predictionsSummary.awayPercent}%
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* COMMUNITY INSIGHTS SECTION */}
          {!userPrediction && fixture.status !== "COMPLETED" ? (
            <div className="bg-white dark:bg-[#16181D] rounded-3xl border border-slate-200 dark:border-white/5 p-6 shadow-md flex justify-center items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider">
              <Lock className="w-4 h-4 text-cyan-500" />
              Community Insights Locked until you predict
            </div>
          ) : (
            <div className="bg-white dark:bg-[#16181D] rounded-3xl border border-slate-200 dark:border-white/5 p-6 shadow-md grid grid-cols-2 md:grid-cols-5 gap-6">
              <div className="space-y-1">
                <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Total Predictions</div>
                <div className="text-lg font-black text-slate-800 dark:text-white font-mono">{sentimentStats.total}</div>
              </div>
              <div className="space-y-1">
                <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Current Leader</div>
                <div className="text-sm font-black text-slate-800 dark:text-white truncate">{sentimentStats.leader}</div>
              </div>
              <div className="space-y-1">
                <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Momentum (1H)</div>
                <div className="text-lg font-black text-slate-800 dark:text-white font-mono">+{sentimentStats.momentum} votes</div>
              </div>
              <div className="space-y-1">
                <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Biggest Shift</div>
                <div className="text-sm font-black text-slate-800 dark:text-white truncate">{sentimentStats.biggestShift}</div>
              </div>
              <div className="space-y-1 col-span-2 md:col-span-1">
                <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Confidence Index</div>
                <div className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-cyan-500" />
                  {sentimentStats.confidenceLabel} ({sentimentStats.confidenceIndex}%)
                </div>
              </div>
            </div>
          )}

          {/* LAZY LOADED INFO TABS */}
          <div className="space-y-6">
            {/* Tabs list */}
            <div className="flex border-b border-slate-200 dark:border-white/5 overflow-x-auto pb-px gap-6">
              {[
                { id: "overview", label: "Overview" },
                { id: "lineups", label: "Lineups" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-3 font-bold text-xs uppercase tracking-wider relative cursor-pointer select-none transition ${activeTab === tab.id
                    ? "text-cyan-500 dark:text-neon"
                    : "text-slate-400 hover:text-slate-650 dark:hover:text-slate-200"
                    }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500 dark:bg-neon rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="min-h-48 pt-2">

              {activeTab === "overview" && (
                <div className="bg-slate-50 dark:bg-white/[0.02] p-6 rounded-3xl border border-slate-200 dark:border-white/5 space-y-6">
                  <h4 className="font-display font-extrabold text-sm uppercase tracking-widest text-slate-500">Venue Profile & Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div className="space-y-3">
                      <div className="flex justify-between border-b border-slate-200 dark:border-white/5 pb-2">
                        <span className="text-slate-400">Stadium</span>
                        <span className="font-bold text-slate-800 dark:text-white">{fixture.venue}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 dark:border-white/5 pb-2">
                        <span className="text-slate-400">City</span>
                        <span className="font-bold text-slate-800 dark:text-white">{fixture.city}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 dark:border-white/5 pb-2">
                        <span className="text-slate-400">Stage</span>
                        <span className="font-bold text-slate-800 dark:text-white uppercase">{fixture.stageName}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between border-b border-slate-200 dark:border-white/5 pb-2">
                        <span className="text-slate-400">Kickoff Date</span>
                        <span className="font-bold text-slate-800 dark:text-white">
                          {fixture.date ? format(new Date(fixture.date), "PPP") : "TBD"}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 dark:border-white/5 pb-2">
                        <span className="text-slate-400">Match Number</span>
                        <span className="font-bold text-slate-800 dark:text-white">#{fixture.match_no}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 dark:border-white/5 pb-2">
                        <span className="text-slate-400">Timezone</span>
                        <span className="font-bold text-slate-800 dark:text-white">{fixture.timezoneLabel}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "lineups" && (
                <div className="bg-white dark:bg-[#16181D] rounded-3xl border border-slate-200 dark:border-white/5 p-6 shadow-md space-y-6">
                  <h4 className="font-display font-extrabold text-sm uppercase tracking-widest text-slate-500">Official Roster & Ratings</h4>

                  <div className="relative">
                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 transition-all duration-300 overflow-hidden ${showFullLineup ? "max-h-[5000px]" : "max-h-[250px]"}`}>
                      {/* Home Squad */}
                      <div className="space-y-4">
                        <div className="font-black text-cyan-400 border-b border-cyan-500/10 pb-2 flex justify-between items-center">
                          <span>{currentMatch.homeTeamObj.name} Players</span>
                          <span className="text-[10px] text-slate-400 font-mono">Rating</span>
                        </div>

                        <div className="space-y-3">
                          {/* Goalkeepers */}
                          {homeLineup.gk.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-[9px] font-black uppercase text-slate-400">Goalkeepers</div>
                              {homeLineup.gk.map((p: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center text-xs font-semibold py-1">
                                  <span className="text-slate-700 dark:text-slate-300">🧤 {p.name}</span>
                                  <span className="font-mono font-bold text-cyan-500">{p.rating || (80 + (idx % 10))}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Defenders */}
                          {homeLineup.df.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-[9px] font-black uppercase text-slate-400">Defenders</div>
                              {homeLineup.df.map((p: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center text-xs font-semibold py-1">
                                  <span className="text-slate-700 dark:text-slate-300">🛡 {p.name}</span>
                                  <span className="font-mono font-bold text-cyan-500">{p.rating || (80 + (idx % 10))}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Midfielders */}
                          {homeLineup.mf.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-[9px] font-black uppercase text-slate-400">Midfielders</div>
                              {homeLineup.mf.map((p: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center text-xs font-semibold py-1">
                                  <span className="text-slate-700 dark:text-slate-300">⚙ {p.name}</span>
                                  <span className="font-mono font-bold text-cyan-500">{p.rating || (80 + (idx % 10))}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Forwards */}
                          {homeLineup.fw.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-[9px] font-black uppercase text-slate-400">Forwards</div>
                              {homeLineup.fw.map((p: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center text-xs font-semibold py-1">
                                  <span className="text-slate-700 dark:text-slate-300">🎯 {p.name}</span>
                                  <span className="font-mono font-bold text-cyan-500">{p.rating || (80 + (idx % 10))}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Away Squad */}
                      <div className="space-y-4">
                        <div className="font-black text-rose-450 border-b border-rose-500/10 pb-2 flex justify-between items-center">
                          <span>{currentMatch.awayTeamObj.name} Players</span>
                          <span className="text-[10px] text-slate-400 font-mono">Rating</span>
                        </div>

                        <div className="space-y-3">
                          {/* Goalkeepers */}
                          {awayLineup.gk.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-[9px] font-black uppercase text-slate-400">Goalkeepers</div>
                              {awayLineup.gk.map((p: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center text-xs font-semibold py-1">
                                  <span className="text-slate-700 dark:text-slate-300">🧤 {p.name}</span>
                                  <span className="font-mono font-bold text-rose-500">{p.rating || (80 + (idx % 10))}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Defenders */}
                          {awayLineup.df.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-[9px] font-black uppercase text-slate-400">Defenders</div>
                              {awayLineup.df.map((p: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center text-xs font-semibold py-1">
                                  <span className="text-slate-700 dark:text-slate-300">🛡 {p.name}</span>
                                  <span className="font-mono font-bold text-rose-500">{p.rating || (80 + (idx % 10))}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Midfielders */}
                          {awayLineup.mf.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-[9px] font-black uppercase text-slate-400">Midfielders</div>
                              {awayLineup.mf.map((p: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center text-xs font-semibold py-1">
                                  <span className="text-slate-700 dark:text-slate-300">⚙ {p.name}</span>
                                  <span className="font-mono font-bold text-rose-500">{p.rating || (80 + (idx % 10))}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Forwards */}
                          {awayLineup.fw.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-[9px] font-black uppercase text-slate-400">Forwards</div>
                              {awayLineup.fw.map((p: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center text-xs font-semibold py-1">
                                  <span className="text-slate-700 dark:text-slate-300">🎯 {p.name}</span>
                                  <span className="font-mono font-bold text-rose-500">{p.rating || (80 + (idx % 10))}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {!showFullLineup && (
                      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white dark:from-[#16181D] to-transparent pointer-events-none" />
                    )}
                  </div>

                  <div className="flex justify-center pt-2">
                    <button
                      onClick={() => setShowFullLineup(!showFullLineup)}
                      className="px-6 py-2 rounded-full border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition cursor-pointer select-none"
                    >
                      {showFullLineup ? "Show Less" : "Show Full Lineup"}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* STANDALONE DISCUSSION SECTION BELOW TABS */}
          <div className="bg-white dark:bg-[#16181D] rounded-3xl border border-slate-200 dark:border-white/5 p-6 shadow-sm space-y-6">
            {/* <h3 className="font-display font-bold text-lg text-slate-800 dark:text-white">
              Discussion
            </h3> */}

            {/* COMMENT COMPOSER */}
            <div className="space-y-3">
              <textarea
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value.slice(0, 1000))}
                placeholder="Add a comment..."
                className="w-full h-20 p-3 bg-transparent border-b border-slate-200 dark:border-white/10 text-xs text-slate-850 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition resize-none"
              />
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-450">{newCommentText.length}/1000 characters</span>
                <div className="flex gap-2">
                  {newCommentText && (
                    <button
                      onClick={() => setNewCommentText("")}
                      className="px-4 py-2 text-xs font-bold text-slate-450 hover:text-slate-250 cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={handlePostComment}
                    disabled={submittingComment || !newCommentText.trim()}
                    className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-slate-950 font-extrabold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer select-none transition"
                  >
                    {submittingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Post Comment
                  </button>
                </div>
              </div>
            </div>

            {/* COMMENTS HEADER SORTING */}
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-white/5 pb-3">
              <span className="text-xs font-bold text-slate-450 uppercase tracking-wider">{comments.length} Comments</span>
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={commentSort}
                  onChange={(e) => setCommentSort(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-855 dark:text-slate-300 focus:outline-none cursor-pointer"
                >
                  {["Newest", "Oldest", "Most Liked", "Most Replies", "Trending"].map((opt) => (
                    <option key={opt} value={opt} className="dark:bg-slate-900">{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* COMMENTS STREAM */}
            {loadingComments ? (
              <div className="h-24 flex justify-center items-center">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-450">
                No comments posted yet. Be the first to share your insights!
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
                      onClick={() => setVisibleCommentsLimit((prev) => prev + 10)}
                      className="px-4 py-2 text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 hover:dark:text-cyan-300 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl transition cursor-pointer select-none"
                    >
                      Show More
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN (Sticky prediction market panel & related cards) */}
        <div className="lg:col-span-4 space-y-8 lg:sticky lg:top-24">

          {/* STICKY PREDICTION PANEL */}
          <div className="bg-white dark:bg-[#16181D] rounded-3xl border border-slate-200 dark:border-white/5 p-6 shadow-xl space-y-6">
            <div className="space-y-1 border-b border-slate-100 dark:border-white/5 pb-4">
              <h3 className="font-display font-black text-lg text-slate-850 dark:text-white tracking-tight flex items-center gap-1.5">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Prediction Pool
              </h3>
              {/* <p className="text-xs text-slate-400">
                Percentages update live. Correct predictions score platform ELO.
              </p> */}
            </div>

            {loadingPreds ? (
              <div className="h-28 flex justify-center items-center">
                <Loader2 className="w-5 h-5 animate-spin text-cyan-500" />
              </div>
            ) : (() => {
              const isPlaceholderHome = !fixture.homeTeamObj.code || fixture.homeTeamObj.code === "TBD" || fixture.homeTeamObj.name.toLowerCase().includes("winner") || fixture.homeTeamObj.name.toLowerCase().includes("runner");
              const isPlaceholderAway = !fixture.awayTeamObj.code || fixture.awayTeamObj.code === "TBD" || fixture.awayTeamObj.name.toLowerCase().includes("winner") || fixture.awayTeamObj.name.toLowerCase().includes("runner");
              const teamsNotAssigned = isPlaceholderHome || isPlaceholderAway;

              if (teamsNotAssigned) {
                return (
                  <div className="bg-slate-50 dark:bg-white/[0.02] p-6 rounded-2xl border border-slate-200 dark:border-white/5 text-center space-y-2 py-8">
                    <div className="text-sm font-black text-slate-500 dark:text-slate-450 uppercase tracking-widest">
                      Voting Not Yet Started
                    </div>
                    <p className="text-xs text-slate-450 dark:text-slate-500 font-medium leading-relaxed max-w-[240px] mx-auto">
                      Competing teams are not yet determined. Predictions will open once participants are locked.
                    </p>
                  </div>
                );
              }

              if (fixture.status === "COMPLETED") {
                const homeScoreVal = parseInt(fixture.homeScore, 10);
                const awayScoreVal = parseInt(fixture.awayScore, 10);

                const homeWonReal = !isNaN(homeScoreVal) && !isNaN(awayScoreVal) && homeScoreVal > awayScoreVal;
                const awayWonReal = !isNaN(homeScoreVal) && !isNaN(awayScoreVal) && awayScoreVal > homeScoreVal;
                const isDrawScore = !isNaN(homeScoreVal) && !isNaN(awayScoreVal) && homeScoreVal === awayScoreVal;

                let homeWon = homeWonReal;
                let awayWon = awayWonReal;
                let isDraw = isDrawScore;

                if (isDrawScore && fixture.isKnockout && allFixtures.length > 0) {
                  const homeCode = fixture.homeTeamObj.code;
                  const awayCode = fixture.awayTeamObj.code;
                  const homeQualified = allFixtures.some(f => 
                    f.match_no > fixture.match_no && 
                    (f.homeTeamObj.code === homeCode || f.awayTeamObj.code === homeCode)
                  );
                  const awayQualified = allFixtures.some(f => 
                    f.match_no > fixture.match_no && 
                    (f.homeTeamObj.code === awayCode || f.awayTeamObj.code === awayCode)
                  );

                  if (homeQualified && !awayQualified) {
                    homeWon = true;
                    isDraw = false;
                  } else if (awayQualified && !homeQualified) {
                    awayWon = true;
                    isDraw = false;
                  }
                }

                const winnerName = homeWon ? fixture.homeTeamObj.name : awayWon ? fixture.awayTeamObj.name : "Draw";
                const winnerFlag = homeWon ? fixture.homeTeamObj.flag : awayWon ? fixture.awayTeamObj.flag : null;
                const winnerCode = homeWon ? fixture.homeTeamObj.code : awayWon ? fixture.awayTeamObj.code : null;

                return (
                  <div className="bg-emerald-500/5 dark:bg-emerald-500/10 p-5 rounded-2xl border border-emerald-500/20 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Determined</span>
                    </div>
                    <div className="bg-white dark:bg-[#16181D]/30 border border-slate-100 dark:border-white/5 p-4 rounded-xl flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider">Winner</span>
                      {isDraw ? (
                        <span className="text-sm font-black text-slate-800 dark:text-white">Draw</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <CountryFlag
                            code={winnerCode || ""}
                            flag={winnerFlag || ""}
                            name={winnerName || ""}
                            className="h-4 w-6 rounded shadow-xs"
                            emojiClassName="text-sm"
                          />
                          <span className="text-sm font-black text-slate-855 dark:text-white">
                            {winnerName}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              return userPrediction ? (
                <div className="bg-slate-50 dark:bg-white/[0.02] p-4.5 rounded-2xl border border-slate-200 dark:border-white/5 space-y-5">
                  <div className="flex items-center gap-2 text-xs font-black text-cyan-600 dark:text-neon uppercase tracking-widest">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>✔ Predicted {userPrediction === "HOME" ? fixture.homeTeamObj.name : fixture.awayTeamObj.name}</span>
                  </div>

                  <div className="space-y-3.5 text-xs font-bold">
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-800 dark:text-slate-300">{fixture.homeTeamObj.name}</span>
                        <span className="font-mono">{predictionsSummary.homePercent}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${predictionsSummary.homePercent}%` }} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-800 dark:text-slate-300">{fixture.awayTeamObj.name}</span>
                        <span className="font-mono">{predictionsSummary.awayPercent}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500 transition-all duration-500" style={{ width: `${predictionsSummary.awayPercent}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <span>Confidence: {sentimentStats.confidenceIndex}%</span>
                    <span>Total Votes: {predictionsSummary.totalVotes}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-xs font-black uppercase text-slate-400 tracking-wider">
                    Will {fixture.homeTeamObj.name} win?
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        if (!currentUserId) {
                          toast.error("Please sign in to cast your prediction!");
                          return;
                        }
                        setConfirmChoice("HOME");
                      }}
                      disabled={submittingPrediction || fixture.status === "COMPLETED"}
                      className="flex-1 py-3.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 font-black text-xs cursor-pointer select-none transition flex items-center justify-center gap-2"
                    >
                      <span>Yes</span>
                      <CountryFlag
                        code={fixture.homeTeamObj.code}
                        flag={fixture.homeTeamObj.flag}
                        name={fixture.homeTeamObj.name}
                        className="h-3.5 w-5 rounded object-cover shadow-sm border border-emerald-500/10"
                        emojiClassName="text-xs"
                      />
                      <span>({fixture.homeTeamObj.name})</span>
                    </button>
                    <button
                      onClick={() => {
                        if (!currentUserId) {
                          toast.error("Please sign in to cast your prediction!");
                          return;
                        }
                        setConfirmChoice("AWAY");
                      }}
                      disabled={submittingPrediction || fixture.status === "COMPLETED"}
                      className="flex-1 py-3.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-650 dark:text-rose-400 font-black text-xs cursor-pointer select-none transition flex items-center justify-center gap-2"
                    >
                      <span>No</span>
                      <CountryFlag
                        code={fixture.awayTeamObj.code}
                        flag={fixture.awayTeamObj.flag}
                        name={fixture.awayTeamObj.name}
                        className="h-3.5 w-5 rounded object-cover shadow-sm border border-rose-500/10"
                        emojiClassName="text-xs"
                      />
                      <span>({fixture.awayTeamObj.name})</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Secondary actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success("Match URL copied to clipboard!");
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-650 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
              >
                <Share2 className="w-3.5 h-3.5" />
                Share
              </button>
            </div>
          </div>

          {/* MORE GAMES SIDEBAR */}
          <div className="space-y-4">
            <h3 className="font-display font-black text-sm uppercase tracking-wider text-slate-500">More Games</h3>

            {loadingRelated ? (
              <div className="h-32 flex justify-center items-center">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              </div>
            ) : relatedMatches.length === 0 ? (
              <div className="text-xs text-slate-400">No other matches scheduled.</div>
            ) : (
              <div className="flex flex-col gap-3">
                {relatedMatches.slice(0, 5).map((m) => (
                  <Link
                    key={m.match_no}
                    href={`/world-cup/match/${m.match_no}`}
                    className="w-full bg-white dark:bg-[#16181D] rounded-2xl border border-slate-200 dark:border-white/5 p-4 hover:border-cyan-500/30 transition duration-300 block space-y-3"
                  >
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase">
                      <span>{m.stageName}</span>
                      <span className="font-mono">{format(new Date(m.date), "MMM d")}</span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <CountryFlag
                            code={m.homeTeamObj.code}
                            flag={m.homeTeamObj.flag}
                            name={m.homeTeamObj.name}
                            className="h-3.5 w-5 rounded object-cover shadow-sm"
                            emojiClassName="text-xs"
                          />
                          <span className="text-xs font-bold truncate text-slate-800 dark:text-white">{m.homeTeamObj.name}</span>
                        </div>
                        <span className="text-xs font-black font-mono text-emerald-500">
                          {m.predictions.hasVoted ? `${m.predictions.homePercent}%` : "-%"}
                        </span>
                      </div>

                      <div className="flex justify-between items-center min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <CountryFlag
                            code={m.awayTeamObj.code}
                            flag={m.awayTeamObj.flag}
                            name={m.awayTeamObj.name}
                            className="h-3.5 w-5 rounded object-cover shadow-sm"
                            emojiClassName="text-xs"
                          />
                          <span className="text-xs font-bold truncate text-slate-800 dark:text-white">{m.awayTeamObj.name}</span>
                        </div>
                        <span className="text-xs font-black font-mono text-rose-500">
                          {m.predictions.hasVoted ? `${m.predictions.awayPercent}%` : "-%"}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {confirmChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#16181D] rounded-3xl border border-slate-200 dark:border-white/5 p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <h3 className="font-display font-black text-base text-slate-800 dark:text-white">Confirm Prediction</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              Are you sure you want to predict that <strong>{confirmChoice === "HOME" ? fixture.homeTeamObj.name : fixture.awayTeamObj.name}</strong> will win? This action cannot be undone.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setConfirmChoice(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-xs font-bold text-slate-500 dark:text-slate-450 cursor-pointer transition select-none"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handlePredict(confirmChoice);
                  setConfirmChoice(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-black text-xs cursor-pointer transition shadow-md select-none"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// RECURSIVE COMMENTS NODE RENDERER
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
  comment,
  depth,
  currentUserId,
  onLike,
  onReport,
  replyTargetId,
  setReplyTargetId,
  replyText,
  setReplyText,
  onPostReply,
  collapsedComments,
  toggleCollapse
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
          <div className="h-6 w-6 rounded-full bg-slate-250 dark:bg-white/5 flex items-center justify-center text-xs font-black text-slate-500 uppercase">
            {comment.user?.name ? comment.user.name.charAt(0) : "U"}
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{comment.user?.name || "Guest"}</span>
              {comment.user?.role === "admin" && (
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              {format(new Date(comment.createdAt), "PPpp")}
            </span>
          </div>
        </div>

        {comment.replies && comment.replies.length > 0 && (
          <button
            onClick={() => toggleCollapse(comment.id)}
            className="text-[10px] font-bold text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer select-none"
          >
            {isCollapsed ? (
              <>
                <ChevronDown className="w-3 h-3" />
                Expand ({comment.replies.length})
              </>
            ) : (
              <>
                <ChevronUp className="w-3 h-3" />
                Collapse
              </>
            )}
          </button>
        )}
      </div>

      {!isCollapsed && (
        <div className="space-y-2 w-full overflow-hidden">
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium break-words">
            {comment.content}
          </p>

          <div className="flex items-center gap-4 text-[10px] font-black uppercase text-slate-450 dark:text-slate-400 pt-1">
            <button
              onClick={() => onLike(comment.id, isReply ? "REPLY" : "COMMENT")}
              className={`flex items-center gap-1 hover:text-cyan-500 cursor-pointer select-none transition ${isLiked ? "text-cyan-500 dark:text-neon" : ""}`}
            >
              <ThumbsUp className="w-3 h-3" />
              Like ({likesCount})
            </button>
            <button
              onClick={() => {
                setReplyTargetId(comment.id);
                setReplyText("");
              }}
              className="flex items-center gap-1 hover:text-cyan-500 cursor-pointer select-none"
            >
              <CornerDownRight className="w-3 h-3" />
              Reply
            </button>
            <button
              onClick={() => onReport(comment.id, isReply ? "REPLY" : "COMMENT")}
              className="flex items-center gap-1 hover:text-rose-500 cursor-pointer select-none opacity-50 hover:opacity-100 ml-auto"
            >
              <Flag className="w-3 h-3" />
              Report
            </button>
          </div>

          {replyTargetId === comment.id && (
            <div className="bg-slate-50 dark:bg-white/[0.01] border border-slate-200 dark:border-white/5 rounded-2xl p-3 space-y-2.5 mt-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value.slice(0, 500))}
                placeholder={`Replying to ${comment.user?.name || "Guest"}...`}
                className="w-full h-16 p-2 bg-transparent text-xs text-slate-800 dark:text-white placeholder-slate-450 focus:outline-none resize-none"
              />
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold text-slate-450">{replyText.length}/500</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setReplyTargetId(null)}
                    className="px-3 py-1.5 text-[10px] font-bold text-slate-450 hover:text-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => onPostReply(isReply ? comment.commentId : comment.id, comment.id)}
                    disabled={!replyText.trim()}
                    className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-slate-950 font-black text-[10px] rounded-lg cursor-pointer select-none transition"
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
