export interface TeamMapping {
  code: string;
  flag: string;
  confederation: "UEFA" | "CONMEBOL" | "CONCACAF" | "AFC" | "CAF" | "OFC";
}

export const TEAM_INFO: Record<string, TeamMapping> = {
  "Argentina": { code: "ARG", flag: "🇦🇷", confederation: "CONMEBOL" },
  "Spain": { code: "ESP", flag: "🇪🇸", confederation: "UEFA" },
  "France": { code: "FRA", flag: "🇫🇷", confederation: "UEFA" },
  "England": { code: "ENG", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", confederation: "UEFA" },
  "Portugal": { code: "POR", flag: "🇵🇹", confederation: "UEFA" },
  "Brazil": { code: "BRA", flag: "🇧🇷", confederation: "CONMEBOL" },
  "Morocco": { code: "MAR", flag: "🇲🇦", confederation: "CAF" },
  "Netherlands": { code: "NED", flag: "🇳🇱", confederation: "UEFA" },
  "Belgium": { code: "BEL", flag: "🇧🇪", confederation: "UEFA" },
  "Germany": { code: "GER", flag: "🇩🇪", confederation: "UEFA" },
  "Croatia": { code: "CRO", flag: "🇭🇷", confederation: "UEFA" },
  "Colombia": { code: "COL", flag: "🇨🇴", confederation: "CONMEBOL" },
  "Mexico": { code: "MEX", flag: "🇲🇽", confederation: "CONCACAF" },
  "Senegal": { code: "SEN", flag: "🇸🇳", confederation: "CAF" },
  "United States": { code: "USA", flag: "🇺🇸", confederation: "CONCACAF" },
  "Uruguay": { code: "URU", flag: "🇺🇾", confederation: "CONMEBOL" },
  "Japan": { code: "JPN", flag: "🇯🇵", confederation: "AFC" },
  "Switzerland": { code: "SUI", flag: "🇨🇭", confederation: "UEFA" },
  "Iran": { code: "IRN", flag: "🇮🇷", confederation: "AFC" },
  "Turkey": { code: "TUR", flag: "🇹🇷", confederation: "UEFA" },
  "Austria": { code: "AUT", flag: "🇦🇹", confederation: "UEFA" },
  "Ecuador": { code: "ECU", flag: "🇪🇨", confederation: "CONMEBOL" },
  "South Korea": { code: "KOR", flag: "🇰🇷", confederation: "AFC" },
  "Australia": { code: "AUS", flag: "🇦🇺", confederation: "AFC" },
  "Algeria": { code: "ALG", flag: "🇩🇿", confederation: "CAF" },
  "Egypt": { code: "EGY", flag: "🇪🇬", confederation: "CAF" },
  "Canada": { code: "CAN", flag: "🇨🇦", confederation: "CONCACAF" },
  "Norway": { code: "NOR", flag: "🇳🇴", confederation: "UEFA" },
  "Ivory Coast": { code: "CIV", flag: "🇨🇮", confederation: "CAF" },
  "Panama": { code: "PAN", flag: "🇵🇦", confederation: "CONCACAF" },
  "Sweden": { code: "SWE", flag: "🇸🇪", confederation: "UEFA" },
  "Czech Republic": { code: "CZE", flag: "🇨🇿", confederation: "UEFA" },
  "Paraguay": { code: "PAR", flag: "🇵🇾", confederation: "CONMEBOL" },
  "Scotland": { code: "SCO", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", confederation: "UEFA" },
  "DR Congo": { code: "COD", flag: "🇨🇩", confederation: "CAF" },
  "Tunisia": { code: "TUN", flag: "🇹🇳", confederation: "CAF" },
  "Uzbekistan": { code: "UZB", flag: "🇺🇿", confederation: "AFC" },
  "Qatar": { code: "QAT", flag: "🇶🇦", confederation: "AFC" },
  "Iraq": { code: "IRQ", flag: "🇮🇶", confederation: "AFC" },
  "South Africa": { code: "RSA", flag: "🇿🇦", confederation: "CAF" },
  "Saudi Arabia": { code: "KSA", flag: "🇸🇦", confederation: "AFC" },
  "Jordan": { code: "JOR", flag: "🇯🇴", confederation: "AFC" },
  "Bosnia and Herzegovina": { code: "BIH", flag: "🇧🇦", confederation: "UEFA" },
  "Cape Verde": { code: "CPV", flag: "🇨🇻", confederation: "CAF" },
  "Ghana": { code: "GHA", flag: "🇬🇭", confederation: "CAF" },
  "Haiti": { code: "HAI", flag: "🇭🇹", confederation: "CONCACAF" },
  "Curacao": { code: "CUW", flag: "🇨🇼", confederation: "CONCACAF" },
  "New Zealand": { code: "NZL", flag: "🇳🇿", confederation: "OFC" }
};

export const FIFA_TO_FULL_NAME: Record<string, string> = Object.entries(TEAM_INFO).reduce((acc, [name, info]) => {
  acc[info.code] = name;
  return acc;
}, {} as Record<string, string>);
