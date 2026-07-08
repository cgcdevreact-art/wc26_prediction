import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export default function SharedLinkLoading() {
  return (
    <div className="min-h-screen bg-hero flex flex-col">
      <Header />
      <main className="flex-grow flex flex-col items-center justify-center pt-24 pb-32 px-4">
        <div className="flex flex-col items-center gap-6 animate-in fade-in duration-700">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 animate-pulse" />
            <div className="absolute inset-0 rounded-full border-t-4 border-cyan-500 animate-spin" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold font-display text-slate-900 dark:text-white tracking-tight">
              Loading Shared Simulation
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto">
              We're retrieving the tournament data from our servers. This will just take a second...
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
