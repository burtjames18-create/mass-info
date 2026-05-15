import type { OHLCV } from "@/types/stock";
import type { PredictionLine, PredictionPoint } from "@/types/prediction";

function holtSmooth(
  data: number[],
  alpha: number,
  beta: number
): { level: number; trend: number } {
  let level = data[0];
  let trend = data[1] - data[0];

  for (let i = 1; i < data.length; i++) {
    const prevLevel = level;
    level = alpha * data[i] + (1 - alpha) * (prevLevel + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }

  return { level, trend };
}

function optimizeParams(data: number[]): { alpha: number; beta: number } {
  let bestAlpha = 0.3;
  let bestBeta = 0.1;
  let bestMSE = Infinity;

  for (let a = 0.1; a <= 0.9; a += 0.1) {
    for (let b = 0.01; b <= 0.5; b += 0.05) {
      const splitIdx = Math.floor(data.length * 0.8);
      const train = data.slice(0, splitIdx);
      const val = data.slice(splitIdx);

      const { level, trend } = holtSmooth(train, a, b);

      let mse = 0;
      for (let i = 0; i < val.length; i++) {
        const pred = level + trend * (i + 1);
        mse += (val[i] - pred) ** 2;
      }
      mse /= val.length;

      if (mse < bestMSE) {
        bestMSE = mse;
        bestAlpha = a;
        bestBeta = b;
      }
    }
  }

  return { alpha: bestAlpha, beta: bestBeta };
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

export function predictExponentialSmoothing(
  data: OHLCV[],
  forecastDays: number = 30
): PredictionLine[] {
  const closes = data.map((d) => d.close);
  const lastClose = closes[closes.length - 1];
  const { alpha, beta } = optimizeParams(closes);
  const { trend } = holtSmooth(closes, alpha, beta);

  const lastDate = String(data[data.length - 1].date);
  const dates = futureDates(lastDate, forecastDays);

  const points: PredictionPoint[] = [
    { date: lastDate, price: lastClose },
    ...dates.map((date, i) => ({ date, price: lastClose + trend * (i + 1) })),
  ];

  return [{ model: "exp-smoothing", label: "Exponential Smoothing", color: "#10b981", points }];
}
