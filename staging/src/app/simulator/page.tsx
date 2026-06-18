import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { GroupPredictor } from "@/components/site/GroupPredictor";

export const metadata = {
  title: "Tournament Simulator — WC26 Predict",
  description: "Run simulations of the FIFA World Cup 2026.",
};

export default function Page() {
  return (
    <div className="min-h-screen bg-hero">
      <Header />
      <main className="pt-6">
        <GroupPredictor />
      </main>
      <Footer />
    </div>
  );
}