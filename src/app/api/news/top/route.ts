import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import { analyzeSentiment } from "@/lib/sentiment";
import type { NewsArticle } from "@/types/news";

/* eslint-disable @typescript-eslint/no-explicit-any */

const yahooFinance = new YahooFinance();

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms)
    ),
  ]);
}

let cache: { articles: NewsArticle[]; ts: number } | null = null;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

const MARKET_QUERIES = [
  "stock market today",
  "federal reserve",
  "S&P 500",
  "Wall Street",
  "US economy",
];

export async function GET() {
  // Return cache if fresh
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.articles);
  }

  try {
    const seenUrls = new Set<string>();
    const allArticles: NewsArticle[] = [];

    // Fetch news from broad market queries
    const results = await Promise.allSettled(
      MARKET_QUERIES.map((q) =>
        withTimeout(yahooFinance.search(q), 10000)
      )
    );

    for (const r of results) {
      if (r.status !== "fulfilled") continue;
      const news = (r.value as any).news || [];
      for (const n of news) {
        if (!n.title || !n.link || seenUrls.has(n.link)) continue;
        seenUrls.add(n.link);
        const title = n.title || "";
        const description = n.summary || n.description || "";
        const sentiment = analyzeSentiment(`${title} ${description}`);
        allArticles.push({
          title,
          description,
          url: n.link,
          source: n.publisher || "Yahoo Finance",
          publishedAt: n.providerPublishTime
            ? new Date(n.providerPublishTime).toISOString()
            : new Date().toISOString(),
          sentiment,
          imageUrl: n.thumbnail?.resolutions?.[0]?.url,
        });
      }
    }

    // Sort by absolute sentiment (highest market impact first), then by recency
    allArticles.sort((a, b) => {
      const impactDiff = Math.abs(b.sentiment) - Math.abs(a.sentiment);
      if (Math.abs(impactDiff) > 0.5) return impactDiff;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

    const top3 = allArticles.slice(0, 3);
    cache = { articles: top3, ts: Date.now() };
    return NextResponse.json(top3);
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to fetch top news: ${error}` },
      { status: 500 }
    );
  }
}
