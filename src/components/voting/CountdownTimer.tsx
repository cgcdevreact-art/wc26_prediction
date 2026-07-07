"use client";

import { useEffect, useState } from "react";

interface CountdownTimerProps {
  kickoffAtIso?: string;
  status?: string;
}

export function CountdownTimer({ kickoffAtIso, status }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (status === "COMPLETED") {
      setTimeLeft("FT");
      return;
    }
    if (status === "LIVE") {
      setTimeLeft("Live now");
      return;
    }
    if (!kickoffAtIso) {
      setTimeLeft("TBD");
      return;
    }

    const updateTime = () => {
      const diffMs = new Date(kickoffAtIso).getTime() - Date.now();
      if (diffMs <= 0) {
        setTimeLeft("Starting now");
        return;
      }

      const totalSeconds = Math.floor(diffMs / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      if (days > 0) {
        setTimeLeft(`In ${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`In ${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeLeft(`In ${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`In ${seconds}s`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [kickoffAtIso, status]);

  return (
    <span className="text-[10px] font-bold text-cyan-700 dark:text-neon">
      {timeLeft}
    </span>
  );
}
