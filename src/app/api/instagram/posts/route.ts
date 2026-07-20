import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Simple in-memory cache for API response
interface CacheStore {
  posts: any[];
  username: string;
  timestamp: number;
}

let cacheStore: CacheStore | null = null;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour cache duration
const CONFIG_PATH = path.join(process.cwd(), "src/data/instagram-config.json");

// Premium, styled fallback data representing active fan engagement posts
const MOCK_POSTS = [
  {
    id: "mock_1",
    caption: "🏆 The road to World Cup 2026 glory starts here! Who is your favorite to lift the trophy? Simulate the entire tournament and lock in your champion prediction today. Link in bio! ⚽🔥 #WorldCup2026 #Predictions #FIFA #Bracket",
    media_type: "IMAGE",
    media_url: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&auto=format&fit=crop&q=80",
    permalink: "https://instagram.com",
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString()
  },
  {
    id: "mock_2",
    caption: "📊 Group of Death analyzed! Group E is stacked with powerhouse teams. Our AI model predicts Spain and Germany have a 78% probability of advancing, but can Japan pull off another miracle? Let us know your picks! 🇯🇵🇪🇸🇩🇪 #WorldCup #Football #GroupStage #AI",
    media_type: "IMAGE",
    media_url: "https://images.unsplash.com/photo-1518063319789-7217e6706b04?w=600&auto=format&fit=crop&q=80",
    permalink: "https://instagram.com",
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  {
    id: "mock_3",
    caption: "⚡ Simulation Engine v2.0 is LIVE! We ran 10,000 simulations of the bracket. France makes the finals in 24.5% of runs, while Argentina holds a 19.8% chance of retaining the crown. Run your own simulations now! 🇦🇷🇫🇷 #GloryPathfinder #Simulate #WorldCup",
    media_type: "VIDEO",
    media_url: "https://images.unsplash.com/photo-1579952365116-613d7edd8865?w=600&auto=format&fit=crop&q=80",
    permalink: "https://instagram.com",
    timestamp: new Date(Date.now() - 3600000 * 48).toISOString()
  },
  {
    id: "mock_4",
    caption: "👥 The community leaderboards are heating up! Thousands of brackets submitted. View global rankings and see how your score predictions stack up against the experts. Upgraded tiers unlock Advanced AI predictions! 🧠🏆 #Leaderboard #FIFA26 #Brackets",
    media_type: "IMAGE",
    media_url: "https://images.unsplash.com/photo-1431324155629-1a6edd1d152b?w=600&auto=format&fit=crop&q=80",
    permalink: "https://instagram.com",
    timestamp: new Date(Date.now() - 3600000 * 72).toISOString()
  },
  {
    id: "mock_5",
    caption: "📈 Elo rating shifts! Post-qualifiers, Argentina leads the rankings with 1860 pts, closely followed by France and Brazil. Can the underdog nations climb the ranks in the group stage? Simulate and see! 🇧🇷🇦🇷🇫🇷 #Elo #Rankings #WorldCup2026 #Analytics",
    media_type: "IMAGE",
    media_url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80",
    permalink: "https://instagram.com",
    timestamp: new Date(Date.now() - 3600000 * 96).toISOString()
  },
  {
    id: "mock_6",
    caption: "🏟️ 16 host cities, 104 matches, 1 champion. From the opening match in Mexico City to the grand final in New York/New Jersey, the stage is set for the biggest tournament ever! Which stadium are you most excited for? 🇺🇸🇲🇽🇨🇦 #HostCities #Stadiums #FIFA2026",
    media_type: "IMAGE",
    media_url: "https://images.unsplash.com/photo-1459865264687-595d652de67e?w=600&auto=format&fit=crop&q=80",
    permalink: "https://instagram.com",
    timestamp: new Date(Date.now() - 3600000 * 120).toISOString()
  },
  {
    id: "mock_7",
    caption: "💰 Squad values vs Win Probability! Is there a direct link between market value and tournament success? Our data engine cross-references transfer values with match outcomes. Check the Teams Directory for full squad evaluations. #SquadValue #MarketValue #FootballAnalytics",
    media_type: "IMAGE",
    media_url: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=600&auto=format&fit=crop&q=80",
    permalink: "https://instagram.com",
    timestamp: new Date(Date.now() - 3600000 * 144).toISOString()
  },
  {
    id: "mock_8",
    caption: "🔮 Predict the perfect bracket and win! Play against friends in private leagues or compete in the global champion ladder. Who will be this year's oracle? Start predicting today! #PerfectBracket #BracketChallenge #PredictionLeague",
    media_type: "IMAGE",
    media_url: "https://images.unsplash.com/photo-1540747737956-37872404a87a?w=600&auto=format&fit=crop&q=80",
    permalink: "https://instagram.com",
    timestamp: new Date(Date.now() - 3600000 * 168).toISOString()
  }
];

export async function GET(req: Request) {
  // Generate 16 mock posts for fallbacks
  const mock16 = [
    ...MOCK_POSTS,
    ...MOCK_POSTS.map((p, index) => ({
      ...p,
      id: `${p.id}_dup_${index}`,
      timestamp: new Date(new Date(p.timestamp).getTime() - 3600000 * 24 * 7).toISOString()
    }))
  ];

  // Read force refresh parameter
  let force = false;
  try {
    const { searchParams } = new URL(req.url);
    force = searchParams.get("force") === "true";
  } catch (e) {
    console.error("Failed to parse request URL for force param:", e);
  }

  // Read token from config file first, then fall back to environment variable
  let accessToken = process.env.INSTAGRAM_ACCESS_TOKEN || "";
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
      if (config.accessToken) {
        accessToken = config.accessToken;
      }
    } catch (e) {
      console.error("Failed to read instagram token config:", e);
    }
  }

  if (!accessToken) {
    // If no access token is configured, return the mock data directly
    return NextResponse.json({ posts: mock16, username: "26WCPrediction", fromCache: false, source: "mock" });
  }

  // Check if cache is still valid (only if not forcing refresh)
  const now = Date.now();
  if (!force && cacheStore && now - cacheStore.timestamp < CACHE_DURATION_MS) {
    return NextResponse.json({ posts: cacheStore.posts, username: cacheStore.username, fromCache: true, source: "api" });
  }

  try {
    const url = `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp&access_token=${accessToken}&limit=16`;
    const res = await fetch(url, force ? { cache: "no-store" } : { next: { revalidate: 3600 } });

    if (!res.ok) {
      console.warn(`Instagram API returned status: ${res.status}`);
      // Fallback to cache if available, else fallback to mock data
      if (cacheStore) {
        return NextResponse.json({ posts: cacheStore.posts, username: cacheStore.username, fromCache: true, source: "fallback-cache" });
      }
      return NextResponse.json({ posts: mock16, username: "26WCPrediction", fromCache: false, source: "fallback-mock" });
    }

    const data = await res.json();
    const posts = data.data || [];

    // Fetch the username dynamically from Instagram Graph API
    let username = "26WCPrediction";
    try {
      const meRes = await fetch(`https://graph.instagram.com/me?fields=username&access_token=${accessToken}`);
      if (meRes.ok) {
        const meData = await meRes.json();
        username = meData.username || "26WCPrediction";
      }
    } catch (e) {
      console.error("Failed to fetch instagram username:", e);
    }

    // Save in cache
    cacheStore = {
      posts,
      username,
      timestamp: now
    };

    return NextResponse.json({ posts, username, fromCache: false, source: "api" });
  } catch (error) {
    console.error("Failed to fetch Instagram posts:", error);
    // Return cache if available, else fallback to mock
    if (cacheStore) {
      return NextResponse.json({ posts: cacheStore.posts, username: cacheStore.username, fromCache: true, source: "fallback-cache" });
    }
    return NextResponse.json({ posts: mock16, username: "26WCPrediction", fromCache: false, source: "fallback-mock" });
  }
}
