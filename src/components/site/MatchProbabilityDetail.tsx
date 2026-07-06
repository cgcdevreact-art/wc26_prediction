"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { X, MessageSquare, Send, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { MarketMatch } from "./MatchProbabilitiesList";
import { generateHistoricalProbabilities } from "@/lib/mockProbabilityData";

export function MatchProbabilityDetail({ 
  match, 
  onClose 
}: { 
  match: MarketMatch; 
  onClose: () => void; 
}) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isVoting, setIsVoting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Memoize graph data to avoid recalculating on re-renders
  const graphData = useMemo(() => {
    return generateHistoricalProbabilities(match.homeProb, match.drawProb, match.awayProb);
  }, [match.homeProb, match.drawProb, match.awayProb]);

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
    fetchComments();
  }, [match.id]);

  const handleVote = async (vote: "HOME" | "DRAW" | "AWAY") => {
    setIsVoting(true);
    try {
      await fetch(`/api/markets/${match.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote })
      });
      // The parent component will refresh the match stats when modal closes
    } catch (e) {
      console.error(e);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#1C1E26] w-full max-w-5xl max-h-[90vh] rounded-2xl border border-white/10 flex flex-col md:flex-row overflow-hidden shadow-2xl">
        
        {/* Left Side: Graph and Voting */}
        <div className="flex-1 flex flex-col border-r border-white/10 overflow-y-auto">
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#1C1E26]/90 backdrop-blur-md z-10">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
                {match.stage}
              </div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Image src={match.homeTeamFlag} alt={match.homeTeamCode} width={28} height={28} className="rounded-sm" />
                {match.homeTeamName} vs {match.awayTeamName}
                <Image src={match.awayTeamFlag} alt={match.awayTeamCode} width={28} height={28} className="rounded-sm" />
              </h2>
            </div>
            <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 transition-colors md:hidden">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-8">
            {/* Graph */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={graphData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    labelStyle={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}
                  />
                  <Line type="monotone" dataKey="home" name={match.homeTeamCode} stroke="#3b82f6" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="draw" name="DRAW" stroke="#94a3b8" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="away" name={match.awayTeamCode} stroke="#ef4444" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Voting */}
            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Cast Your Prediction</h3>
              <div className="flex gap-4">
                <button 
                  disabled={isVoting}
                  onClick={() => handleVote("HOME")}
                  className="flex-1 p-4 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 transition-all text-center flex flex-col items-center gap-1 disabled:opacity-50"
                >
                  <span className="text-xs font-bold text-blue-400 uppercase">{match.homeTeamCode}</span>
                  <span className="text-xl font-black text-white">{match.homeProb}%</span>
                </button>
                <button 
                  disabled={isVoting}
                  onClick={() => handleVote("DRAW")}
                  className="flex-1 p-4 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/50 transition-all text-center flex flex-col items-center gap-1 disabled:opacity-50"
                >
                  <span className="text-xs font-bold text-slate-400 uppercase">DRAW</span>
                  <span className="text-xl font-black text-white">{match.drawProb}%</span>
                </button>
                <button 
                  disabled={isVoting}
                  onClick={() => handleVote("AWAY")}
                  className="flex-1 p-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-all text-center flex flex-col items-center gap-1 disabled:opacity-50"
                >
                  <span className="text-xs font-bold text-red-400 uppercase">{match.awayTeamCode}</span>
                  <span className="text-xl font-black text-white">{match.awayProb}%</span>
                </button>
              </div>
              <div className="mt-4 text-center text-xs text-slate-500">
                {match.totalVotes} total predictions cast
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Comments */}
        <div className="w-full md:w-80 flex flex-col bg-[#16181D]">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-neon" />
              Discussion
            </h3>
            <button onClick={onClose} className="hidden md:block p-1.5 hover:bg-white/5 rounded-full text-slate-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {comments.length === 0 ? (
              <div className="text-center text-slate-500 text-sm mt-10">
                No comments yet. Be the first to share your thoughts!
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden flex-shrink-0">
                    {comment.user.image ? (
                      <Image src={comment.user.image} alt="User" width={32} height={32} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xs bg-gradient-to-br from-indigo-500 to-purple-600">
                        {comment.user.name?.charAt(0) || "U"}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-bold text-slate-200">{comment.user.name || "Anonymous"}</span>
                      <span className="text-[10px] text-slate-500">
                        {format(new Date(comment.createdAt), "MMM d, h:mm a")}
                      </span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-sm">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-white/5 bg-[#1C1E26]">
            <form onSubmit={handlePostComment} className="flex gap-2">
              <input 
                type="text" 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your prediction..."
                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-neon/50"
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
    </div>
  );
}
