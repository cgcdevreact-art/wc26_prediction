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
        const res = await fetch("/api/fixtures");
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
    return () => {
      active = false;
    };
  }, []);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayMatches = fixtures.filter((f) => f.date === todayStr);

  const handleSimulationClick = () => {
    if (session) {
      router.push("/predictions/country");
    } else {
      setAuthModalOpen(true);
    }
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
      <div className="relative mx-auto grid container mx-auto px-4 gap-8 pt-12 pb-8 md:px-6 md:pt-20 md:pb-12 lg:grid-cols-2 lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs uppercase tracking-[0.25em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-neon" /> FIFA World Cup 2026 · USA · Canada · Mexico
          </div>
          <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] sm:text-5xl md:text-6xl">
            Who Will Win the <span className="text-gradient">World Cup 2026</span>?
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
              href="#predict"
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
          <div className="relative glass-strong rounded-3xl p-6">
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
                <BarChart data={top} margin={{ top: 16, right: 8, left: 0, bottom: 0 }} barCategoryGap={18}>
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
                  <Bar dataKey="prob.champion" radius={[8, 8, 4, 4]}>
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
          </div>

          {/* Today's Matches Slider */}
          <div className="mt-10 relative z-10">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-red-500" /> Today's <span className="text-red-500">Matches</span>
              </h3>

              {/* Navigation buttons and Swipe indicator */}
              {todayMatches.length > 1 && (
                <div className="flex items-center gap-3">
                  <span className="hidden sm:inline text-[10px] font-medium text-muted-foreground bg-muted dark:bg-white/5 border border-border dark:border-white/5 rounded-full px-2 py-0.5 animate-pulse">
                    Swipe to view ({todayMatches.length})
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => carouselApi?.scrollPrev()}
                      disabled={!canScrollPrev}
                      className="h-6 w-6 rounded-full border border-border dark:border-white/10 flex items-center justify-center bg-white/70 dark:bg-white/5 text-foreground/80 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                      aria-label="Previous match"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => carouselApi?.scrollNext()}
                      disabled={!canScrollNext}
                      className="h-6 w-6 rounded-full border border-border dark:border-white/10 flex items-center justify-center bg-white/70 dark:bg-white/5 text-foreground/80 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                      aria-label="Next match"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {loading ? (
              <div className="glass rounded-2xl p-6 flex flex-col items-center justify-center min-h-[120px] gap-2 border border-border dark:border-white/5">
                <div className="h-6 w-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Loading matches...</span>
              </div>
            ) : todayMatches.length > 0 ? (
              <Carousel setApi={setCarouselApi} className="w-full" opts={{ align: "start", loop: false }}>
                <CarouselContent className="-ml-3">
                  {todayMatches.map((match) => (
                    <CarouselItem key={match.match_no} className="pl-3 basis-[85%] sm:basis-[48%]">
                      <div
                        onClick={handleMatchCardClick}
                        className="glass hover:bg-white/10 hover:border-red-500/40 hover:scale-[1.01] transition-all duration-300 rounded-2xl p-3 cursor-pointer relative overflow-hidden group select-none border border-white/5"
                      >
                        {/* Shimmer effect on hover */}
                        <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />

                        <div className="flex items-center justify-between text-[9px] text-muted-foreground font-bold uppercase tracking-wider mb-2">
                          <span className="text-red-500 font-extrabold">Match #{match.match_no}</span>
                          <span className="text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full font-extrabold">
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

                          {/* Score / VS display */}
                          <div className="shrink-0 px-2 py-0.5 rounded-lg bg-black/10 dark:bg-black/40 border border-white/5 text-center min-w-[60px] flex flex-col justify-center items-center">
                            {match.status === "LIVE" ? (
                              <>
                                <span className="font-mono text-xs font-black text-red-500 flex items-center gap-0.5">
                                  <span className="h-1 w-1 rounded-full bg-red-500 animate-ping inline-block" />
                                  {match.homeScore} - {match.awayScore}
                                </span>
                                <span className="text-[7px] text-red-500 uppercase tracking-widest font-extrabold mt-0.5">
                                  {match.time_elapsed && !isNaN(Number(match.time_elapsed)) ? `${match.time_elapsed}'` : "LIVE"}
                                </span>
                              </>
                            ) : match.status === "COMPLETED" ? (
                              <>
                                <span className="font-mono text-xs font-bold text-muted-foreground">{match.homeScore} - {match.awayScore}</span>
                                <span className="text-[7px] text-muted-foreground/80 uppercase font-extrabold mt-0.5">FT</span>
                              </>
                            ) : (
                              <>
                                <span className="font-mono text-[10px] font-black text-red-500">{match.kickoffTime || "VS"}</span>
                                <span className="text-[7px] text-muted-foreground uppercase font-extrabold mt-0.5">UPCOMING</span>
                              </>
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

                        <div className="text-[9px] text-center text-muted-foreground/80 mt-2.5 pt-1.5 border-t border-white/5 flex items-center justify-center gap-1 font-medium truncate">
                          <MapPin className="h-2.5 w-2.5 text-red-500 shrink-0" />
                          <span className="truncate">{match.stageName} · {match.city}</span>
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            ) : (
              <div
                onClick={handleMatchCardClick}
                className="glass hover:bg-white/10 hover:border-red-500/40 hover:scale-[1.01] transition-all duration-300 rounded-2xl p-6 cursor-pointer text-center relative overflow-hidden group select-none border border-white/5"
              >
                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-500/15 text-red-500 mb-2 border border-red-500/20">
                  <Calendar className="h-4.5 w-4.5" />
                </div>
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">No matches scheduled today</h4>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-xs mx-auto">Click to browse full schedules, venues, and stage filters.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </section>
  );
}
