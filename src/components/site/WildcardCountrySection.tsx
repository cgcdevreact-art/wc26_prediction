"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { useTeams, useGroupsConfig } from "@/components/TeamsProvider";
import { ArrowRight, Sparkles, Plus, X, Info, Pencil } from "lucide-react";
import { ALL_COUNTRIES } from "@/lib/countries-data";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function InfoTooltip({ content }: { content: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button 
            type="button"
            onClick={(e) => e.stopPropagation()} 
            className="inline-block ml-1.5 align-middle cursor-help select-none bg-transparent border-none p-0 outline-none focus:outline-none"
          >
            <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-slate-900 dark:hover:text-white transition-colors" />
          </button>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="max-w-[200px] bg-slate-950 text-white border border-white/10 px-2.5 py-1.5 text-[11px] font-medium normal-case tracking-normal leading-normal text-center shadow-xl rounded-lg z-50"
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const FEATURED_CODES = ["NOR", "ITA", "CHL", "NGA", "IND", "RSA"];
const DEFAULT_FAILED_COUNTRY_CODE = "NQ-NO";
const FLAG_QUICK_SELECT_CODES = ["NG", "NO", "IT", "CL", "IN", "ZA", "EG", "SE"];

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

function normalizeCountryName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

export interface CustomCountry {
  code: string;
  name: string;
  flag: string;
  baselineCode: string;
  elo: number;
  attack: number;
  defense: number;
  replacedCode: string;
}

interface FailedCountryOption {
  code: string;
  name: string;
  flag: string;
  selectionCode: string;
}

export function WildcardCountrySection() {
  const router = useRouter();
  const { data: session } = useSession();
  const teams = useTeams();
  const groupsConfig = useGroupsConfig();

  const [selectedCode, setSelectedCode] = useState(DEFAULT_FAILED_COUNTRY_CODE);
  const [customCountries, setCustomCountries] = useState<CustomCountry[]>([]);

  // Inline Builder State
  const [isBuilding, setIsBuilding] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customFlag, setCustomFlag] = useState("🇳🇬");
  const [baselineCode, setBaselineCode] = useState("ENG");
  const [replacedCode, setReplacedCode] = useState("SEN");
  const [customElo, setCustomElo] = useState(1650);
  const [customAttack, setCustomAttack] = useState(78);
  const [customDefense, setCustomDefense] = useState(78);

  const [flagSearch, setFlagSearch] = useState("");
  const [isFlagDropdownOpen, setIsFlagDropdownOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [confirmRunOpen, setConfirmRunOpen] = useState(false);
  const [customCountryDeleteTarget, setCustomCountryDeleteTarget] = useState<CustomCountry | null>(null);

  const worldCupCodes = useMemo(() => {
    return Object.values(groupsConfig).flat();
  }, [groupsConfig]);

  const qualifiedNamesAndFlags = useMemo(() => {
    const names = new Set<string>();
    const flags = new Set<string>();
    teams
      .filter((team) => worldCupCodes.includes(team.code))
      .forEach((team) => {
        if (team.name) names.add(normalizeCountryName(team.name));
        if (team.flag) flags.add(team.flag);
      });
    return { names, flags };
  }, [teams, worldCupCodes]);

  const failedToQualifyCountries = useMemo<FailedCountryOption[]>(() => {
    return ALL_COUNTRIES
      .filter((country) => !qualifiedNamesAndFlags.names.has(normalizeCountryName(country.name)))
      .map((country) => ({
        code: country.code,
        name: country.name,
        flag: country.emoji,
        selectionCode: `NQ-${country.code}`,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [qualifiedNamesAndFlags]);

  const visibleFailedToQualifyCountries = useMemo(() => {
    const customCountryNames = new Set(
      customCountries.map((country) => normalizeCountryName(country.name)),
    );

    return failedToQualifyCountries.filter(
      (country) => !customCountryNames.has(normalizeCountryName(country.name)),
    );
  }, [customCountries, failedToQualifyCountries]);

  const filteredCountries = useMemo(() => {
    const search = normalizeCountryName(flagSearch);
    const list = [...visibleFailedToQualifyCountries].sort((a, b) => a.name.localeCompare(b.name));

    if (!search) return list;
    return list.filter((country) => normalizeCountryName(country.name).includes(search));
  }, [flagSearch, visibleFailedToQualifyCountries]);

  useEffect(() => {
    let localList: CustomCountry[] = [];
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("wc26_custom_countries");
        if (stored) {
          localList = JSON.parse(stored);
          setCustomCountries(localList);
        }
      } catch (e) {
        console.error("Failed to load custom countries", e);
      }
    }

    if (session?.user?.id) {
      fetch("/api/user/custom-countries")
        .then((res) => res.json())
        .then(async (data) => {
          if (data.success && Array.isArray(data.customCountries)) {
            const dbList = data.customCountries;
            const merged = [...dbList];
            const uploadPromises = [];

            for (const localTeam of localList) {
              const existsInDb = dbList.some((dbTeam: any) => dbTeam.code === localTeam.code);
              if (!existsInDb) {
                merged.push(localTeam);
                uploadPromises.push(
                  fetch("/api/user/custom-countries", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(localTeam),
                  }).catch((err) => console.error("Error uploading custom team:", err))
                );
              }
            }

            if (uploadPromises.length > 0) {
              await Promise.all(uploadPromises);
            }

            setCustomCountries(merged);
            localStorage.setItem("wc26_custom_countries", JSON.stringify(merged));
          }
        })
        .catch((err) => console.error("Error fetching custom countries from DB:", err));
    }
  }, [session]);

  const handleDeleteCustomCountry = (code: string) => {
    const updated = customCountries.filter((c) => c.code !== code);
    localStorage.setItem("wc26_custom_countries", JSON.stringify(updated));
    setCustomCountries(updated);
    if (selectedCode === code) {
      setSelectedCode(DEFAULT_FAILED_COUNTRY_CODE);
    }

    if (session?.user?.id) {
      fetch("/api/user/custom-countries", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      }).catch((err) => console.error("Error deleting custom country from DB:", err));
    }
  };

  const worldCupTeams = useMemo(() => {
    return teams
      .filter((team) => worldCupCodes.includes(team.code))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [teams, worldCupCodes]);

  const featuredTeams = useMemo(() => {
    const featuredNameMap: Record<string, string> = {
      NOR: "Norway",
      ITA: "Italy",
      CHL: "Chile",
      NGA: "Nigeria",
      IND: "India",
      RSA: "South Africa",
    };

    const featured = FEATURED_CODES
      .map((code) => visibleFailedToQualifyCountries.find((country) => country.name === featuredNameMap[code]))
      .filter(Boolean) as FailedCountryOption[];

    return featured.length > 0 ? featured : visibleFailedToQualifyCountries.slice(0, 6);
  }, [visibleFailedToQualifyCountries]);

  useEffect(() => {
    if (customCountries.some((country) => country.code === selectedCode)) return;
    if (failedToQualifyCountries.some((country) => country.selectionCode === selectedCode)) return;

    const fallbackCode =
      customCountries[0]?.code ||
      featuredTeams[0]?.selectionCode ||
      visibleFailedToQualifyCountries[0]?.selectionCode ||
      DEFAULT_FAILED_COUNTRY_CODE;

    if (fallbackCode && fallbackCode !== selectedCode) {
      setSelectedCode(fallbackCode);
    }
  }, [selectedCode, customCountries, failedToQualifyCountries, featuredTeams, visibleFailedToQualifyCountries]);

  const flagQuickSelectCountries = useMemo(() => {
    const featuredPool = visibleFailedToQualifyCountries
      .filter((country) => FLAG_QUICK_SELECT_CODES.includes(country.code));

    return featuredPool.length > 0
      ? featuredPool
      : visibleFailedToQualifyCountries.slice(0, 8);
  }, [visibleFailedToQualifyCountries]);

  const selectedFailedCountry = useMemo(() => {
    return failedToQualifyCountries.find((country) => country.selectionCode === selectedCode) || null;
  }, [failedToQualifyCountries, selectedCode]);

  const selectedTeam = useMemo(() => {
    const custom = customCountries.find((cc) => cc.code === selectedCode);
    if (custom) {
      return {
        code: custom.code,
        name: custom.name,
        flag: custom.flag,
      };
    }
    if (selectedFailedCountry) {
      return {
        code: selectedFailedCountry.selectionCode,
        name: selectedFailedCountry.name,
        flag: selectedFailedCountry.flag,
      };
    }
    return featuredTeams[0] || null;
  }, [selectedCode, customCountries, selectedFailedCountry, featuredTeams]);

  // Selected Team Details for Dashboard Preview
  const selectedTeamDetails = useMemo(() => {
    const custom = customCountries.find((cc) => cc.code === selectedCode);
    if (custom) {
      const baselineTeam = teams.find((t) => t.code === custom.baselineCode);
      const replacedTeam = teams.find((t) => t.code === custom.replacedCode);
      return {
        code: custom.code,
        name: custom.name,
        flag: custom.flag,
        rank: "Custom",
        elo: custom.elo,
        attack: custom.attack,
        defense: custom.defense,
        power: baselineTeam?.power || 75,
        squadValueM: baselineTeam?.squadValueM || 100,
        confederation: replacedTeam?.confederation || baselineTeam?.confederation || "UEFA",
        isCustom: true,
        replacedName: replacedTeam?.name || "",
      };
    }
    if (selectedFailedCountry) {
      return {
        code: selectedFailedCountry.selectionCode,
        name: selectedFailedCountry.name,
        flag: selectedFailedCountry.flag,
        rank: "Wildcard",
        elo: 1650,
        attack: 78,
        defense: 78,
        power: 75,
        squadValueM: 100,
        confederation: "Wildcard",
        isCustom: false,
        replacedName: "",
      };
    }
    const fallbackFailedCountry = featuredTeams[0] || visibleFailedToQualifyCountries[0] || null;
    if (fallbackFailedCountry) {
      return {
        code: fallbackFailedCountry.selectionCode,
        name: fallbackFailedCountry.name,
        flag: fallbackFailedCountry.flag,
        rank: "Wildcard",
        elo: 1650,
        attack: 78,
        defense: 78,
        power: 75,
        squadValueM: 100,
        confederation: "Wildcard",
        isCustom: false,
        replacedName: "",
      };
    }

    const team = teams.find((t) => t.code === selectedCode) || teams[0];
    return {
      code: team?.code || "ARG",
      name: team?.name || "Argentina",
      flag: team?.flag || "🇦🇷",
      rank: team?.rank ? `#${team.rank}` : "N/A",
      elo: team?.elo ? Math.round(team.elo) : 1500,
      attack: team?.attack ? Math.round(team.attack < 10 ? team.attack * 80 : team.attack) : 75,
      defense: team?.defense ? Math.round(team.defense < 10 ? team.defense * 80 : team.defense) : 75,
      power: team?.power || 70,
      squadValueM: team?.squadValueM,
      confederation: team?.confederation || "CONMEBOL",
      isCustom: false,
      replacedName: "",
    };
  }, [selectedCode, customCountries, teams, selectedFailedCountry, featuredTeams, visibleFailedToQualifyCountries]);

  const resetBuilder = () => {
    setIsBuilding(false);
    setEditingCode(null);
    setCustomName("");
    setCustomFlag("🇳🇬");
    setBaselineCode("ENG");
    setReplacedCode("SEN");
    setFlagSearch("");
    setIsFlagDropdownOpen(false);
    setCustomElo(1650);
    setCustomAttack(78);
    setCustomDefense(78);
  };

  const applyBaselineTeam = (teamCode: string) => {
    const baselineTeam = teams.find((team) => team.code === teamCode);
    setBaselineCode(teamCode);
    if (!baselineTeam) return;
    setCustomElo(Math.round(baselineTeam.elo || 1650));
    setCustomAttack(formatTeamScaleRating(baselineTeam.attack));
    setCustomDefense(formatTeamScaleRating(baselineTeam.defense));
  };

  const prefillBuilderFromFailedCountry = (country: FailedCountryOption) => {
    setEditingCode(null);
    setIsBuilding(true);
    setCustomName(country.name);
    setCustomFlag(country.flag);
    setFlagSearch("");
    setIsFlagDropdownOpen(false);
  };

  const handleStartCreate = () => {
    setEditingCode(null);
    setCustomName(selectedTeam?.name || "");
    setCustomFlag(selectedTeam?.flag || "🇳🇬");
    setReplacedCode("SEN");
    setFlagSearch("");
    setIsFlagDropdownOpen(false);
    applyBaselineTeam("ENG");
    setIsBuilding(true);
  };

  const handleSelectCode = (code: string) => {
    setSelectedCode(code);
    const failedCountry = failedToQualifyCountries.find((country) => country.selectionCode === code);
    if (failedCountry) {
      prefillBuilderFromFailedCountry(failedCountry);
    }
  };

  const handleEditCustomCountry = (code: string) => {
    const custom = customCountries.find((country) => country.code === code);
    if (!custom) return;

    setEditingCode(custom.code);
    setIsBuilding(true);
    setSelectedCode(custom.code);
    setCustomName(custom.name);
    setCustomFlag(custom.flag);
    setBaselineCode(custom.baselineCode);
    setReplacedCode(custom.replacedCode);
    setCustomElo(custom.elo);
    setCustomAttack(custom.attack);
    setCustomDefense(custom.defense);
    setFlagSearch("");
    setIsFlagDropdownOpen(false);
  };

  const persistCustomCountry = async ({
    code,
    name,
    flag,
    baselineTeamCode,
    elo,
    attack,
    defense,
    replacementTeamCode,
  }: {
    code?: string;
    name: string;
    flag: string;
    baselineTeamCode: string;
    elo: number;
    attack: number;
    defense: number;
    replacementTeamCode: string;
  }) => {
    if (!name.trim()) {
      alert("Please enter a country name.");
      return null;
    }

    const generatedCode = code || "CC_" + name.trim().substring(0, 3).toUpperCase();

    const isWcConflict = teams.some(
      (t) => worldCupCodes.includes(t.code) && t.name.toLowerCase() === name.trim().toLowerCase()
    );
    if (isWcConflict) {
      alert("This country is already in the World Cup! Please enter a wildcard country name.");
      return null;
    }

    const newCC: CustomCountry = {
      code: generatedCode,
      name: name.trim(),
      flag,
      baselineCode: baselineTeamCode,
      elo,
      attack,
      defense,
      replacedCode: replacementTeamCode,
    };

    const updated = [newCC, ...customCountries.filter((c) => c.code !== generatedCode)];
    localStorage.setItem("wc26_custom_countries", JSON.stringify(updated));
    setCustomCountries(updated);

    if (session?.user?.id) {
      try {
        const res = await fetch("/api/user/custom-countries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newCC),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.error("Failed to save custom country to DB:", errData.error || res.statusText);
        }
      } catch (err) {
        console.error("Error saving custom country to DB:", err);
      }
    }

    setSelectedCode(generatedCode);
    return generatedCode;
  };

  const handleSaveCustomCountryPreview = async () => {
    const savedCode = await persistCustomCountry({
      code: editingCode || undefined,
      name: customName,
      flag: customFlag,
      baselineTeamCode: baselineCode,
      elo: customElo,
      attack: customAttack,
      defense: customDefense,
      replacementTeamCode: replacedCode,
    });

    if (!savedCode) return null;

    resetBuilder();
    return savedCode;
  };

  const handleConfirmRun = async () => {
    let teamCode = selectedTeam?.code || "";

    if (isBuilding) {
      const savedCode = await handleSaveCustomCountryPreview();
      if (!savedCode) return;
      teamCode = savedCode;
    }

    if (!isBuilding && selectedFailedCountry && !customCountries.some((country) => country.code === teamCode)) {
      const savedCode = await persistCustomCountry({
        name: selectedFailedCountry.name,
        flag: selectedFailedCountry.flag,
        baselineTeamCode: baselineCode,
        elo: customElo,
        attack: customAttack,
        defense: customDefense,
        replacementTeamCode: replacedCode,
      });
      if (!savedCode) return;
      teamCode = savedCode;
    }

    if (!teamCode) return;
    setConfirmRunOpen(false);
    router.push(`/predictions/country?team=${teamCode}&autorun=true&wildcard=true&model=base`);
  };

  const previewTeam = isBuilding
    ? {
        code: editingCode || "CC_NEW",
        name: customName.trim() || selectedTeam?.name || "Custom Country",
        flag: customFlag,
      }
    : selectedTeam;

  const previewDetails = isBuilding
    ? {
        ...selectedTeamDetails,
        code: editingCode || "CC_NEW",
        name: customName.trim() || selectedTeamDetails.name,
        flag: customFlag,
        rank: "Custom",
        elo: customElo,
        attack: customAttack,
        defense: customDefense,
        power: teams.find((team) => team.code === baselineCode)?.power || selectedTeamDetails.power,
        squadValueM: teams.find((team) => team.code === baselineCode)?.squadValueM || selectedTeamDetails.squadValueM,
        confederation:
          teams.find((team) => team.code === replacedCode)?.confederation || selectedTeamDetails.confederation,
        isCustom: true,
        replacedName: teams.find((team) => team.code === replacedCode)?.name || selectedTeamDetails.replacedName,
      }
    : selectedTeamDetails;

  const previewEloBarWidth = Math.max(0, Math.min(100, ((previewDetails.elo - 1200) / 1000) * 100));
  const hasSavedSelectedCountry = customCountries.some((country) => country.code === selectedCode);
  const canRunPathToGlory = hasSavedSelectedCountry && !isBuilding;

  return (
    <div className="py-2">
      <div className="grid gap-8 lg:grid-cols-[1fr_400px] min-w-0">

        {/* Left Column: Selector & Launcher Panel */}
        <div className="glass-strong rounded-3xl p-6 relative border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden flex flex-col justify-between min-h-[480px]">
          <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-neon/15 blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 h-40 w-40 rounded-full bg-neon-2/15 blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-5 border-b border-slate-200/50 dark:border-white/5 pb-5">
              {previewTeam && (
                <>
                  <div className="filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:scale-105 transition-transform duration-300">
                    <CountryFlag
                      code={previewTeam.code}
                      flag={previewTeam.flag}
                      name={previewTeam.name}
                      className="h-16 w-20 rounded-xl object-cover drop-shadow-md"
                      emojiClassName="text-7xl leading-none select-none drop-shadow-md"
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
                    <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-neon font-extrabold mb-1">
                      Active Selection
                    </div>
                    <h3 className="font-display text-3xl font-black text-slate-950 dark:text-white tracking-tight">
                      {previewTeam.name}
                    </h3>
                    </div>
                    {previewDetails.isCustom && (
                      <button
                        type="button"
                        onClick={() => handleEditCustomCountry(selectedCode)}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600 transition hover:border-neon/40 hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:text-white"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Quick selectors list */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
                Quick Selection
              </label>
              <div className="flex flex-wrap gap-2.5">
                {featuredTeams.map((team) => {
                  if (!team) return null;
                  const active = team.selectionCode === selectedCode;
                  return (
                    <button
                      key={team.selectionCode}
                      onClick={() => handleSelectCode(team.selectionCode)}
                      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition cursor-pointer ${active
                        ? "border-neon/40 bg-neon/10 text-slate-950 dark:text-white font-bold shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.02] dark:text-muted-foreground dark:hover:bg-white/5 dark:hover:text-white"
                        }`}
                    >
                      <CountryFlag
                        code={team.code}
                        flag={team.flag}
                        name={team.name}
                        className="h-4.5 w-6.5 rounded object-cover"
                        emojiClassName="text-lg leading-none"
                      />
                      <span>{team.name}</span>
                    </button>
                  );
                })}

                {customCountries.map((cc) => {
                  const active = cc.code === selectedCode;
                  return (
                    <div
                      key={cc.code}
                      onClick={() => handleSelectCode(cc.code)}
                      className={`inline-flex items-center gap-2 rounded-xl border pl-3 pr-2 py-2 text-sm font-semibold transition cursor-pointer relative overflow-hidden group ${
                        active
                          ? "border-neon-2/45 bg-neon-2/15 text-slate-950 dark:text-white font-bold shadow-[0_0_15px_rgba(178,57,210,0.18)]"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.02] dark:text-muted-foreground dark:hover:bg-white/5 dark:hover:text-white"
                      }`}
                    >
                      <CountryFlag
                        code={cc.code}
                        flag={cc.flag}
                        name={cc.name}
                        className="h-4.5 w-6 rounded object-cover"
                        emojiClassName="text-lg leading-none"
                      />
                      <span>{cc.name}</span>
                      <span className="text-[8px] tracking-wider uppercase bg-neon-2/20 text-neon-2 font-bold px-1.5 py-0.5 rounded">Custom</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCustomCountryDeleteTarget(cc);
                        }}
                        className="p-0.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-red-500 transition-colors z-20 cursor-pointer ml-1"
                        title="Delete custom country"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dropdown Selector */}
            <div className="space-y-2 max-w-md pt-2">
              <div className="flex items-center justify-between gap-3">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
                  Browse Failed-To-Qualify Nations
                </label>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
                  {visibleFailedToQualifyCountries.length} available
                </span>
              </div>
              <select
                value={selectedCode}
                onChange={(event) => handleSelectCode(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-neon focus:ring-1 focus:ring-neon dark:border-white/10 dark:bg-slate-950 dark:text-white"
              >
                {customCountries.length > 0 && (
                  <optgroup label="Custom Wildcard Teams" className="bg-white text-slate-900 dark:bg-slate-950 dark:text-white">
                    {customCountries.map((cc) => (
                      <option key={cc.code} value={cc.code}>
                        {cc.flag} {cc.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Failed To Qualify" className="bg-white text-slate-900 dark:bg-slate-950 dark:text-white">
                  {visibleFailedToQualifyCountries.map((country) => (
                    <option key={country.selectionCode} value={country.selectionCode}>
                      {country.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Selected Team Analysis Preview */}
            <div className="space-y-4 pt-4 border-t border-slate-200/50 dark:border-white/5">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
                <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 rounded-2xl p-4 transition-colors">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-bold">FIFA Rank / Region</span>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white mt-1 block">
                    {previewDetails.isCustom ? previewDetails.rank : `${previewDetails.rank} (${previewDetails.confederation})`}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 rounded-2xl p-4 transition-colors">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-bold">Squad Value</span>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white mt-1 block font-mono">
                    {previewDetails.squadValueM ? `€${previewDetails.squadValueM}M` : "N/A"}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 rounded-2xl p-4 transition-colors">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-bold">Power Index</span>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white mt-1 block font-mono">
                    {previewDetails.power}
                  </span>
                </div>
              </div>

              {/* Progress bars for Elo, Att & Def */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 rounded-2xl p-4">
                <div>
                  <div className="flex justify-between text-[11px] text-muted-foreground font-bold mb-1.5 uppercase tracking-wide">
                    <span>Elo Rating</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{previewDetails.elo}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-neon rounded-full" style={{ width: `${previewEloBarWidth}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-muted-foreground font-bold mb-1.5 uppercase tracking-wide">
                    <span>Attack Power</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{previewDetails.attack}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-neon rounded-full" style={{ width: `${previewDetails.attack}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-muted-foreground font-bold mb-1.5 uppercase tracking-wide">
                    <span>Defense Strength</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{previewDetails.defense}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-neon rounded-full" style={{ width: `${previewDetails.defense}%` }} />
                  </div>
                </div>
              </div>

              {/* Custom Flag Indicator Banner */}
              {previewDetails.isCustom && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-neon/25 bg-neon/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-neon">
                      <Sparkles className="h-3.5 w-3.5" />
                      Hypothetical Wildcard
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/70 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                      Base Model Only
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-neon bg-neon/8 px-4 py-3 rounded-2xl border border-neon/20 font-bold transition-all">
                    <Sparkles className="w-4 h-4 text-neon shrink-0 animate-pulse" />
                    <span>Custom wildcard team replacing {previewDetails.replacedName} (baseline cloned from {teams.find(t => t.code === (isBuilding ? baselineCode : customCountries.find(cc => cc.code === selectedCode)?.baselineCode))?.name}). This run will open in Country Predict using the Base model.</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Launch Button */}
          <div className="relative z-10 pt-8 border-t border-slate-200/50 dark:border-white/5 mt-6">
            <button
              onClick={() => setConfirmRunOpen(true)}
              disabled={!canRunPathToGlory}
              className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-neon to-neon-2 px-6 text-sm font-black text-background transition hover:opacity-95 active:scale-[0.98] shadow-lg shadow-neon/20 hover:shadow-neon/30 cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
            >
              <Sparkles className="h-4.5 w-4.5 fill-current" />
              <span>Run Path To Glory</span>
              <ArrowRight className="h-4.5 w-4.5" />
            </button>
            {!canRunPathToGlory && (
              <p className="mt-2 text-center text-[11px] font-semibold text-muted-foreground">
                Save the country profile first to enable this run.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Custom Country Builder Panel (Inline Form) */}
        <div className="glass rounded-3xl p-6 border border-slate-200 dark:border-white/10 shadow-xl min-h-[480px] flex flex-col justify-between relative overflow-hidden bg-white dark:bg-slate-900/60">
          {!isBuilding ? (
            /* Intro / Creator Placeholder state */
            <div className="flex flex-col justify-between h-full space-y-6">
              <div className="space-y-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-neon/10 border border-neon/20 text-neon animate-float">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h3 className="font-display text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                  Custom Team Creator
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Slot your own nation into the tournament. Customize ELO, attack/defense parameters, clone any baseline player squad, and swap them with any region-specific World Cup team.
                </p>

                <div className="space-y-2.5 pt-2">
                  <MiniDetail number="01" text="Clone and customize initial ratings" />
                  <MiniDetail number="02" text="Slot into region suggested group position" />
                  <MiniDetail number="03" text="Test squad quality in simulation brackets" />
                  <MiniDetail number="04" text="Run their path to glory" />
                </div>
              </div>

              <button
                onClick={handleStartCreate}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-neon bg-neon/5 px-4 text-sm font-bold text-neon hover:bg-neon/10 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Build Custom Country Profile</span>
              </button>
            </div>
          ) : (
            /* Active Creator Form (Single Screen Layout) */
            <div className="flex flex-col h-full justify-between space-y-5">
              <div className="space-y-3.5 flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-custom">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-white/5">
                  <h4 className="font-display text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-neon" />
                    <span>{editingCode ? "Edit Country Profile" : "Create Country Profile"}</span>
                  </h4>
                  <button
                    onClick={resetBuilder}
                    className="text-xs text-muted-foreground hover:text-slate-950 dark:hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
                     {/* Country Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block flex items-center">
                    <span>Country Name</span>
                    <InfoTooltip content="The name of your custom wildcard country (e.g. Italy, Nigeria)." />
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Nigeria, Sweden, Ireland..."
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-neon dark:border-white/10 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                 {/* Flag & Country Picker */}
                <div className="space-y-2 relative">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block flex items-center">
                      <span>Flag & Country Profile</span>
                      <InfoTooltip content="Search and select any flag image, or click on a quick select shortcut." />
                    </label>
                  </div>
                  
                  <div className="relative">
                    <div className="flex gap-2 items-center">
                      <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 px-3 h-10 flex-1">
                        <CountryFlag flag={customFlag} className="h-5 w-7 rounded object-cover shrink-0" />
                        <input
                          type="text"
                          placeholder="Search country flag (e.g. Italy, Nigeria...)"
                          value={flagSearch}
                          onChange={(e) => {
                            setFlagSearch(e.target.value);
                            setIsFlagDropdownOpen(true);
                          }}
                          onFocus={() => setIsFlagDropdownOpen(true)}
                          className="w-full text-sm font-semibold text-slate-900 dark:text-white outline-none bg-transparent"
                        />
                        {flagSearch && (
                          <button
                            type="button"
                            onClick={() => setFlagSearch("")}
                            className="text-xs text-muted-foreground hover:text-slate-950 dark:hover:text-white shrink-0 cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    {isFlagDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-30"
                          onClick={() => setIsFlagDropdownOpen(false)}
                        />
                        <div className="absolute z-40 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-white/10 dark:bg-slate-950 scrollbar-custom">
                          {filteredCountries.length > 0 ? (
                            filteredCountries.map((c) => (
                              <button
                                key={c.code}
                                type="button"
                                onClick={() => {
                                  setCustomFlag(c.flag);
                                  if (!customName.trim() || visibleFailedToQualifyCountries.some(ac => ac.name.toLowerCase() === customName.trim().toLowerCase())) {
                                    setCustomName(c.name);
                                  }
                                  setFlagSearch("");
                                  setIsFlagDropdownOpen(false);
                                }}
                                className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer text-slate-900 dark:text-white"
                              >
                                <CountryFlag code={c.code} flag={c.flag} name={c.name} className="h-4.5 w-6 rounded object-cover shrink-0" />
                                <span className="font-semibold">{c.name}</span>
                                <span className="text-[10px] text-muted-foreground ml-auto uppercase font-mono">{c.code}</span>
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-xs text-muted-foreground">
                              No countries found
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Quick Select Row */}
                  <div className="flex flex-wrap gap-1.5 items-center pt-0.5">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mr-1">Quick Select:</span>
                    {flagQuickSelectCountries.map((country) => (
                      <button
                        key={country.selectionCode}
                        type="button"
                        onClick={() => {
                          setCustomFlag(country.flag);
                          if (!customName.trim() || visibleFailedToQualifyCountries.some(ac => ac.name.toLowerCase() === customName.trim().toLowerCase())) {
                            setCustomName(country.name);
                          }
                        }}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center border hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer ${customFlag === country.flag ? "border-neon bg-neon/10" : "border-slate-200 dark:border-white/10"
                          }`}
                        title={country.name}
                      >
                        <CountryFlag flag={country.flag} className="h-4.5 w-6 rounded object-cover" emojiClassName="text-lg" />
                      </button>
                    ))}
                  </div>
                </div>
                     {/* Clone Baseline */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block flex items-center">
                    <span>Clone Baseline Squad</span>
                    <InfoTooltip content="Clones the selected country's real player names, statistics, and value to use as the base for this team." />
                  </label>
                  <select
                    value={baselineCode}
                    onChange={(e) => applyBaselineTeam(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-neon dark:border-white/10 dark:bg-slate-950 dark:text-white"
                  >
                    {worldCupTeams.map((team) => (
                      <option key={team.code} value={team.code}>
                        Clone: {team.name} ({team.code})
                      </option>
                    ))}
                  </select>
                </div>

                     {/* Ratings Sliders (Elo, Att, Def) */}
                <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-white/5">
                  <div>
                    <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 items-center">
                      <span className="flex items-center">
                        <span>Elo Rating</span>
                        <InfoTooltip content="Overall skill rating of the country. Higher ELO increases the probability of winning matches." />
                      </span>
                      <span className="text-neon font-mono font-bold">{customElo}</span>
                    </div>
                    <input
                      type="range"
                      min={1200}
                      max={2200}
                      value={customElo}
                      onChange={(e) => setCustomElo(Number(e.target.value))}
                      className="w-full accent-neon cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 items-center">
                      <span className="flex items-center">
                        <span>Attack Power</span>
                        <InfoTooltip content="Influences the average number of goals scored per match by this team." />
                      </span>
                      <span className="text-neon font-mono font-bold">{customAttack}</span>
                    </div>
                    <input
                      type="range"
                      min={15}
                      max={99}
                      value={customAttack}
                      onChange={(e) => setCustomAttack(Number(e.target.value))}
                      className="w-full accent-neon cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 items-center">
                      <span className="flex items-center">
                        <span>Defense Strength</span>
                        <InfoTooltip content="Influences the average number of goals conceded per match by this team." />
                      </span>
                      <span className="text-neon font-mono font-bold">{customDefense}</span>
                    </div>
                    <input
                      type="range"
                      min={15}
                      max={99}
                      value={customDefense}
                      onChange={(e) => setCustomDefense(Number(e.target.value))}
                      className="w-full accent-neon cursor-pointer"
                    />
                  </div>
                </div>

                {/* Replacement Choice */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neon-2 uppercase tracking-widest block flex items-center">
                    <span>Replacement Team (Slots in)</span>
                    <InfoTooltip content="The original tournament team that will be replaced by your custom country in the final brackets." />
                  </label>
                  <select
                    value={replacedCode}
                    onChange={(e) => setReplacedCode(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-neon dark:border-white/10 dark:bg-slate-950 dark:text-white"
                  >
                    {worldCupTeams.map((team) => (
                      <option key={team.code} value={team.code}>
                        Replace: {team.name} ({team.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-white/5 mt-auto">
                <button
                  type="button"
                  onClick={resetBuilder}
                  className="flex-1 px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer dark:border-white/10 dark:text-white dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomCountryPreview}
                  className="flex-1.5 px-4 py-2.5 text-xs font-black rounded-xl bg-gradient-to-r from-neon to-neon-2 text-background hover:scale-[1.02] active:scale-95 transition cursor-pointer"
                >
                  Save & Preview
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={confirmRunOpen} onOpenChange={setConfirmRunOpen}>
        <AlertDialogContent className="rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-xl dark:border-white/10 dark:bg-slate-950 dark:text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 font-display text-xl font-bold">
              <Sparkles className="h-5 w-5 text-neon" />
              <span>Run Hypothetical Path To Glory?</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              {isBuilding
                ? "Your current country profile will be saved, previewed, and then launched into the simulator."
                : `Start the simulation for ${previewTeam?.name || "this team"} now?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex gap-2">
            <AlertDialogCancel className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-white dark:hover:bg-white/5">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleConfirmRun();
              }}
              className="rounded-xl bg-gradient-to-r from-neon to-neon-2 px-4 py-2 text-xs font-black text-background hover:opacity-95"
            >
              Confirm & Run
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!customCountryDeleteTarget} onOpenChange={(open) => !open && setCustomCountryDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-xl dark:border-white/10 dark:bg-slate-950 dark:text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl font-bold text-slate-950 dark:text-white">
              Delete Custom Country?
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              {customCountryDeleteTarget
                ? `This will remove ${customCountryDeleteTarget.name} from your custom country list.`
                : "This will remove this custom country from your custom country list."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex gap-2">
            <AlertDialogCancel className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-white dark:hover:bg-white/5">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!customCountryDeleteTarget) return;
                handleDeleteCustomCountry(customCountryDeleteTarget.code);
                setCustomCountryDeleteTarget(null);
              }}
              className="rounded-xl bg-red-600 px-4 py-2 text-xs font-black text-white hover:bg-red-700"
            >
              Delete Country
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function SectionHeader({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="max-w-3xl">
      <div className="text-xs uppercase tracking-[0.25em] text-neon">{eyebrow}</div>
      <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl text-slate-950 dark:text-white">{title}</h2>
      {sub && <p className="mt-3 text-muted-foreground">{sub}</p>}
    </div>
  );
}

function MiniDetail({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/[0.04] p-3 rounded-xl">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neon/15 text-[11px] font-mono font-black text-neon">{number}</span>
      <span className="text-xs text-muted-foreground leading-normal">{text}</span>
    </div>
  );
}
