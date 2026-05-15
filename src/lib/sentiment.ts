import Sentiment from "sentiment";

// Financial terms the generic library doesn't weight heavily enough
const FINANCE_EXTRAS: Record<string, number> = {
  // Positive
  surge: 3, surges: 3, soar: 3, soars: 3, rally: 3, rallies: 3,
  bullish: 3, bull: 2, upgrade: 3, upgraded: 3, outperform: 3,
  beat: 2, beats: 2, exceeds: 2, exceeded: 2, record: 2,
  boom: 3, booming: 3, breakout: 2, upside: 2, gains: 2,
  dividend: 1, buyback: 2, profit: 2, profits: 2, growth: 2,
  // Negative
  crash: -4, crashes: -4, plunge: -3, plunges: -3, plummet: -3,
  bearish: -3, bear: -2, downgrade: -3, downgraded: -3, underperform: -3,
  miss: -2, misses: -2, missed: -2, recession: -3, layoff: -2,
  layoffs: -2, bankruptcy: -4, default: -3, defaults: -3, tariff: -2,
  tariffs: -2, sanctions: -2, inflation: -1, sell: -1, selloff: -3,
  decline: -2, declining: -2, loss: -2, losses: -2, debt: -1,
  warning: -2, warns: -2, fraud: -4, investigation: -2, lawsuit: -2,
};

const analyzer = new Sentiment();

export function analyzeSentiment(text: string): number {
  const result = analyzer.analyze(text);

  // Add financial keyword boost
  const words = text.toLowerCase().split(/\W+/);
  let finBoost = 0;
  for (const w of words) {
    if (FINANCE_EXTRAS[w]) finBoost += FINANCE_EXTRAS[w];
  }

  // Combine: amplify the comparative score and add financial context
  const raw = result.comparative * 25 + finBoost * 0.5;
  return Math.max(-5, Math.min(5, raw));
}

export function averageSentiment(scores: number[]): number {
  if (scores.length === 0) return 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}
