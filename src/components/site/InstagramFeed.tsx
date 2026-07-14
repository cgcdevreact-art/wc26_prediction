"use client";

import { useEffect, useState } from "react";
import { Video, ExternalLink, Loader2, X, ChevronLeft, ChevronRight } from "lucide-react";

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

export function InstagramFeed() {
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedPost, setSelectedPost] = useState<InstagramPost | null>(null);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const res = await fetch("/api/instagram/posts");
        if (!res.ok) throw new Error("Failed to fetch posts");
        const data = await res.json();
        setPosts(data.posts || []);
      } catch (err) {
        console.error("Instagram feed error:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
  }, []);

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

  // Listen for keyboard controls (Escape to close, Left/Right arrows for nav)
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
            <p className="text-sm font-semibold text-slate-400">Loading social updates...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error || posts.length === 0) {
    return null; // Hide feed gracefully if there is an error and no posts
  }

  return (
    <section className="py-16 bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-200/50 dark:border-white/5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 mb-10 md:flex-row md:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 dark:bg-violet-950/30 px-3 py-1 text-xs font-semibold text-violet-700 dark:text-violet-300 border border-violet-100 dark:border-violet-900/50 mb-3 uppercase tracking-wider">
              <InstagramIcon className="h-3.5 w-3.5" />
              Social Hub
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white sm:text-3xl tracking-tight">
              Follow Us on Instagram
            </h2>
            {/* <p className="mt-2 text-sm font-medium text-slate-500 max-w-xl">
              Stay updated with real-time match analytics, tournament predictions, AI models insight, and community bracket standings.
            </p> */}
          </div>
          
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 px-5 py-3 text-sm font-bold shadow-md hover:-translate-y-0.5 hover:shadow-lg dark:hover:bg-slate-100 hover:bg-slate-800 transition-all duration-200"
          >
            <InstagramIcon className="h-4 w-4" />
            <span>@26WCPrediction</span>
          </a>
        </div>

        {/* Gallery Grid */}
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {posts.map((post) => (
            <button
              key={post.id}
              onClick={() => setSelectedPost(post)}
              className="group relative aspect-square overflow-hidden rounded-2xl border border-slate-200/60 dark:border-white/5 bg-slate-100 dark:bg-slate-900 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer text-left w-full focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {/* Media Element */}
              <img
                src={post.media_type === "VIDEO" && post.thumbnail_url ? post.thumbnail_url : post.media_url}
                alt="Instagram post"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />

              {/* Video Indicator */}
              {post.media_type === "VIDEO" && (
                <div className="absolute right-3 top-3 rounded-lg bg-black/60 p-1.5 text-white backdrop-blur-sm shadow-sm ring-1 ring-white/10 z-10">
                  <Video className="h-3.5 w-3.5" />
                </div>
              )}

              {/* Hover Overlay */}
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <div className="translate-y-2 transition-transform duration-300 group-hover:translate-y-0">
                  <p className="text-[12px] font-medium leading-relaxed text-white line-clamp-3 mb-3">
                    {post.caption || "View post on Instagram"}
                  </p>
                  
                  <div className="flex items-center justify-between text-[11px] font-bold text-violet-300 uppercase tracking-widest border-t border-white/10 pt-3">
                    <span className="flex items-center gap-1">
                      <InstagramIcon className="h-3.5 w-3.5" />
                      View Details
                    </span>
                    <ExternalLink className="h-3 w-3" />
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Post Modal Overlay */}
      {selectedPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 md:p-16 backdrop-blur-sm transition-all duration-300 select-none"
          onClick={() => setSelectedPost(null)}
        >
          {/* Navigation - Left Arrow */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-2 md:left-4 lg:left-8 top-1/2 -translate-y-1/2 z-50 rounded-full bg-slate-900/60 hover:bg-slate-900/90 p-3 text-white/80 hover:text-white transition-all duration-200 border border-white/10 hover:scale-105 active:scale-95 focus:outline-none shadow-xl cursor-pointer"
            aria-label="Previous post"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          {/* Modal Container */}
          <div
            className="relative flex flex-col md:flex-row w-full max-w-5xl max-h-[90vh] md:max-h-[85vh] overflow-hidden rounded-[2rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl scale-100 transition-transform duration-300 animate-in zoom-in-95 duration-200 select-text"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedPost(null)}
              className="absolute right-4 top-4 z-20 rounded-full bg-slate-900/60 p-2 text-white/80 hover:text-white backdrop-blur-sm transition-colors border border-white/10 focus:outline-none"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Media Frame */}
            <div className="flex-1 bg-black flex items-center justify-center min-h-[250px] md:min-h-0 relative select-none">
              {selectedPost.media_type === "VIDEO" ? (
                <video
                  src={selectedPost.media_url}
                  poster={selectedPost.thumbnail_url}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="max-h-[40vh] md:max-h-[85vh] w-full object-contain"
                />
              ) : (
                <img
                  src={selectedPost.media_url}
                  alt="Instagram post details"
                  className="max-h-[40vh] md:max-h-[85vh] w-full object-contain"
                />
              )}
            </div>

            {/* Info Section */}
            <div className="w-full md:w-[380px] bg-white dark:bg-slate-950 p-6 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800">
              <div className="flex-1 overflow-y-auto max-h-[25vh] md:max-h-none space-y-4 pr-1">
                {/* Header info */}
                <div className="flex items-center gap-3 pb-3.5 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-500 text-white shadow-sm">
                    <InstagramIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">@26WCPrediction</h4>
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

          {/* Navigation - Right Arrow */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-2 md:right-4 lg:right-8 top-1/2 -translate-y-1/2 z-50 rounded-full bg-slate-900/60 hover:bg-slate-900/90 p-3 text-white/80 hover:text-white transition-all duration-200 border border-white/10 hover:scale-105 active:scale-95 focus:outline-none shadow-xl cursor-pointer"
            aria-label="Next post"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      )}
    </section>
  );
}
