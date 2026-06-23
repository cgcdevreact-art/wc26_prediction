import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { GroupPredictor } from "@/components/site/GroupPredictor";
import { ModelGuideAccordion } from "@/components/site/ModelGuideAccordion";

export const metadata = {
  title: "Tournament Simulator — WC26 Predict",
  description: "Run simulations of the FIFA World Cup 2026.",
};

export default function Page() {
  return (
    <div className="min-h-screen bg-hero">
      <Header />
      <main className="pt-6">
        <section className="container mx-auto px-4 pb-6">
          <ModelGuideAccordion />
        </section>
        <GroupPredictor />
      </main>
      <Footer />
    </div>
  );
}