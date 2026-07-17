"use client";

import { useEffect, useState, useRef } from "react";
import { 
  Video, 
  ExternalLink, 
  Loader2, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  Grid,
  Tv,
  Bookmark as BookmarkIcon,
  User
} from "lucide-react";
import Image from "next/image";

interface InstagramPost {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url: string;
  permalink: string;
  thumbnail_url?: string;
  timestamp: string;
}

const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const MOCK_POSTS: InstagramPost[] = [
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

export function InstagramFeed() {
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [username, setUsername] = useState("26WCPrediction");
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<InstagramPost | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const otherPosts = selectedPost ? posts.filter((p) => p.id !== selectedPost.id) : [];

  // Consistent mock likes and comments numbers based on post ID
  const getMockLikes = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs((hash % 800) + 120);
  };

  const getMockComments = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 3) - hash);
    }
    return Math.abs((hash % 120) + 15);
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 500);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const res = await fetch("/api/instagram/posts");
        if (!res.ok) throw new Error("Failed to fetch posts");
        const data = await res.json();
        const apiPosts = data.posts || [];
        
        let finalPosts = apiPosts;
        if (finalPosts.length === 0) {
          finalPosts = [
            ...MOCK_POSTS,
            ...MOCK_POSTS.map((p, index) => ({
              ...p,
              id: `${p.id}_dup_${index}`,
              timestamp: new Date(new Date(p.timestamp).getTime() - 3600000 * 24 * 7).toISOString()
            }))
          ];
        }
        setPosts(finalPosts);
        if (data.username) {
          setUsername(data.username);
        }
      } catch (err) {
        console.error("Instagram feed error, using fallbacks:", err);
        const fallback16 = [
          ...MOCK_POSTS,
          ...MOCK_POSTS.map((p, index) => ({
            ...p,
            id: `${p.id}_dup_${index}`,
            timestamp: new Date(new Date(p.timestamp).getTime() - 3600000 * 24 * 7).toISOString()
          }))
        ];
        setPosts(fallback16);
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
  }, []);

  // Autoplay / pause video elements inside the mobile feed on intersection
  useEffect(() => {
    if (!isMobile || posts.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.6 }
    );

    // Timeout to let elements render
    const timer = setTimeout(() => {
      const videos = document.querySelectorAll(".instagram-mobile-video");
      videos.forEach((v) => observer.observe(v));
    }, 500);

    return () => {
      clearTimeout(timer);
      const videos = document.querySelectorAll(".instagram-mobile-video");
      videos.forEach((v) => observer.unobserve(v));
    };
  }, [isMobile, posts]);

  const handlePrev = () => {
    if (!selectedPost || posts.length === 0) return;
    const currentIndex = posts.findIndex((p) => p.id === selectedPost.id);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : posts.length - 1;
    setSelectedPost(posts[prevIndex]);
  };

  const handleNext = () => {
    if (!selectedPost || posts.length === 0) return;
    const currentIndex = posts.findIndex((p) => p.id === selectedPost.id);
    const nextIndex = currentIndex < posts.length - 1 ? currentIndex + 1 : 0;
    setSelectedPost(posts[nextIndex]);
  };

  // Keyboard controls for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedPost(null);
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPost, posts]);

  if (loading) {
    return (
      <section className="py-16 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200/50 dark:border-white/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            <p className="text-sm font-semibold text-slate-400">Loading social feed...</p>
          </div>
        </div>
      </section>
    );
  }

  // Display exactly 16 latest posts (4x4)
  const visiblePosts = posts.slice(0, 16);

  return (
    <section className="py-16 bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-200/50 dark:border-white/5 animate-fade-in">
      {/* Global CSS for snap scrolling and custom scrollbars */}
      <style jsx global>{`
        .instagram-mobile-feed {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
        .instagram-mobile-feed::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
        }
        @media (max-width: 500px) {
          .desktop-instagram-header,
          .desktop-instagram-grid {
            display: none !important;
          }
          .mobile-instagram-view {
            display: block !important;
          }
        }
        @media (min-width: 501px) {
          .desktop-instagram-header {
            display: flex !important;
          }
          .desktop-instagram-grid {
            display: block !important;
          }
          .mobile-instagram-view {
            display: none !important;
          }
        }
      `}</style>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Desktop Header */}
        <div className="desktop-instagram-header flex flex-row items-end justify-between gap-4 mb-10 max-w-7xl mx-auto w-full">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 dark:bg-violet-950/30 px-3 py-1 text-xs font-semibold text-violet-700 dark:text-violet-300 border border-violet-100 dark:border-violet-900/50 mb-3 uppercase tracking-wider">
              <InstagramIcon className="h-3.5 w-3.5" />
              Social Hub
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white sm:text-3xl tracking-tight">
              Follow Us on Instagram
            </h2>
          </div>
          
          <a
            href={`https://instagram.com/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 px-5 py-3 text-sm font-bold shadow-md hover:-translate-y-0.5 hover:shadow-lg dark:hover:bg-slate-100 hover:bg-slate-800 transition-all duration-200"
          >
            <InstagramIcon className="h-4 w-4" />
            <span>@{username}</span>
          </a>
        </div>

        {/* Desktop grid (displayed > 500px) */}
        <div className="desktop-instagram-grid mt-6">
          <div className="grid gap-[2px] grid-cols-2 md:grid-cols-4 w-full mx-auto bg-slate-200 dark:bg-neutral-900/60 p-[2px] rounded-2xl overflow-hidden shadow-xs">
            {visiblePosts.map((post) => (
              <button
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="group relative aspect-[4/5] overflow-hidden bg-slate-150 dark:bg-slate-950 transition-all duration-300 hover:opacity-95 cursor-pointer text-left w-full focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {/* Media Image */}
                <img
                  src={post.media_type === "VIDEO" && post.thumbnail_url ? post.thumbnail_url : post.media_url}
                  alt="Instagram post thumbnail"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />

                {/* Video Icon Indicator */}
                {post.media_type === "VIDEO" && (
                  <div className="absolute right-3 top-3 rounded-lg bg-black/60 p-1.5 text-white backdrop-blur-sm shadow-xs ring-1 ring-white/10 z-10">
                    <Video className="h-3.5 w-3.5" />
                  </div>
                )}

                {/* Instagram style overlay on hover (shows likes and comments) */}
                <div className="absolute inset-0 flex items-center justify-center gap-6 bg-black/50 text-white font-bold opacity-0 transition-opacity duration-200 group-hover:opacity-100 z-20">
                  <span className="flex items-center gap-2 text-base">
                    <Heart className="h-5 w-5 fill-white text-white" />
                    {getMockLikes(post.id)}
                  </span>
                  <span className="flex items-center gap-2 text-base">
                    <MessageCircle className="h-5 w-5 fill-white text-white" />
                    {getMockComments(post.id)}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Show More Redirect Button */}
          <div className="flex justify-center mt-12">
            <a
              href={`https://instagram.com/${username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/20 text-slate-800 dark:text-white text-sm font-semibold rounded-lg transition duration-200 hover:-translate-y-0.5 shadow-sm hover:shadow-md cursor-pointer"
            >
              <InstagramIcon className="h-4.5 w-4.5" />
              <span>Show More on Instagram</span>
            </a>
          </div>
        </div>

        {/* Mobile View: Swipe Up Snapping Feed (displayed <= 500px) */}
        <div className="mobile-instagram-view hidden">
          <div className="mx-auto text-center mb-6">
            <div className="inline-flex items-center gap-1 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2">
              <InstagramIcon className="h-3 w-3" />
              <span>Instagram Feed</span>
            </div>
            <h3 className="text-lg font-black text-slate-800 dark:text-white">Swipe up to browse posts</h3>
          </div>

          <div className="mx-auto w-full max-w-[420px] h-[600px] bg-white dark:bg-black border border-slate-200 dark:border-neutral-900 rounded-[2.25rem] overflow-hidden shadow-2xl relative select-none">
            {/* The scrollable snap container */}
            <div className="instagram-mobile-feed h-[600px] overflow-y-scroll snap-y snap-mandatory scroll-smooth">
              {visiblePosts.map((post) => {
                const likes = getMockLikes(post.id);
                
                return (
                  <div 
                    key={post.id} 
                    className="snap-start snap-always h-[600px] flex flex-col justify-between bg-white dark:bg-black border-b border-slate-200 dark:border-neutral-900/60 flex-shrink-0"
                  >
                    {/* Post Header */}
                    <div className="h-[52px] px-4 flex items-center justify-between border-b border-slate-100 dark:border-neutral-900/40">
                      <div className="flex items-center gap-2.5">
                        <div className="relative h-8 w-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[1.5px]">
                          <div className="h-full w-full rounded-full border border-white dark:border-black overflow-hidden relative bg-slate-200">
                            <Image
                              src="/26wc-logo.png"
                              alt="Avatar"
                              fill
                              className="object-cover"
                            />
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1">
                            {username}
                            <span className="w-2.5 h-2.5 bg-sky-500 rounded-full flex items-center justify-center text-white text-[5px] font-bold">✓</span>
                          </h4>
                          <p className="text-[9px] font-semibold text-slate-400">Stadium Simulator Hub</p>
                        </div>
                      </div>
                      <button className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Post Media Container (Autoplay videos or cover images) */}
                    <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden">
                      {post.media_type === "VIDEO" ? (
                        <video
                          src={post.media_url}
                          poster={post.thumbnail_url}
                          muted
                          loop
                          playsInline
                          className="instagram-mobile-video h-full w-full object-cover"
                        />
                      ) : (
                        <img
                          src={post.media_url}
                          alt="Feed media"
                          className="h-full w-full object-cover"
                        />
                      )}
                      
                      {/* Media Indicator Overlay */}
                      {post.media_type === "VIDEO" && (
                        <div className="absolute right-3 top-3 rounded-lg bg-black/60 p-1 text-white backdrop-blur-sm shadow-xs border border-white/5 pointer-events-none">
                          <Video className="h-3 w-3" />
                        </div>
                      )}
                    </div>

                    {/* Post Action Buttons tray */}
                    <div className="h-[44px] px-4 flex items-center justify-between border-t border-slate-100 dark:border-neutral-900/40 mt-auto">
                      <div className="flex items-center gap-4 text-slate-700 dark:text-slate-300">
                        <Heart className="h-5 w-5 hover:scale-110 transition hover:text-rose-500 cursor-pointer" />
                        <MessageCircle className="h-5 w-5 hover:scale-110 transition hover:text-sky-500 cursor-pointer" />
                        <Send className="h-5 w-5 hover:scale-110 transition hover:text-emerald-500 cursor-pointer" />
                      </div>
                      <Bookmark className="h-5 w-5 hover:scale-110 transition hover:text-amber-500 cursor-pointer text-slate-700 dark:text-slate-300" />
                    </div>

                    {/* Post Captions & Stats Area */}
                    <div className="px-4 pb-4.5 pt-1 space-y-1.5">
                      <p className="text-[11px] font-black text-slate-900 dark:text-white">
                        Liked by <strong>champions_league</strong> and <strong>{likes} others</strong>
                      </p>
                      
                      <div className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 line-clamp-2">
                        <strong className="text-slate-950 dark:text-white mr-1.5">{username}</strong>
                        {post.caption}
                      </div>

                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                        {new Date(post.timestamp).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric"
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Snap slide 9: Redirect CTA Card */}
              <div className="snap-start snap-always h-[600px] flex flex-col items-center justify-center bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-500 text-white p-8 text-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg animate-bounce">
                  <InstagramIcon className="h-8 w-8 text-white" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-display font-black text-xl">Follow our Instagram!</h3>
                  <p className="text-xs text-white/80 max-w-[240px] mx-auto leading-relaxed">
                    Get regular updates on ELO shifts, tournament simulations, match predictions, and join the global leaderboards!
                  </p>
                </div>
                <a
                  href={`https://instagram.com/${username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-white text-slate-950 px-6 py-3 text-xs font-black shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <span>@{username}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Desktop Modal Post Overlay */}
      {selectedPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 md:p-16 backdrop-blur-xs transition-all duration-300 select-none"
          onClick={() => setSelectedPost(null)}
        >
          {/* Navigation - Left Arrow */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-50 rounded-full bg-slate-900/60 hover:bg-slate-900/90 p-3 text-white/80 hover:text-white transition-all border border-white/10 hover:scale-105 active:scale-95 focus:outline-none shadow-xl cursor-pointer"
            aria-label="Previous post"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          {/* Close Button */}
          <button
            onClick={() => setSelectedPost(null)}
            className="fixed right-4 top-4 md:right-8 md:top-8 z-50 rounded-full bg-slate-950/80 p-3 text-white hover:text-white backdrop-blur-xs transition-transform border border-white/15 hover:scale-105 active:scale-95 cursor-pointer shadow-2xl focus:outline-none"
            aria-label="Close modal"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Modal Container */}
          <div
            className="relative flex flex-col w-full max-w-5xl max-h-[90vh] md:max-h-[85vh] overflow-y-auto no-scrollbar rounded-[2rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl scale-100 transition-transform duration-300 animate-in zoom-in-95 duration-200 select-text"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Main Post Section */}
            <div className="flex flex-col md:flex-row w-full border-b border-slate-100 dark:border-slate-800/80">
              {/* Media Frame */}
              <div className="flex-1 bg-black flex items-center justify-center min-h-[300px] md:min-h-[600px] relative select-none">
                {selectedPost.media_type === "VIDEO" ? (
                  <video
                    src={selectedPost.media_url}
                    poster={selectedPost.thumbnail_url}
                    controls
                    autoPlay
                    loop
                    playsInline
                    className="max-h-[55vh] md:max-h-[70vh] w-full object-contain"
                  />
                ) : (
                  <img
                    src={selectedPost.media_url}
                    alt="Instagram post details"
                    className="max-h-[55vh] md:max-h-[70vh] w-full object-contain"
                  />
                )}
              </div>

              {/* Info Section */}
              <div className="w-full md:w-[380px] bg-white dark:bg-slate-950 p-6 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800">
                <div className="flex-1 space-y-4 pr-1">
                  {/* Header info */}
                  <div className="flex items-center gap-3 pb-3.5 border-b border-slate-100 dark:border-slate-800/80">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-500 text-white shadow-sm">
                      <InstagramIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1">
                        @{username}
                        <span className="w-3 h-3 bg-sky-500 rounded-full flex items-center justify-center text-white text-[6px] font-bold">✓</span>
                      </h4>
                      <p className="text-[10px] font-bold text-slate-400">
                        {new Date(selectedPost.timestamp).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Caption / Description text */}
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-350 whitespace-pre-line font-medium pr-1">
                    {selectedPost.caption || "View details on Instagram"}
                  </p>
                </div>

                {/* Redirect Action CTA */}
                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80">
                  <a
                    href={selectedPost.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 px-4 py-3.5 text-sm font-bold shadow-md hover:-translate-y-0.5 hover:shadow-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-all duration-200"
                  >
                    <InstagramIcon className="h-4 w-4" />
                    <span>View on Instagram</span>
                    <ExternalLink className="h-3.5 w-3.5 ml-0.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* More Posts Section */}
            {otherPosts.length > 0 && (
              <div className="bg-slate-50/50 dark:bg-slate-950/20 p-6 md:p-8">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6">
                  More posts from {username}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {otherPosts.slice(0, 4).map((post) => (
                    <button
                      key={post.id}
                      onClick={() => setSelectedPost(post)}
                      className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200/60 dark:border-white/5 bg-slate-150 dark:bg-slate-900 shadow-xs cursor-pointer text-left w-full hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                    >
                      <img
                        src={post.media_type === "VIDEO" && post.thumbnail_url ? post.thumbnail_url : post.media_url}
                        alt="More instagram updates"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      {post.media_type === "VIDEO" && (
                        <div className="absolute right-2.5 top-2.5 rounded-md bg-black/60 p-1 text-white backdrop-blur-sm shadow-xs ring-1 ring-white/10 z-10">
                          <Video className="h-3 w-3" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Navigation - Right Arrow */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-50 rounded-full bg-slate-900/60 hover:bg-slate-900/90 p-3 text-white/80 hover:text-white transition-all border border-white/10 hover:scale-105 active:scale-95 focus:outline-none shadow-xl cursor-pointer"
            aria-label="Next post"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      )}
    </section>
  );
}
