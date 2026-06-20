const CODE_TO_FLAG_ASSET: Record<string, string> = {
  ALG: "dz",
  ARG: "ar",
  AUS: "au",
  AUT: "at",
  BEL: "be",
  BIH: "ba",
  BRA: "br",
  CAN: "ca",
  CIV: "ci",
  COD: "cd",
  COL: "co",
  CPV: "cv",
  CRO: "hr",
  CUW: "cw",
  CZE: "cz",
  ECU: "ec",
  EGY: "eg",
  ENG: "gb-eng",
  ESP: "es",
  FRA: "fr",
  GER: "de",
  GHA: "gh",
  HAI: "ht",
  IRQ: "iq",
  IRN: "ir",
  JOR: "jo",
  JPN: "jp",
  KOR: "kr",
  MAR: "ma",
  MEX: "mx",
  NED: "nl",
  NOR: "no",
  NZL: "nz",
  PAN: "pa",
  PAR: "py",
  POR: "pt",
  QAT: "qa",
  RSA: "za",
  SAU: "sa",
  KSA: "sa", // Saudi Arabia
  SCO: "gb-sct",
  SEN: "sn",
  SUI: "ch",
  SWE: "se",
  TUN: "tn",
  TUR: "tr",
  URU: "uy",
  USA: "us",
  UZB: "uz",
  // Wildcards / Custom countries
  ITA: "it", // Italy
  CHL: "cl", // Chile
  NGA: "ng", // Nigeria
  IND: "in", // India
};

export function getFlagImageSrc(teamCode?: string | null) {
  if (!teamCode) return null;
  const asset = CODE_TO_FLAG_ASSET[teamCode.toUpperCase()];
  if (!asset) return null;
  return `https://flagcdn.com/w80/${asset}.png`;
}

export function isFlagImage(value?: string | null): value is string {
  return typeof value === "string" && /^https?:\/\//.test(value);
}

export function emojiToCountryCode(emoji: string): string | null {
  if (!emoji) return null;

  const codePoints = Array.from(emoji)
    .map((c) => c.codePointAt(0))
    .filter((cp): cp is number => cp !== undefined);

  // Check for Regional Indicator Symbols (standard 2-letter country flags)
  if (codePoints.length === 2) {
    const [cp0, cp1] = codePoints;
    if (cp0 >= 0x1f1e6 && cp0 <= 0x1f1ff && cp1 >= 0x1f1e6 && cp1 <= 0x1f1ff) {
      const char0 = String.fromCharCode(cp0 - 0x1f1e6 + 97); // lowercase 'a' is 97
      const char1 = String.fromCharCode(cp1 - 0x1f1e6 + 97);
      return char0 + char1;
    }
  }

  // Check for subdivision flag tag sequences (like England, Scotland, Wales)
  // These start with WAVING BLACK FLAG (0x1F3F4)
  if (codePoints.length > 0 && codePoints[0] === 0x1f3f4) {
    const tags: string[] = [];
    for (let i = 1; i < codePoints.length; i++) {
      const cp = codePoints[i];
      if (cp >= 0xe0030 && cp <= 0xe007e) {
        tags.push(String.fromCharCode(cp - 0xe0000));
      }
    }
    if (tags.length > 0) {
      const subregion = tags.join(""); // e.g. "gbeng", "gbsct"
      if (subregion === "gbeng") return "gb-eng";
      if (subregion === "gbsct") return "gb-sct";
      if (subregion === "gbwls") return "gb-wls";
      return subregion;
    }
  }

  return null;
}

