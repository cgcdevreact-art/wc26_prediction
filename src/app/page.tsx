import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Hero } from "@/components/site/Hero";
import { LiveStats } from "@/components/site/LiveStats";
import { HomeSectionsAccordion } from "@/components/site/HomeSectionsAccordion";
import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "WC26 Predict — Who Will Win the FIFA World Cup 2026?",
  description: "Predict every match, simulate the tournament, build your bracket and compete globally for World Cup 2026 glory.",
};

export default function Page() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <LiveStats />
        <HomeSectionsAccordion />
        <div className="container mx-auto px-4 pb-12">
          <Link
            href="/predictions/country"
            className="mt-10 block overflow-hidden rounded-2xl border border-black/8 shadow-lg transition-opacity duration-300 hover:opacity-95 dark:border-white/10"
          >
            <Image
              src="/banner.png"
              alt="FIFA World Cup 2026 Banner"
              width={1600}
              height={500}
              className="h-auto w-full"
            />
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
