"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTeams } from "@/components/TeamsProvider";
import { UpgradeModal } from "@/components/site/UpgradeModal";
import { useSimulationStore, TeamStats, PlayerStats } from "@/lib/store/simulationStore";
import { CountryFlag } from "@/components/ui/CountryFlag";

type RankingTeam = {
  code: string;
  name: string;
  flag: string;
  elo: number;
  attack: number;
  defense: number;
};

export default function TeamsClient({
  initialTeams,
  initialPlayers,
  flagMap,
}: {
  initialTeams: TeamStats[];
  initialPlayers: PlayerStats[];
  flagMap: Record<string, string>;
}) {
  const { isInitialized, initializeData, teams, players } = useSimulationStore();
  const appTeams = useTeams();
  const router = useRouter();
  const { data: session } = useSession();

  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalReason, setModalReason] = useState<"plus" | "pro" | "credits" | "guest">("plus");
  const [ratingVisible, setRatingVisible] = useState(10);
  const [attackVisible, setAttackVisible] = useState(10);
  const [defenseVisible, setDefenseVisible] = useState(10);

  const subTier = session?.user?.subscriptionTier || "free";

  useEffect(() => {
    setMounted(true);
    initializeData(initialTeams, initialPlayers);
  }, [initializeData, initialTeams, initialPlayers]);

  const formatRating = (val: number | undefined | null) => {
    if (val === undefined || val === null) return 0;
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

  const sortedTeams = useMemo(() => {
    const teamsList = Object.values(teams);
    return teamsList.sort((a, b) => {
      const appTeamA = appTeams.find((t) => t.code === a["Team Code"]);
      const appTeamB = appTeams.find((t) => t.code === b["Team Code"]);
      const eloA = appTeamA?.elo || 0;
      const eloB = appTeamB?.elo || 0;
      return eloB - eloA;
    });
  }, [teams, appTeams]);

  const filteredTeams = useMemo(() => {
    if (!search) return sortedTeams;
    const lowerSearch = search.toLowerCase();
    return sortedTeams.filter(
      (t) =>
        t.Team.toLowerCase().includes(lowerSearch) ||
        t["Team Code"].toLowerCase().includes(lowerSearch),
    );
  }, [search, sortedTeams]);

  const rankingTeams = useMemo<RankingTeam[]>(() => {
    return appTeams.map((team) => ({
      code: team.code,
      name: team.name,
      flag: team.flag || flagMap[team.code] || "🏳️",
      elo: team.elo,
      attack: formatRating(team.attack),
      defense: formatRating(team.defense),
    }));
  }, [appTeams, flagMap]);

  const rankings = useMemo(() => {
    return {
      rating: [...rankingTeams].sort((a, b) => b.elo - a.elo),
      attack: [...rankingTeams].sort((a, b) => b.attack - a.attack),
      defense: [...rankingTeams].sort((a, b) => b.defense - a.defense),
    };
  }, [rankingTeams]);

  const getTeamPlayers = (teamCode: string) => {
    return Object.values(players)
      .filter((p) => p["Team Code"] === teamCode)
      .sort((a, b) => {
        const ratingA = parseInt(a["Overall Rating"]?.replace("%", "") || "0", 10);
        const ratingB = parseInt(b["Overall Rating"]?.replace("%", "") || "0", 10);
        return ratingB - ratingA;
      });
  };

  const openTeam = (teamCode: string) => {
    if (subTier === "free") {
      setModalReason("plus");
      setModalOpen(true);
      return;
    }
    router.push(`/teams/${teamCode}`);
  };

  if (!mounted || !isInitialized) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-neon"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Tabs defaultValue="list" className="space-y-6">
        <TabsList className="h-auto rounded-2xl bg-white/5 p-1.5 dark:bg-white/5">
          <TabsTrigger
            value="list"
            className="rounded-xl px-4 py-2 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-foreground dark:data-[state=active]:bg-slate-900"
          >
            Teams List
          </TabsTrigger>
          <TabsTrigger
            value="rankings"
            className="rounded-xl px-4 py-2 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-foreground dark:data-[state=active]:bg-slate-900"
          >
            Team Rankings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-8">
          <div className="relative max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <Input
              type="text"
              placeholder="Search teams..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="glass h-12 rounded-xl pl-10 text-foreground placeholder-muted-foreground focus-visible:ring-neon"
            />
          </div>

          <div className="glass overflow-x-auto rounded-xl border-white/10 shadow-xl">
            <table className="w-full whitespace-nowrap text-left text-sm">
              <thead className="border-b border-white/10 bg-black/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="w-12 rounded-tl-xl px-4 py-3 text-center font-medium">Rk</th>
                  <th className="px-4 py-3 font-medium">Team</th>
                  <th className="px-4 py-3 text-center font-medium">Players</th>
                  {subTier !== "free" && (
                    <>
                      <th className="px-4 py-3 text-center font-medium">Elite</th>
                      <th className="px-4 py-3 text-center font-medium">Strong</th>
                    </>
                  )}
                  <th className="w-20 px-3 py-3 text-center font-medium">Elo</th>
                  <th className="w-16 px-3 py-3 text-center font-medium">Att</th>
                  <th className="w-16 px-3 py-3 text-center font-medium">Def</th>
                  <th className="w-48 rounded-tr-xl px-4 py-3 text-right font-medium">Top Player</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeams.map((team, index) => {
                  const appTeam = appTeams.find((t) => t.code === team["Team Code"]);
                  const teamPlayers = getTeamPlayers(team["Team Code"]);
                  const topPlayer = teamPlayers[0];
                  const topPlayerName = topPlayer ? topPlayer["Name on Shirt"] || topPlayer["Player Name"] : "";
                  const topPlayerRating = topPlayer ? topPlayer["Overall Rating"] || "" : "";

                  return (
                    <tr
                      key={team["Team Code"]}
                      onClick={() => openTeam(team["Team Code"])}
                      className="group cursor-pointer border-b border-white/5 transition-colors hover:bg-white/5"
                    >
                      <td className="px-4 py-3 text-center text-xs font-mono text-muted-foreground group-hover:text-foreground">
                        {index + 1}
                      </td>
                      <td className="flex items-center space-x-3 px-4 py-3">
                        <CountryFlag
                          code={team["Team Code"]}
                          flag={flagMap[team["Team Code"]] || appTeam?.flag}
                          name={team.Team}
                          className="h-6 w-8 shrink-0 rounded object-cover drop-shadow-md"
                          emojiClassName="text-2xl leading-none drop-shadow-md"
                        />
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground transition-colors group-hover:text-neon">
                            {team.Team}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{team["Team Code"]}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-foreground">
                          {team.Players}
                        </span>
                      </td>
                      {subTier !== "free" && (
                        <>
                          <td className="px-4 py-3 text-center">
                            <span className="font-semibold text-foreground">{team.Elite || "0"}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-medium text-muted-foreground">{team["Very Strong"] || "0"}</span>
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
                      <td className="max-w-[150px] truncate px-4 py-3 text-right text-muted-foreground">
                        <span className="font-semibold text-neon/90">{topPlayerName || "N/A"}</span>
                        {topPlayerRating && (
                          <span className="ml-1 text-[10px] text-foreground/50 dark:text-white/40">
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
              <div className="py-20 text-center text-muted-foreground">
                No teams found matching "{search}"
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="rankings" className="space-y-6">
          <div className="grid items-start gap-6 xl:grid-cols-3">
            {[
              {
                key: "rating",
                title: "Top 10 Rating Teams",
                subtitle: "Highest overall Elo strength",
                data: rankings.rating,
                visible: ratingVisible,
                onShowMore: () => setRatingVisible((value) => value + 10),
                statLabel: "Elo",
                getValue: (team: RankingTeam) => Math.round(team.elo),
                accent: "emerald",
              },
              {
                key: "attack",
                title: "Top 10 Attacking Teams",
                subtitle: "Best attacking numbers in the pool",
                data: rankings.attack,
                visible: attackVisible,
                onShowMore: () => setAttackVisible((value) => value + 10),
                statLabel: "Att",
                getValue: (team: RankingTeam) => team.attack,
                accent: "blue",
              },
              {
                key: "defense",
                title: "Top 10 Defending Teams",
                subtitle: "Strongest defensive ratings",
                data: rankings.defense,
                visible: defenseVisible,
                onShowMore: () => setDefenseVisible((value) => value + 10),
                statLabel: "Def",
                getValue: (team: RankingTeam) => team.defense,
                accent: "fuchsia",
              },
            ].map((section) => {
              const accentClasses =
                section.accent === "emerald"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                  : section.accent === "blue"
                    ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300"
                    : "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-500/20 dark:bg-fuchsia-500/10 dark:text-fuchsia-300";

              return (
                <div key={section.key} className="glass self-start rounded-[1.75rem] border border-white/10 p-5 shadow-xl">
                  <div className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${accentClasses}`}>
                    {section.statLabel}
                  </div>
                  <h3 className="mt-3 text-xl font-display font-bold text-foreground">{section.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{section.subtitle}</p>

                  <div className="mt-5 space-y-3">
                    {section.data.slice(0, section.visible).map((team, index) => (
                      <button
                        key={team.code}
                        onClick={() => openTeam(team.code)}
                        className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="w-7 text-center text-xs font-mono text-muted-foreground">{index + 1}</span>
                          <CountryFlag
                            code={team.code}
                            flag={team.flag}
                            name={team.name}
                            className="h-6 w-8 shrink-0 rounded object-cover"
                            emojiClassName="text-2xl leading-none"
                          />
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-foreground">{team.name}</div>
                            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{team.code}</div>
                          </div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-1.5 text-right dark:bg-white/5">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{section.statLabel}</div>
                          <div className="text-sm font-bold font-mono text-foreground">{section.getValue(team)}</div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {section.visible < section.data.length && (
                    <button
                      onClick={section.onShowMore}
                      className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-white/10"
                    >
                      Show More
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <UpgradeModal isOpen={modalOpen} onClose={() => setModalOpen(false)} reason={modalReason} />
    </div>
  );
}
