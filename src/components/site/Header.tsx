"use client";

import Link from "next/link";
import { Trophy, Menu, LogOut, Sun, Moon, ChevronDown, Check, Sparkles, Brain, Cpu, LayoutGrid, FolderKanban, UserCircle2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "@/components/ThemeProvider";
import { useSimulationStore } from "@/lib/store/simulationStore";
import { UpgradeModal } from "./UpgradeModal";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { buildAuthModalHref } from "@/lib/auth-modal";

const NAV = [
  // { to: "/", label: "Home" },
  { to: "/predictions/country", label: "Country Predict" },
  { to: "/teams", label: "Teams" },
  { to: "/subscription", label: "Pricing" },
];

const SIMULATOR_NAV = [
  { to: "/simulator", label: "Simulator", icon: Cpu },
  { to: "/bracket", label: "Bracket", icon: LayoutGrid },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { theme, setTheme } = useTheme();
  const { selectedModel, setSelectedModel } = useSimulationStore();
  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalReason, setModalReason] = useState<"plus" | "pro" | "credits" | "guest">("plus");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [simulatorMenuOpen, setSimulatorMenuOpen] = useState(false);
  const simulatorMenuRef = useRef<HTMLDivElement>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const isActiveRoute = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const isPredictionSectionActive = SIMULATOR_NAV.some((item) => isActiveRoute(item.to));

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (simulatorMenuRef.current && !simulatorMenuRef.current.contains(event.target as Node)) {
        setSimulatorMenuOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const tier = session?.user?.subscriptionTier;
    if (!tier) return;

    if (tier === "pro") {
      setSelectedModel("pro");
      return;
    }

    if (tier === "plus") {
      setSelectedModel("advanced");
      return;
    }

    setSelectedModel("base");
  }, [session?.user?.subscriptionTier, setSelectedModel]);

  const handleModelChange = (model: "base" | "advanced" | "pro") => {
    if (model === "base") {
      setSelectedModel("base");
      return;
    }

    const tier = session?.user?.subscriptionTier || "free";

    if (model === "advanced") {
      if (tier === "free") {
        setModalReason("plus");
        setModalOpen(true);
        return;
      }
      setSelectedModel("advanced");
    }

    if (model === "pro") {
      if (tier === "free" || tier === "plus") {
        setModalReason("pro");
        setModalOpen(true);
        return;
      }
      setSelectedModel("pro");
    }
  };

  const openAuthModal = (mode: "signin" | "signup" = "signin") => {
    router.push(buildAuthModalHref({
      pathname,
      search: searchParams.toString(),
      mode,
      callbackUrl: pathname,
    }));
  };

  return (
    <header className="sticky top-0 z-40 glass">
      <div className="container mx-auto flex px-4 items-center justify-between py-3">
        <Link href="/" className="flex items-center gap-2 shrink-0 whitespace-nowrap">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-neon to-neon-2 text-background">
            <Trophy className="h-5 w-5" strokeWidth={2.4} />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-wide">WC26 <span className="text-gradient">PREDICT</span></div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Probability · Picks · Glory</div>
          </div>
        </Link>
        
        <nav className="hidden items-center gap-1.5 xl:flex shrink-0 whitespace-nowrap">
          <div
            className="relative pt-2"
            ref={simulatorMenuRef}
            onMouseEnter={() => setSimulatorMenuOpen(true)}
            onMouseLeave={() => setSimulatorMenuOpen(false)}
          >
            <button
              onClick={() => setSimulatorMenuOpen((open) => !open)}
              className={`flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 xl:px-2.5 xl:py-1.5 text-xs xl:text-sm transition ${
                isPredictionSectionActive
                  ? "bg-black/6 dark:bg-white/6 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Prediction</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </button>
            {simulatorMenuOpen && (
              <div className="absolute left-0 top-full w-48 rounded-xl border border-border dark:border-white/10 bg-white/95 dark:bg-[#070b19]/95 backdrop-blur-md p-1.5 shadow-2xl animate-fade-in z-50">
                {SIMULATOR_NAV.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      href={item.to}
                      onClick={() => setSimulatorMenuOpen(false)}
                      className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition ${
                        isActiveRoute(item.to)
                          ? "bg-black/6 dark:bg-white/6 text-foreground font-medium"
                          : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {NAV.map((n) => (
            <Link
              key={n.to}
              href={n.to}
              className={`rounded-md px-2 py-1 xl:px-2.5 xl:py-1.5 text-xs xl:text-sm transition whitespace-nowrap ${
                isActiveRoute(n.to)
                  ? "bg-black/6 dark:bg-white/6 text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {n.label}
            </Link>
          ))}
          
          {/* Custom Redesigned Model Selector */}
          <div
            className="relative ml-2 mr-1 pt-2"
            ref={dropdownRef}
            onMouseEnter={() => setDropdownOpen(true)}
            onMouseLeave={() => setDropdownOpen(false)}
          >
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex cursor-pointer items-center gap-1.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 text-[11px] font-medium rounded-lg px-2.5 py-1.5 text-foreground transition duration-200 select-none outline-none"
            >
              {selectedModel === "pro" && <Sparkles className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0" />}
              {selectedModel === "advanced" && <Brain className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
              {selectedModel === "base" && <Cpu className="h-3.5 w-3.5 text-emerald-600 dark:text-neon shrink-0" />}
              <span>
                {selectedModel === "pro" && "Pro Model"}
                {selectedModel === "advanced" && "Advanced Model"}
                {selectedModel === "base" && "Base Model"}
              </span>
              <ChevronDown className="h-3 w-3 opacity-60 shrink-0" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full w-56 rounded-xl border border-border dark:border-white/10 bg-white/95 dark:bg-[#070b19]/95 backdrop-blur-md p-1.5 shadow-2xl animate-fade-in z-50">
                <button
                  onClick={() => {
                    handleModelChange("base");
                    setDropdownOpen(false);
                  }}
                  className={`flex items-center justify-between w-full rounded-lg px-2.5 py-2 text-left text-xs transition hover:bg-black/5 dark:hover:bg-white/5 ${
                    selectedModel === "base" ? "text-emerald-600 dark:text-neon font-semibold bg-black/5 dark:bg-white/[0.02]" : "text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Cpu className="h-3.5 w-3.5 text-emerald-600 dark:text-neon shrink-0" />
                    <div>
                      <div className="text-foreground font-semibold">Base Model</div>
                      <div className="text-[10px] text-muted-foreground">Elo / Att / Def stats</div>
                    </div>
                  </div>
                  {selectedModel === "base" && <Check className="h-3.5 w-3.5" />}
                </button>
                
                <button
                  onClick={() => {
                    handleModelChange("advanced");
                    setDropdownOpen(false);
                  }}
                  className={`flex items-center justify-between w-full rounded-lg px-2.5 py-2 text-left text-xs transition hover:bg-black/5 dark:hover:bg-white/5 ${
                    selectedModel === "advanced" ? "text-blue-600 dark:text-blue-400 font-semibold bg-black/5 dark:bg-white/[0.02]" : "text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Brain className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <div>
                      <div className="text-foreground font-semibold">Advanced Model</div>
                      <div className="text-[10px] text-muted-foreground">+Squad value & stats</div>
                    </div>
                  </div>
                  {selectedModel === "advanced" && <Check className="h-3.5 w-3.5" />}
                </button>

                <button
                  onClick={() => {
                    handleModelChange("pro");
                    setDropdownOpen(false);
                  }}
                  className={`flex items-center justify-between w-full rounded-lg px-2.5 py-2 text-left text-xs transition hover:bg-black/5 dark:hover:bg-white/5 ${
                    selectedModel === "pro" ? "text-purple-600 dark:text-purple-400 font-semibold bg-black/5 dark:bg-white/[0.02]" : "text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                    <div>
                      <div className="text-foreground font-semibold">Pro Model</div>
                      <div className="text-[10px] text-muted-foreground">+Player aspects & form</div>
                    </div>
                  </div>
                  {selectedModel === "pro" && <Check className="h-3.5 w-3.5" />}
                </button>
              </div>
            )}
          </div>
          
          <button
            onClick={toggleTheme}
            className="ml-1 rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition duration-200"
            aria-label="Toggle theme"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun className="h-4.5 w-4.5 text-amber-400" /> : <Moon className="h-4.5 w-4.5 text-indigo-600" />}
          </button>

          {session ? (
            <div
              className="relative ml-4 pl-4 pt-2 border-l border-slate-300 dark:border-white/10 animate-fade-in shrink-0"
              ref={profileMenuRef}
              onMouseEnter={() => setProfileMenuOpen(true)}
              onMouseLeave={() => setProfileMenuOpen(false)}
            >
              <button
                onClick={() => setProfileMenuOpen((open) => !open)}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-black/5 dark:hover:bg-white/5"
              >
                <div className="flex items-center gap-2">
                  {session.user?.image ? (
                    <img src={session.user.image} alt="" className="w-6 h-6 rounded-full border border-neon/50" />
                  ) : (
                    <div className="grid h-6 w-6 place-items-center rounded-full bg-neon/10 border border-neon/30 text-[10px] font-bold text-neon uppercase">
                      {session.user?.name?.charAt(0) || "?"}
                    </div>
                  )}
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-xs font-semibold text-muted-foreground max-w-[100px] truncate">
                      {session.user?.name}
                    </span>
                    {session.user.subscriptionTier && session.user.subscriptionTier !== "free" && (
                      <span className={`text-[8px] font-extrabold uppercase tracking-wider mt-0.5 px-1 py-0.2 rounded ${
                        session.user.subscriptionTier === "pro"
                          ? "bg-purple-500/10 border border-purple-500/20 text-purple-400"
                          : "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                      }`}>
                        {session.user.subscriptionTier}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 top-full w-52 rounded-xl border border-border dark:border-white/10 bg-white/95 dark:bg-[#070b19]/95 backdrop-blur-md p-1.5 shadow-2xl animate-fade-in z-50">
                  <Link
                    href="/profile"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
                  >
                    <UserCircle2 className="h-4 w-4 shrink-0" />
                    <span>Profile</span>
                  </Link>
                  <Link
                    href="/predictions"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
                  >
                    <FolderKanban className="h-4 w-4 shrink-0" />
                    <span>My Predictions</span>
                  </Link>
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      signOut();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition hover:bg-black/5 dark:hover:bg-white/5 hover:text-destructive"
                  >
                    <LogOut className="h-4 w-4 shrink-0" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => openAuthModal("signin")}
              className="ml-4 rounded-md bg-gradient-to-r from-neon to-neon-2 px-4 py-2 text-sm font-semibold text-background neon-border transition hover:opacity-90 animate-fade-in whitespace-nowrap"
            >
              Sign In
            </button>
          )}
        </nav>
        
        <button onClick={() => setOpen((o) => !o)} className="xl:hidden rounded-md p-2 text-muted-foreground hover:text-foreground" aria-label="menu">
          <Menu className="h-5 w-5" />
        </button>
      </div>
      
      {open && (
        <div className="xl:hidden border-t border-slate-200 dark:border-white/5 px-4 py-3 flex flex-col gap-2">
          <div className="rounded-md px-3 py-2 text-sm text-muted-foreground">
            <div className="font-medium text-foreground">Simulator</div>
            <div className="mt-2 flex flex-col gap-1">
              {SIMULATOR_NAV.map((n) => (
                <Link
                  key={n.to}
                  href={n.to}
                  onClick={() => setOpen(false)}
                  className={`rounded-md px-3 py-2 text-sm transition ${
                    isActiveRoute(n.to)
                      ? "bg-black/6 dark:bg-white/6 text-foreground font-medium"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  }`}
                >
                  {n.label}
                </Link>
              ))}
            </div>
          </div>
          {NAV.map((n) => (
            <Link
              key={n.to}
              href={n.to}
              onClick={() => setOpen(false)}
              className={`rounded-md px-3 py-2 text-sm transition ${
                isActiveRoute(n.to)
                  ? "bg-black/6 dark:bg-white/6 text-foreground font-medium"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              }`}
            >
              {n.label}
            </Link>
          ))}
          
          <button
            onClick={() => {
              toggleTheme();
              setOpen(false);
            }}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground transition duration-200 w-full text-left"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <>
                <Sun className="h-4.5 w-4.5 text-amber-400" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="h-4.5 w-4.5 text-indigo-600" />
                <span>Dark Mode</span>
              </>
            )}
          </button>

          {/* Redesigned Mobile Segmented Model Switcher */}
          <div className="border-t border-border dark:border-white/5 pt-3 mt-2 px-3">
            <div className="text-xs text-muted-foreground mb-2">Model Tier:</div>
            <div className="grid grid-cols-3 gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-lg">
              {(["base", "advanced", "pro"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => handleModelChange(m)}
                  className={`py-1 text-[10px] font-bold uppercase rounded-md transition ${
                    selectedModel === m
                      ? m === "pro"
                        ? "bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30"
                        : m === "advanced"
                          ? "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30"
                          : "bg-emerald-100 dark:bg-neon/20 text-emerald-600 dark:text-neon border border-emerald-200 dark:border-neon/30"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m === "base" && "Base"}
                  {m === "advanced" && "Adv"}
                  {m === "pro" && "Pro"}
                </button>
              ))}
            </div>
          </div>

          {session ? (
            <div className="flex items-center justify-between border-t border-slate-200 dark:border-white/5 pt-3 mt-1 px-3">
              <div className="flex flex-col gap-2">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-muted-foreground truncate">{session.user?.name}</span>
                  {session.user.subscriptionTier && session.user.subscriptionTier !== "free" && (
                    <span className={`text-[8px] font-extrabold uppercase tracking-wider self-start mt-0.5 px-1 py-0.2 rounded ${
                      session.user.subscriptionTier === "pro"
                        ? "bg-purple-500/10 border border-purple-500/20 text-purple-400"
                        : "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                    }`}>
                      {session.user.subscriptionTier}
                    </span>
                  )}
                </div>
                <Link
                  href="/profile"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <UserCircle2 className="h-3.5 w-3.5" />
                  <span>Profile</span>
                </Link>
                <Link
                  href="/predictions"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <FolderKanban className="h-3.5 w-3.5" />
                  <span>My Predictions</span>
                </Link>
              </div>
              <button onClick={() => { signOut(); setOpen(false); }} className="flex items-center gap-2 text-xs text-destructive hover:opacity-80">
                <LogOut className="h-3.5 w-3.5" /> Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                openAuthModal("signin");
                setOpen(false);
              }}
              className="mt-2 w-full rounded-md bg-gradient-to-r from-neon to-neon-2 py-2 text-center text-sm font-semibold text-background neon-border"
            >
              Sign In
            </button>
          )}
        </div>
      )}
      <UpgradeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        reason={modalReason}
      />
    </header>
  );
}
