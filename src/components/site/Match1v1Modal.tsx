"use client";

import React, { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { Brain, Cpu, Sparkles, Activity, Shield, Crosshair, Play } from "lucide-react";

interface Match1v1ModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: {
    id: string;
    group: string;
    homeCode: string;
    awayCode: string;
    homeScore: number | "";
    awayScore: number | "";
  } | null;
  homeTeam: any;
  awayTeam: any;
  homeTopPlayer?: any;
  awayTopPlayer?: any;
  homeLambda: number;
  awayLambda: number;
  matchDetails: {
    date: string;
    time?: string;
    venue: string;
    matchNumber?: number;
  };
  onSimulate: () => void;
  isRealData: boolean;
  isReadOnly?: boolean;
}

export function Match1v1Modal({
  isOpen,
  onClose,
  match,
  homeTeam,
  awayTeam,
  homeTopPlayer,
  awayTopPlayer,
  homeLambda,
  awayLambda,
  matchDetails,
  onSimulate,
  isRealData,
  isReadOnly = false
}: Match1v1ModalProps) {
  const probs = useMemo(() => {
    if (!homeTeam || !awayTeam) return { homeWin: 0, awayWin: 0 };
    
    // Compute knockout probabilities (must sum to 100%, no draws)
    const poissonPdf = (lambda: number, k: number) => {
      let fact = 1;
      for (let i = 2; i <= k; i++) fact *= i;
      return (Math.pow(lambda, k) * Math.exp(-lambda)) / fact;
    };

    const homeP = Array.from({ length: 8 }, (_, k) => poissonPdf(homeLambda, k));
    const awayP = Array.from({ length: 8 }, (_, k) => poissonPdf(awayLambda, k));

    let pHomeWin = 0;
    let pDraw = 0;
    let pAwayWin = 0;

    for (let h = 0; h < 8; h++) {
      for (let a = 0; a < 8; a++) {
        const p = homeP[h] * awayP[a];
        if (h > a) pHomeWin += p;
        else if (h === a) pDraw += p;
        else pAwayWin += p;
      }
    }

    const total = pHomeWin + pDraw + pAwayWin;
    pHomeWin /= total || 1;
    pDraw /= total || 1;
    pAwayWin /= total || 1;

    // Knockout resolves draws proportionally
    const drawSplit = pHomeWin / (pHomeWin + pAwayWin || 1);
    pHomeWin += pDraw * drawSplit;
    pAwayWin += pDraw * (1 - drawSplit);

    return {
      homeWin: Math.round(pHomeWin * 100),
      awayWin: Math.round(pAwayWin * 100)
    };
  }, [homeTeam, awayTeam, homeLambda, awayLambda]);

  if (!match || !homeTeam || !awayTeam) return null;

  const StatBar = ({ label, homeValue, awayValue, icon: Icon, maxValue }: any) => {
    const homePercent = Math.min(100, Math.max(0, (homeValue / maxValue) * 100));
    const awayPercent = Math.min(100, Math.max(0, (awayValue / maxValue) * 100));
    const isHomeBetter = homeValue >= awayValue;
    
    return (
      <div className="mb-4">
        <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
          <span className={isHomeBetter ? "text-emerald-500 dark:text-emerald-400" : ""}>{Math.round(homeValue)}</span>
          <span className="flex items-center gap-1"><Icon className="h-3 w-3" /> {label}</span>
          <span className={!isHomeBetter ? "text-emerald-500 dark:text-emerald-400" : ""}>{Math.round(awayValue)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden flex justify-end">
            <div className={`h-full ${isHomeBetter ? "bg-emerald-500" : "bg-slate-400 dark:bg-slate-600"}`} style={{ width: `${homePercent}%` }} />
          </div>
          <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
            <div className={`h-full ${!isHomeBetter ? "bg-emerald-500" : "bg-slate-400 dark:bg-slate-600"}`} style={{ width: `${awayPercent}%` }} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-card border border-border shadow-2xl">
        <div className="bg-muted/30 dark:bg-white/5 border-b border-border p-6 text-center">
          <DialogTitle className="text-xl font-display font-bold text-foreground">
            {match.group === "r32" ? "Round of 32" :
             match.group === "r16" ? "Round of 16" :
             match.group === "qf" ? "Quarter-Final" :
             match.group === "sf" ? "Semi-Final" :
             match.group === "final" ? "Final" : "Third Place"} Match
          </DialogTitle>
          <DialogDescription className="mt-1 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>{matchDetails.date}</span> &bull; <span>{matchDetails.venue}</span>
            {isRealData && <span className="ml-2 inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-500 uppercase tracking-widest border border-cyan-500/30">Real Data</span>}
          </DialogDescription>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            {/* Home Team */}
            <div className="flex flex-col items-center gap-2 w-1/3">
              <CountryFlag 
                code={homeTeam.code} 
                flag={homeTeam.flag} 
                name={homeTeam.name} 
                className="h-16 w-24 rounded-lg object-cover shadow-lg border border-border" 
                emojiClassName="text-6xl leading-none drop-shadow-md"
              />
              <span className="font-bold text-lg text-center leading-tight">{homeTeam.name}</span>
              <span className="text-xs text-muted-foreground font-mono">#{homeTeam.rank}</span>
            </div>

            {/* VS and Score */}
            <div className="flex flex-col items-center justify-center w-1/3">
              {(match.homeScore !== "" && match.awayScore !== "") ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-3 font-display text-4xl font-black">
                    <span className={match.homeScore > match.awayScore ? "text-emerald-500" : ""}>{match.homeScore}</span>
                    <span className="text-muted-foreground text-xl">-</span>
                    <span className={match.awayScore > match.homeScore ? "text-emerald-500" : ""}>{match.awayScore}</span>
                  </div>
                  {match.homeScore === match.awayScore && (
                    <div className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Pens</div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2 font-display text-2xl font-bold text-muted-foreground/50 italic">
                    VS
                  </div>
                  <div className="w-full flex mt-2 h-1.5 rounded-full overflow-hidden bg-muted">
                    <div className="bg-emerald-500" style={{ width: `${probs.homeWin}%` }} />
                    <div className="bg-blue-500" style={{ width: `${probs.awayWin}%` }} />
                  </div>
                  <div className="w-full flex justify-between text-[10px] font-bold mt-1 text-muted-foreground">
                    <span>{probs.homeWin}%</span>
                    <span>{probs.awayWin}%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Away Team */}
            <div className="flex flex-col items-center gap-2 w-1/3">
              <CountryFlag 
                code={awayTeam.code} 
                flag={awayTeam.flag} 
                name={awayTeam.name} 
                className="h-16 w-24 rounded-lg object-cover shadow-lg border border-border" 
                emojiClassName="text-6xl leading-none drop-shadow-md"
              />
              <span className="font-bold text-lg text-center leading-tight">{awayTeam.name}</span>
              <span className="text-xs text-muted-foreground font-mono">#{awayTeam.rank}</span>
            </div>
          </div>

          <div className="bg-muted/10 rounded-xl p-5 border border-border/50">
            <h4 className="text-xs font-bold uppercase tracking-widest text-center text-muted-foreground mb-4">Team Comparison</h4>
            
            <StatBar label="Elo Rating" homeValue={homeTeam.elo} awayValue={awayTeam.elo} icon={Activity} maxValue={2100} />
            <StatBar label="Attack" homeValue={homeTeam.attack} awayValue={awayTeam.attack} icon={Crosshair} maxValue={99} />
            <StatBar label="Defense" homeValue={homeTeam.defense} awayValue={awayTeam.defense} icon={Shield} maxValue={99} />

            {(homeTopPlayer || awayTopPlayer) && (
              <div className="mt-6 pt-4 border-t border-border/50 flex justify-between text-sm">
                <div className="w-[45%]">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Key Player</div>
                  {homeTopPlayer ? (
                    <div className="font-semibold">{homeTopPlayer["Name on Shirt"] || homeTopPlayer["Player Name"]} <span className="text-xs text-emerald-500 font-mono">({homeTopPlayer["Overall Rating"]})</span></div>
                  ) : <div className="text-muted-foreground text-xs italic">N/A</div>}
                </div>
                <div className="w-[45%] text-right">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Key Player</div>
                  {awayTopPlayer ? (
                    <div className="font-semibold"><span className="text-xs text-emerald-500 font-mono">({awayTopPlayer["Overall Rating"]})</span> {awayTopPlayer["Name on Shirt"] || awayTopPlayer["Player Name"]}</div>
                  ) : <div className="text-muted-foreground text-xs italic">N/A</div>}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-muted/30 dark:bg-white/5 border-t border-border p-4 flex justify-between items-center">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Close
          </button>
          {!isReadOnly && !(match.homeScore !== "" && match.awayScore !== "") && (
            <button
              type="button"
              onClick={() => {
                onSimulate();
                onClose();
              }}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-bold transition-all duration-200 active:scale-95 shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              <Play className="h-4 w-4" fill="currentColor" />
              Simulate Match
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
