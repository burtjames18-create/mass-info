import type { OHLCV } from "@/types/stock";
import type { PredictionLine, PredictionPoint } from "@/types/prediction";

function fitOLS(y: number[]): { slope: number; intercept: number; stdErr: number } {
  const n = y.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += y[i];
    sumXY += i * y[i];
    sumX2 += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Standard error of residuals
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const predicted = intercept + slope * i;
    ssRes += (y[i] - predicted) ** 2;
  }
  const stdErr = Math.sqrt(ssRes / (n - 2));

  return { slope, intercept, stdErr };
}

function futureDates(lastDate: string, count: number): string[] {
  const dates: string[] = [];
  const d = new Date(lastDate);
  for (let i = 0; i < count; i++) {
    d.setDate(d.getDate() + 1);
    while (d.getDay() === 0 || d.getDay() === 6) {
      d.setDate(d.getDate() + 1);
    }
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

export function predictLinearRegression(
  data: OHLCV[],
  forecastDays: number = 30,
  lookbackDays: number = 90
): PredictionLine[] {
  const recent = data.slice(-lookbackDays);
  const closes = recent.map((d) => d.close);
  const lastClose = data[data.length - 1].close;
  const { slope, stdErr } = fitOLS(closes);

  const lastDate = String(data[data.length - 1].date);
  const dates = futureDates(lastDate, forecastDays);

  const trendPoints: PredictionPoint[] = [];
  const upperPoints: PredictionPoint[] = [];
  const lowerPoints: PredictionPoint[] = [];

  // Anchor point \u2014 all lines start from the last historical close
  const anchor: PredictionPoint = { date: lastDate, price: lastClose };

  for (let i = 0; i < forecastDays; i++) {
    const predicted = lastClose + slope * (i + 1);
    trendPoints.push({ date: dates[i], price: predicted });
    upperPoints.push({ date: dates[i], price: predicted + stdErr });
    lowerPoints.push({ date: dates[i], price: predicted - stdErr });
  }

  return [
    { model: "linear-trend",  label: "Linear Trend",         color: "#3b82f6", points: [anchor, ...trendPoints] },
    { model: "linear-upper",  label: "Upper Band (+1\u03c3)", color: "#93c5fd", points: [anchor, ...upperPoints] },
    { model: "linear-lower",  label: "Lower Band (-1\u03c3)", color: "#93c5fd", points: [anchor, ...lowerPoints] },
  ];
}
