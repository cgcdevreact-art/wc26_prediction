"use client";

import Link from "next/link";
import { ArrowRight, Check, Cpu, Brain, Sparkles, ChevronRight } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function ModelGuideAccordion() {
  return (
    <div className="rounded-[2rem] border border-slate-200/80 bg-white/80 shadow-[0_20px_50px_rgba(15,23,42,0.06)] backdrop-blur-md dark:border-white/5 dark:bg-slate-900/60 overflow-hidden">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="model-guide" className="border-none">
          <AccordionTrigger className="hover:no-underline py-6 px-8">
            <div className="flex w-full items-start justify-between gap-4 pr-4">
              <div className="text-left">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-600 dark:text-neon">
                  Model Guide
                </div>
                <h2 className="mt-1 font-display text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  How to use the bracket models
                </h2>
              </div>

              <Link
                href="/subscription#compare-plans"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex shrink-0 items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-fuchsia-500 px-4.5 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-[0_10px_25px_rgba(14,165,233,0.22)] transition hover:scale-[1.02] hover:opacity-95 active:scale-[0.98]"
              >
                <span>Compare Models</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-0 pb-8 px-8">
            <p className="text-sm text-muted-foreground mb-8 leading-relaxed max-w-2xl">
              Move through the tournament in steps. Switch prediction engines to apply squad analytics or granular player-level simulations.
            </p>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Step 1 */}
              <div className="group relative overflow-hidden rounded-[2rem] border border-emerald-200/80 bg-emerald-50/20 p-6 dark:border-emerald-500/10 dark:bg-emerald-500/[0.02] text-left flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/[0.02] hover:border-emerald-500/30">
                {/* Background Watermark */}
                <span className="absolute -right-4 -bottom-6 font-display text-9xl font-black text-emerald-500/[0.04] dark:text-emerald-500/[0.02] select-none pointer-events-none">
                  01
                </span>
                
                <div className="relative z-10">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Step 1 — Core Rating
                    </span>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <Cpu className="h-5 w-5" />
                    </div>
                  </div>
                  
                  <h3 className="mt-3 font-display text-xl font-bold text-slate-900 dark:text-white">
                    Base model prediction
                  </h3>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Start with the base model to run predictions using team-level Elo, attack, and defense ratings.
                  </p>

                  <div className="mt-6 space-y-3">
                    <div className="flex flex-col gap-2 p-3 rounded-xl bg-white/40 dark:bg-slate-950/40 border border-slate-200/40 dark:border-white/[0.02] shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                          <Check className="h-3 w-3" />
                        </span>
                        <strong className="text-xs font-bold text-slate-900 dark:text-slate-250">Elo & Modifiers</strong>
                      </div>
                      <ul className="pl-5.5 space-y-1 text-slate-500 dark:text-slate-400 text-[11px] list-none leading-relaxed">
                        <li className="flex items-start gap-1.5">
                          <ChevronRight className="h-3 w-3 text-emerald-500/70 dark:text-emerald-400/80 shrink-0 mt-0.5" />
                          <span>Calculates goals based on team Elo ratings</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <ChevronRight className="h-3 w-3 text-emerald-500/70 dark:text-emerald-400/80 shrink-0 mt-0.5" />
                          <span>Modified by attack and opposing defense</span>
                        </li>
                      </ul>
                    </div>

                    <div className="flex flex-col gap-2 p-3 rounded-xl bg-white/40 dark:bg-slate-950/40 border border-slate-200/40 dark:border-white/[0.02] shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                          <Check className="h-3 w-3" />
                        </span>
                        <strong className="text-xs font-bold text-slate-900 dark:text-slate-250">Live Team Edits</strong>
                      </div>
                      <ul className="pl-5.5 space-y-1 text-slate-500 dark:text-slate-400 text-[11px] list-none leading-relaxed">
                        <li className="flex items-start gap-1.5">
                          <ChevronRight className="h-3 w-3 text-emerald-500/70 dark:text-emerald-400/80 shrink-0 mt-0.5" />
                          <span>Fully reflects team Elo, Attack, and Defense edits</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <ChevronRight className="h-3 w-3 text-emerald-500/70 dark:text-emerald-400/80 shrink-0 mt-0.5" />
                          <span>Saved in the Teams section</span>
                        </li>
                      </ul>
                    </div>

                    <div className="flex flex-col gap-2 p-3 rounded-xl bg-white/40 dark:bg-slate-950/40 border border-slate-200/40 dark:border-white/[0.02] shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                          <Check className="h-3 w-3" />
                        </span>
                        <strong className="text-xs font-bold text-slate-900 dark:text-slate-250">Quick Bracket Runs</strong>
                      </div>
                      <ul className="pl-5.5 space-y-1 text-slate-500 dark:text-slate-400 text-[11px] list-none leading-relaxed">
                        <li className="flex items-start gap-1.5">
                          <ChevronRight className="h-3 w-3 text-emerald-500/70 dark:text-emerald-400/80 shrink-0 mt-0.5" />
                          <span>Ideal for quick, high-level simulations</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <ChevronRight className="h-3 w-3 text-emerald-500/70 dark:text-emerald-400/80 shrink-0 mt-0.5" />
                          <span>Based on general country-level ratings</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <Link
                href="/teams"
                className="group relative overflow-hidden rounded-[2rem] border border-blue-200/80 bg-blue-50/20 p-6 dark:border-blue-500/10 dark:bg-blue-500/[0.02] hover:shadow-xl hover:shadow-blue-500/[0.03] hover:border-blue-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 flex flex-col justify-between text-left cursor-pointer animate-fade-in"
              >
                {/* Background Watermark */}
                <span className="absolute -right-4 -bottom-6 font-display text-9xl font-black text-blue-500/[0.04] dark:text-blue-500/[0.02] select-none pointer-events-none">
                  02
                </span>

                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                        Step 2 — Squad Analytics
                      </span>
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        <Brain className="h-5 w-5" />
                      </div>
                    </div>
                    
                    <h3 className="mt-3 font-display text-xl font-bold text-slate-900 dark:text-white">
                      Advanced prediction
                    </h3>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Switch to advanced to factor in overall squad quality based on average player ratings.
                    </p>

                    <div className="mt-6 space-y-3">
                      <div className="flex flex-col gap-2 p-3 rounded-xl bg-white/40 dark:bg-slate-950/40 border border-slate-200/40 dark:border-white/[0.02] shadow-sm">
                        <div className="flex items-center gap-3">
                          <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                            <Check className="h-3 w-3" />
                          </span>
                          <strong className="text-xs font-bold text-slate-900 dark:text-slate-250">Average Player Quality</strong>
                        </div>
                        <ul className="pl-5.5 space-y-1 text-slate-500 dark:text-slate-400 text-[11px] list-none leading-relaxed">
                          <li className="flex items-start gap-1.5">
                            <ChevronRight className="h-3 w-3 text-blue-500/70 dark:text-blue-400/80 shrink-0 mt-0.5" />
                            <span>Factors in average player Overall Rating</span>
                          </li>
                          <li className="flex items-start gap-1.5">
                            <ChevronRight className="h-3 w-3 text-blue-500/70 dark:text-blue-400/80 shrink-0 mt-0.5" />
                            <span>Adjusts base expected goals</span>
                          </li>
                        </ul>
                      </div>

                      <div className="flex flex-col gap-2 p-3 rounded-xl bg-white/40 dark:bg-slate-950/40 border border-slate-200/40 dark:border-white/[0.02] shadow-sm">
                        <div className="flex items-center gap-3">
                          <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                            <Check className="h-3 w-3" />
                          </span>
                          <strong className="text-xs font-bold text-slate-900 dark:text-slate-250">Squad-Level Depth</strong>
                        </div>
                        <ul className="pl-5.5 space-y-1 text-slate-500 dark:text-slate-400 text-[11px] list-none leading-relaxed">
                          <li className="flex items-start gap-1.5">
                            <ChevronRight className="h-3 w-3 text-blue-500/70 dark:text-blue-400/80 shrink-0 mt-0.5" />
                            <span>Refines bracket outcomes using average squad depth</span>
                          </li>
                          <li className="flex items-start gap-1.5">
                            <ChevronRight className="h-3 w-3 text-blue-500/70 dark:text-blue-400/80 shrink-0 mt-0.5" />
                            <span>Calculates overall player quality ratio</span>
                          </li>
                        </ul>
                      </div>

                      <div className="flex flex-col gap-2 p-3 rounded-xl bg-white/40 dark:bg-slate-950/40 border border-slate-200/40 dark:border-white/[0.02] shadow-sm">
                        <div className="flex items-center gap-3">
                          <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                            <Check className="h-3 w-3" />
                          </span>
                          <strong className="text-xs font-bold text-slate-900 dark:text-slate-250">Player Level Edits</strong>
                        </div>
                        <ul className="pl-5.5 space-y-1 text-slate-500 dark:text-slate-400 text-[11px] list-none leading-relaxed">
                          <li className="flex items-start gap-1.5">
                            <ChevronRight className="h-3 w-3 text-blue-500/70 dark:text-blue-400/80 shrink-0 mt-0.5" />
                            <span>Ideal after modifying individual player overall ratings</span>
                          </li>
                          <li className="flex items-start gap-1.5">
                            <ChevronRight className="h-3 w-3 text-blue-500/70 dark:text-blue-400/80 shrink-0 mt-0.5" />
                            <span>Reflects rating edits in the Teams section</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 w-full rounded-xl bg-blue-500/10 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 transition-all duration-300 group-hover:bg-blue-500 group-hover:text-white group-hover:shadow-[0_4px_15px_rgba(59,130,246,0.2)]">
                    Edit Teams &rarr;
                  </div>
                </div>
              </Link>

              {/* Step 3 */}
              <Link
                href="/teams"
                className="group relative overflow-hidden rounded-[2rem] border border-fuchsia-200/80 bg-fuchsia-50/20 p-6 dark:border-fuchsia-500/10 dark:bg-fuchsia-500/[0.02] hover:shadow-xl hover:shadow-fuchsia-500/[0.03] hover:border-fuchsia-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 flex flex-col justify-between text-left cursor-pointer animate-fade-in"
              >
                {/* Background Watermark */}
                <span className="absolute -right-4 -bottom-6 font-display text-9xl font-black text-fuchsia-500/[0.04] dark:text-fuchsia-500/[0.02] select-none pointer-events-none">
                  03
                </span>

                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black uppercase tracking-wider text-fuchsia-600 dark:text-fuchsia-400">
                        Step 3 — Premium Pro
                      </span>
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-fuchsia-500/10 dark:bg-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-400 border border-fuchsia-500/20">
                        <Sparkles className="h-5 w-5" />
                      </div>
                    </div>
                    
                    <h3 className="mt-3 font-display text-xl font-bold text-slate-900 dark:text-white">
                      Pro prediction
                    </h3>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Use pro for the deepest simulation incorporating detailed player stats, fitness, form, and availability.
                    </p>

                    <div className="mt-6 space-y-3">
                      <div className="flex flex-col gap-2 p-3 rounded-xl bg-white/40 dark:bg-slate-950/40 border border-slate-200/40 dark:border-white/[0.02] shadow-sm">
                        <div className="flex items-center gap-3">
                          <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/10 text-fuchsia-600 dark:bg-fuchsia-500/20 dark:text-fuchsia-400">
                            <Check className="h-3 w-3" />
                          </span>
                          <strong className="text-xs font-bold text-slate-900 dark:text-slate-250">Detailed Attributes</strong>
                        </div>
                        <ul className="pl-5.5 space-y-1 text-slate-500 dark:text-slate-400 text-[11px] list-none leading-relaxed">
                          <li className="flex items-start gap-1.5">
                            <ChevronRight className="h-3 w-3 text-fuchsia-500/70 dark:text-fuchsia-400/80 shrink-0 mt-0.5" />
                            <span>Applies attacking impact, passing, and form</span>
                          </li>
                          <li className="flex items-start gap-1.5">
                            <ChevronRight className="h-3 w-3 text-fuchsia-500/70 dark:text-fuchsia-400/80 shrink-0 mt-0.5" />
                            <span>Factors in defense impact, fitness, and discipline risk</span>
                          </li>
                        </ul>
                      </div>

                      <div className="flex flex-col gap-2 p-3 rounded-xl bg-white/40 dark:bg-slate-950/40 border border-slate-200/40 dark:border-white/[0.02] shadow-sm">
                        <div className="flex items-center gap-3">
                          <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/10 text-fuchsia-600 dark:bg-fuchsia-500/20 dark:text-fuchsia-400">
                            <Check className="h-3 w-3" />
                          </span>
                          <strong className="text-xs font-bold text-slate-900 dark:text-slate-250">Squad Availability</strong>
                        </div>
                        <ul className="pl-5.5 space-y-1 text-slate-500 dark:text-slate-400 text-[11px] list-none leading-relaxed">
                          <li className="flex items-start gap-1.5">
                            <ChevronRight className="h-3 w-3 text-fuchsia-500/70 dark:text-fuchsia-400/80 shrink-0 mt-0.5" />
                            <span>Highly sensitive to player edits and squad changes</span>
                          </li>
                          <li className="flex items-start gap-1.5">
                            <ChevronRight className="h-3 w-3 text-fuchsia-500/70 dark:text-fuchsia-400/80 shrink-0 mt-0.5" />
                            <span>Tracks active player selection and availability status</span>
                          </li>
                        </ul>
                      </div>

                      <div className="flex flex-col gap-2 p-3 rounded-xl bg-white/40 dark:bg-slate-950/40 border border-slate-200/40 dark:border-white/[0.02] shadow-sm">
                        <div className="flex items-center gap-3">
                          <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/10 text-fuchsia-600 dark:bg-fuchsia-500/20 dark:text-fuchsia-400">
                            <Check className="h-3 w-3" />
                          </span>
                          <strong className="text-xs font-bold text-slate-900 dark:text-slate-250">Form Shifts</strong>
                        </div>
                        <ul className="pl-5.5 space-y-1 text-slate-500 dark:text-slate-400 text-[11px] list-none leading-relaxed">
                          <li className="flex items-start gap-1.5">
                            <ChevronRight className="h-3 w-3 text-fuchsia-500/70 dark:text-fuchsia-400/80 shrink-0 mt-0.5" />
                            <span>Captures granular individual-level capabilities</span>
                          </li>
                          <li className="flex items-start gap-1.5">
                            <ChevronRight className="h-3 w-3 text-fuchsia-500/70 dark:text-fuchsia-400/80 shrink-0 mt-0.5" />
                            <span>Reflects recent form shifts in matches</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 w-full rounded-xl bg-fuchsia-50/10 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-fuchsia-600 dark:bg-fuchsia-500/20 dark:text-fuchsia-400 transition-all duration-300 group-hover:bg-fuchsia-500 group-hover:text-white group-hover:shadow-[0_4px_15px_rgba(217,70,239,0.2)]">
                    Edit Players &rarr;
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
