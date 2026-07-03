import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "edge";

export async function GET(
  request: Request,
  { params }: { params: any }
) {
  try {
    const resolvedParams = await params;
    const { shareId } = resolvedParams;

    if (!shareId) {
      return new Response("Share ID is required", { status: 400 });
    }

    const share = await prisma.shareLink.findUnique({
      where: { id: shareId },
      include: {
        user: {
          select: { name: true }
        }
      }
    });

    if (!share) {
      return new Response("Not Found", { status: 404 });
    }

    const champ = share.championCode || "TBD";
    const finalist1 = share.finalist1Code || "TBD";
    const finalist2 = share.finalist2Code || "TBD";
    const author = share.user?.name || "Guest User";

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#080b11",
            backgroundImage: "radial-gradient(circle at center, #111827 0%, #030712 100%)",
            color: "white",
            padding: "50px",
            position: "relative",
          }}
        >
          {/* Neon Grid Overlay Accent */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0.05,
              backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />

          {/* Subheader */}
          <div
            style={{
              display: "flex",
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "3px",
              color: "#10b981", // emerald-500
              textTransform: "uppercase",
              marginBottom: 15,
            }}
          >
            FIFA World Cup 2026 Simulator
          </div>

          {/* Main Title */}
          <div
            style={{
              fontSize: 48,
              fontWeight: 900,
              textAlign: "center",
              marginBottom: 25,
              color: "#ffffff",
              display: "flex",
            }}
          >
            {share.title || `${author}'s Tournament Bracket`}
          </div>

          {/* Visual Finalist Matchup Cards */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 30,
              marginBottom: 35,
              width: "100%",
            }}
          >
            {/* Finalist 1 Card */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "16px",
                padding: "20px 40px",
                minWidth: "180px",
              }}
            >
              <span style={{ fontSize: 14, color: "#9ca3af", marginBottom: 5 }}>Finalist</span>
              <span style={{ fontSize: 36, fontWeight: 800, color: "#ffffff" }}>{finalist1}</span>
            </div>

            {/* VS Divider */}
            <div
              style={{
                fontSize: 28,
                fontWeight: 900,
                color: "#10b981",
                textShadow: "0 0 10px rgba(16, 185, 129, 0.4)",
              }}
            >
              VS
            </div>

            {/* Finalist 2 Card */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "16px",
                padding: "20px 40px",
                minWidth: "180px",
              }}
            >
              <span style={{ fontSize: 14, color: "#9ca3af", marginBottom: 5 }}>Finalist</span>
              <span style={{ fontSize: 36, fontWeight: 800, color: "#ffffff" }}>{finalist2}</span>
            </div>
          </div>

          {/* Predicted Champion Section */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 15,
              padding: "16px 45px",
              backgroundColor: "rgba(16, 185, 129, 0.06)",
              border: "1.5px solid rgba(16, 185, 129, 0.3)",
              borderRadius: "9999px",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
            }}
          >
            <span style={{ fontSize: 20, color: "#e5e7eb" }}>🏆 Champion Prediction:</span>
            <span
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: "#10b981",
              }}
            >
              {champ}
            </span>
          </div>

          {/* Footer Metadata */}
          <div
            style={{
              display: "flex",
              position: "absolute",
              bottom: 30,
              fontSize: 14,
              color: "#6b7280",
            }}
          >
            Created by {author} using {share.modelUsed.toUpperCase()} simulation model
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (err: any) {
    console.error("Error generating OG preview image:", err);
    return new Response("Failed to generate preview image", { status: 500 });
  }
}
