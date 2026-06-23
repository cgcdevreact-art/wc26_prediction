import { redirect } from "next/navigation";
import Link         from "next/link";
import { Prisma }   from "@prisma/client";
import { Header }   from "@/components/site/Header";
import { Footer }   from "@/components/site/Footer";
import { auth }     from "@/lib/auth";
import { prisma }   from "@/lib/prisma";
import {
  BadgeCheck,
  CalendarDays,
  ChevronRight,
  FolderKanban,
  Gauge,
  Mail,
  Shield,
  Sparkles,
  Trophy,
} from "lucide-react";

export const metadata = {
  title      : "Profile - WC26 Predict",
  description: "Manage your WC26 Predict account, plan, and prediction activity.",
};

const PLAN_STYLES: Record<string, string> = {
  free: "border-slate-200 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white/70",
  plus: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300",
  pro : "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300",
};

const PLAN_LABELS: Record<string, string> = {
  free: "Free Predictor",
  plus: "Advanced Predictor",
  pro : "Expert Predictor",
};

function formatPredictionType(type: string) {
  return type
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  const fallbackName  = session.user.name || "Predictor";
  const fallbackEmail = session.user.email || "No email on file";
  const fallbackTier  = session.user.subscriptionTier || "free";

  let profileData: {
    name                  : string;
    email                 : string;
    image                 : string | null;
    subscriptionTier      : string;
    freeModelUsageCount   : number;
    createdAt             : Date;
    stripeCurrentPeriodEnd: Date | null;
    predictionsCount      : number;
    achievementsCount     : number;
  } | null = null;
  let typeCounts: Array<{ type: string; _count: { type: number } }> = [];
  let pointsTotal                                                   = 0;
  let recentPredictions: Array<{
    id                : string;
    type              : string;
    createdAt         : Date;
    predictedHomeScore: number | null;
    predictedAwayScore: number | null;
    predictedWinner   : string | null;
    predictedPayload  : Prisma.JsonValue | null;
    match             : {
      homeTeam: { name: string | null; tla: string | null } | null;
      awayTeam: { name: string | null; tla: string | null } | null;
    } | null;
  }> = [];

  try {
    const [user, groupedPredictions, pointsAggregate, recent] = await Promise.all([
      prisma.user.findUnique({
        where : { id: session.user.id },
        select: {
          name                  : true,
          email                 : true,
          image                 : true,
          subscriptionTier      : true,
          freeModelUsageCount   : true,
          createdAt             : true,
          stripeCurrentPeriodEnd: true,
          _count                : {
            select: {
              predictions     : true,
              userAchievements: true,
            },
          },
        },
      }),
      prisma.prediction.groupBy({
        by    : ["type"],
        where : { userId: session.user.id },
        _count: {
          type: true,
        },
      }),
      prisma.predictionPoint.aggregate({
        where: { userId: session.user.id },
        _sum : {
          points: true,
        },
      }),
      prisma.prediction.findMany({
        where  : { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take   : 6,
        select : {
          id                : true,
          type              : true,
          createdAt         : true,
          predictedHomeScore: true,
          predictedAwayScore: true,
          predictedWinner   : true,
          predictedPayload  : true,
          match             : {
            select: {
              homeTeam: {
                select: {
                  name: true,
                  tla : true,
                },
              },
              awayTeam: {
                select: {
                  name: true,
                  tla : true,
                },
              },
            },
          },
        },
      }),
    ]);

    if (user) {
      profileData = {
        name                  : user.name || fallbackName,
        email                 : user.email || fallbackEmail,
        image                 : user.image,
        subscriptionTier      : user.subscriptionTier,
        freeModelUsageCount   : user.freeModelUsageCount,
        createdAt             : user.createdAt,
        stripeCurrentPeriodEnd: user.stripeCurrentPeriodEnd,
        predictionsCount      : user._count.predictions,
        achievementsCount     : user._count.userAchievements,
      };
    }

    typeCounts        = groupedPredictions;
    pointsTotal       = pointsAggregate._sum.points || 0;
    recentPredictions = recent;
  } catch (error) {
    console.warn("Failed to load full profile data, rendering fallback profile view.");
  }

  const user = profileData || {
    name                  : fallbackName,
    email                 : fallbackEmail,
    image                 : session.user.image || null,
    subscriptionTier      : fallbackTier,
    freeModelUsageCount   : session.user.freeModelUsageCount || 0,
    createdAt             : new Date(),
    stripeCurrentPeriodEnd: null,
    predictionsCount      : 0,
    achievementsCount     : 0,
  };

  const tierClass          = PLAN_STYLES[user.subscriptionTier] || PLAN_STYLES.free;
  const tierLabel          = PLAN_LABELS[user.subscriptionTier] || user.subscriptionTier;
  const topPredictionTypes = [...typeCounts].sort((a, b) => b._count.type - a._count.type).slice(0, 3);

  return (
    <div className = "min-h-screen bg-hero text-foreground">
      <Header />

      <main className = "mx-auto container px-4 py-16   md:py-24">
      <div  className = "mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className = "inline-flex items-center gap-2 rounded-full glass px-3.5 py-1 text-xs uppercase tracking-[0.25em] text-neon">
              Account Overview
            </div>
            <h1  className       = "mt-4 font-display text-4xl font-bold tracking-tight text-foreground dark:text-white sm:text-5xl">
            Your <span className = "text-gradient">Profile</span>
            </h1>
            <p className = "mt-3 max-w-2xl text-base text-muted-foreground">
              Keep track of your subscription, prediction activity, and progress across the tournament tools.
            </p>
          </div>
          <div className = "flex flex-wrap gap-3">
            <Link
              href      = "/predictions"
              className = "inline-flex items-center gap-2 rounded-2xl border border-border bg-white/80 px-4 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              <FolderKanban className = "h-4 w-4" />
              My Predictions
            </Link>
            <Link
              href      = "/subscription"
              className = "inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-neon to-neon-2 px-4 py-3 text-sm font-semibold text-background neon-border transition hover:opacity-90"
            >
              <Sparkles className = "h-4 w-4" />
              Manage Plan
            </Link>
          </div>
        </div>

        <div     className = "grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className = "rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-900">
        <div     className = "flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div     className = "flex items-center gap-4">
                {user.image ? (
                  <img
                    src       = {user.image}
                    alt       = {user.name}
                    className = "h-20 w-20 rounded-3xl border border-slate-200 object-cover shadow-sm dark:border-white/10"
                  />
                ) : (
                  <div className = "grid h-20 w-20 place-items-center rounded-3xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-fuchsia-50 text-2xl font-black uppercase text-cyan-700 shadow-sm dark:border-neon/30 dark:from-neon/15 dark:to-neon-2/10 dark:text-neon">
                    {user.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h2 className = "font-display text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                    {user.name}
                  </h2>
                  <div  className = "mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className = "h-4 w-4" />
                    <span>{user.email}</span>
                  </div>
                </div>
              </div>

              <div className = {`self-start rounded-full border px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.2em] ${tierClass}`}>
                {tierLabel} Plan
              </div>
            </div>

            <div          className = "mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
            <div          className = "rounded-[1.6rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/[0.03]">
            <div          className = "flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            <CalendarDays className = "h-3.5 w-3.5" />
                  Member Since
                </div>
                <div className = "mt-3 text-lg font-bold text-slate-950 dark:text-white">
                  {user.createdAt.toLocaleDateString("en-US", {
                    month: "short",
                    day  : "numeric",
                    year : "numeric",
                  })}
                </div>
              </div>

              <div   className = "rounded-[1.6rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/[0.03]">
              <div   className = "flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              <Gauge className = "h-3.5 w-3.5" />
                  Base Usage
                </div>
                <div className = "mt-3 text-lg font-bold text-slate-950 dark:text-white">
                  {user.subscriptionTier === "free" ? `${user.freeModelUsageCount} / 5` : "Unlimited"}
                </div>
              </div>

              <div      className = "rounded-[1.6rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/[0.03]">
              <div      className = "flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              <Sparkles className = "h-3.5 w-3.5" />
                  Renewal
                </div>
                <div className = "mt-3 text-lg font-bold text-slate-950 dark:text-white">
                  {user.stripeCurrentPeriodEnd
                    ? user.stripeCurrentPeriodEnd.toLocaleDateString("en-US", {
                        month: "short",
                        day  : "numeric",
                        year : "numeric",
                      })
                    : "Not Active"}
                </div>
              </div>

              <div    className = "rounded-[1.6rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/[0.03]">
              <div    className = "flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              <Shield className = "h-3.5 w-3.5" />
                  Access
                </div>
                <div className = "mt-3 text-lg font-bold text-slate-950 dark:text-white">
                  {user.subscriptionTier === "pro"
                    ? "All Models"
                    : user.subscriptionTier === "plus"
                      ? "Base + Advanced"
                      : "Base Only"}
                </div>
              </div>
            </div>
          </section>

          <section className = "rounded-[2rem] border border-slate-200 bg-white flex flex-col p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-900">
          <div     className = "flex items-center justify-between flex-grow-1">
              <div>
                <h2 className = "font-display text-2xl font-black text-slate-950 dark:text-white">Prediction Stats</h2>
                <p  className = "mt-1 text-sm text-muted-foreground">A quick snapshot of your activity so far.</p>
              </div>
              <Trophy className = "h-8 w-8 text-amber-500" />
            </div>

            <div className = "mt-6 grid grid-cols-2 gap-3">
            <div className = "rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/[0.03]">
            <div className = "text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Saved Predictions</div>
            <div className = "mt-2 text-3xl font-black font-mono text-slate-950 dark:text-white">{user.predictionsCount}</div>
              </div>
              <div className = "rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/[0.03]">
              <div className = "text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Points Earned</div>
              <div className = "mt-2 text-3xl font-black font-mono text-slate-950 dark:text-white">{pointsTotal}</div>
              </div>
              <div className = "rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/[0.03]">
              <div className = "text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Achievements</div>
              <div className = "mt-2 text-3xl font-black font-mono text-slate-950 dark:text-white">{user.achievementsCount}</div>
              </div>
              <div className = "rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/[0.03]">
              <div className = "text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Top Category</div>
              <div className = "mt-2 text-lg font-black text-slate-950 dark:text-white">
                  {topPredictionTypes[0] ? formatPredictionType(topPredictionTypes[0].type) : "No Data"}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <section className = "rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-900">
          <div     className = "flex items-center justify-between border-b border-slate-200 pb-4 dark:border-white/5">
              <div>
                <h2 className = "font-display text-2xl font-black text-slate-950 dark:text-white">Recent Activity</h2>
                <p  className = "mt-1 text-sm text-muted-foreground">Your latest saved prediction actions.</p>
              </div>
              <Link href = "/predictions" className = "text-sm font-semibold text-cyan-700 transition hover:text-cyan-600 dark:text-neon">
                View all
              </Link>
            </div>

            <div className = "mt-5 space-y-3">
              {recentPredictions.length > 0 ? (
                recentPredictions.map((prediction) => {
                  const matchup = prediction.match
                    ? `${prediction.match.homeTeam?.name || prediction.match.homeTeam?.tla || "TBD"} vs ${prediction.match.awayTeam?.name || prediction.match.awayTeam?.tla || "TBD"}`
                    :  "Tournament projection";

                  const result                          = 
                        prediction.predictedHomeScore !== null && prediction.predictedAwayScore !== null
                      ? `${prediction.predictedHomeScore} - ${prediction.predictedAwayScore}`
                      :  prediction.predictedWinner || "Saved";

                  return (
                    <div
                      key       = {prediction.id}
                      className = "flex items-center justify-between gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/5 dark:bg-white/[0.03]"
                    >
                      <div className = "min-w-0">
                      <div className = "text-xs font-bold uppercase tracking-[0.18em] text-cyan-700 dark:text-neon">
                          {formatPredictionType(prediction.type)}
                        </div>
                        <div className = "mt-1 truncate text-sm font-semibold text-slate-950 dark:text-white">{matchup}</div>
                        <div className = "mt-1 text-xs text-muted-foreground">
                          Saved {prediction.createdAt.toLocaleDateString("en-US", {
                            month: "short",
                            day  : "numeric",
                            year : "numeric",
                          })}
                        </div>
                      </div>
                      <div className = "shrink-0 text-right">
                      <div className = "text-sm font-black font-mono text-slate-950 dark:text-white">{result}</div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className = "rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center dark:border-white/10 dark:bg-white/[0.02]">
                <div className = "text-base font-semibold text-slate-950 dark:text-white">No saved activity yet</div>
                <p   className = "mt-2 text-sm text-muted-foreground">
                    Start with the simulator or country projections and your profile will fill up here.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className = "rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-900">
          <div     className = "flex items-center justify-between border-b border-slate-200 pb-4 dark:border-white/5">
              <div>
                <h2 className = "font-display text-2xl font-black text-slate-950 dark:text-white">Shortcuts</h2>
                <p  className = "mt-1 text-sm text-muted-foreground">Jump back into the tools you use most.</p>
              </div>
              <BadgeCheck className = "h-7 w-7 text-emerald-500" />
            </div>

            <div className = "mt-5 space-y-3">
              {[
                {
                  href : "/predictions/country",
                  title: "Country Predictor",
                  sub  : "Run nation-level simulations and save full tournament paths.",
                },
                {
                  href : "/simulator",
                  title: "Match Simulator",
                  sub  : "Predict group-stage and knockout fixtures with the active model.",
                },
                {
                  href : "/teams",
                  title: "Teams Explorer",
                  sub  : "Browse squad depth, ratings, and editable team detail pages.",
                },
                {
                  href : "/subscription",
                  title: "Billing & Plan",
                  sub  : "Review your current tier and upgrade when you want more depth.",
                },
              ].map((item) => (
                <Link
                  key       = {item.href}
                  href      = {item.href}
                  className = "flex items-center justify-between rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-cyan-300 hover:bg-white dark:border-white/5 dark:bg-white/[0.03] dark:hover:border-neon/30 dark:hover:bg-white/[0.05]"
                >
                  <div className = "min-w-0">
                  <div className = "text-sm font-bold text-slate-950 dark:text-white">{item.title}</div>
                  <div className = "mt-1 text-xs text-muted-foreground">{item.sub}</div>
                  </div>
                  <ChevronRight className = "h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </section>
        </div> */}
      </main>

      <Footer />
    </div>
  );
}
