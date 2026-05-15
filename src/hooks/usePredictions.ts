"use client";
import useSWR from "swr";
import type { PredictionLine } from "@/types/prediction";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function usePredictions(ticker: string | null, days: number = 30) {
  return useSWR<PredictionLine[]>(
    ticker ? `/api/predictions?ticker=${ticker}&days=${days}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );
}
