"use client";

import { useTournamentStore } from "@/stores/useTournamentStore";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { useVotingStore } from "@/stores/useVotingStore";
import { useSession } from "next-auth/react";
import { CheckCircle2 } from "lucide-react";

export function BracketTree() {
  const { rounds } = useTournamentStore();
  const { data: session } = useSession();
  const userVotes = useVotingStore((state) => state.userVotes);
  const voteQualification = useVotingStore((state) => state.voteQualification);

  const handleQualifyVote = async (matchId: number, teamId: number, teamCode: string) => {
    if (!session) {
      alert("Please sign in to vote!");
      return;
    }
    if (!teamCode) return;
    await voteQualification(matchId, teamId, teamCode);
  };

  // If no knockout matches are generated or available, return null to hide the section completely
  if (rounds.length === 0) {
    return null;
  }

  return (
    <div className="w-full overflow-x-auto pb-6 scrollbar-custom select-none">
      <div className="flex gap-8 min-w-[1200px] justify-between p-4 items-start">
        {rounds.map((round) => (
          <div key={round.key} className="flex-1 flex flex-col gap-6">
            {/* Round Title Header */}
            <div className="sticky top-0 bg-background/95 backdrop-blur z-10 border-b border-slate-200 dark:border-white/5 pb-2 mb-2 text-center">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-450 dark:text-slate-400 font-display">
                {round.name}
              </h4>
              <span className="text-[9px] text-muted-foreground font-mono font-bold">
                {round.matches.length} Matches
              </span>
            </div>

            {/* Matches list */}
            <div className="flex flex-col gap-4 justify-around h-full min-h-[600px]">
              {round.matches.map((m) => {
                const isCompleted = m.status === "COMPLETED";
                const hs = parseInt(m.homeScore, 10);
                const as = parseInt(m.awayScore, 10);
                
                let winnerCode = "";
                if (isCompleted && !isNaN(hs) && !isNaN(as)) {
                  winnerCode = hs > as ? m.homeTeamObj.code : m.awayTeamObj.code;
                }

                const qualifyVoteKey = `qualify-${m.match_no}`;
                const hasVoted = userVotes[qualifyVoteKey];

                return (
                  <div
                    key={m.match_no}
                    className={`bg-white dark:bg-[#16181D] rounded-2xl border p-4 shadow-sm hover:border-slate-350 dark:hover:border-white/10 transition-all duration-300 w-full max-w-[240px] mx-auto relative ${
                      m.status === "LIVE" ? "ring-2 ring-red-500 border-transparent animate-pulse" : "border-slate-200 dark:border-white/5"
                    }`}
                  >
                    {/* Match number */}
                    <div className="absolute -top-2.5 left-4 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-[8px] font-mono font-bold text-slate-400">
                      Match #{m.match_no}
                    </div>

                    <div className="space-y-3 pt-1">
                      {/* Home Team Row */}
                      <button
                        onClick={() => handleQualifyVote(m.match_no, (m as any).homeTeamObj.id || 0, m.homeTeamObj.code)}
                        disabled={isCompleted || !!hasVoted}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition ${
                          isCompleted && winnerCode === m.homeTeamObj.code
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold"
                            : isCompleted && winnerCode !== m.homeTeamObj.code
                              ? "opacity-40"
                              : hasVoted === m.homeTeamObj.code
                                ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-neon"
                                : "hover:bg-slate-50 dark:hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <CountryFlag
                            code={m.homeTeamObj.code}
                            flag={m.homeTeamObj.flag}
                            name={m.homeTeamObj.name}
                            className="h-4.5 w-6 rounded object-cover shadow-sm shrink-0"
                            emojiClassName="text-base"
                          />
                          <span className="text-xs font-bold truncate">{m.homeTeamObj.name}</span>
                        </div>
                        {isCompleted ? (
                          <span className="font-mono text-xs font-black">{m.homeScore}</span>
                        ) : hasVoted === m.homeTeamObj.code ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-neon" />
                        ) : null}
                      </button>

                      {/* Away Team Row */}
                      <button
                        onClick={() => handleQualifyVote(m.match_no, (m as any).awayTeamObj.id || 0, m.awayTeamObj.code)}
                        disabled={isCompleted || !!hasVoted}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition ${
                          isCompleted && winnerCode === m.awayTeamObj.code
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold"
                            : isCompleted && winnerCode !== m.awayTeamObj.code
                              ? "opacity-40"
                              : hasVoted === m.awayTeamObj.code
                                ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-neon"
                                : "hover:bg-slate-50 dark:hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <CountryFlag
                            code={m.awayTeamObj.code}
                            flag={m.awayTeamObj.flag}
                            name={m.awayTeamObj.name}
                            className="h-4.5 w-6 rounded object-cover shadow-sm shrink-0"
                            emojiClassName="text-base"
                          />
                          <span className="text-xs font-bold truncate">{m.awayTeamObj.name}</span>
                        </div>
                        {isCompleted ? (
                          <span className="font-mono text-xs font-black">{m.awayScore}</span>
                        ) : hasVoted === m.awayTeamObj.code ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-neon" />
                        ) : null}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
