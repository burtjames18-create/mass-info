import type { OHLCV } from "@/types/stock";
import type { PredictionLine, PredictionPoint } from "@/types/prediction";

function computeSMA(prices: number[], window: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < window - 1) {
      sma.push(NaN);
    } else {
      const slice = prices.slice(i - window + 1, i + 1);
      sma.push(slice.reduce((a, b) => a + b, 0) / window);
    }
  }
  return sma;
}

function smaSlope(sma: number[]): number {
  const valid = sma.filter((v) => !isNaN(v));
  if (valid.length < 2) return 0;
  const recent = valid.slice(-10);
  return (recent[recent.length - 1] - recent[0]) / (recent.length - 1);
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

export function predictMovingAverage(
  data: OHLCV[],
  forecastDays: number = 30
): PredictionLine[] {
  const closes = data.map((d) => d.close);
  const lastClose = closes[closes.length - 1];
  const lastDate = String(data[data.length - 1].date);
  const dates = futureDates(lastDate, forecastDays);

  const sma20 = computeSMA(closes, 20);
  const sma50 = computeSMA(closes, 50);

  const slope20 = smaSlope(sma20);
  const slope50 = smaSlope(sma50);

  const lines: PredictionLine[] = [];

  if (slope20 !== 0 || sma20.filter((v) => !isNaN(v)).length > 0) {
    lines.push({
      model: "sma-20",
      label: "SMA-20 Projection",
      color: "#f59e0b",
      points: [
        { date: lastDate, price: lastClose },
        ...dates.map((date, i): PredictionPoint => ({ date, price: lastClose + slope20 * (i + 1) })),
      ],
    });
  }

  if (slope50 !== 0 || sma50.filter((v) => !isNaN(v)).length > 0) {
    lines.push({
      model: "sma-50",
      label: "SMA-50 Projection",
      color: "#8b5cf6",
      points: [
        { date: lastDate, price: lastClose },
        ...dates.map((date, i): PredictionPoint => ({ date, price: lastClose + slope50 * (i + 1) })),
      ],
    });
  }

  return lines;
}
