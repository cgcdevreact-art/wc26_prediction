import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { GroupPredictor } from "@/components/site/GroupPredictor";
import { ModelGuideAccordion } from "@/components/site/ModelGuideAccordion";

export const metadata = {
  title: "Bracket Builder — WC26 Predict",
  description: "Build your own World Cup 2026 bracket.",
};

export default function Page() {
  return (
    <div className="min-h-screen bg-hero">
      <Header />
      <main>
        <section className="container mx-auto px-4  pt-8">
          <ModelGuideAccordion />
        </section>
        <GroupPredictor defaultTab="knockout" onlyKnockout={true} />
      </main>
      <Footer />
    </div>
  );
}
