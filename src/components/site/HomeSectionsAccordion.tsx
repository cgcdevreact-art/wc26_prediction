"use client";

import { useEffect, useState, Fragment } from "react";
import Link from "next/link";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ProbabilityExplorer } from "@/components/site/ProbabilityExplorer";
import { WildcardCountrySection } from "@/components/site/WildcardCountrySection";
import { FixturesExplorer } from "@/components/site/FixturesExplorer";
import { ChevronDown } from "lucide-react";

const DEFAULT_OPEN_SECTIONS = [ "fixtures"];
export const HOME_SECTION_OPEN_EVENT = "wc26:open-home-section";
const PROBABILITY_SECTION_VALUE = "probability";

const SECTIONS = [
  {
    value: "probability",
    eyebrow: "Team Probability Explorer",
    title: "Pick a country. See every chance.",
    sub: "From group qualification to lifting the trophy — explore the full probability journey for any nation.",
    contentClassName: "pt-6",
    content: <ProbabilityExplorer />,
  },
  {
    value: "wildcard",
    eyebrow: "Dream Route",
    title: "Your team didn't make the World Cup?",
    sub: "Drop them in anyway. Build your custom country profile, swap them into the tournament brackets, and run their hypothetical path to glory.",
    contentClassName: "pt-6",
    content: <WildcardCountrySection />,
  },
  {
    value: "fixtures",
    eyebrow: "Tournament Schedule",
    title: "Matches & Fixtures",
    sub: "Browse full schedules for all 104 matches of the FIFA World Cup 2026™. Filter by stage, date, or search by venue.",
    contentClassName: "pt-6",
    content: <FixturesExplorer />,
  },
] as const;

export function HomeSectionsAccordion() {
  const [openItems, setOpenItems] = useState<string[]>(DEFAULT_OPEN_SECTIONS);

  useEffect(() => {
    const openProbabilitySection = () => {
      setOpenItems((current) => (
        current.includes(PROBABILITY_SECTION_VALUE)
          ? current
          : [...current, PROBABILITY_SECTION_VALUE]
      ));
    };

    const handleOpenRequest = (event: Event) => {
      const detail = (event as CustomEvent<{ section?: string }>).detail;
      const targetSection = detail?.section;
      if (targetSection) {
        setOpenItems((current) =>
          current.includes(targetSection) ? current : [...current, targetSection]
        );
      }
    };

    window.addEventListener(HOME_SECTION_OPEN_EVENT, handleOpenRequest);

    if (window.location.hash === "#predict") {
      openProbabilitySection();
    } else if (window.location.hash === "#fixtures") {
      setOpenItems((current) =>
        current.includes("fixtures") ? current : [...current, "fixtures"]
      );
    }

    return () => {
      window.removeEventListener(HOME_SECTION_OPEN_EVENT, handleOpenRequest);
    };
  }, []);

  return (
    <Accordion
      type="multiple"
      value={openItems}
      onValueChange={setOpenItems}
      className="container mx-auto space-y-8 px-4 py-12"
    >
      {SECTIONS.map((section) => {
        const isOpen = openItems.includes(section.value);

        return (
          <Fragment key={section.value}>
            <AccordionItem
              value={section.value}
              id={section.value === PROBABILITY_SECTION_VALUE ? "predict" : section.value === "fixtures" ? "fixtures" : undefined}
              className="overflow-visible border-none bg-transparent shadow-none"
            >
              <AccordionTrigger className="group relative w-full cursor-pointer flex-col justify-between gap-6 border-b border-slate-300/90 pb-6 text-left hover:no-underline dark:border-white/15 sm:flex-row sm:items-end [&>svg]:hidden">
                <div className="pointer-events-none absolute inset-x-[-2%] -top-6 h-24 rounded-[2.5rem] bg-gradient-to-r from-neon/20 via-cyan-400/18 to-neon-2/20 opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-100 dark:from-neon/16 dark:via-cyan-400/14 dark:to-neon-2/16" />
                <div className="max-w-3xl">
                  <div className="text-xs uppercase tracking-[0.25em] text-neon font-bold">{section.eyebrow}</div>
                  <h2 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl text-foreground dark:text-white tracking-tight">
                    {section.title}
                  </h2>
                  {section.sub && (
                    <p className="mt-3 text-muted-foreground text-sm font-normal leading-relaxed">
                      {section.sub}
                    </p>
                  )}
                </div>
                <div className="relative shrink-0 self-start pt-2 sm:self-auto sm:pt-0">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300/80 bg-white/85 text-foreground/80 shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition group-hover:bg-white group-hover:shadow-[0_0_24px_rgba(6,182,212,0.18)] dark:border-white/12 dark:bg-white/5 dark:group-hover:bg-white/10 dark:group-hover:shadow-[0_0_24px_rgba(178,57,210,0.16)]">
                    <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isOpen ? "rotate-180" : "rotate-0"}`} />
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="[&>div]:pb-0">
                <div className={section.contentClassName}>{section.content}</div>
              </AccordionContent>
            </AccordionItem>

            {/* Banner element between Team Probability Explorer and Dream Route */}
            {section.value === "probability" && (
              <Link
                href="/predictions/country"
                className="my-20 block overflow-hidden rounded-2xl border border-black/8 shadow-lg transition-opacity duration-300 hover:opacity-95 dark:border-white/10"
              >
                <img
                  src="/banner2.png"
                  alt="FIFA World Cup 2026 Banner"
                  className="h-auto w-full"
                />
              </Link>
            )}
          </Fragment>
        );
      })}
    </Accordion>
  );
}
