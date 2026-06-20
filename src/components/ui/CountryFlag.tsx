"use client";

import { getFlagImageSrc, isFlagImage } from "@/lib/flag-utils";

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
  const src = isFlagImage(flag) ? flag : getFlagImageSrc(code);

  if (src) {
    return (
      <img
        src={src}
        alt={name ? `${name} flag` : "Country flag"}
        className={className}
        loading="lazy"
      />
    );
  }

  return <span className={emojiClassName}>{flag || "🏳️"}</span>;
}
