import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { BracketTree } from "@/components/voting/BracketTree";
import { QualificationProgress } from "@/components/voting/QualificationProgress";
import { ModelGuideAccordion } from "@/components/site/ModelGuideAccordion";

export const metadata = {
  title: "Live World Cup Bracket — WC26 Predict",
  description: "View the live, API-driven FIFA World Cup 2026 knockout bracket and qualification charts.",
};

export default function Page() {
  return (
    <div className="min-h-screen bg-hero">
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-12 space-y-12">
        <section>
          <ModelGuideAccordion />
        </section>

        {/* Dynamic bracket tracking section */}
        <section className="space-y-8">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground dark:text-white sm:text-4xl">
              Live Tournament Bracket
            </h1>
            <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
              Knockout progression is updated automatically from the API. Cast community votes on qualification pathways.
            </p>
          </div>

          <QualificationProgress />
          <BracketTree />
        </section>
      </main>
      <Footer />
    </div>
  );
}
