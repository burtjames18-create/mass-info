import type { PredictionLine, PredictionPoint } from "@/types/prediction";

const MAX_ADJUSTMENT = 0.05; // +/- 5% max

export function predictSentimentComposite(
  predictionLines: PredictionLine[],
  avgSentiment: number // -5 to 5 scale
): PredictionLine | null {
  // Filter to only the main forecast lines (not bands)
  const forecastLines = predictionLines.filter(
    (l) => !l.model.includes("upper") && !l.model.includes("lower")
  );

  if (forecastLines.length === 0) return null;

  // Find the shortest forecast length
  const minLen = Math.min(...forecastLines.map((l) => l.points.length));
  if (minLen === 0) return null;

  // Average all forecast lines point by point
  const avgPoints: PredictionPoint[] = [];
  for (let i = 0; i < minLen; i++) {
    const date = forecastLines[0].points[i].date;
    const avgPrice =
      forecastLines.reduce((sum, line) => sum + line.points[i].price, 0) /
      forecastLines.length;
    avgPoints.push({ date, price: avgPrice });
  }

  // Apply sentiment adjustment: normalized sentiment (-5 to 5) -> multiplier
  // Positive sentiment pushes price up, negative pushes down
  const sentimentMultiplier =
    1 + (avgSentiment / 5) * MAX_ADJUSTMENT;

  // Keep the anchor point (index 0) at the exact last close — don't adjust it
  const adjustedPoints = avgPoints.map((p, i) => ({
    date: p.date,
    price: i === 0 ? p.price : p.price * sentimentMultiplier,
  }));

  return {
    model: "sentiment-composite",
    label: "Sentiment-Adjusted Forecast",
    color: "#ef4444",
    points: adjustedPoints,
  };
}
