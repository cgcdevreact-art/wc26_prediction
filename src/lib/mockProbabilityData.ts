export function generateHistoricalProbabilities(
  currentHomeProb: number,
  currentDrawProb: number,
  currentAwayProb: number,
  days: number = 7
) {
  const data = [];
  
  let hProb = currentHomeProb;
  let dProb = currentDrawProb;
  let aProb = currentAwayProb;
  
  const now = new Date();

  // Walk backwards in time to generate the chart data leading up to the current true probabilities
  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    
    data.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      home: Math.max(0, Math.min(100, hProb)),
      draw: Math.max(0, Math.min(100, dProb)),
      away: Math.max(0, Math.min(100, aProb))
    });

    // Add some random variance for the previous day (walking backwards, so we are modifying the state for the 'next' iteration which is earlier in time)
    // For a more realistic look, the further back we go, the more it diverges from the current reality, but we keep it constrained.
    hProb += (Math.random() - 0.5) * 8;
    dProb += (Math.random() - 0.5) * 4;
    
    // Ensure they still sum to roughly 100
    aProb = 100 - hProb - dProb;
  }

  return data;
}
