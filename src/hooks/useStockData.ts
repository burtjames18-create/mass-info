"use client";
import useSWR from "swr";
import type { OHLCV, StockQuote } from "@/types/stock";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const INTRADAY_PERIODS = new Set(["1d", "5d", "1m"]);

export function useStockHistory(ticker: string | null, period: string = "1y") {
  const isIntraday = INTRADAY_PERIODS.has(period);
  const isLive = period === "1d";
  return useSWR<OHLCV[]>(
    ticker ? `/api/stock/history?ticker=${ticker}&period=${period}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnMount: true,
      dedupingInterval: isLive ? 4000 : isIntraday ? 10000 : 300000,
      refreshInterval: isLive ? 5000 : 0,
    }
  );
}

export function useStockQuote(ticker: string | null) {
  return useSWR<StockQuote>(
    ticker ? `/api/stock/quote?ticker=${ticker}` : null,
    fetcher,
    { refreshInterval: 60000 }
  );
}

export function useSparkline(ticker: string | null) {
  return useSWR<OHLCV[]>(
    ticker ? `/api/stock/history?ticker=${ticker}&period=1d` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000, refreshInterval: 60000 }
  );
}
