"use client";
import useSWR from "swr";
import type { Portfolio, Trade } from "@/types/trading";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Not authenticated");
    return r.json();
  });

export function usePortfolio() {
  return useSWR<Portfolio>("/api/trading/portfolio", fetcher, {
    refreshInterval: 15000,
    revalidateOnFocus: true,
  });
}

export function useTradeHistory(ticker?: string) {
  const url = ticker
    ? `/api/trading/history?ticker=${ticker}`
    : "/api/trading/history";
  return useSWR<Trade[]>(url, fetcher, { revalidateOnFocus: true });
}

export async function executeTrade(
  side: "buy" | "sell",
  ticker: string,
  quantity: number
) {
  const res = await fetch(`/api/trading/${side}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticker, quantity }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Trade failed");
  return data;
}
