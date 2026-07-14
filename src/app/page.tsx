import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Hero } from "@/components/site/Hero";
import { LiveStats } from "@/components/site/LiveStats";
import { HomeSectionsAccordion } from "@/components/site/HomeSectionsAccordion";
import { InstagramFeed } from "@/components/site/InstagramFeed";
import { ScrollToTop } from "@/components/site/ScrollToTop";
import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "26WC Prediction — Who Will Win the FIFA World Cup 2026?",
  description: "Predict every match, simulate the tournament, build your bracket and compete globally for World Cup 2026 glory.",
};

export default function Page() {
  return (
    <div className="min-h-screen relative">
      <Header />
      <main>
        <Hero />
        <LiveStats />
        
        <HomeSectionsAccordion />
        {/* <InstagramFeed /> */}
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
