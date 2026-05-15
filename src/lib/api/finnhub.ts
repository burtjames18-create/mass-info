import type { NewsArticle } from "@/types/news";
import type { StockQuote } from "@/types/stock";
import { analyzeSentiment } from "@/lib/sentiment";

const API_KEY = process.env.FINNHUB_KEY;
const BASE_URL = "https://finnhub.io/api/v1";

export async function getFinnhubQuote(ticker: string): Promise<StockQuote | null> {
  if (!API_KEY) return null;
  try {
    const [quoteRes, profileRes] = await Promise.all([
      fetch(`${BASE_URL}/quote?symbol=${ticker}&token=${API_KEY}`),
      fetch(`${BASE_URL}/stock/profile2?symbol=${ticker}&token=${API_KEY}`),
    ]);
    if (!quoteRes.ok) return null;
    const q = await quoteRes.json();
    const p = profileRes.ok ? await profileRes.json() : {};
    if (!q.c) return null; // c = current price, 0 means no data
    return {
      ticker,
      name: p.name || ticker,
      price: q.c,
      change: q.d ?? 0,
      changePercent: q.dp ?? 0,
      high: q.h ?? 0,
      low: q.l ?? 0,
      volume: 0, // Finnhub basic quote doesn't include volume
      marketCap: p.marketCapitalization ? p.marketCapitalization * 1e6 : undefined,
    };
  } catch {
    return null;
  }
}

export async function getCompanyNews(ticker: string): Promise<NewsArticle[]> {
  if (!API_KEY) return [];

  const to = new Date().toISOString().split("T")[0];
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  try {
    const res = await fetch(
      `${BASE_URL}/company-news?symbol=${ticker}&from=${from}&to=${to}&token=${API_KEY}`
    );

    if (!res.ok) return [];

    const data = await res.json();
    return (data || []).slice(0, 20).map(
      (a: Record<string, unknown>) => {
        const title = (a.headline || "") as string;
        const description = (a.summary || "") as string;
        return {
          title,
          description,
          url: a.url as string,
          source: (a.source || "Finnhub") as string,
          publishedAt: new Date(
            ((a.datetime as number) || 0) * 1000
          ).toISOString(),
          sentiment: analyzeSentiment(`${title} ${description}`),
          imageUrl: a.image as string | undefined,
        };
      }
    );
  } catch {
    return [];
  }
}
