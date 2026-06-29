const fs = require('fs');
const path = require('path');

const contentPath = '/Users/bosana/.gemini/antigravity-ide/brain/31fe1128-ec8a-4899-a607-7f02e4f65b47/.system_generated/steps/682/content.md';
const content = fs.readFileSync(contentPath, 'utf8');

// Parse games array from JSON
const startIdx = content.indexOf('{"games":[');
if (startIdx === -1) {
  console.log("Could not find games JSON");
  process.exit(1);
}
const endIdx = content.lastIndexOf(']}');
const jsonStr = content.substring(startIdx, endIdx + 2);
const data = JSON.parse(jsonStr);

const liveR32 = data.games.filter(g => String(g.type || '').toLowerCase() === 'r32');

const r32SlotDefinitions = [
  { idx: 0, h: "Winner Group A", a: "3rd" },
  { idx: 1, h: "Runner-up Group B", a: "Runner-up Group C" },
  { idx: 2, h: "Winner Group C", a: "3rd" },
  { idx: 3, h: "Runner-up Group D", a: "Runner-up Group E" },
  { idx: 4, h: "Winner Group E", a: "3rd" },
  { idx: 5, h: "Runner-up Group F", a: "Runner-up Group G" },
  { idx: 6, h: "Winner Group G", a: "3rd" },
  { idx: 7, h: "Runner-up Group H", a: "Runner-up Group I" },
  { idx: 8, h: "Winner Group B", a: "3rd" },
  { idx: 9, h: "Runner-up Group A", a: "Runner-up Group J" },
  { idx: 10, h: "Winner Group D", a: "3rd" },
  { idx: 11, h: "Runner-up Group K", a: "Runner-up Group L" },
  { idx: 12, h: "Winner Group F", a: "3rd" },
  { idx: 13, h: "Winner Group H", a: "3rd" },
  { idx: 14, h: "Winner Group I", a: "Winner Group J" },
  { idx: 15, h: "Winner Group K", a: "Winner Group L" },
];

r32SlotDefinitions.forEach(slot => {
  const match = liveR32.find(g => {
    const hLab = String(g.home_team_label || '').toLowerCase();
    const aLab = String(g.away_team_label || '').toLowerCase();
    const hPart = slot.h.toLowerCase();
    const aPart = slot.a.toLowerCase();
    return (hLab.includes(hPart) && aLab.includes(aPart)) || (hLab.includes(aPart) && aLab.includes(hPart));
  });
  if (match) {
    console.log(`Slot ${slot.idx}: Match ${match.id} (Home: ${match.home_team_label}, Away: ${match.away_team_label})`);
  } else {
    console.log(`Slot ${slot.idx}: NOT FOUND`);
  }
});
