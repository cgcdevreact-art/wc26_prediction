"use client";

import { useEffect, useMemo, useState } from "react";
import { getFlagImageSrc, isFlagImage, emojiToCountryCode } from "@/lib/flag-utils";

export function CountryFlag({
  code,
  flag,
  name,
  className = "h-6 w-8",
  emojiClassName = "text-2xl leading-none",
}: {
  code?: string | null;
  flag?: string | null;
  name?: string;
  className?: string;
  emojiClassName?: string;
}) {
  const initials = useMemo(() => {
    const tokens = (name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (tokens.length === 0) return "??";
    if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
    return `${tokens[0][0] || ""}${tokens[1][0] || ""}`.toUpperCase();
  }, [name]);

  const sources = useMemo(() => {
    const candidates: string[] = [];

    if (isFlagImage(flag)) {
      candidates.push(flag);
    } else if (flag) {
      const codeFromEmoji = emojiToCountryCode(flag);
      if (codeFromEmoji) {
        candidates.push(`https://flagcdn.com/w80/${codeFromEmoji}.png`);
      }
    }

    const fromCodeOrName = getFlagImageSrc(code, name);
    if (fromCodeOrName) {
      candidates.push(fromCodeOrName);
    }

    return [...new Set(candidates)];
  }, [code, flag, name]);

  const [srcIndex, setSrcIndex] = useState(0);

  useEffect(() => {
    setSrcIndex(0);
  }, [sources]);

  const src = sources[srcIndex] || null;

  if (src) {
    return (
      <img
        src={src}
        alt={name ? `${name} flag` : "Country flag"}
        className={`${className} object-cover rounded-[2px]`}
        loading="lazy"
        onError={() => {
          setSrcIndex((current) => current + 1);
        }}
      />
    );
  }

  if (flag) {
    return <span className={emojiClassName}>{flag}</span>;
  }

  return (
    <span
      className={`${className} inline-flex items-center justify-center rounded-[2px] border border-slate-200 bg-slate-100 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/55`}
      aria-label={name ? `${name} flag unavailable` : "Country flag unavailable"}
      title={name ? `${name} flag unavailable` : "Country flag unavailable"}
    >
      {initials}
    </span>
  );
}
