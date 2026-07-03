import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { GroupPredictor } from "@/components/site/GroupPredictor";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ImportButton } from "./ImportButton";

export async function generateMetadata({ params }: { params: any }) {
  const resolvedParams = await params;
  const { shareId } = resolvedParams;

  if (!shareId) return {};

  const share = await prisma.shareLink.findUnique({ where: { id: shareId } });
  if (!share) return {};

  return {
    title: `${share.title} — WC26 Predict`,
    description: `Check out this FIFA World Cup 2026 predictions bracket simulation. Champion: ${share.championCode || 'TBD'}`,
    openGraph: {
      title: share.title,
      description: `Predicted World Cup Champion: ${share.championCode || 'TBD'}`,
      images: [`/api/share/${share.id}/og`],
    },
    twitter: {
      card: "summary_large_image",
      title: share.title,
      description: `Predicted World Cup Champion: ${share.championCode || 'TBD'}`,
      images: [`/api/share/${share.id}/og`],
    },
  };
}

export default async function SharedBracketPage({ params }: { params: any }) {
  const resolvedParams = await params;
  const { shareId } = resolvedParams;

  if (!shareId) {
    notFound();
  }

  const share = await prisma.shareLink.findUnique({
    where: { id: shareId },
    include: { user: { select: { name: true } } }
  });

  if (!share) {
    notFound();
  }

  const authorName = share.user?.name || "Guest User";

  return (
    <div className="min-h-screen bg-hero">
      <Header />
      <main className="pt-6">
        {/* Banner with Import / Create Actions */}
        <section className="container mx-auto px-4 mb-6">
          <div className="bg-slate-900/60 border border-slate-800/40 backdrop-blur-md rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 shadow-glass">
            <div>
              <span className="text-neon text-[10px] font-black uppercase tracking-widest bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-md">
                Shared Bracket Snapshot
              </span>
              <h2 className="text-xl md:text-2xl font-extrabold text-white mt-3 font-display">
                {share.title}
              </h2>
              <p className="text-slate-400 text-xs mt-1">
                Simulated by <strong className="text-slate-200">{authorName}</strong> using <strong className="text-cyan-400">{share.modelUsed.toUpperCase()}</strong> prediction model
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ImportButton snapshot={share.snapshot} />
              <a
                href="/simulator"
                className="bg-transparent border border-white/10 hover:border-white/20 text-white hover:bg-white/5 px-5 py-2.5 rounded-full text-sm font-semibold transition text-center min-w-[140px]"
              >
                Create Mine
              </a>
            </div>
          </div>
        </section>

        {/* Read-Only Simulator Display */}
        <GroupPredictor
          sharedData={share.snapshot}
          sharedAuthor={authorName}
          isReadOnly={true}
        />
      </main>
      <Footer />
    </div>
  );
}
