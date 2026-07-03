"use client";

import { useTeams } from "@/components/TeamsProvider";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { Countdown } from "./Countdown";
import { HOME_SECTION_OPEN_EVENT } from "./HomeSectionsAccordion";
import { Trophy, Sparkles, ArrowRight, MapPin, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, XAxis, Cell, Tooltip } from "recharts";
import { useState, useEffect, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AuthModal } from "./AuthModal";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";

const FIXTURES_REFRESH_INTERVAL_MS = 120000;

export function Hero() {
  const teams = useTeams();
  const top = [...teams].sort((a, b) => b.prob.champion - a.prob.champion).slice(0, 8);
  const { data: session } = useSession();
  const router = useRouter();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [fixtures, setFixtures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => {
      setCanScrollPrev(carouselApi.canScrollPrev());
      setCanScrollNext(carouselApi.canScrollNext());
    };
    carouselApi.on("select", onSelect);
    carouselApi.on("reInit", onSelect);
    onSelect();
    return () => {
      carouselApi.off("select", onSelect);
      carouselApi.off("reInit", onSelect);
    };
  }, [carouselApi]);

  useEffect(() => {
    let active = true;
    const fetchFixtures = async () => {
      try {
        const res = await fetch("/api/fixtures", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (active && data.success && Array.isArray(data.fixtures)) {
            setFixtures(data.fixtures);
          }
        }
      } catch (err) {
        console.error("Failed to fetch fixtures for hero", err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchFixtures();
    const interval = setInterval(fetchFixtures, FIXTURES_REFRESH_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Find the active date dynamically:
  // 1. If any match is LIVE, use the date of the first LIVE match.
  // 2. Otherwise, use the date of the first UPCOMING match.
  // 3. Otherwise, use the date of the last COMPLETED match.
  // 4. Fallback to client's local date.
  const getActiveDate = (matches: any[]) => {
    if (matches.length === 0) return new Date().toISOString().slice(0, 10);

    const liveMatch = matches.find((m) => m.status === "LIVE");
    if (liveMatch) return liveMatch.date;

    const upcomingMatch = matches.find((m) => m.status === "UPCOMING");
    if (upcomingMatch) return upcomingMatch.date;

    const completedMatches = matches.filter((m) => m.status === "COMPLETED");
    if (completedMatches.length > 0) {
      return completedMatches[completedMatches.length - 1].date;
    }

    return new Date().toISOString().slice(0, 10);
  };

  const activeDate = getActiveDate(fixtures);
  const todayMatches = fixtures
    .filter((f) => f.date === activeDate)
    .sort((a, b) => {
      const getMatchPriority = (match: any) => {
        if (match.status === "LIVE") return 0;
        if (match.status === "UPCOMING") return 1;
        if (match.status === "COMPLETED") return 2;
        return 3;
      };

      const priorityDiff = getMatchPriority(a) - getMatchPriority(b);
      if (priorityDiff !== 0) return priorityDiff;

      const kickoffDiff = new Date(a.kickoffAtIso).getTime() - new Date(b.kickoffAtIso).getTime();
      if (kickoffDiff !== 0) {
        return a.status === "COMPLETED" ? -kickoffDiff : kickoffDiff;
      }

      return a.match_no - b.match_no;
    });
  const hasLiveMatch = todayMatches.some((match) => match.status === "LIVE");
  const matchesHeadingLabel = hasLiveMatch ? "Today's" : "Upcoming";

  const handleSimulationClick = () => {
    if (session) {
      router.push("/predictions/country");
    } else {
      setAuthModalOpen(true);
    }
  };

  const handleBannerClick = () => {
    router.push("/predictions/country");
  };

  const handleStartPredictingClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();

    window.dispatchEvent(new CustomEvent(HOME_SECTION_OPEN_EVENT, {
      detail: { section: "probability" },
    }));
    window.history.replaceState(null, "", "#predict");

    requestAnimationFrame(() => {
      document.getElementById("predict")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const handleMatchCardClick = () => {
    window.dispatchEvent(new CustomEvent(HOME_SECTION_OPEN_EVENT, {
      detail: { section: "fixtures" },
    }));
    window.history.replaceState(null, "", "#fixtures");

    requestAnimationFrame(() => {
      document.getElementById("fixtures")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  return (
    <section className="relative overflow-hidden bg-hero">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-20 h-72 w-72 rounded-full bg-neon/20 blur-3xl" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-neon-2/20 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neon/60 to-transparent" />
      </div>
      <div className="relative mx-auto grid container mx-auto px-4 gap-8 pt-16 pb-4 md:px-6 md:pt-24 md:pb-6 lg:grid-cols-2 lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs uppercase tracking-[0.25em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-neon" /> FIFA World Cup 2026 · USA · Canada · Mexico
          </div>
          <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] sm:text-5xl md:text-6xl">
            Who Will Win the <span className="text-gradient">2026 World Cup</span>?
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            Run simulations, predict every match, build your bracket and compete with millions. Real probabilities. Real glory.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              onClick={handleSimulationClick}
              className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-neon to-neon-2 px-5 py-3 text-sm font-semibold text-background neon-border transition hover:opacity-90 cursor-pointer"
            >
              Run Simulation <ArrowRight className="h-4 w-4" />
            </button>
            <a
              href=""
              onClick={handleStartPredictingClick}
              className="rounded-md glass px-5 py-3 text-sm font-semibold hover:bg-white/10"
            >
              Start Predicting
            </a>
          </div>
          <div className="mt-8">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Countdown to Final</div>
              <div className="text-xs text-muted-foreground">Jul 19, 2026 · New York New Jersey Stadium</div>
            </div>
            <Countdown />
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 rounded-3xl bg-gradient-to-tr from-neon/20 via-transparent to-neon-2/20 blur-2xl" />
          <button
            type="button"
            onClick={handleBannerClick}
            className="relative block w-full text-left glass-strong rounded-3xl p-6 transition hover:scale-[1.01] hover:bg-white/10 cursor-pointer"
            aria-label="Open country predictor"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Live Win Probability</div>
                <div className="font-display text-xl font-semibold">Top contenders</div>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-gold/80 to-gold/30 animate-float text-background neon-border">
                <Trophy className="h-6 w-6" />
              </div>
            </div>

            <div className="mt-5 h-56">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <BarChart data={top} margin={{ top: 16, right: 4, left: 4, bottom: 0 }} barCategoryGap={2}>
                  <defs>
                    <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-neon)" />
                      <stop offset="100%" stopColor="var(--color-neon-2)" />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="code" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    contentStyle={{ background: "var(--color-popover)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                    formatter={(v: any) => [`${Number(v).toFixed(1)}%`, "Win Cup"]}
                  />
                  <Bar dataKey="prob.champion" radius={[12, 12, 8, 8]} barSize={44} maxBarSize={48}>
                    {top.map((t, i) => <Cell key={i} fill="url(#barFill)" />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2 text-center">
              {top.slice(0, 4).map((t) => (
                <div key={t.code} className="rounded-lg border border-black/8 bg-black/8 p-2 dark:border-white/8 dark:bg-white/5">
                  <div className="flex justify-center">
                    <CountryFlag code={t.code} flag={t.flag} name={t.name} className="h-6 w-8" emojiClassName="text-xl" />
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.code}</div>
                  <div className="text-sm font-semibold text-neon">{t.prob.champion.toFixed(1)}%</div>
                </div>
              ))}
            </div>
          </button>
        </div>
      </div>

      {/* Today's Matches Section */}
      <div className="mx-auto container px-4 pb-12 md:px-6 relative z-10 mt-2">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            {todayMatches.length > 0 ? (
              <span>
                {matchesHeadingLabel} <span className="text-red-500">{todayMatches.length}</span> Matches
              </span>
            ) : (
              <span>{matchesHeadingLabel} Matches</span>
            )}
          </h3>

          {/* Navigation buttons */}
          {todayMatches.length > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => carouselApi?.scrollPrev()}
                disabled={!canScrollPrev}
                className="h-7 w-7 rounded-full border border-border dark:border-white/10 flex items-center justify-center bg-white/70 dark:bg-white/5 text-foreground/80 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                aria-label="Previous match"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => carouselApi?.scrollNext()}
                disabled={!canScrollNext}
                className="h-7 w-7 rounded-full border border-border dark:border-white/10 flex items-center justify-center bg-white/70 dark:bg-white/5 text-foreground/80 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                aria-label="Next match"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="glass rounded-2xl p-6 flex flex-col items-center justify-center min-h-[120px] gap-2 border border-border dark:border-white/5">
            <div className="h-6 w-6 border-2 border-neon border-t-transparent rounded-full animate-spin"></div>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Loading matches...</span>
          </div>
        ) : todayMatches.length > 0 ? (
          <Carousel setApi={setCarouselApi} className="w-full" opts={{ align: "start", loop: false }}>
            <CarouselContent className="-ml-3">
              {todayMatches.map((match) => (
                <CarouselItem key={match.match_no} className="pl-3 basis-[85%] sm:basis-[48%] md:basis-[32%] lg:basis-[24%]">
                  <HeroMatchCard
                    match={match}
                    onClick={handleMatchCardClick}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        ) : (
          <div
            onClick={handleMatchCardClick}
            className="glass hover:bg-white/10 hover:border-neon/40 hover:scale-[1.01] transition-all duration-300 rounded-2xl p-6 cursor-pointer text-center relative overflow-hidden group select-none border border-white/5"
          >
            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-neon/15 text-neon mb-2 border border-neon/20">
              <Calendar className="h-4.5 w-4.5" />
            </div>
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">No matches scheduled today</h4>
            <p className="text-[11px] text-muted-foreground mt-1 max-w-xs mx-auto">Click to browse full schedules, venues, and stage filters.</p>
          </div>
        )}
      </div>
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </section>
  );
}

function HeroMatchCard({
  match,
  onClick,
}: {
  match: any;
  onClick: () => void;
}) {
  const rawKickoff = match.kickoffAtIso ? new Date(match.kickoffAtIso).getTime() : NaN;
  const kickoffMs = Number.isNaN(rawKickoff) ? 0 : rawKickoff;
  const hasValidKickoff = !Number.isNaN(rawKickoff);
  const [nowTime, setNowTime] = useState<number>(kickoffMs);

  useEffect(() => {
    const syncTimer = window.setTimeout(() => {
      setNowTime(Date.now());
    }, 0);
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => {
      window.clearTimeout(syncTimer);
      clearInterval(timer);
    };
  }, []);

  const diffMs = kickoffMs - nowTime;
  const isLive = match.status === "LIVE" || (match.status === "UPCOMING" && hasValidKickoff && diffMs <= 0);
  const isCompleted = match.status === "COMPLETED";

  const getCountdownString = (diff: number) => {
    if (!Number.isFinite(diff) || diff <= 0) return "0s";
    const totalSec = Math.floor(diff / 1000);
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;

    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  // Card styles
  let cardClass = "hover:scale-[1.01] transition-all duration-300 rounded-2xl p-3.5 cursor-pointer relative overflow-hidden group select-none border";
  if (isLive) {
    cardClass += " border-red-500/80 bg-red-500/[0.04] dark:bg-red-500/[0.08] hover:bg-red-500/[0.06] dark:hover:bg-red-500/[0.1] shadow-[0_0_15px_rgba(239,68,68,0.15)] animate-[pulse_3s_infinite]";
  } else {
    cardClass += " border-slate-200/50 dark:border-white/5 bg-slate-100/80 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-white/10 hover:shadow-sm";
  }
  if (isCompleted) {
    cardClass += " opacity-70";
  }

  // Center pill styles
  let pillClass = "shrink-0 px-2 py-1.5 rounded-lg border text-center min-w-[85px] flex flex-col justify-center items-center transition-all duration-300";
  if (isLive) {
    pillClass += " bg-red-500/10 border-red-500/25 text-red-500";
  } else {
    pillClass += " bg-slate-200/40 dark:bg-black/40 border-slate-200/60 dark:border-white/5 text-slate-700 dark:text-slate-350";
  }

  return (
    <div onClick={onClick} className={cardClass}>
      {/* Shimmer effect on hover */}
      <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />

      <div className="flex items-center justify-between text-[9px] text-muted-foreground font-bold uppercase tracking-wider mb-2">
        <span className={isLive ? "text-red-500 font-extrabold" : "text-slate-600 dark:text-slate-400 font-extrabold"}>
          Match #{match.match_no}
        </span>
        <span className={isLive ? "text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full font-extrabold" : "text-slate-600 bg-slate-500/10 dark:text-slate-450 dark:bg-white/5 px-2 py-0.5 rounded-full font-extrabold"}>
          {match.group ? `Group ${match.group}` : match.stageName}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2.5 my-1.5">
        {/* Home Team */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <div className="shrink-0 flex items-center justify-center bg-black/10 dark:bg-white/5 p-1 rounded-md border border-white/5">
            <CountryFlag
              code={match.homeTeamObj.code}
              flag={match.homeTeamObj.flag}
              name={match.homeTeamObj.name}
              className="h-4.5 w-6 shrink-0"
              emojiClassName="text-base leading-none"
            />
          </div>
          <span className="font-bold text-xs truncate text-foreground dark:text-white uppercase font-display">
            {match.homeTeamObj.code || match.homeTeamObj.name.slice(0, 3)}
          </span>
        </div>

        {/* Score / VS / Countdown display */}
        <div className={pillClass}>
          {isLive ? (
            <>
              <span className="font-mono text-xs font-bold text-red-500 tracking-wider">
                {match.homeScore !== "-" ? match.homeScore : "0"} - {match.awayScore !== "-" ? match.awayScore : "0"}
              </span>
              <span className="text-[7px] font-black text-red-500 tracking-widest uppercase flex items-center gap-1 mt-0.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                </span>
                LIVE
              </span>
            </>
          ) : isCompleted ? (
            <>
              <span className="font-mono text-xs font-bold text-muted-foreground">{match.homeScore} - {match.awayScore}</span>
              <span className="text-[7px] text-muted-foreground/80 uppercase font-extrabold mt-0.5">FT</span>
            </>
          ) : !hasValidKickoff ? (
            <span className="font-mono text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              TBD
            </span>
          ) : (
            <span className="font-mono text-[11px] font-bold text-red-500">
              {getCountdownString(diffMs)}
            </span>
          )}
        </div>

        {/* Away Team */}
        <div className="flex items-center gap-1.5 justify-end min-w-0 flex-1 text-right">
          <span className="font-bold text-xs truncate text-foreground dark:text-white uppercase font-display">
            {match.awayTeamObj.code || match.awayTeamObj.name.slice(0, 3)}
          </span>
          <div className="shrink-0 flex items-center justify-center bg-black/10 dark:bg-white/5 p-1 rounded-md border border-white/5">
            <CountryFlag
              code={match.awayTeamObj.code}
              flag={match.awayTeamObj.flag}
              name={match.awayTeamObj.name}
              className="h-4.5 w-6 shrink-0"
              emojiClassName="text-base leading-none"
            />
          </div>
        </div>
      </div>

      <div className="text-[9px] text-center text-muted-foreground/80 mt-2.5 pt-1.5 border-t border-white/5 flex items-center justify-center gap-1.5 font-medium truncate">
        <MapPin className={`h-2.5 w-2.5 shrink-0 ${isLive ? "text-red-500" : "text-slate-500 dark:text-slate-400"}`} />
        <span className="truncate">
          {match.kickoffTime ? `${match.kickoffTime} ${match.timezoneLabel || ""} · ` : ""}{match.venue ? `${match.venue}${match.city ? `, ${match.city}` : ""}` : "Venue TBD"}
        </span>
      </div>
    </div>
  );
}
