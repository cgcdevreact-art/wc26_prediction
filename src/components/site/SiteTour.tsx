"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Script from "next/script";
import { toast } from "sonner";

interface SiteTourContextType {
  startTour: () => void;
  isActive: boolean;
}

const SiteTourContext = createContext<SiteTourContextType | undefined>(undefined);

export const useSiteTour = () => {
  const context = useContext(SiteTourContext);
  if (!context) {
    throw new Error("useSiteTour must be used within a SiteTourProvider");
  }
  return context;
};

// Define steps for each page path
const TOUR_STEPS: Record<string, any[]> = {
  "/": [
    {
      title: "Welcome to WC26 Prediction!",
      content: "Let's take a quick tour to learn how to predict matches, simulate results, and customize stats.",
      selector: "#tour-brand-logo",
    },
    {
      title: "Top Contenders",
      content: "Check out the live champion probabilities for top countries. This chart shows who is currently favored to win.",
      selector: "#tour-hero-probabilities",
    },
    {
      title: "Today's & Upcoming Matches",
      content: "Here you can see scheduled matches, kick-off times, venues, and jump directly to predict their score.",
      selector: "#tour-hero-matches",
    },
    {
      title: "Interactive Features",
      content: "Predict matches, check full schedules, view leaderboards, and look at live rankings.",
      selector: "#tour-home-sections",
    },
    {
      title: "Model & Prediction Nav",
      content: "Use the 'Prediction' menu to navigate to the Tournament Simulator or Bracket builder. Let's head to the Tournament Simulator!",
      selector: "#tour-nav-prediction",
    }
  ],
  "/simulator": [
    {
      title: "Tournament Simulator",
      content: "Here you can simulate the entire World Cup 2026 tournament stage-by-stage.",
      // no selector means centered dialog
    },
    {
      title: "Model Capabilities Guide",
      content: "Understand what parameters (Elo, Att/Def, or Squad Values) are factored into each simulation model tier.",
      selector: "#tour-model-guide",
    },
    {
      title: "AI Simulation Controls",
      content: "Run full automated simulations of the Group Stage matches using advanced Poisson distributions.",
      selector: "#tour-simulator-controls",
    },
    {
      title: "Seeding & Bracket",
      content: "Next, let's explore the Bracket Builder to visualize qualified teams and advance them to the finals!",
      selector: "#tour-nav-prediction",
    }
  ],
  "/bracket": [
    {
      title: "Bracket Builder",
      content: "The bracket view maps out the Round of 32 down to the Final match in a traditional tree diagram.",
    },
    {
      title: "Knockout Seeding",
      content: "Specify scores for knockout games to seed winning teams directly to the next round. Now let's explore Country predictions!",
      selector: "#tour-bracket-container",
    }
  ],
  "/predictions/country": [
    {
      title: "Country Predictions",
      content: "Analyze the path of any team to the World Cup final.",
    },
    {
      title: "Search Nations",
      content: "Select or search for a specific nation to analyze its statistics and match pairings.",
      selector: "#tour-country-search",
    },
    {
      title: "Customize Attributes",
      content: "Adjust the Elo, Attack power, and Defense power of a team to see how virtual adjustments affect their winning path.",
      selector: "#tour-country-stats",
    },
    {
      title: "Run Poisson Simulations",
      content: "Run 10,000 Poisson-model simulations to calculate live probabilities for each stage. Let's finish by looking at team rosters!",
      selector: "#tour-country-run-simulation",
    }
  ],
  "/teams": [
    {
      title: "Teams Directory",
      content: "A centralized directory for all 48 qualified countries, their stats, and details.",
    },
    {
      title: "Filter and Search",
      content: "Filter teams by confederation or group, and search for specific nations.",
      selector: "#tour-teams-search",
    },
    {
      title: "Compare Team Stats",
      content: "See Squad Value, Average Age, and goals per match inside this detailed interactive table.",
      selector: "#tour-teams-table",
    },
    {
      title: "Tour Complete!",
      content: "You are all set! Predict matches, simulate paths, and explore statistics. Have fun!",
    }
  ]
};

export const SiteTourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const tourInstanceRef = useRef<any>(null);

  // Initialize tour for the current page if active
  const startTourForPage = (path: string) => {
    if (!scriptLoaded || typeof window === "undefined" || !(window as any).Tourguide) {
      console.warn("Tourguide script not loaded yet");
      return;
    }

    const steps = TOUR_STEPS[path];
    if (!steps) return;

    // Clean up existing instance if any
    if (tourInstanceRef.current) {
      try {
        tourInstanceRef.current.stop();
      } catch (e) {}
    }

    const TourguideConstructor = (window as any).Tourguide;
    const tour = new TourguideConstructor({
      steps: steps,
      autoScroll: true,
      exitOnClickOutside: false,
      exitOnEscape: true,
      onComplete: () => {
        const nextPageMap: Record<string, string> = {
          "/": "/simulator",
          "/simulator": "/bracket",
          "/bracket": "/predictions/country",
          "/predictions/country": "/teams",
        };
        const nextPage = nextPageMap[path];
        if (nextPage) {
          localStorage.setItem("active-site-tour", nextPage);
          setIsActive(true);
          router.push(nextPage);
        } else {
          localStorage.removeItem("active-site-tour");
          setIsActive(false);
          toast.success("Site tour completed! Predict like an expert!");
        }
      },
      onStop: () => {
        // Check if complete transition was already triggered (which sets active-site-tour for next page)
        const nextActiveTour = localStorage.getItem("active-site-tour");
        if (!nextActiveTour || nextActiveTour === path) {
          localStorage.removeItem("active-site-tour");
          setIsActive(false);
          toast.info("Site tour closed.");
        }
      }
    });

    tourInstanceRef.current = tour;
    setIsActive(true);
    tour.start();
  };

  const startTour = () => {
    localStorage.setItem("active-site-tour", "/");
    if (pathname === "/") {
      startTourForPage("/");
    } else {
      router.push("/");
    }
  };

  // Resume or start tour when page path changes
  useEffect(() => {
    if (!scriptLoaded) return;

    const activeTourPage = localStorage.getItem("active-site-tour");
    if (activeTourPage === pathname) {
      // Add a slight timeout to ensure the DOM elements have mounted and rendered
      const timer = setTimeout(() => {
        startTourForPage(pathname);
      }, 350);
      return () => clearTimeout(timer);
    } else if (activeTourPage && activeTourPage !== pathname) {
      // The path doesn't match yet, wait for navigation
    } else {
      setIsActive(false);
    }
  }, [pathname, scriptLoaded]);

  // Check window availability and whether tour is active on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      if ((window as any).Tourguide) {
        setScriptLoaded(true);
      }
      const activeTourPage = localStorage.getItem("active-site-tour");
      if (activeTourPage) {
        setIsActive(true);
      }
    }
  }, []);

  return (
    <SiteTourContext.Provider value={{ startTour, isActive }}>
      <Script
        src="https://cdn.jsdelivr.net/gh/LikaloLLC/tourguide.js@0.2.0/tourguide.min.js"
        strategy="afterInteractive"
        onLoad={() => {
          setScriptLoaded(true);
        }}
      />
      {children}
    </SiteTourContext.Provider>
  );
};
