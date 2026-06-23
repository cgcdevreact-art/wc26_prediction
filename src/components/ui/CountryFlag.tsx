"use client";

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
  let src: string | null = null;

  if (isFlagImage(flag)) {
    src = flag;
  } else if (flag) {
    const codeFromEmoji = emojiToCountryCode(flag);
    if (codeFromEmoji) {
      src = `https://flagcdn.com/w80/${codeFromEmoji}.png`;
    }
  }

  if (!src && code) {
    src = getFlagImageSrc(code);
  }

  if (src) {
    return (
      <img
        src={src}
        alt={name ? `${name} flag` : "Country flag"}
        className={`${className} object-cover rounded-[2px]`}
        loading="lazy"
      />
    );
  }

  return <span className={emojiClassName}>{flag || "🏳️"}</span>;
}

