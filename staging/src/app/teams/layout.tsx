import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export default function TeamsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-hero text-foreground flex flex-col">
      <Header />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
}
