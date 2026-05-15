"use client";
import useSWR from "swr";
import type { NewsArticle } from "@/types/news";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useNews(ticker: string | null) {
  return useSWR<NewsArticle[]>(
    ticker ? `/api/news?ticker=${ticker}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );
}
