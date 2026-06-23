"use client";

import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ProbabilityExplorer } from "@/components/site/ProbabilityExplorer";
import { WildcardCountrySection } from "@/components/site/WildcardCountrySection";
import { FixturesExplorer } from "@/components/site/FixturesExplorer";
import { ChevronDown } from "lucide-react";

const DEFAULT_OPEN_SECTIONS = [ "fixtures"];

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
    sub: "Drop them in anyway. Build your custom country profile, swap them into the tournament brackets, and run their path to glory.",
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
          <AccordionItem
            key={section.value}
            value={section.value}
            className="overflow-visible border-none bg-transparent shadow-none"
          >
            <AccordionTrigger className="w-full flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-slate-200 dark:border-white/10 pb-6 hover:no-underline text-left cursor-pointer group [&>svg]:hidden">
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
              <div className="shrink-0 self-start sm:self-auto pt-2 sm:pt-0">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-white/70 text-foreground/80 shadow-sm transition group-hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:group-hover:bg-white/10">
                  <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isOpen ? "rotate-180" : "rotate-0"}`} />
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="[&>div]:pb-0">
              <div className={section.contentClassName}>{section.content}</div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
