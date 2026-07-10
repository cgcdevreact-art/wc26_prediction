import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import PollDetailClient from "./PollDetailClient";

export const metadata = {
  title: "Fans Prediction — WC26 Predict",
  description: "Vote and see community results for this poll.",
};

export default async function PollDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <Header />
      <main className="flex-grow pt-24 pb-12">
        <PollDetailClient pollId={id} />
      </main>
      <Footer />
    </div>
  );
}
