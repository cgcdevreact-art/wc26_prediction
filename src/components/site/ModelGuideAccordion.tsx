"use client";

import Link from "next/link";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function ModelGuideAccordion() {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white/80 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/80 overflow-hidden">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="model-guide" className="border-none">
          <AccordionTrigger className="hover:no-underline py-5 px-6">
            <div className="text-left">
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-600 dark:text-neon">
                Model Guide
              </div>
              <h2 className="mt-1 font-display text-2xl font-bold text-foreground dark:text-white">
                How to use the bracket models
              </h2>
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
                </div>
              </Link>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
