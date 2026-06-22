"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { useTeams, useGroupsConfig } from "@/components/TeamsProvider";
import { ArrowRight, Sparkles, Plus, X, Info } from "lucide-react";
import { ALL_COUNTRIES } from "@/lib/countries-data";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

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

export function WildcardCountrySection() {
  const router = useRouter();
  const { data: session } = useSession();
  const teams = useTeams();
  const groupsConfig = useGroupsConfig();

  const [selectedCode, setSelectedCode] = useState("NOR");
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
  const [countriesList, setCountriesList] = useState<any[]>(ALL_COUNTRIES);

  useEffect(() => {
    fetch("https://cdn.jsdelivr.net/npm/country-flag-emoji-json@2.0.0/dist/index.json")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const cleaned = data.map((c: any) => ({
            name: c.name,
            code: c.code,
            emoji: c.emoji,
          }));
          setCountriesList(cleaned);
        }
      })
      .catch((err) => console.warn("Failed to fetch country flag JSON from CDN, using static fallback:", err));
  }, []);

  const filteredCountries = useMemo(() => {
    const search = flagSearch.trim().toLowerCase();
    const list = [...countriesList].sort((a, b) => a.name.localeCompare(b.name));
    if (!search) return list;
    return list.filter((c) =>
      c.name.toLowerCase().includes(search)
    );
  }, [flagSearch, countriesList]);

  const worldCupCodes = useMemo(() => {
    return Object.values(groupsConfig).flat();
  }, [groupsConfig]);

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
    if (!confirm("Are you sure you want to delete this custom country?")) {
      return;
    }
    const updated = customCountries.filter((c) => c.code !== code);
    localStorage.setItem("wc26_custom_countries", JSON.stringify(updated));
    setCustomCountries(updated);
    if (selectedCode === code) {
      setSelectedCode("NOR");
    }

    if (session?.user?.id) {
      fetch("/api/user/custom-countries", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      }).catch((err) => console.error("Error deleting custom country from DB:", err));
    }
  };

  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => a.name.localeCompare(b.name));
  }, [teams]);

  const featuredTeams = useMemo(() => {
    const featured = FEATURED_CODES.map((code) => teams.find((team) => team.code === code)).filter(Boolean);
    return featured.length > 0 ? featured : sortedTeams.slice(0, 5);
  }, [sortedTeams, teams]);

  const selectedTeam = useMemo(() => {
    const custom = customCountries.find((cc) => cc.code === selectedCode);
    if (custom) {
      return {
        code: custom.code,
        name: custom.name,
        flag: custom.flag,
      };
    }
    return teams.find((team) => team.code === selectedCode) || featuredTeams[0] || teams[0];
  }, [selectedCode, customCountries, teams, featuredTeams]);

  // Selected Team Details for Dashboard Preview
  const selectedTeamDetails = useMemo(() => {
    const custom = customCountries.find((cc) => cc.code === selectedCode);
    if (custom) {
      const orig = teams.find((t) => t.code === custom.replacedCode);
      return {
        code: custom.code,
        name: custom.name,
        flag: custom.flag,
        rank: "Custom",
        elo: custom.elo,
        attack: custom.attack,
        defense: custom.defense,
        power: orig?.power || 75,
        squadValueM: orig?.squadValueM || 100,
        confederation: orig?.confederation || "UEFA",
        isCustom: true,
        replacedName: orig?.name || "",
      };
    }
    const team = teams.find((t) => t.code === selectedCode) || featuredTeams[0] || teams[0];
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
  }, [selectedCode, customCountries, teams, featuredTeams]);

  // Suggested replacements based on baseline's confederation/region
  const suggestedReplacements = useMemo(() => {
    const baselineTeam = teams.find((t) => t.code === baselineCode);
    if (!baselineTeam) return [];

    const regionalWcTeams = teams.filter(
      (t) => worldCupCodes.includes(t.code) && t.confederation === baselineTeam.confederation
    );

    return regionalWcTeams.length > 0
      ? regionalWcTeams
      : teams.filter((t) => worldCupCodes.includes(t.code));
  }, [baselineCode, teams, worldCupCodes]);

  // Auto-select replacement suggestion when suggestions list changes
  useEffect(() => {
    if (suggestedReplacements.length > 0) {
      setReplacedCode(suggestedReplacements[0].code);
    }
  }, [suggestedReplacements]);

  const launchCountryPath = () => {
    if (!selectedTeam) return;
    router.push(`/predictions/country?team=${selectedTeam.code}&autorun=true`);
  };

  const handleCreateCustomCountry = async () => {
    if (!customName.trim()) {
      alert("Please enter a country name.");
      return;
    }

    const generatedCode = "CC_" + customName.trim().substring(0, 3).toUpperCase();

    const isWcConflict = teams.some(
      (t) => worldCupCodes.includes(t.code) && t.name.toLowerCase() === customName.trim().toLowerCase()
    );
    if (isWcConflict) {
      alert("This country is already in the World Cup! Please enter a wildcard country name.");
      return;
    }

    const newCC: CustomCountry = {
      code: generatedCode,
      name: customName.trim(),
      flag: customFlag,
      baselineCode,
      elo: customElo,
      attack: customAttack,
      defense: customDefense,
      replacedCode,
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

    // Reset inline builder
    setIsBuilding(false);
    setCustomName("");
    setCustomFlag("🇳🇬");

    // Redirect directly to path to glory simulation for custom team with autorun
    router.push(`/predictions/country?team=${generatedCode}&autorun=true`);
  };

  return (
    <section className="container mx-auto px-4 py-16">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-slate-200 dark:border-white/5 pb-6">
        <SectionHeader
          eyebrow="Dream Route"
          title="Your team didn't make the World Cup?"
          sub="Drop them in anyway. Build your custom country profile, swap them into the tournament brackets, and run their path to glory."
        />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_400px] min-w-0">

        {/* Left Column: Selector & Launcher Panel */}
        <div className="glass-strong rounded-3xl p-6 relative border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden flex flex-col justify-between min-h-[480px]">
          <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-neon/15 blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 h-40 w-40 rounded-full bg-neon-2/15 blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-5 border-b border-slate-200/50 dark:border-white/5 pb-5">
              {selectedTeam && (
                <>
                  <div className="filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:scale-105 transition-transform duration-300">
                    <CountryFlag
                      code={selectedTeam.code}
                      flag={selectedTeam.flag}
                      name={selectedTeam.name}
                      className="h-16 w-20 rounded-xl object-cover drop-shadow-md"
                      emojiClassName="text-7xl leading-none select-none drop-shadow-md"
                    />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.25em] text-neon font-extrabold mb-1">
                      Active Selection
                    </div>
                    <h3 className="font-display text-3xl font-black text-slate-950 dark:text-white tracking-tight">
                      {selectedTeam.name}
                    </h3>
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
                  const active = team.code === selectedCode;
                  return (
                    <button
                      key={team.code}
                      onClick={() => setSelectedCode(team.code)}
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
                      onClick={() => setSelectedCode(cc.code)}
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
                          handleDeleteCustomCountry(cc.code);
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
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
                Browse Full Country List
              </label>
              <select
                value={selectedCode}
                onChange={(event) => setSelectedCode(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-neon focus:ring-1 focus:ring-neon dark:border-white/10 dark:bg-slate-950 dark:text-white"
              >
                {customCountries.length > 0 && (
                  <optgroup label="Custom Wildcard Teams" className="bg-white text-slate-900 dark:bg-slate-950 dark:text-white">
                    {customCountries.map((cc) => (
                      <option key={cc.code} value={cc.code}>
                        {cc.flag} {cc.name} ({cc.code})
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="All Teams" className="bg-white text-slate-900 dark:bg-slate-950 dark:text-white">
                  {sortedTeams.map((team) => (
                    <option key={team.code} value={team.code}>
                      {team.name} ({team.code})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Selected Team Analysis Preview */}
            <div className="space-y-4 pt-4 border-t border-slate-200/50 dark:border-white/5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 rounded-2xl p-4 transition-colors">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-bold">FIFA Rank / Region</span>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white mt-1 block">
                    {selectedTeamDetails.rank} ({selectedTeamDetails.confederation})
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 rounded-2xl p-4 transition-colors">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-bold">Elo Rating</span>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white mt-1 block font-mono">
                    {selectedTeamDetails.elo}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 rounded-2xl p-4 transition-colors">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-bold">Squad Value</span>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white mt-1 block font-mono">
                    {selectedTeamDetails.squadValueM ? `€${selectedTeamDetails.squadValueM}M` : "N/A"}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 rounded-2xl p-4 transition-colors">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-bold">Power Index</span>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white mt-1 block font-mono">
                    {selectedTeamDetails.power}
                  </span>
                </div>
              </div>

              {/* Progress bars for Att & Def */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 rounded-2xl p-4">
                <div>
                  <div className="flex justify-between text-[11px] text-muted-foreground font-bold mb-1.5 uppercase tracking-wide">
                    <span>Attack Power</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedTeamDetails.attack}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-neon rounded-full" style={{ width: `${selectedTeamDetails.attack}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-muted-foreground font-bold mb-1.5 uppercase tracking-wide">
                    <span>Defense Strength</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedTeamDetails.defense}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-neon rounded-full" style={{ width: `${selectedTeamDetails.defense}%` }} />
                  </div>
                </div>
              </div>

              {/* Custom Flag Indicator Banner */}
              {selectedTeamDetails.isCustom && (
                <div className="flex items-center gap-2.5 text-xs text-neon bg-neon/8 px-4 py-3 rounded-2xl border border-neon/20 font-bold transition-all">
                  <Sparkles className="w-4 h-4 text-neon shrink-0 animate-pulse" />
                  <span>Custom wildcard team replacing {selectedTeamDetails.replacedName} (baseline cloned from {teams.find(t => t.code === customCountries.find(cc => cc.code === selectedCode)?.baselineCode)?.name})</span>
                </div>
              )}
            </div>
          </div>

          {/* Launch Button */}
          <div className="relative z-10 pt-8 border-t border-slate-200/50 dark:border-white/5 mt-6">
            <button
              onClick={launchCountryPath}
              className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-neon to-neon-2 px-6 text-sm font-black text-background transition hover:opacity-95 active:scale-[0.98] shadow-lg shadow-neon/20 hover:shadow-neon/30 cursor-pointer"
            >
              <Sparkles className="h-4.5 w-4.5 fill-current" />
              <span>Launch Path To Glory Simulation</span>
              <ArrowRight className="h-4.5 w-4.5" />
            </button>
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
                onClick={() => {
                  setIsBuilding(true);
                }}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-neon bg-neon/5 px-4 text-sm font-bold text-neon hover:bg-neon/10 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Build Custom Country Profile</span>
              </button>
            </div>
          ) : (
            /* Active Creator Form (Single Screen Layout) */
            <div className="flex flex-col h-full justify-between space-y-5">
              <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1 scrollbar-custom">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-white/5">
                  <h4 className="font-display text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-neon" />
                    <span>Create Country Profile</span>
                  </h4>
                  <button
                    onClick={() => setIsBuilding(false)}
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
                                  setCustomFlag(c.emoji);
                                  if (!customName.trim() || countriesList.some(ac => ac.name.toLowerCase() === customName.trim().toLowerCase())) {
                                    setCustomName(c.name);
                                  }
                                  setFlagSearch("");
                                  setIsFlagDropdownOpen(false);
                                }}
                                className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer text-slate-900 dark:text-white"
                              >
                                <CountryFlag flag={c.emoji} className="h-4.5 w-6 rounded object-cover shrink-0" />
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
                    {countriesList.filter(c => ["NG", "NO", "IT", "CL", "IN", "ZA", "EG", "SE"].includes(c.code)).map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => {
                          setCustomFlag(c.emoji);
                          if (!customName.trim() || countriesList.some(ac => ac.name.toLowerCase() === customName.trim().toLowerCase())) {
                            setCustomName(c.name);
                          }
                        }}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center border hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer ${customFlag === c.emoji ? "border-neon bg-neon/10" : "border-slate-200 dark:border-white/10"
                          }`}
                        title={c.name}
                      >
                        <CountryFlag flag={c.emoji} className="h-4.5 w-6 rounded object-cover" emojiClassName="text-lg" />
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
                    onChange={(e) => setBaselineCode(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-neon dark:border-white/10 dark:bg-slate-950 dark:text-white"
                  >
                    {sortedTeams.map((team) => (
                      <option key={team.code} value={team.code}>
                        Clone: {team.name} ({team.code})
                      </option>
                    ))}
                  </select>
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
                    <optgroup label="Suggested (Same Confederation)" className="bg-white text-slate-900 dark:bg-slate-950 dark:text-white">
                      {suggestedReplacements.map((team) => (
                        <option key={team.code} value={team.code}>
                          Replace: {team.name} ({team.code})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="All World Cup Teams" className="bg-white text-slate-900 dark:bg-slate-950 dark:text-white">
                      {teams
                        .filter((t) => worldCupCodes.includes(t.code))
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((team) => (
                          <option key={team.code} value={team.code}>
                            Replace: {team.name} ({team.code})
                          </option>
                        ))}
                    </optgroup>
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
              </div>

              {/* Form Buttons */}
              <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-white/5 mt-auto">
                <button
                  type="button"
                  onClick={() => setIsBuilding(false)}
                  className="flex-1 px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer dark:border-white/10 dark:text-white dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateCustomCountry}
                  className="flex-1.5 px-4 py-2.5 text-xs font-black rounded-xl bg-gradient-to-r from-neon to-neon-2 text-background hover:scale-[1.02] active:scale-95 transition cursor-pointer"
                >
                  Save & Launch Path
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
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
