"use client";

import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ProbabilityExplorer } from "@/components/site/ProbabilityExplorer";
import { WildcardCountrySection } from "@/components/site/WildcardCountrySection";
import { FixturesExplorer } from "@/components/site/FixturesExplorer";

const DEFAULT_OPEN_SECTIONS = ["probability", "fixtures"];

const SECTIONS = [
  {
    value: "probability",
    title: "Pick a country. See every chance.",
    contentClassName: "-mt-10",
    content: <ProbabilityExplorer />,
  },
  {
    value: "wildcard",
    title: "Your team didn't make the World Cup?",
    contentClassName: "-mt-10",
    content: <WildcardCountrySection />,
  },
  {
    value: "fixtures",
    title: "Matches & Fixtures",
    contentClassName: "-mt-10",
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
      className="container mx-auto space-y-4 px-4 py-12"
    >
      {SECTIONS.map((section) => {
        const isOpen = openItems.includes(section.value);

        return (
          <AccordionItem
            key={section.value}
            value={section.value}
            className="overflow-visible border-none bg-transparent shadow-none"
          >
            <div className="mb-3 flex items-center justify-between gap-4">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="text-sm font-semibold text-foreground">{section.title}</span>
                <div className="h-px flex-1 bg-border/70 dark:bg-white/10" />
              </div>
              <AccordionTrigger className="w-auto rounded-full border border-black/8 bg-white/70 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-foreground/80 shadow-sm transition hover:no-underline hover:text-foreground dark:border-white/10 dark:bg-white/5 [&>svg]:hidden">
                <span>{isOpen ? "Collapse" : "Expand"}</span>
              </AccordionTrigger>
            </div>
            <AccordionContent className="[&>div]:pb-0">
              <div className={section.contentClassName}>{section.content}</div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
