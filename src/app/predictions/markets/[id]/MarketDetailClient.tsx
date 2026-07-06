"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { MessageSquare, Send, Loader2, ArrowLeft, TrendingUp, Layers, ChevronDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { generateHistoricalProbabilities } from "@/lib/mockProbabilityData";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

type MarketMatch = {
  id: string;
  homeTeamName: string;
  homeTeamCode: string;
  homeTeamFlag: string;
  awayTeamName: string;
  awayTeamCode: string;
  awayTeamFlag: string;
  matchDate: Date;
  stage: string;
  status: string;
  homeProb: number;
  drawProb: number;
  awayProb: number;
  totalVotes: number;
};

type PredictionSelection = {
  marketId: string;
  marketName: string;
  outcome: string;
  percentage: number;
  dbOutcome: "HOME" | "DRAW" | "AWAY"; // map back to db schema
};

export function MarketDetailClient({ initialMatch }: { initialMatch: MarketMatch }) {
  const [match, setMatch] = useState<MarketMatch>(initialMatch);
  const [allMatches, setAllMatches] = useState<MarketMatch[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isVoting, setIsVoting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voteMessage, setVoteMessage] = useState("");
  const [timeframe, setTimeframe] = useState<"10m" | "1h" | "1d" | "1w" | "all">("all");

  // Predict Board Selection State
  const [selectedPrediction, setSelectedPrediction] = useState<PredictionSelection | null>(null);
  const [predictAmount, setPredictAmount] = useState<number>(10);

  const graphData = useMemo(() => {
    return generateHistoricalProbabilities(match.homeProb, match.drawProb, match.awayProb);
  }, [match.homeProb, match.drawProb, match.awayProb]);

  // Fetch all matches for related markets sidebar
  const fetchAllMarkets = async () => {
    try {
      const res = await fetch("/api/markets");
      if (res.ok) {
        const data = await res.json();
        setAllMatches(data);
        
        // Sync current match details
        const current = data.find((m: any) => m.id === match.id);
        if (current) {
          setMatch(current);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/markets/${match.id}/comments`);
      if (res.ok) {
        setComments(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAllMarkets();
    fetchComments();
    
    // Set default selection
    setSelectedPrediction({
      marketId: "winner",
      marketName: "Match Winner",
      outcome: `${match.homeTeamName} Win`,
      percentage: match.homeProb,
      dbOutcome: "HOME"
    });
  }, [match.id]);

  // Handle Predict / Vote Action
  const handleVote = async () => {
    if (!selectedPrediction) return;
    setIsVoting(true);
    setVoteMessage("");
    try {
      const res = await fetch(`/api/markets/${match.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote: selectedPrediction.dbOutcome })
      });
      if (res.ok) {
        setVoteMessage("Prediction cast!");
        setTimeout(() => setVoteMessage(""), 3000);
        await fetchAllMarkets();
      } else {
        const data = await res.json();
        setVoteMessage(data.error || "Failed to predict.");
      }
    } catch (e) {
      console.error(e);
      setVoteMessage("Connection failed.");
    } finally {
      setIsVoting(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/markets/${match.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment })
      });
      if (res.ok) {
        setNewComment("");
        fetchComments();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const relatedMarkets = allMatches.filter(m => m.id !== match.id);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#111217] text-slate-900 dark:text-white flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        {/* Back Link */}
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white mb-6 transition-colors font-bold">
          <ArrowLeft className="w-4 h-4" />
          Back to Tournament
        </Link>

        {/* Polymarket Detail Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8 items-start">
          
          {/* Left Column: Market Info, Chart, Sub-markets, Comments (Span 7) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Header info card */}
            <div className="bg-white dark:bg-[#16181D] rounded-2xl border border-slate-200 dark:border-white/5 p-6 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                <span>Sports</span>
                <span>•</span>
                <span>World Cup</span>
                <span>•</span>
                <span>{match.stage}</span>
              </div>
              
              <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-6">
                Who will win: {match.homeTeamName} vs {match.awayTeamName}?
              </h1>

              {/* Outcomes row */}
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-white/5 pt-4">
                <div className="flex items-center gap-2.5">
                  <CountryFlag code={match.homeTeamCode} flag={match.homeTeamFlag} name={match.homeTeamName} className="h-6 w-9 rounded-sm" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{match.homeTeamName}</span>
                </div>
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  DRAW
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{match.awayTeamName}</span>
                  <CountryFlag code={match.awayTeamCode} flag={match.awayTeamFlag} name={match.awayTeamName} className="h-6 w-9 rounded-sm" />
                </div>
              </div>
            </div>

            {/* Recharts chart card */}
            <div className="bg-white dark:bg-[#16181D] rounded-2xl border border-slate-200 dark:border-white/5 p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-black flex items-center gap-2">
                  <TrendingUp className="w-4.5 h-4.5 text-neon" />
                  Probability Trend
                </h2>
                
                {/* Timeframe choices */}
                <div className="flex gap-1.5 bg-slate-100 dark:bg-white/5 p-0.5 rounded-lg text-[10px] font-bold">
                  {(["10m", "1h", "1d", "1w", "all"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTimeframe(t)}
                      className={`px-2.5 py-1 rounded-md uppercase transition-all ${
                        timeframe === t 
                          ? "bg-white dark:bg-[#1C1E26] text-slate-950 dark:text-white shadow-sm"
                          : "text-slate-450 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart lines display */}
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={graphData} margin={{ top: 10, right: 110, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#334155" strokeDasharray="3 3" opacity={0.4} />
                    <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tickMargin={10} />
                    <YAxis 
                      orientation="right" 
                      stroke="#475569" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(val) => `${val}%`} 
                      tickMargin={10}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`${Number(value).toFixed(1)}%`]}
                      contentStyle={{ backgroundColor: 'var(--tooltip-bg, #16181d)', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '8px' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                      labelStyle={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="home" 
                      name={match.homeTeamCode} 
                      stroke="#3b82f6" 
                      strokeWidth={2} 
                      dot={(props: any) => {
                        if (props.index !== graphData.length - 1) return <g key={`dot-home-${props.index}`}></g>;
                        return (
                          <g key={`dot-home-${props.index}`}>
                            <circle cx={props.cx} cy={props.cy} r={4} fill="#3b82f6" />
                            <text x={props.cx + 12} y={props.cy - 12} fill="#3b82f6" fontSize={12} fontWeight="600">{match.homeTeamName}</text>
                            <text x={props.cx + 12} y={props.cy + 12} fill="#3b82f6" fontSize={24} fontWeight="900" style={{ letterSpacing: '-0.05em' }}>{Math.round(Number(props.payload.home))}%</text>
                          </g>
                        );
                      }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="draw" 
                      name="DRAW" 
                      stroke="#94a3b8" 
                      strokeWidth={2} 
                      dot={(props: any) => {
                        if (props.index !== graphData.length - 1) return <g key={`dot-draw-${props.index}`}></g>;
                        return (
                          <g key={`dot-draw-${props.index}`}>
                            <circle cx={props.cx} cy={props.cy} r={4} fill="#94a3b8" />
                            <text x={props.cx + 12} y={props.cy - 12} fill="#94a3b8" fontSize={12} fontWeight="600">Draw</text>
                            <text x={props.cx + 12} y={props.cy + 12} fill="#94a3b8" fontSize={24} fontWeight="900" style={{ letterSpacing: '-0.05em' }}>{Math.round(Number(props.payload.draw))}%</text>
                          </g>
                        );
                      }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="away" 
                      name={match.awayTeamCode} 
                      stroke="#ef4444" 
                      strokeWidth={2} 
                      dot={(props: any) => {
                        if (props.index !== graphData.length - 1) return <g key={`dot-away-${props.index}`}></g>;
                        return (
                          <g key={`dot-away-${props.index}`}>
                            <circle cx={props.cx} cy={props.cy} r={4} fill="#ef4444" />
                            <text x={props.cx + 12} y={props.cy - 12} fill="#ef4444" fontSize={12} fontWeight="600">{match.awayTeamName}</text>
                            <text x={props.cx + 12} y={props.cy + 12} fill="#ef4444" fontSize={24} fontWeight="900" style={{ letterSpacing: '-0.05em' }}>{Math.round(Number(props.payload.away))}%</text>
                          </g>
                        );
                      }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sub-Markets List (Collapsible row sections) */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">
                Markets for this match
              </h3>

              {/* Row 1: Match Winner */}
              <div className="bg-white dark:bg-[#16181D] rounded-xl border border-slate-200 dark:border-white/5 p-4 shadow-sm space-y-3">
                <div className="flex justify-between items-center text-xs font-black text-slate-500 uppercase tracking-wider">
                  <span>Match Winner</span>
                  <span className="text-[10px] text-slate-400">Regular time</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => setSelectedPrediction({
                      marketId: "winner",
                      marketName: "Match Winner",
                      outcome: `${match.homeTeamName} Win`,
                      percentage: match.homeProb,
                      dbOutcome: "HOME"
                    })}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex justify-between items-center ${
                      selectedPrediction?.marketId === "winner" && selectedPrediction?.dbOutcome === "HOME"
                        ? "bg-blue-600 text-white shadow border border-blue-600"
                        : "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-950/30"
                    }`}
                  >
                    <span>{match.homeTeamName}</span>
                    <span className="font-mono">{match.homeProb}%</span>
                  </button>
                  <button 
                    onClick={() => setSelectedPrediction({
                      marketId: "winner",
                      marketName: "Match Winner",
                      outcome: "Draw Outcome",
                      percentage: match.drawProb,
                      dbOutcome: "DRAW"
                    })}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex justify-between items-center ${
                      selectedPrediction?.marketId === "winner" && selectedPrediction?.dbOutcome === "DRAW"
                        ? "bg-slate-600 dark:bg-slate-500 text-white shadow border border-slate-500"
                        : "bg-slate-50 dark:bg-slate-800/20 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/20 hover:bg-slate-100 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <span>DRAW</span>
                    <span className="font-mono">{match.drawProb}%</span>
                  </button>
                  <button 
                    onClick={() => setSelectedPrediction({
                      marketId: "winner",
                      marketName: "Match Winner",
                      outcome: `${match.awayTeamName} Win`,
                      percentage: match.awayProb,
                      dbOutcome: "AWAY"
                    })}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex justify-between items-center ${
                      selectedPrediction?.marketId === "winner" && selectedPrediction?.dbOutcome === "AWAY"
                        ? "bg-red-600 text-white shadow border border-red-600"
                        : "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-500/10 hover:bg-red-100 dark:hover:bg-red-950/30"
                    }`}
                  >
                    <span>{match.awayTeamName}</span>
                    <span className="font-mono">{match.awayProb}%</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Both Teams to Score */}
              <div className="bg-white dark:bg-[#16181D] rounded-xl border border-slate-200 dark:border-white/5 p-4 shadow-sm space-y-3">
                <div className="flex justify-between items-center text-xs font-black text-slate-500 uppercase tracking-wider">
                  <span>Both Teams to Score</span>
                  <span className="text-[10px] text-slate-400">Regular time</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setSelectedPrediction({
                      marketId: "btts",
                      marketName: "Both Teams to Score",
                      outcome: "Both Teams to Score: Yes",
                      percentage: 52,
                      dbOutcome: "HOME" // mock maps to HOME vote
                    })}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex justify-between items-center ${
                      selectedPrediction?.marketId === "btts" && selectedPrediction?.outcome.includes("Yes")
                        ? "bg-green-600 text-white shadow border border-green-600"
                        : "bg-slate-50 dark:bg-slate-800/20 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/20 hover:bg-slate-100 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <span>Yes</span>
                    <span className="font-mono">52%</span>
                  </button>
                  <button 
                    onClick={() => setSelectedPrediction({
                      marketId: "btts",
                      marketName: "Both Teams to Score",
                      outcome: "Both Teams to Score: No",
                      percentage: 48,
                      dbOutcome: "AWAY"
                    })}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex justify-between items-center ${
                      selectedPrediction?.marketId === "btts" && selectedPrediction?.outcome.includes("No")
                        ? "bg-slate-600 text-white shadow border border-slate-500"
                        : "bg-slate-50 dark:bg-slate-800/20 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/20 hover:bg-slate-100 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <span>No</span>
                    <span className="font-mono">48%</span>
                  </button>
                </div>
              </div>

              {/* Row 3: Total Goals */}
              <div className="bg-white dark:bg-[#16181D] rounded-xl border border-slate-200 dark:border-white/5 p-4 shadow-sm space-y-3">
                <div className="flex justify-between items-center text-xs font-black text-slate-500 uppercase tracking-wider">
                  <span>Total Goals (Over/Under 2.5)</span>
                  <span className="text-[10px] text-slate-400">Regular time</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setSelectedPrediction({
                      marketId: "total_goals",
                      marketName: "Total Goals Over/Under",
                      outcome: "Over 2.5 Goals",
                      percentage: 54,
                      dbOutcome: "HOME"
                    })}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex justify-between items-center ${
                      selectedPrediction?.marketId === "total_goals" && selectedPrediction?.outcome.includes("Over")
                        ? "bg-blue-600 text-white shadow border border-blue-600"
                        : "bg-slate-50 dark:bg-slate-800/20 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/20 hover:bg-slate-100 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <span>Over 2.5</span>
                    <span className="font-mono">54%</span>
                  </button>
                  <button 
                    onClick={() => setSelectedPrediction({
                      marketId: "total_goals",
                      marketName: "Total Goals Over/Under",
                      outcome: "Under 2.5 Goals",
                      percentage: 46,
                      dbOutcome: "AWAY"
                    })}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex justify-between items-center ${
                      selectedPrediction?.marketId === "total_goals" && selectedPrediction?.outcome.includes("Under")
                        ? "bg-slate-600 text-white shadow border border-slate-500"
                        : "bg-slate-50 dark:bg-slate-800/20 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/20 hover:bg-slate-100 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <span>Under 2.5</span>
                    <span className="font-mono">46%</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Comments Box (Expanded full-width below chart) */}
            <div className="bg-white dark:bg-[#16181D] rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden flex flex-col min-h-[500px] shadow-sm">
              <div className="p-4 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#1C1E26]">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <MessageSquare className="w-4.5 h-4.5 text-neon" />
                  Comments Discussion
                </h3>
              </div>

              {/* Feed */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {comments.length === 0 ? (
                  <div className="text-center text-slate-550 text-sm mt-12">
                    No comments yet. Share your thoughts below!
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 text-sm border-b border-slate-100 dark:border-white/5 pb-4 last:border-0 last:pb-0">
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex-shrink-0">
                        {comment.user.image ? (
                          <img src={comment.user.image} alt="User" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-200 font-bold text-xs bg-gradient-to-br from-indigo-500 to-purple-600">
                            {comment.user.name?.charAt(0) || "U"}
                          </div>
                        )}
                      </div>
                      
                      {/* Details */}
                      <div className="space-y-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-bold text-slate-850 dark:text-slate-200">{comment.user.name || "Anonymous"}</span>
                          <span className="text-[10px] text-slate-500">
                            {format(new Date(comment.createdAt), "MMM d, h:mm")}
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Send Form */}
              <div className="p-4 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#1C1E26]">
                <form onSubmit={handlePostComment} className="flex gap-2">
                  <input 
                    type="text" 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add to discussion..."
                    className="flex-1 bg-white dark:bg-black/40 border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-450 dark:placeholder:text-slate-500 focus:outline-none focus:border-neon/50"
                  />
                  <button 
                    type="submit" 
                    disabled={isSubmitting || !newComment.trim()}
                    className="p-2 bg-neon text-black rounded-lg hover:bg-neon-hover transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </form>
              </div>
            </div>

          </div>

          {/* Right Column: Vote panel & Related markets (Span 3) */}
          <div className="lg:col-span-3 space-y-6 lg:sticky lg:top-8">
            
            {/* Predict/Vote Box */}
            <div className="bg-white dark:bg-[#16181D] rounded-2xl border border-slate-200 dark:border-white/5 p-6 space-y-6 shadow-sm">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Cast Prediction</h2>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-semibold leading-relaxed">
                  Support dynamic crowdsourced probabilities.
                </p>
              </div>

              {selectedPrediction ? (
                <div className="space-y-6">
                  {/* Selection Badge */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/5 space-y-3">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <span>Market: {selectedPrediction.marketName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {selectedPrediction.outcome}
                      </span>
                      <span className="font-mono text-base font-black text-neon">
                        {selectedPrediction.percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Yes/No Options */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Prediction Type</span>
                    <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-black/40 p-1 rounded-xl">
                      <button className="py-2 rounded-lg bg-green-500 text-white text-xs font-bold shadow-md">
                        Yes {selectedPrediction.percentage}%
                      </button>
                      <button className="py-2 rounded-lg text-slate-500 dark:text-slate-450 hover:text-slate-700 text-xs font-bold">
                        No {100 - selectedPrediction.percentage}%
                      </button>
                    </div>
                  </div>

                  {/* Weight Points */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Weight Points</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{predictAmount} Points</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[1, 5, 10, 100].map((amt) => (
                        <button 
                          key={amt}
                          onClick={() => setPredictAmount(amt)}
                          className={`py-1.5 rounded-lg border text-xs font-bold transition-all ${
                            predictAmount === amt 
                              ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950 border-slate-900 dark:border-white"
                              : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/10 dark:hover:bg-white/5 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-350"
                          }`}
                        >
                          +{amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cast button */}
                  <button 
                    disabled={isVoting}
                    onClick={handleVote}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
                  >
                    {isVoting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cast Prediction"}
                  </button>

                  {voteMessage && (
                    <div className="text-center text-xs text-neon font-semibold animate-pulse">
                      {voteMessage}
                    </div>
                  )}

                </div>
              ) : (
                <div className="text-center py-6 text-xs text-slate-500">
                  Select a market option from the left to predict.
                </div>
              )}

              <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-200 dark:border-white/5">
                {match.totalVotes} total predictions cast
              </div>
            </div>

            {/* Related Markets Side Card */}
            {relatedMarkets.length > 0 && (
              <div className="bg-white dark:bg-[#16181D] rounded-2xl border border-slate-200 dark:border-white/5 p-6 space-y-4 shadow-sm">
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-2">
                  <TrendingUp className="w-4 h-4 text-neon" />
                  Related Matches
                </h3>
                <div className="space-y-3">
                  {relatedMarkets.map((rm) => (
                    <Link 
                      href={`/predictions/markets/${rm.id}`}
                      key={rm.id}
                      className="block p-3 rounded-xl border border-slate-100 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 bg-slate-50/50 dark:bg-black/10 transition-all space-y-2"
                    >
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                        <span>{rm.stage}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <CountryFlag code={rm.homeTeamCode} flag={rm.homeTeamFlag} name={rm.homeTeamName} className="h-4 w-6 rounded-sm" />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{rm.homeTeamName}</span>
                          <span className="text-[10px] text-slate-400">vs</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{rm.awayTeamName}</span>
                          <CountryFlag code={rm.awayTeamCode} flag={rm.awayTeamFlag} name={rm.awayTeamName} className="h-4 w-6 rounded-sm" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
