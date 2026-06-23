"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function ModelGuideAccordion() {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white/80 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/80 overflow-hidden">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="model-guide" className="border-none">
          <AccordionTrigger className="hover:no-underline py-5 px-6">
            <div className="flex w-full items-start justify-between gap-4 pr-4">
              <div className="text-left">
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-600 dark:text-neon">
                  Model Guide
                </div>
                <h2 className="mt-1 font-display text-2xl font-bold text-foreground dark:text-white">
                  How to use the bracket models
                </h2>
              </div>

              <Link
                href="/subscription#compare-plans"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex shrink-0 items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-fuchsia-500 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-[0_10px_25px_rgba(14,165,233,0.22)] transition hover:scale-[1.02] hover:opacity-95 active:scale-[0.98]"
              >
                <span>Compare Models</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-0 pb-6 px-6">
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Move through the bracket in steps and switch models when you want deeper prediction logic.
            </p>

            <div className="grid gap-5 md:grid-cols-3">
              {/* Step 1 */}
              <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-500/20 dark:bg-emerald-500/5 text-left flex flex-col justify-between">
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    Step 1
                  </div>
                  <h3 className="mt-2 text-lg font-bold text-foreground dark:text-white">
                    Base model prediction
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    Start with the base model for a quick bracket using core Elo, attack, and defense signals.
                  </p>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                        <Check className="h-3 w-3" />
                      </span>
                      <span>Works with the default team ratings already loaded into the simulator.</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                        <Check className="h-3 w-3" />
                      </span>
                      <span>Best when you want to simulate quickly without changing team or player data.</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                        <Check className="h-3 w-3" />
                      </span>
                      <span>Good starting point before opening the Teams section to customize ratings.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <Link
                href="/teams"
                className="group rounded-[1.5rem] border border-blue-200 bg-blue-50/60 p-5 dark:border-blue-500/20 dark:bg-blue-500/5 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 flex flex-col justify-between text-left cursor-pointer"
              >
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">
                      Step 2
                    </span>
                    <span className="text-[9px] font-extrabold uppercase bg-blue-100/80 text-blue-800 px-2 py-0.5 rounded-full dark:bg-blue-900/40 dark:text-blue-300 transition-colors group-hover:bg-blue-200/80">
                      Edit Teams &rarr;
                    </span>
                  </div>
                  <h3 className="mt-2 text-lg font-bold text-foreground dark:text-white">
                    Advanced prediction
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    Switch to advanced when you want squad strength and extra team-level context to refine the bracket.
                  </p>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                        <Check className="h-3 w-3" />
                      </span>
                      <span>Use after editing team Elo, attack, or defense values in the Teams section.</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                        <Check className="h-3 w-3" />
                      </span>
                      <span>Lets you refine bracket outcomes using the team-level customization tools you already saved.</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                        <Check className="h-3 w-3" />
                      </span>
                      <span>Ideal if you want more control from team edits without touching individual players yet.</span>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Step 3 */}
              <Link
                href="/teams"
                className="group rounded-[1.5rem] border border-fuchsia-200 bg-fuchsia-50/60 p-5 dark:border-fuchsia-500/20 dark:bg-fuchsia-500/5 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 flex flex-col justify-between text-left cursor-pointer"
              >
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black uppercase tracking-wider text-fuchsia-700 dark:text-fuchsia-300">
                      Step 3
                    </span>
                    <span className="text-[9px] font-extrabold uppercase bg-fuchsia-100/80 text-fuchsia-800 px-2 py-0.5 rounded-full dark:bg-fuchsia-900/40 dark:text-fuchsia-300 transition-colors group-hover:bg-fuchsia-200/80">
                      Edit Players &rarr;
                    </span>
                  </div>
                  <h3 className="mt-2 text-lg font-bold text-foreground dark:text-white">
                    Pro prediction
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    Use pro for the deepest bracket run, adding player-level and form-driven prediction detail.
                  </p>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300">
                        <Check className="h-3 w-3" />
                      </span>
                      <span>Use after editing player ratings, stats, image links, or squad details in the Teams section.</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300">
                        <Check className="h-3 w-3" />
                      </span>
                      <span>Best when you also change player availability like players in and players out.</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300">
                        <Check className="h-3 w-3" />
                      </span>
                      <span>Choose this when you want the bracket to reflect your saved team and player customizations most closely.</span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
