import YahooFinance from "yahoo-finance2";
import type { OHLCV, StockQuote, SearchResult } from "@/types/stock";

/* eslint-disable @typescript-eslint/no-explicit-any */

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// Simple sequential queue to avoid hammering Yahoo Finance
let pending: Promise<any> = Promise.resolve();
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const task = pending.then(fn, fn);
  pending = task.then(() => {}, () => {});
  return task;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Request timeout")), ms)
    ),
  ]);
}

type Interval = "5m" | "15m" | "1h" | "1d" | "1wk";

interface PeriodConfig {
  interval: Interval;
  days: number;
}

const PERIOD_CONFIG: Record<string, PeriodConfig> = {
  "1d":  { interval: "5m",  days: 2   }, // 2 days back catches pre-market from yesterday
  "5d":  { interval: "15m", days: 7   },
  "1m":  { interval: "1h",  days: 30  },
  "3m":  { interval: "1d",  days: 90  },
  "6m":  { interval: "1d",  days: 180 },
  "1y":  { interval: "1d",  days: 365 },
  "2y":  { interval: "1d",  days: 730 },
  "5y":  { interval: "1wk", days: 1825 },
};

export async function getHistoricalData(
  ticker: string,
  period: string = "1y"
): Promise<OHLCV[]> {
  const cfg = PERIOD_CONFIG[period] ?? PERIOD_CONFIG["1y"];
  const isIntraday = cfg.interval === "5m" || cfg.interval === "15m" || cfg.interval === "1h";
  const now = new Date();

  const params: any = {
    interval: cfg.interval,
    period1: new Date(now.getTime() - (cfg.days ?? 365) * 24 * 60 * 60 * 1000),
    period2: now,
  };

  const result: any = await enqueue(() =>
    withTimeout(yahooFinance.chart(ticker, params), 15000)
  );

  return (result.quotes || [])
    .filter((q: any) => q.close != null)
    .map((q: any) => {
      // Yahoo may return a Date object or a raw Unix-seconds number
      const d = q.date instanceof Date ? q.date : new Date(
        typeof q.date === "number" ? q.date * 1000 : q.date
      );
      return {
      date: isIntraday
        ? Math.floor(d.getTime() / 1000)
        : d.toISOString().split("T")[0],
      open:   q.open   ?? 0,
      high:   q.high   ?? 0,
      low:    q.low    ?? 0,
      close:  q.close  ?? 0,
      volume: q.volume ?? 0,
    };});
}

export async function getQuote(ticker: string): Promise<StockQuote> {
  const result: any = await enqueue(() =>
    withTimeout(yahooFinance.quote(ticker), 10000)
  );
  return {
    ticker: result.symbol,
    name: result.shortName || result.longName || result.symbol,
    price: result.regularMarketPrice ?? 0,
    change: result.regularMarketChange ?? 0,
    changePercent: result.regularMarketChangePercent ?? 0,
    high: result.regularMarketDayHigh ?? 0,
    low: result.regularMarketDayLow ?? 0,
    volume: result.regularMarketVolume ?? 0,
    marketCap: result.marketCap,
  };
}

export async function searchTickers(query: string): Promise<SearchResult[]> {
  const result: any = await withTimeout(yahooFinance.search(query), 10000);
  return (result.quotes || [])
    .filter((q: any) => q.symbol && q.isYahooFinance)
    .slice(0, 10)
    .map((q: any) => ({
      ticker: q.symbol as string,
      name: (q.shortname || q.longname || q.symbol) as string,
      exchange: (q.exchange || "") as string,
      type: (q.quoteType || "") as string,
    }));
}
