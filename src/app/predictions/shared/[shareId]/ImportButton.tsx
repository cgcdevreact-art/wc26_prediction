"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";

interface ImportButtonProps {
  snapshot: any;
}

export function ImportButton({ snapshot }: ImportButtonProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleImport = async () => {
    if (!session?.user?.id) {
      toast.error("Please Sign In or Sign Up to import brackets.");
      router.push("/signin?callbackUrl=" + encodeURIComponent(window.location.pathname));
      return;
    }

    setIsLoading(true);
    try {
      // The snapshot is already a predictions array. We want to clean the types 
      // to write directly to the active slot (MATCH_SCORE / KNOCKOUT_WINNER).
      const activePredictions = snapshot.map((p: any) => {
        // Strip any slot specific suffixes to make it overwrite the main active slot
        let cleanType = p.type;
        if (p.type.startsWith("MATCH_SCORE_SLOT_")) cleanType = "MATCH_SCORE";
        if (p.type.startsWith("KNOCKOUT_WINNER_SLOT_")) cleanType = "KNOCKOUT_WINNER";
        if (p.type.startsWith("SLOT_METADATA")) cleanType = "SLOT_METADATA";

        return {
          matchId: p.matchId,
          type: cleanType,
          predictedHomeScore: p.predictedHomeScore,
          predictedAwayScore: p.predictedAwayScore,
          predictedWinner: p.predictedWinner,
          predictedTeamId: p.predictedTeamId,
        };
      });

      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activePredictions),
      });

      if (res.ok) {
        toast.success("Successfully imported predictions to your simulator!");
        router.push("/simulator");
        router.refresh();
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to import predictions.");
      }
    } catch (error: any) {
      console.error("Import failed:", error);
      toast.error(error.message || "Failed to clone predictions. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleImport}
      disabled={isLoading}
      className="inline-flex items-center gap-2 bg-gradient-to-r from-[#0a8a45] via-[#2c7c87] to-[#af3fd1] hover:opacity-95 text-white px-5 py-2.5 rounded-full text-sm font-semibold transition shadow-md cursor-pointer disabled:opacity-70"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Cloning Bracket...</span>
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          <span>Clone to My Simulator</span>
        </>
      )}
    </button>
  );
}
