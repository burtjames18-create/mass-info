import type { OHLCV } from "@/types/stock";
import type { PredictionLine } from "@/types/prediction";
import { predictMovingAverage } from "./movingAverage";
import { predictLinearRegression } from "./linearRegression";
import { predictExponentialSmoothing } from "./exponentialSmoothing";
import { predictSentimentComposite } from "./sentimentAdjustment";

export function generatePredictions(
  data: OHLCV[],
  avgSentiment: number = 0,
  forecastDays: number = 30
): PredictionLine[] {
  if (data.length < 50) return [];

  const lines: PredictionLine[] = [
    ...predictMovingAverage(data, forecastDays),
    ...predictLinearRegression(data, forecastDays),
    ...predictExponentialSmoothing(data, forecastDays),
  ];

  const composite = predictSentimentComposite(lines, avgSentiment);
  if (composite) {
    lines.push(composite);
  }

  return lines;
}
