"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Trash2, Info, TrendingUp, Cpu, Award, Trophy, ChevronRight, Route, Sparkles, User, AlertCircle, BarChart2, Clock, Zap, Shield, Plus, Minus
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend
} from "recharts";
import { useTeams } from "@/components/TeamsProvider";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { readPredictionPayload } from "@/lib/predictionWinner";
import { UpgradeModal } from "@/components/site/UpgradeModal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

function formatTeamScaleRating(value: number | undefined | null) {
  if (value === undefined || value === null) return 75;
  if (value < 10) {
    const minM = 0.75;
    const maxM = 1.1;
    const minR = 50;
    const maxR = 95;
    const rating = ((value - minM) / (maxM - minM)) * (maxR - minR) + minR;
    return Math.max(15, Math.min(99, Math.round(rating)));
  }
  return Math.max(15, Math.min(99, Math.round(value)));
}

const CustomCompareTooltip = ({ active, payload, label, mode }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/90 dark:bg-slate-950/95 border border-slate-700/50 p-4 rounded-xl shadow-2xl backdrop-blur-md text-xs text-white">
        <p className="font-extrabold uppercase tracking-wider text-[10px] text-cyan-400 mb-2 border-b border-white/10 pb-1">{label}</p>
        <div className="space-y-1.5 font-sans">
          {payload.map((pld: any) => {
            const countryName = pld.name;
            const rawVal = mode === "attributes" && pld.payload ? pld.payload[`${countryName}_raw`] : null;
            return (
              <div key={countryName} className="flex items-center justify-between gap-4">
                <span className="font-semibold text-slate-300">{countryName}:</span>
                <span className="font-mono font-bold" style={{ color: pld.color }}>
                  {rawVal !== null ? String(rawVal) : `${pld.value}%`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

export default function SavedPredictionsClient() {
  const { data: session } = useSession();
  const router = useRouter();
  const appTeams = useTeams();

  const subTier = session?.user?.subscriptionTier || "free";
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<"plus" | "pro">("plus");

  const [savedPredictions, setSavedPredictions] = useState<any[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);
  const [compareMetricMode, setCompareMetricMode] = useState<"progression" | "attributes">("attributes");
  const [selectedHypotheticalCompareIds, setSelectedHypotheticalCompareIds] = useState<string[]>([]);
  const [compareHypotheticalMetricMode, setCompareHypotheticalMetricMode] = useState<"progression" | "attributes">("attributes");
  const [customCountries, setCustomCountries] = useState<any[]>([]);

  const fetchCustomCountries = async () => {
    if (!session?.user?.id) return;
    try {
      const res = await fetch("/api/user/custom-countries");
      if (res.ok) {
        const data = await res.json();
        setCustomCountries(data.customCountries || []);
      }
    } catch (err) {
      console.error("Error fetching custom countries:", err);
    }
  };

  const standardPredictions = useMemo(() => {
    return savedPredictions.filter((p) => {
      let data: any = null;
      try {
        data = readPredictionPayload(p.predictedPayload, p.predictedWinner);
      } catch (e) {
        console.error(e);
      }
      return data && !data.code?.startsWith("CC_");
    });
  }, [savedPredictions]);

  const hypotheticalPredictions = useMemo(() => {
    return savedPredictions.filter((p) => {
      let data: any = null;
      try {
        data = readPredictionPayload(p.predictedPayload, p.predictedWinner);
      } catch (e) {
        console.error(e);
      }
      return data && data.code?.startsWith("CC_");
    });
  }, [savedPredictions]);

  useEffect(() => {
    if (subTier === "free") {
      setCompareMetricMode("attributes");
      setCompareHypotheticalMetricMode("attributes");
    }
  }, [subTier]);

  const fetchSavedPredictions = async () => {
    if (!session?.user?.id) return;
    setIsLoadingSaved(true);
    try {
      const res = await fetch("/api/predictions");
      if (!res.ok) throw new Error("Failed to fetch predictions");
      const data = await res.json();

      const countryProjs = data.filter((p: any) => p.type.startsWith("COUNTRY_PROJECTION"));
      // Sort by updatedAt descending (newest first)
      countryProjs.sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setSavedPredictions(countryProjs);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingSaved(false);
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      fetchSavedPredictions();
      fetchCustomCountries();
    }
  }, [session]);

  const handleLoadPrediction = (prediction: any) => {
    const data = readPredictionPayload<any>(prediction.predictedPayload, prediction.predictedWinner);
    if (!data) return;
    router.push(`/predictions/country?team=${data.code}&load=${prediction.id}`);
  };

  const handleDeletePrediction = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the saved prediction for ${name}?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/predictions?id=${id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete prediction");
      toast.success(`Deleted prediction for ${name}`);
      fetchSavedPredictions();
      setSelectedCompareIds(prev => prev.filter(item => item !== id));
      setSelectedHypotheticalCompareIds(prev => prev.filter(item => item !== id));
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete prediction.");
    }
  };

  const toggleCompareSelect = (id: string) => {
    setSelectedCompareIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      }
      if (prev.length >= 4) return prev; // Limit to 4
      return [...prev, id];
    });
  };

  const toggleHypotheticalCompareSelect = (id: string) => {
    setSelectedHypotheticalCompareIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      }
      if (prev.length >= 4) return prev; // Limit to 4
      return [...prev, id];
    });
  };

  const formatSavedDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    });
  };

  const renderSection = (type: "standard" | "hypothetical") => {
    const isHypo = type === "hypothetical";
    const title = isHypo ? "My Hypothetical Predictions & Comparison" : "My Predictions & Comparison";
    const subtitle = isHypo 
      ? "Load saved custom/hypothetical country simulations or compare side-by-side" 
      : "Load saved Prediction or select multiple to compare side-by-side";
    const accordionValue = isHypo ? "hypothetical-comparison" : "saved-comparison";
    
    const predictions = isHypo ? hypotheticalPredictions : standardPredictions;
    const selectedIds = isHypo ? selectedHypotheticalCompareIds : selectedCompareIds;
    const onToggle = isHypo ? toggleHypotheticalCompareSelect : toggleCompareSelect;
    const metricMode = isHypo ? compareHypotheticalMetricMode : compareMetricMode;
    const setMetricMode = isHypo ? setCompareHypotheticalMetricMode : setCompareMetricMode;

    const lineColors = [
      "#06b6d4",
      "#d946ef",
      "#10b981",
      "#f59e0b",
      "#8b5cf6",
      "#3b82f6",
    ];

    const parsedCompareData = predictions
      .filter(p => selectedIds.includes(p.id))
      .map((p, idx) => {
        let data: any = null;
        try {
          data = readPredictionPayload(p.predictedPayload, p.predictedWinner);
        } catch (e) {
          console.error(e);
        }
        if (data) {
          const modelName = (data.modelName || "base").toUpperCase();
          data.displayName = `${data.name} (${modelName})`;
        }
        return { id: p.id, raw: p, data, color: lineColors[idx % lineColors.length] };
      })
      .filter(item => item.data !== null);

    const selectedCountryNames = Array.from(new Set(parsedCompareData.map(item => item.data.name)));
    const countryCounts: Record<string, number> = {};
    parsedCompareData.forEach(item => {
      const name = item.data.name;
      countryCounts[name] = (countryCounts[name] || 0) + 1;
    });
    const hasDuplicateCountrySelected = Object.values(countryCounts).some(count => count >= 2);

    const progressionChartData = [
      { stage: "Group Stage", ...parsedCompareData.reduce((acc, c) => ({ ...acc, [c.data.displayName]: 100 }), {}) },
      { stage: "Round of 32", ...parsedCompareData.reduce((acc, c) => ({ ...acc, [c.data.displayName]: parseFloat(((c.data.stages?.r32 ?? 0) / 10).toFixed(1)) }), {}) },
      { stage: "Round of 16", ...parsedCompareData.reduce((acc, c) => ({ ...acc, [c.data.displayName]: parseFloat(((c.data.stages?.r16 ?? 0) / 10).toFixed(1)) }), {}) },
      { stage: "Quarter Final", ...parsedCompareData.reduce((acc, c) => ({ ...acc, [c.data.displayName]: parseFloat(((c.data.stages?.qf ?? 0) / 10).toFixed(1)) }), {}) },
      { stage: "Semi Final", ...parsedCompareData.reduce((acc, c) => ({ ...acc, [c.data.displayName]: parseFloat(((c.data.stages?.sf ?? 0) / 10).toFixed(1)) }), {}) },
      { stage: "Final", ...parsedCompareData.reduce((acc, c) => ({ ...acc, [c.data.displayName]: parseFloat(((c.data.stages?.final ?? 0) / 10).toFixed(1)) }), {}) },
      { stage: "Champion", ...parsedCompareData.reduce((acc, c) => ({ ...acc, [c.data.displayName]: parseFloat(((c.data.stages?.champion ?? (c.data.championProb * 10 || 0)) / 10).toFixed(1)) }), {}) }
    ];

    const attributesChartData = [
      {
        attribute: "Elo Rating",
        ...parsedCompareData.reduce((acc, c) => {
          const rawElo = c.data.customElo ?? c.data.elo ?? 1500;
          const scaledElo = Math.round((rawElo - 1300) / 6);
          return {
            ...acc,
            [c.data.displayName]: Math.max(0, Math.min(100, scaledElo)),
            [`${c.data.displayName}_raw`]: rawElo
          };
        }, {})
      },
      {
        attribute: "Attack Rating",
        ...parsedCompareData.reduce((acc, c) => {
          const rawAttack = c.data.customAttack ?? 75;
          return {
            ...acc,
            [c.data.displayName]: rawAttack,
            [`${c.data.displayName}_raw`]: rawAttack
          };
        }, {})
      },
      {
        attribute: "Defense Rating",
        ...parsedCompareData.reduce((acc, c) => {
          const rawDefense = c.data.customDefense ?? 75;
          return {
            ...acc,
            [c.data.displayName]: rawDefense,
            [`${c.data.displayName}_raw`]: rawDefense
          };
        }, {})
      },
      {
        attribute: "Squad Value",
        ...parsedCompareData.reduce((acc, c) => {
          const rawSquadValue = c.data.squadValueM ?? appTeams.find(t => t.code === c.data.code)?.squadValueM ?? 100;
          const scaledSquad = Math.round(rawSquadValue / 15);
          return {
            ...acc,
            [c.data.displayName]: Math.max(0, Math.min(100, scaledSquad)),
            [`${c.data.displayName}_raw`]: `€${rawSquadValue}M`
          };
        }, {})
      },
      {
        attribute: "Championship Odds",
        ...parsedCompareData.reduce((acc, c) => {
          const ch = c.data.stages?.champion ?? (c.data.championProb * 10 || 0);
          const rawChamp = parseFloat((ch / 10).toFixed(1));
          return {
            ...acc,
            [c.data.displayName]: rawChamp,
            [`${c.data.displayName}_raw`]: `${rawChamp}%`
          };
        }, {})
      }
    ];

    const filteredAttributesChartData = subTier === "free"
      ? attributesChartData.filter(d => 
          d.attribute === "Elo Rating" || 
          d.attribute === "Attack Rating" || 
          d.attribute === "Defense Rating"
        )
      : attributesChartData;

    return (
      <Accordion
        type="multiple"
        defaultValue={[accordionValue]}
        className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-[2rem] relative shadow-[0_18px_50px_rgba(15,23,42,0.08)] mt-8"
      >
        <AccordionItem value={accordionValue} className="border-none">
          <AccordionTrigger className="px-6 md:px-8 pt-6 md:pt-8 pb-3 hover:no-underline">
            <div>
              <div className="font-display font-extrabold text-2xl text-foreground dark:text-white tracking-tight">{title}</div>
              <div className="text-xs text-[#00c6ff] mt-1 font-bold tracking-wider uppercase">{subtitle}</div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 md:px-8 pb-6 md:pb-8">
            {!session ? (
              <div className="text-center py-10">
                <p className="text-sm text-muted-foreground mb-4">Please sign in to view, load, and compare your saved predictions.</p>
              </div>
            ) : isLoadingSaved ? (
              <div className="flex flex-col justify-center items-center py-12 gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
                <span className="text-xs text-muted-foreground">Fetching saved simulations...</span>
              </div>
            ) : predictions.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground border border-dashed border-slate-200 dark:border-white/10 rounded-[1.75rem] p-6 bg-slate-50/50 dark:bg-white/[0.01]">
                <Sparkles className="w-8 h-8 text-cyan-500 mx-auto mb-3 opacity-60 animate-pulse" />
                <p className="font-bold text-foreground">
                  {isHypo ? "No hypothetical projections saved yet." : "No country projections saved yet."}
                </p>
                <p className="text-xs mt-1.5 max-w-md mx-auto font-sans leading-relaxed">
                  {isHypo
                    ? "Customize hypothetical country attributes in the Simulation Lab, run the simulator, and click \"Save to Predictions\" to build custom team comparisons."
                    : "Adjust team attributes in the Simulation Lab, run the simulator, and click \"Save to Predictions\" to begin building your comparison library."
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="overflow-x-auto rounded-[1.5rem] border border-slate-200 dark:border-white/10 bg-slate-50/30 dark:bg-black/20">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.02] text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        <th className="py-3 px-4 w-12 text-center">Compare</th>
                        <th className="py-3 px-4 min-w-[150px]">Country</th>
                        <th className="py-3 px-4">Elo Rating</th>
                        <th className="py-3 px-4">Model Engine</th>
                        <th className="py-3 px-4">Championship Odds</th>
                        <th className="py-3 px-4">Saved On</th>
                        <th className="py-3 px-4 text-right pr-6">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                      {predictions.map((p) => {
                        let data: any = null;
                        try {
                          data = readPredictionPayload(p.predictedPayload, p.predictedWinner);
                        } catch (e) {
                          console.error(e);
                        }

                        if (!data) return null;
                        const isChecked = selectedIds.includes(p.id);
                        const hasDifferentCountrySelected = selectedCountryNames.length > 0 && !selectedCountryNames.includes(data.name);
                        const isDisableCompare = !isChecked && (
                           selectedIds.length >= 4 || 
                           (hasDuplicateCountrySelected && hasDifferentCountrySelected)
                         );
                        const d = new Date(p.updatedAt);
                        const dateStr = d.toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        });
                        const timeStr = d.toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          hour12: true
                        });

                        return (
                          <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                            <td className="py-3.5 px-4 text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isDisableCompare}
                                onChange={() => onToggle(p.id)}
                                className="w-4.5 h-4.5 rounded border-slate-350 accent-cyan-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              />
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex flex-col gap-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="flex items-center gap-2">
                                    <CountryFlag code={data.code} flag={data.flag} name={data.name} className="h-5 w-7 shrink-0 rounded object-cover shadow-sm" emojiClassName="text-lg leading-none" />
                                    <span className="text-foreground font-bold">{data.name}</span>
                                  </div>
                                  {isHypo && (() => {
                                    const cc = customCountries.find(c => c.code === data.code);
                                    const replacedCode = data.replacedCode || cc?.replacedCode;
                                    const baselineCode = data.baselineCode || cc?.baselineCode;
                                    const replacedName = data.replacedName || appTeams.find(t => t.code === replacedCode)?.name || replacedCode;
                                    const baselineName = data.baselineName || appTeams.find(t => t.code === baselineCode)?.name || baselineCode;
                                    const replacedFlag = appTeams.find(t => t.code === replacedCode)?.flag;
                                    const baselineFlag = appTeams.find(t => t.code === baselineCode)?.flag;
                                    
                                    if (!replacedName && !baselineName) return null;
                                    return (
                                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[9px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 shrink-0 select-none">
                                        <span className="font-extrabold uppercase text-[8px] tracking-wider opacity-60">Replaces:</span>
                                        <CountryFlag code={replacedCode} flag={replacedFlag} name={replacedName} className="h-3.5 w-5 rounded object-cover shadow-sm shrink-0" emojiClassName="text-xs" />
                                        <span className="font-black">{replacedName || "N/A"}</span>
                                        <span className="opacity-40">•</span>
                                        <span className="font-extrabold uppercase text-[8px] tracking-wider opacity-60">Cloned:</span>
                                        <CountryFlag code={baselineCode} flag={baselineFlag} name={baselineName} className="h-3.5 w-5 rounded object-cover shadow-sm shrink-0" emojiClassName="text-xs" />
                                        <span className="font-black">{baselineName || "N/A"}</span>
                                      </span>
                                    );
                                  })()}
                                </div>
                                {data.path && data.path.length > 0 && (
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-0.5 font-sans">
                                    {data.path.map((step: any, idx: number) => (
                                      <span key={idx} className="flex items-center gap-0.5">
                                        <span className="font-medium text-slate-600 dark:text-slate-400">{step.stage}</span>
                                        <span className="font-mono font-bold text-cyan-600 dark:text-neon">({step.winPct}%)</span>
                                        {idx < data.path.length - 1 && <span className="text-slate-350 dark:text-slate-650 ml-1.5 font-sans">➔</span>}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Inclusion Badges for Actual Results & Custom Stats */}
                                <div className="flex flex-wrap gap-2 mt-1.5 items-center">
                                  {data.useRealScores && (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                                      <Zap className="w-2.5 h-2.5 fill-emerald-500/20" />
                                      Real-Time Data
                                    </span>
                                  )}

                                  {(() => {
                                    const originalTeam = appTeams.find(t => t.code === data.code);
                                    const defaultAttack = originalTeam ? formatTeamScaleRating(originalTeam.attack) : 75;
                                    const defaultDefense = originalTeam ? formatTeamScaleRating(originalTeam.defense) : 75;
                                    const isTeamEloCustomized = data.customElo !== undefined && originalTeam && Math.round(data.customElo) !== Math.round(originalTeam.elo);
                                    const isTeamAttackCustomized = data.customAttack !== undefined && Math.round(data.customAttack) !== defaultAttack;
                                    const isTeamDefenseCustomized = data.customDefense !== undefined && Math.round(data.customDefense) !== defaultDefense;
                                    const hasPlayerChanges = !!(
                                      (data.playersIn && data.playersIn.length > 0) || 
                                      (data.playersOut && data.playersOut.length > 0) || 
                                      (data.customPlayerRatingDelta !== undefined && data.customPlayerRatingDelta !== 0)
                                    );

                                    const isCustomCountry = data.code?.startsWith("CC_");
                                    const hasCustomStats = data.hasCustomStats !== undefined 
                                      ? data.hasCustomStats 
                                      : !!(isCustomCountry || isTeamEloCustomized || isTeamAttackCustomized || isTeamDefenseCustomized || hasPlayerChanges);

                                    return hasCustomStats ? (
                                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400">
                                        <Award className="w-2.5 h-2.5 fill-purple-500/20" />
                                        Custom Overrides
                                      </span>
                                    ) : null;
                                  })()}

                                  {!data.useRealScores && (() => {
                                    const originalTeam = appTeams.find(t => t.code === data.code);
                                    const defaultAttack = originalTeam ? formatTeamScaleRating(originalTeam.attack) : 75;
                                    const defaultDefense = originalTeam ? formatTeamScaleRating(originalTeam.defense) : 75;
                                    const isTeamEloCustomized = data.customElo !== undefined && originalTeam && Math.round(data.customElo) !== Math.round(originalTeam.elo);
                                    const isTeamAttackCustomized = data.customAttack !== undefined && Math.round(data.customAttack) !== defaultAttack;
                                    const isTeamDefenseCustomized = data.customDefense !== undefined && Math.round(data.customDefense) !== defaultDefense;
                                    const hasPlayerChanges = !!(
                                      (data.playersIn && data.playersIn.length > 0) || 
                                      (data.playersOut && data.playersOut.length > 0) || 
                                      (data.customPlayerRatingDelta !== undefined && data.customPlayerRatingDelta !== 0)
                                    );

                                    const isCustomCountry = data.code?.startsWith("CC_");
                                    const hasCustomStats = data.hasCustomStats !== undefined 
                                      ? data.hasCustomStats 
                                      : !!(isCustomCountry || isTeamEloCustomized || isTeamAttackCustomized || isTeamDefenseCustomized || hasPlayerChanges);

                                    return !hasCustomStats;
                                  })() && (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500">
                                      Standard Simulation
                                    </span>
                                  )}
                                </div>
                                {(() => {
                                  const originalTeam = appTeams.find(t => t.code === data.code);
                                  const defaultAttack = originalTeam ? formatTeamScaleRating(originalTeam.attack) : 75;
                                  const defaultDefense = originalTeam ? formatTeamScaleRating(originalTeam.defense) : 75;
                                  const isTeamEloCustomized = data.customElo !== undefined && originalTeam && Math.round(data.customElo) !== Math.round(originalTeam.elo);
                                  const isTeamAttackCustomized = data.customAttack !== undefined && Math.round(data.customAttack) !== defaultAttack;
                                  const isTeamDefenseCustomized = data.customDefense !== undefined && Math.round(data.customDefense) !== defaultDefense;
                                  const hasPlayerChanges = !!(
                                    (data.playersIn && data.playersIn.length > 0) || 
                                    (data.playersOut && data.playersOut.length > 0) || 
                                    (data.customPlayerRatingDelta !== undefined && data.customPlayerRatingDelta !== 0)
                                  );

                                  const isCustomCountry = data.code?.startsWith("CC_");
                                  const hasCustomStats = data.hasCustomStats !== undefined 
                                    ? data.hasCustomStats 
                                    : !!(isCustomCountry || isTeamEloCustomized || isTeamAttackCustomized || isTeamDefenseCustomized || hasPlayerChanges);

                                  if (!hasCustomStats) return null;

                                  const details: { type: string; label: string; code: string; name: string; flag: string }[] = [];
                                  const tName = originalTeam?.name || data.name || "";
                                  const tCode = originalTeam?.code || data.code || "";
                                  const tFlag = originalTeam?.flag || data.flag || "";

                                  if (isCustomCountry) {
                                    details.push({ type: "elo", label: `Elo: ${Math.round(data.customElo ?? data.elo ?? 1500)}`, code: tCode, name: tName, flag: tFlag });
                                    details.push({ type: "attack", label: `Attack: ${Math.round(data.customAttack ?? 75)}`, code: tCode, name: tName, flag: tFlag });
                                    details.push({ type: "defense", label: `Defense: ${Math.round(data.customDefense ?? 75)}`, code: tCode, name: tName, flag: tFlag });
                                  } else {
                                    if (isTeamEloCustomized) {
                                      details.push({ type: "elo", label: `Elo: ${Math.round(data.customElo)} (vs ${Math.round(originalTeam.elo)})`, code: tCode, name: tName, flag: tFlag });
                                    }
                                    if (isTeamAttackCustomized) {
                                      details.push({ type: "attack", label: `Attack: ${Math.round(data.customAttack)} (vs ${defaultAttack})`, code: tCode, name: tName, flag: tFlag });
                                    }
                                    if (isTeamDefenseCustomized) {
                                      details.push({ type: "defense", label: `Defense: ${Math.round(data.customDefense)} (vs ${defaultDefense})`, code: tCode, name: tName, flag: tFlag });
                                    }
                                  }

                                  if (data.customPlayerRatingDelta !== undefined && data.customPlayerRatingDelta !== 0) {
                                    details.push({ type: "squad_quality", label: `Squad Quality: ${data.customPlayerRatingDelta > 0 ? "+" : ""}${data.customPlayerRatingDelta}`, code: tCode, name: tName, flag: tFlag });
                                  }

                                  const otherTeamsBadges = data.activeOverridesSummary?.teams
                                    ?.filter((t: any) => t && t.code && t.name && t.name.trim() !== "")
                                    ?.map((t: any, idx: number) => {
                                      const flag = appTeams.find(x => x.code === t.code)?.flag;
                                      return (
                                        <span key={`other-t-${idx}`} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 dark:bg-white/5 text-slate-650 dark:text-slate-350 border border-slate-200 dark:border-white/10 select-none">
                                          <CountryFlag code={t.code} flag={flag} name={t.name} className="h-2.5 w-3.5 rounded object-cover shadow-sm shrink-0" emojiClassName="text-[10px]" />
                                          <span>{t.name} (Stats Modified)</span>
                                        </span>
                                      );
                                    });

                                  const playersList: { name: string; teamCode: string; teamName: string; detail?: string }[] = [];

                                  // Load from activeOverridesSummary if present
                                  if (data.activeOverridesSummary?.players) {
                                    data.activeOverridesSummary.players.forEach((p: any) => {
                                      playersList.push(p);
                                    });
                                  } else {
                                    // Backward compatibility fallback for older saved runs
                                    if (data.playersInNames && data.playersInNames.length > 0) {
                                      data.playersInNames.forEach((name: string) => {
                                        playersList.push({ name, teamCode: tCode, teamName: tName, detail: "Fit" });
                                      });
                                    } else if (data.playersIn && data.playersIn.length > 0) {
                                      data.playersIn.forEach((id: string) => {
                                        const name = id.split("-").pop() || id;
                                        playersList.push({ name, teamCode: tCode, teamName: tName, detail: "Fit" });
                                      });
                                    }

                                    if (data.playersOutNames && data.playersOutNames.length > 0) {
                                      data.playersOutNames.forEach((name: string) => {
                                        playersList.push({ name, teamCode: tCode, teamName: tName, detail: "Injured" });
                                      });
                                    } else if (data.playersOut && data.playersOut.length > 0) {
                                      data.playersOut.forEach((id: string) => {
                                        const name = id.split("-").pop() || id;
                                        playersList.push({ name, teamCode: tCode, teamName: tName, detail: "Injured" });
                                      });
                                    }
                                  }

                                  const otherPlayersBadges = playersList
                                    ?.filter((p: any) => p && p.name && p.name.trim() !== "" && p.teamCode)
                                    ?.map((p: any, idx: number) => {
                                      const flag = appTeams.find(x => x.code === p.teamCode)?.flag;
                                      return (
                                        <span key={`other-p-${idx}`} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 select-none">
                                          <CountryFlag code={p.teamCode} flag={flag} name={p.teamName || p.teamCode} className="h-2.5 w-3.5 rounded object-cover shadow-sm shrink-0" emojiClassName="text-[10px]" />
                                          <span className="opacity-75">{p.teamName || p.teamCode}</span>
                                          <span className="mx-0.5 text-indigo-200 dark:text-indigo-800 font-normal">|</span>
                                          <User className="w-2.5 h-2.5 shrink-0" />
                                          <span>{p.name}</span>
                                          {p.detail && (
                                            <>
                                              <span className="mx-0.5 text-indigo-200 dark:text-indigo-800 font-normal">|</span>
                                              <span className="text-[8px] opacity-90">{p.detail}</span>
                                            </>
                                          )}
                                        </span>
                                      );
                                    });

                                  return (
                                    <div className="flex flex-col gap-1.5 mt-2">
                                      {/* Simulated Team Overrides */}
                                      {details.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 items-center">
                                          <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 dark:text-slate-500 mr-1 select-none">Active Overrides:</span>
                                          {details.map((detail, index) => {
                                            let bgClass = "bg-slate-500/5 text-slate-500 border-slate-500/10";
                                            let icon = null;
                                            
                                            if (detail.type === "elo") {
                                              bgClass = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
                                              icon = <TrendingUp className="w-2.5 h-2.5 shrink-0" />;
                                            } else if (detail.type === "attack") {
                                              bgClass = "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
                                              icon = <Sparkles className="w-2.5 h-2.5 shrink-0" />;
                                            } else if (detail.type === "defense") {
                                              bgClass = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
                                              icon = <Shield className="w-2.5 h-2.5 shrink-0" />;
                                            } else if (detail.type === "squad_quality") {
                                              bgClass = "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20";
                                              icon = <Cpu className="w-2.5 h-2.5 shrink-0" />;
                                            } else if (detail.type === "added") {
                                              bgClass = "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20";
                                              icon = <Plus className="w-2.5 h-2.5 shrink-0" />;
                                            } else if (detail.type === "removed") {
                                              bgClass = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
                                              icon = <Minus className="w-2.5 h-2.5 shrink-0" />;
                                            }

                                            const isProjectedTeam = detail.code === data.code;
                                            return (
                                              <span key={index} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold border ${bgClass} select-none`}>
                                                {!isProjectedTeam && (
                                                  <>
                                                    <CountryFlag code={detail.code} flag={detail.flag} name={detail.name} className="h-2.5 w-3.5 rounded object-cover shadow-sm shrink-0" emojiClassName="text-[10px]" />
                                                    <span className="opacity-75">{detail.name}</span>
                                                    <span className="mx-0.5 text-slate-300 dark:text-slate-700 font-normal">|</span>
                                                  </>
                                                )}
                                                {icon}
                                                <span>{detail.label}</span>
                                              </span>
                                            );
                                          })}
                                        </div>
                                      )}

                                      {/* Other Edited Teams */}
                                      {otherTeamsBadges && otherTeamsBadges.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 items-center">
                                          <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 dark:text-slate-500 mr-1 select-none">Other Edited Teams:</span>
                                          <div className="flex flex-wrap gap-1.5">
                                            {otherTeamsBadges}
                                          </div>
                                        </div>
                                      )}

                                      {/* Edited Players */}
                                      {otherPlayersBadges && otherPlayersBadges.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 items-center">
                                          <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 dark:text-slate-500 mr-1 select-none">Edited Players:</span>
                                          <div className="flex flex-wrap gap-1.5">
                                            {otherPlayersBadges}
                                          </div>
                                        </div>
                                      )}

                                      {/* Generic Overrides Warning for Older Runs */}
                                      {details.length === 0 && (!otherTeamsBadges || otherTeamsBadges.length === 0) && (!otherPlayersBadges || otherPlayersBadges.length === 0) && (
                                        <div className="flex flex-wrap gap-1.5 items-center">
                                          <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 dark:text-slate-500 mr-1 select-none">Active Overrides:</span>
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-500/5 text-slate-500 border border-slate-500/10">
                                            Tournament-wide custom overrides active
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-xs text-muted-foreground">
                              {Math.round(data.customElo ?? data.elo ?? 1500)}
                            </td>
                            <td className="py-3.5 px-4 text-xs font-semibold text-cyan-600 dark:text-neon uppercase">
                              {data.modelName || "base"}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-foreground">
                              {data.championProb}%
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  {dateStr}
                                </span>
                                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-cyan-500/70 dark:text-cyan-400/70 shrink-0" />
                                  {timeStr}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right pr-6">
                              <div className="flex items-center justify-end gap-2.5">
                                <button
                                  onClick={() => handleLoadPrediction(p)}
                                  className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 hover:border-cyan-400 hover:text-cyan-500 bg-white hover:bg-slate-50 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 dark:text-white transition cursor-pointer"
                                  title="Load this simulation results and setup"
                                >
                                  Load
                                </button>
                                <button
                                  onClick={() => handleDeletePrediction(p.id, data.name)}
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition cursor-pointer"
                                  title="Delete saved projection"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Compare Section */}
                {selectedIds.length < 2 ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 p-4 rounded-[1.25rem]">
                    <Info className="w-4.5 h-4.5 text-cyan-500 shrink-0" />
                    <span>Select at least 2 saved country projections above to compare their performance parameters and tournament outcomes side-by-side.</span>
                  </div>
                ) : (
                  <div className="border-t border-slate-200 dark:border-white/10 pt-6">
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <h4 className="font-display font-extrabold text-base text-foreground flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-cyan-500" />
                            <span>Comparison Metrics Projection</span>
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5">Visualize side-by-side attributes or progression probabilities</p>
                        </div>
                        <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200/50 dark:border-white/5 self-stretch sm:self-auto">
                          <button
                            onClick={subTier === "free" ? () => {
                              setUpgradeReason("plus");
                              setUpgradeOpen(true);
                            } : () => setMetricMode("progression")}
                            className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition ${metricMode === "progression" ? "bg-white dark:bg-white/10 text-cyan-600 dark:text-neon shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                          >
                            Progression Curve
                          </button>
                          <button
                            onClick={() => setMetricMode("attributes")}
                            className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition ${metricMode === "attributes" ? "bg-white dark:bg-white/10 text-cyan-600 dark:text-neon shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                          >
                            Attributes Profile
                          </button>
                        </div>
                      </div>

                      <div className="w-full h-80">
                        {metricMode === "progression" ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={progressionChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                              <XAxis dataKey="stage" stroke="#94a3b8" fontSize={11} tickLine={false} />
                              <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `${v}%`} tickLine={false} />
                              <RechartsTooltip content={<CustomCompareTooltip mode="progression" />} />
                              <Legend />
                              {parsedCompareData.map((c) => (
                                <Line
                                  key={c.id}
                                  type="monotone"
                                  dataKey={c.data.displayName}
                                  stroke={c.color}
                                  strokeWidth={3}
                                  dot={{ r: 5, strokeWidth: 2 }}
                                  activeDot={{ r: 8 }}
                                />
                              ))}
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={filteredAttributesChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" strokeOpacity={0.1} />
                              <XAxis dataKey="attribute" stroke="#94a3b8" fontSize={11} tickLine={false} />
                              <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} tickLine={false} />
                              <RechartsTooltip content={<CustomCompareTooltip mode="attributes" />} />
                              <Legend />
                              {parsedCompareData.map((c) => (
                                <Line
                                  key={c.id}
                                  type="monotone"
                                  dataKey={c.data.displayName}
                                  stroke={c.color}
                                  strokeWidth={3}
                                  dot={{ r: 5, strokeWidth: 2 }}
                                  activeDot={{ r: 8 }}
                                />
                              ))}
                            </LineChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>

                    {/* Head-to-Head Attributes Grid Comparison Table */}
                    <div className="p-5 rounded-[2rem] border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900 shadow-[0_16px_40px_rgba(15,23,42,0.04)] overflow-hidden mt-6">
                      <h4 className="font-display font-extrabold text-base text-foreground mb-6 flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-[#00c6ff]" />
                        <span>Head-to-Head Compare Table</span>
                      </h4>

                      <div className="overflow-x-auto rounded-2xl border border-slate-250 dark:border-white/5">
                        <table className="w-full text-left border-collapse text-xs whitespace-nowrap min-w-[700px]">
                          <thead>
                            <tr className="bg-slate-100 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/10 font-bold uppercase tracking-wider text-muted-foreground">
                              <th className="py-4 px-5 w-44 sticky left-0 bg-slate-100 dark:bg-[#0c1322] border-r border-slate-200 dark:border-white/10 z-25 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.08)]">Metrics</th>
                              {parsedCompareData.map((c) => (
                                <th key={c.id} className="py-4 px-5 min-w-[150px]" style={{ color: c.color }}>
                                  <div className="flex items-center gap-2 font-black">
                                    <CountryFlag code={c.data.code} flag={c.data.flag} name={c.data.name} className="h-4.5 w-6 rounded shrink-0" emojiClassName="text-base leading-none" />
                                    <span className="truncate">{c.data.displayName}</span>
                                  </div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-sans">
                            {(() => {
                              // Helpers for finding best traits
                              const getRawEloVal = (pData: any) => pData.customElo ?? pData.elo ?? 1500;
                              const getRawAttackVal = (pData: any) => pData.customAttack ?? 75;
                              const getRawDefenseVal = (pData: any) => pData.customDefense ?? 75;
                              const getRawSquadVal = (pData: any) => pData.squadValueM ?? appTeams.find(t => t.code === pData.code)?.squadValueM ?? 0;
                              const getRawChOdds = (pData: any) => pData.stages?.champion ?? (pData.championProb * 10 || 0);

                              const maxEloVal = Math.max(...parsedCompareData.map(c => getRawEloVal(c.data)));
                              const maxAttackValue = Math.max(...parsedCompareData.map(c => getRawAttackVal(c.data)));
                              const maxDefenseValue = Math.min(...parsedCompareData.map(c => getRawDefenseVal(c.data))); // Lower defense rating is actually better for conceding less
                              const maxSquadValue = Math.max(...parsedCompareData.map(c => getRawSquadVal(c.data)));
                              const maxChampionshipOdds = Math.max(...parsedCompareData.map(c => getRawChOdds(c.data)));

                              const maxReachFinal = Math.max(...parsedCompareData.map(c => c.data.stages?.final ?? 0));
                              const maxReachSF = Math.max(...parsedCompareData.map(c => c.data.stages?.sf ?? 0));
                              const maxReachQF = Math.max(...parsedCompareData.map(c => c.data.stages?.qf ?? 0));
                              const maxReachR16 = Math.max(...parsedCompareData.map(c => c.data.stages?.r16 ?? 0));
                              const maxReachR32 = Math.max(...parsedCompareData.map(c => c.data.stages?.r32 ?? 0));

                              const renderStageRow = (label: string, icon: React.ReactNode, stageKey: string, maxValue: number) => {
                                return (
                                  <tr
                                    onClick={subTier === "free" ? (e) => { e.stopPropagation(); setUpgradeReason("plus"); setUpgradeOpen(true); } : undefined}
                                    className={`border-b border-slate-150 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors ${subTier === "free" ? "cursor-pointer" : ""}`}
                                  >
                                    <td className="py-4 px-5 font-bold text-muted-foreground sticky left-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md z-10 border-r border-slate-200/60 dark:border-white/5 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.4)]">
                                      <div className={`flex items-center gap-2 ${subTier === "free" ? "blur-[5px] select-none pointer-events-none" : ""}`}>
                                        {icon}
                                        <span>{label}</span>
                                      </div>
                                    </td>
                                    {parsedCompareData.map((c) => {
                                      const val = c.data.stages?.[stageKey] || 0;
                                      const displayPct = (val / 10).toFixed(1);
                                      const isBest = val === maxValue && val > 0 && parsedCompareData.length > 1;
                                      return (
                                        <td key={c.id} className={`py-4 px-5 border-b border-slate-100 dark:border-white/5 font-mono font-bold transition-colors ${isBest ? "bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08]" : ""}`}>
                                          <div className={`flex items-center justify-between gap-1.5 max-w-[180px] ${subTier === "free" ? "blur-[5px] select-none pointer-events-none" : ""}`}>
                                            <span className={isBest ? "text-emerald-600 dark:text-emerald-400 font-extrabold" : "text-foreground"}>
                                              {displayPct}%
                                            </span>
                                            {isBest && (
                                              <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/10">Best</span>
                                            )}
                                          </div>
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              };

                              return (
                                <>
                                  {/* Elo Rating */}
                                  <tr className="border-b border-slate-150 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                    <td className="py-4 px-5 font-bold text-muted-foreground sticky left-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md z-10 border-r border-slate-200/60 dark:border-white/5 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.4)]">
                                      <div className="flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-cyan-500 shrink-0" />
                                        <span>Elo Strength</span>
                                      </div>
                                    </td>
                                    {parsedCompareData.map((c) => {
                                      const eloVal = getRawEloVal(c.data);
                                      const isBest = eloVal === maxEloVal && parsedCompareData.length > 1;
                                      return (
                                        <td key={c.id} className={`py-4 px-5 border-b border-slate-100 dark:border-white/5 font-mono font-bold transition-colors ${isBest ? "bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08]" : ""}`}>
                                          <div className="flex items-center justify-between gap-1.5 max-w-[180px]">
                                            <span className={isBest ? "text-emerald-600 dark:text-emerald-400 font-extrabold" : "text-foreground"}>
                                              {Math.round(eloVal)}
                                            </span>
                                            {isBest && (
                                              <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/10">Strongest</span>
                                            )}
                                          </div>
                                        </td>
                                      );
                                    })}
                                  </tr>

                                  {/* Attack Rating */}
                                  <tr className="border-b border-slate-150 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                    <td className="py-4 px-5 font-bold text-muted-foreground sticky left-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md z-10 border-r border-slate-200/60 dark:border-white/5 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.4)]">
                                      <div className="flex items-center gap-2">
                                        <Award className="w-4 h-4 text-emerald-500 shrink-0" />
                                        <span>Attack Rating</span>
                                      </div>
                                    </td>
                                    {parsedCompareData.map((c) => {
                                      const attVal = getRawAttackVal(c.data);
                                      const isBest = attVal === maxAttackValue && parsedCompareData.length > 1;
                                      return (
                                        <td key={c.id} className={`py-4 px-5 border-b border-slate-100 dark:border-white/5 font-mono font-bold transition-colors ${isBest ? "bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08]" : ""}`}>
                                          <div className="flex items-center justify-between gap-1.5 max-w-[180px]">
                                            <span className={isBest ? "text-emerald-600 dark:text-emerald-400 font-extrabold" : "text-foreground"}>
                                              {Math.round(attVal)}
                                            </span>
                                            {isBest && (
                                              <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/10">Best Att</span>
                                            )}
                                          </div>
                                        </td>
                                      );
                                    })}
                                  </tr>

                                  {/* Defense Rating */}
                                  <tr className="border-b border-slate-150 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                    <td className="py-4 px-5 font-bold text-muted-foreground sticky left-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md z-10 border-r border-slate-200/60 dark:border-white/5 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.4)]">
                                      <div className="flex items-center gap-2">
                                        <Info className="w-4 h-4 text-rose-500 shrink-0" />
                                        <span>Defense Rating</span>
                                      </div>
                                    </td>
                                    {parsedCompareData.map((c) => {
                                      const defVal = getRawDefenseVal(c.data);
                                      const isBest = defVal === maxDefenseValue && parsedCompareData.length > 1;
                                      return (
                                        <td key={c.id} className={`py-4 px-5 border-b border-slate-100 dark:border-white/5 font-mono font-bold transition-colors ${isBest ? "bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08]" : ""}`}>
                                          <div className="flex items-center justify-between gap-1.5 max-w-[180px]">
                                            <span className={isBest ? "text-emerald-600 dark:text-emerald-400 font-extrabold" : "text-foreground"}>
                                              {Math.round(defVal)}
                                            </span>
                                            {isBest && (
                                              <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/10">Best Def</span>
                                            )}
                                          </div>
                                        </td>
                                      );
                                    })}
                                  </tr>

                                  {/* Squad Value */}
                                  <tr
                                    onClick={subTier === "free" ? (e) => { e.stopPropagation(); setUpgradeReason("plus"); setUpgradeOpen(true); } : undefined}
                                    className={`border-b border-slate-150 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors ${subTier === "free" ? "cursor-pointer" : ""}`}
                                  >
                                    <td className="py-4 px-5 font-bold text-muted-foreground sticky left-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md z-10 border-r border-slate-200/60 dark:border-white/5 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.4)]">
                                      <div className={`flex items-center gap-2 ${subTier === "free" ? "blur-[5px] select-none pointer-events-none" : ""}`}>
                                        <Award className="w-4 h-4 text-amber-500 shrink-0" />
                                        <span>Squad Value</span>
                                      </div>
                                    </td>
                                    {parsedCompareData.map((c) => {
                                      const squadVal = getRawSquadVal(c.data);
                                      const isBest = squadVal === maxSquadValue && squadVal > 0 && parsedCompareData.length > 1;
                                      return (
                                        <td key={c.id} className={`py-4 px-5 border-b border-slate-100 dark:border-white/5 font-mono font-bold transition-colors ${isBest ? "bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08]" : ""}`}>
                                          <div className={`flex items-center justify-between gap-1.5 max-w-[180px] ${subTier === "free" ? "blur-[5px] select-none pointer-events-none" : ""}`}>
                                            <span className={isBest ? "text-emerald-600 dark:text-emerald-400 font-extrabold" : "text-foreground"}>
                                              {squadVal ? `€${squadVal}M` : "N/A"}
                                            </span>
                                            {isBest && (
                                              <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/10">Highest</span>
                                            )}
                                          </div>
                                        </td>
                                      );
                                    })}
                                  </tr>

                                  {/* Model Engine */}
                                  <tr
                                    onClick={subTier === "free" ? (e) => { e.stopPropagation(); setUpgradeReason("plus"); setUpgradeOpen(true); } : undefined}
                                    className={`border-b border-slate-150 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors ${subTier === "free" ? "cursor-pointer" : ""}`}
                                  >
                                    <td className="py-4 px-5 font-bold text-muted-foreground sticky left-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md z-10 border-r border-slate-200/60 dark:border-white/5 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.4)]">
                                      <div className={`flex items-center gap-2 ${subTier === "free" ? "blur-[5px] select-none pointer-events-none" : ""}`}>
                                        <Cpu className="w-4 h-4 text-purple-500 shrink-0" />
                                        <span>Model Engine</span>
                                      </div>
                                    </td>
                                    {parsedCompareData.map((c) => {
                                      const modelLower = (c.data?.modelName || "base").toLowerCase();
                                      const model = modelLower === "pro" || modelLower === "expert" ? "Pro" : modelLower === "advanced" ? "Advanced" : "Base";
                                      const badgeClass = model === "Pro" 
                                        ? "bg-purple-500/10 text-purple-700 border-purple-500/20" 
                                        : model === "Advanced" 
                                        ? "bg-cyan-500/10 text-cyan-700 border-cyan-500/20" 
                                        : "bg-slate-500/10 text-slate-700 border-slate-500/20";
                                      return (
                                        <td key={c.id} className="py-4 px-5 border-b border-slate-100 dark:border-white/5">
                                          <div className={subTier === "free" ? "blur-[5px] select-none pointer-events-none" : ""}>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${badgeClass}`}>
                                              {model}
                                            </span>
                                          </div>
                                        </td>
                                      );
                                    })}
                                  </tr>

                                  {/* Championship Odds */}
                                  <tr
                                    onClick={subTier === "free" ? (e) => { e.stopPropagation(); setUpgradeReason("plus"); setUpgradeOpen(true); } : undefined}
                                    className={`border-b border-slate-200 dark:border-white/10 hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors ${subTier === "free" ? "cursor-pointer" : ""}`}
                                  >
                                    <td className="py-4 px-5 font-bold text-muted-foreground sticky left-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md z-10 border-r border-slate-200/60 dark:border-white/5 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.4)]">
                                      <div className={`flex items-center gap-2 ${subTier === "free" ? "blur-[5px] select-none pointer-events-none" : ""}`}>
                                        <Award className="w-4 h-4 text-rose-500 shrink-0" />
                                        <span>Championship Odds</span>
                                      </div>
                                    </td>
                                    {parsedCompareData.map((c) => {
                                      const ch = getRawChOdds(c.data);
                                      const prob = parseFloat((ch / 10).toFixed(1));
                                      const isBest = ch === maxChampionshipOdds && parsedCompareData.length > 1;
                                      return (
                                        <td key={c.id} className={`py-4 px-5 border-b border-slate-200 dark:border-white/10 transition-colors ${isBest ? "bg-cyan-500/[0.08] dark:bg-neon/10" : "bg-cyan-500/[0.02] dark:bg-neon/5"}`}>
                                          <div className={`space-y-1.5 max-w-[180px] ${subTier === "free" ? "blur-[5px] select-none pointer-events-none" : ""}`}>
                                            <div className="flex items-center justify-between text-xs font-black font-mono">
                                              <span className={isBest ? "text-cyan-600 dark:text-neon text-sm" : "text-foreground"}>
                                                {prob}%
                                              </span>
                                              {isBest && (
                                                <span className="text-[9px] font-extrabold text-cyan-600 dark:text-neon uppercase tracking-wide bg-cyan-500/15 dark:bg-neon/20 px-1 py-0.2 rounded flex items-center gap-0.5">
                                                  <Trophy className="w-2.5 h-2.5" /> Favorite
                                                </span>
                                              )}
                                            </div>
                                            <div className="w-full bg-slate-200 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                                              <div
                                                className={`h-full rounded-full transition-all duration-500 ${isBest ? "bg-cyan-500 dark:bg-neon" : "bg-cyan-400"}`}
                                                style={{ width: `${prob}%` }}
                                              />
                                            </div>
                                          </div>
                                        </td>
                                      );
                                    })}
                                  </tr>

                                  {/* Reach Final */}
                                  {renderStageRow("Reach Final", <ChevronRight className="w-4 h-4 text-cyan-500 shrink-0" />, "final", maxReachFinal)}

                                  {/* Reach Semi-Final */}
                                  {renderStageRow("Reach Semi-Final", <ChevronRight className="w-4 h-4 text-cyan-500/80 shrink-0" />, "sf", maxReachSF)}

                                  {/* Reach Quarter-Final */}
                                  {renderStageRow("Reach Quarter-Final", <ChevronRight className="w-4 h-4 text-cyan-500/60 shrink-0" />, "qf", maxReachQF)}

                                  {/* Reach Round of 16 */}
                                  {renderStageRow("Reach Round of 16", <ChevronRight className="w-4 h-4 text-cyan-500/40 shrink-0" />, "r16", maxReachR16)}

                                  {/* Reach Round of 32 */}
                                  {renderStageRow("Reach Round of 32", <ChevronRight className="w-4 h-4 text-cyan-500/20 shrink-0" />, "r32", maxReachR32)}

                                  {/* Expected Path */}
                                  <tr
                                    onClick={subTier === "free" ? (e) => { e.stopPropagation(); setUpgradeReason("plus"); setUpgradeOpen(true); } : undefined}
                                    className={`border-b border-slate-100 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors ${subTier === "free" ? "cursor-pointer" : ""}`}
                                  >
                                    <td className="py-4 px-5 font-bold text-muted-foreground sticky left-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md z-10 border-r border-slate-200/60 dark:border-white/5 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.4)]">
                                      <div className={`flex items-center gap-2 ${subTier === "free" ? "blur-[5px] select-none pointer-events-none" : ""}`}>
                                        <Route className="w-4 h-4 text-pink-500 shrink-0" />
                                        <span>Expected Path</span>
                                      </div>
                                    </td>
                                    {parsedCompareData.map((c) => (
                                      <td key={c.id} className="py-4 px-5">
                                        <div className={subTier === "free" ? "blur-[5px] select-none pointer-events-none" : ""}>
                                          <div className="relative pl-4 border-l border-slate-200 dark:border-white/10 space-y-3.5 my-1 max-w-[220px] ml-2">
                                            {c.data.path?.map((step: any, sidx: number) => {
                                              const stageShort = step.stage
                                                .replace("Round of 32", "R32")
                                                .replace("Round of 16", "R16")
                                                .replace("Quarter Final", "QF")
                                                .replace("Semi Final", "SF")
                                                .replace("Final", "Final");
                                              return (
                                                <div key={sidx} className="relative text-[11px]">
                                                  {/* Timeline Bullet Node centered on parent border-l */}
                                                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-cyan-500 border-2 border-white dark:border-slate-900 shadow-sm" />
                                                  <div className="flex flex-col gap-0.5">
                                                    <span className="font-extrabold text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                                      {stageShort}
                                                    </span>
                                                    <div className="flex items-center gap-1.5">
                                                      <span className="flex items-center gap-1.5 font-bold text-foreground truncate max-w-[120px]" title={step.opponentName}>
                                                        <CountryFlag
                                                          code={step.opponentCode}
                                                          flag={step.opponentFlag}
                                                          name={step.opponentName}
                                                          className="h-3.5 w-5 shrink-0 rounded-[2px] object-cover"
                                                          emojiClassName="hidden"
                                                        />
                                                        <span className="truncate">{step.opponentName}</span>
                                                      </span>
                                                      <span className="font-mono font-bold text-cyan-600 dark:text-neon text-[10px] bg-cyan-500/10 px-1 py-0.2 rounded shrink-0">
                                                        {step.winPct}%
                                                      </span>
                                                    </div>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      </td>
                                    ))}
                                  </tr>

                                  {/* Actions */}
                                  <tr className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                    <td className="py-4 px-5 font-bold text-muted-foreground sticky left-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md z-10 border-r border-slate-200/60 dark:border-white/5 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.4)]">
                                      <div className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
                                        <span>Actions</span>
                                      </div>
                                    </td>
                                    {parsedCompareData.map((c) => (
                                      <td key={c.id} className="py-4 px-5">
                                        <div className="flex gap-2">
                                          <button
                                            type="button"
                                            onClick={() => handleLoadPrediction(c.raw)}
                                            className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-cyan-500/10 text-cyan-700 hover:bg-cyan-500/20 dark:bg-neon/10 dark:text-neon dark:hover:bg-neon/20 transition cursor-pointer"
                                          >
                                            Load Settings
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => onToggle(c.id)}
                                            className="text-[11px] font-bold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition cursor-pointer"
                                          >
                                            Remove
                                          </button>
                                        </div>
                                      </td>
                                    ))}
                                  </tr>
                                </>
                              );
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  };

  return (
    <div className="space-y-8">
      {renderSection("standard")}
      {renderSection("hypothetical")}
      <UpgradeModal isOpen={upgradeOpen} onClose={() => setUpgradeOpen(false)} reason={upgradeReason} />
    </div>
  );
}
