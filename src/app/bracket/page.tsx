import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { GroupPredictor } from "@/components/site/GroupPredictor";

export const metadata = {
  title: "Bracket Builder — WC26 Predict",
  description: "Build your own World Cup 2026 bracket and share it.",
};

export default function Page() {
  return (
    <div className="min-h-screen bg-hero">
      <Header />
      <main>
        <section className="mx-auto max-w-7xl px-4 pt-8 md:px-6">
          <div className="rounded-[2rem] border border-border bg-white/80 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/80">
            <div className="max-w-2xl">
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-600 dark:text-neon">
                Model Guide
              </div>
              <h2 className="mt-2 font-display text-2xl font-bold text-foreground dark:text-white">
                How to use the bracket models
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Move through the bracket in steps and switch models when you want deeper prediction logic.
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                <div className="text-sm font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  Step 1
                </div>
                <h3 className="mt-2 text-lg font-bold text-foreground dark:text-white">
                  Base model prediction
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Start with the base model for a quick bracket using core Elo, attack, and defense signals.
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-blue-200 bg-blue-50 p-5 dark:border-blue-500/20 dark:bg-blue-500/10">
                <div className="text-sm font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">
                  Step 2
                </div>
                <h3 className="mt-2 text-lg font-bold text-foreground dark:text-white">
                  Advanced prediction
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Switch to advanced when you want squad strength and extra team-level context to refine the bracket.
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-fuchsia-200 bg-fuchsia-50 p-5 dark:border-fuchsia-500/20 dark:bg-fuchsia-500/10">
                <div className="text-sm font-black uppercase tracking-wider text-fuchsia-700 dark:text-fuchsia-300">
                  Step 3
                </div>
                <h3 className="mt-2 text-lg font-bold text-foreground dark:text-white">
                  Pro prediction
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Use pro for the deepest bracket run, adding player-level and form-driven prediction detail.
                </p>
              </div>
            </div>
          </div>
        </section>
        <GroupPredictor defaultTab="knockout" onlyKnockout={true} />
      </main>
      <Footer />
    </div>
  );
}
