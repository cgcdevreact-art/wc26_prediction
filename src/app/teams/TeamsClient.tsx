"use client";

import { useEffect, useState, useMemo } from "react";
import { useSimulationStore, TeamStats, PlayerStats } from "@/lib/store/simulationStore";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useTeams } from "@/components/TeamsProvider";
import { useSession } from "next-auth/react";
import { UpgradeModal } from "@/components/site/UpgradeModal";

export default function TeamsClient({ 
  initialTeams, 
  initialPlayers,
  flagMap
}: { 
  initialTeams: TeamStats[], 
  initialPlayers: PlayerStats[],
  flagMap: Record<string, string>
}) {
  const { isInitialized, initializeData, teams, players } = useSimulationStore();
  const appTeams = useTeams();
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();
  
  const { data: session } = useSession();
  const subTier = session?.user?.subscriptionTier || "free";

  const [modalOpen, setModalOpen] = useState(false);
  const [modalReason, setModalReason] = useState<"plus" | "pro" | "credits" | "guest">("plus");

  useEffect(() => {
    setMounted(true);
    initializeData(initialTeams, initialPlayers);
  }, [initializeData, initialTeams, initialPlayers]);

  const sortedTeams = useMemo(() => {
    const teamsList = Object.values(teams);
    return teamsList.sort((a, b) => {
      const appTeamA = appTeams.find(t => t.code === a["Team Code"]);
      const appTeamB = appTeams.find(t => t.code === b["Team Code"]);
      const eloA = appTeamA?.elo || 0;
      const eloB = appTeamB?.elo || 0;
      return eloB - eloA;
    });
  }, [teams, appTeams]);

  const filteredTeams = useMemo(() => {
    if (!search) return sortedTeams;
    const lowerSearch = search.toLowerCase();
    return sortedTeams.filter(t => 
      t.Team.toLowerCase().includes(lowerSearch) || 
      t["Team Code"].toLowerCase().includes(lowerSearch)
    );
  }, [search, sortedTeams]);

  const getTeamPlayers = (teamCode: string) => {
    return Object.values(players)
      .filter((p) => p["Team Code"] === teamCode)
      .sort((a, b) => {
        const ratingA = parseInt(a["Overall Rating"]?.replace("%", "") || "0", 10);
        const ratingB = parseInt(b["Overall Rating"]?.replace("%", "") || "0", 10);
        return ratingB - ratingA;
      });
  };

  const formatRating = (val: number | undefined | null) => {
    if (val === undefined || val === null) return "-";
    if (val < 10) {
      const minM = 0.75;
      const maxM = 1.10;
      const minR = 50;
      const maxR = 95;
      const rating = ((val - minM) / (maxM - minM)) * (maxR - minR) + minR;
      return Math.max(15, Math.min(99, Math.round(rating)));
    }
    return Math.round(val);
  };

  // Don't render until hydration is complete to avoid layout shifts with localStorage
  if (!mounted || !isInitialized) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neon"></div>
      </div>
    );
  }

  const getStatColor = (valueStr: string) => {
    if (!valueStr) return "bg-white/10 text-muted-foreground border-white/5";
    const val = parseInt(valueStr.replace("%", ""));
    if (val >= 80) return "bg-green-700 text-green-50 border-green-600";
    if (val >= 70) return "bg-green-600/80 text-green-50 border-green-500/80";
    if (val >= 60) return "bg-yellow-600 text-yellow-50 border-yellow-500";
    return "bg-red-700 text-red-50 border-red-600";
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Search Bar */}
      <div className="relative max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-muted-foreground" />
        </div>
        <Input
          type="text"
          placeholder="Search teams..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 glass text-foreground placeholder-muted-foreground focus-visible:ring-neon rounded-xl h-12"
        />
      </div>

      {/* Table of Teams */}
      <div className="glass overflow-x-auto rounded-xl border-white/10 shadow-xl">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="text-[10px] uppercase tracking-wider bg-black/40 text-muted-foreground border-b border-white/10">
            <tr>
              <th className="px-4 py-3 rounded-tl-xl font-medium w-12 text-center">Rk</th>
              <th className="px-4 py-3 font-medium">Team</th>
              <th className="px-4 py-3 text-center font-medium">Players</th>
              {subTier !== "free" && (
                <>
                  <th className="px-4 py-3 text-center font-medium">Elite</th>
                  <th className="px-4 py-3 text-center font-medium">Strong</th>
                </>
              )}
              <th className="px-3 py-3 text-center font-medium w-20">Elo</th>
              <th className="px-3 py-3 text-center font-medium w-16">Att</th>
              <th className="px-3 py-3 text-center font-medium w-16">Def</th>
              <th className="px-4 py-3 text-right rounded-tr-xl font-medium w-48">Top Player</th>
            </tr>
          </thead>
          <tbody>
            {filteredTeams.map((team, index) => {
              const flag = flagMap[team["Team Code"]] || "🏳️";
              const appTeam = appTeams.find((t) => t.code === team["Team Code"]);
              
              const teamPlayers = getTeamPlayers(team["Team Code"]);
              const topPlayer = teamPlayers[0];
              const topPlayerName = topPlayer ? (topPlayer["Name on Shirt"] || topPlayer["Player Name"]) : "";
              const topPlayerRating = topPlayer ? (topPlayer["Overall Rating"] || "") : "";

              return (
                <tr 
                  key={team["Team Code"]}
                  onClick={() => {
                    if (subTier === "free") {
                      setModalReason("plus");
                      setModalOpen(true);
                    } else {
                      router.push(`/teams/${team["Team Code"]}`);
                    }
                  }}
                  className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors group"
                >
                  <td className="px-4 py-3 text-center text-xs font-mono text-muted-foreground group-hover:text-foreground">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3 flex items-center space-x-3">
                    <div className="text-2xl shadow-sm leading-none drop-shadow-md">{flag}</div>
                    <div className="flex flex-col">
                      <span className="font-bold text-foreground group-hover:text-neon transition-colors">
                        {team.Team}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {team["Team Code"]}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="bg-white/5 border border-white/10 rounded px-2 py-0.5 text-xs text-foreground">
                      {team.Players}
                    </span>
                  </td>
                  {subTier !== "free" && (
                    <>
                      <td className="px-4 py-3 text-center">
                        <span className="text-foreground font-semibold">{team.Elite || "0"}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-muted-foreground font-medium">{team["Very Strong"] || "0"}</span>
                      </td>
                    </>
                  )}
                  <td className="px-3 py-3 text-center font-mono tabular-nums text-foreground/80 dark:text-white/80">
                    {appTeam?.elo ? Math.round(appTeam.elo) : "-"}
                  </td>
                  <td className="px-3 py-3 text-center font-mono tabular-nums text-foreground/80 dark:text-white/80">
                    {formatRating(appTeam?.attack)}
                  </td>
                  <td className="px-3 py-3 text-center font-mono tabular-nums text-foreground/80 dark:text-white/80">
                    {formatRating(appTeam?.defense)}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground truncate max-w-[150px]">
                    <span className="text-neon/90 font-semibold">{topPlayerName || "N/A"}</span>
                    {topPlayerRating && (
                      <span className="text-[10px] ml-1 text-foreground/50 dark:text-white/40">
                        ({topPlayerRating})
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredTeams.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            No teams found matching "{search}"
          </div>
        )}
      </div>

      <UpgradeModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        reason={modalReason} 
      />
    </div>
  );
}
