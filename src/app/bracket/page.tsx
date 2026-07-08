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
        <GroupPredictor defaultTab="knockout" onlyKnockout={true} />
      </main>
      <Footer />
    </div>
  );
}