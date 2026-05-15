import { NextRequest, NextResponse } from "next/server";
import { getYahooNews } from "@/lib/api/yahooNews";
import { getNews } from "@/lib/api/newsApi";
import { getCompanyNews } from "@/lib/api/finnhub";
import { getCachedNews, cacheNews } from "@/lib/cache";

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get("ticker");

  if (!ticker) {
    return NextResponse.json({ error: "ticker is required" }, { status: 400 });
  }

  try {
    // Check cache first (1 hour)
    const cached = getCachedNews(ticker);
    if (cached.length > 0) {
      return NextResponse.json(cached);
    }

    const isCrypto = ticker.includes("-USD") || ticker.includes("-BTC");
    const baseSymbol = isCrypto ? ticker.split("-")[0] : ticker;

    // Yahoo Finance news is the primary source
    const yahooNews = await getYahooNews(ticker).catch(() => []);

    // NewsAPI: use base symbol for crypto (BTC not BTC-USD), skip Finnhub for crypto
    const [newsApiResults, finnhubResults] = await Promise.all([
      getNews(baseSymbol).catch(() => []),
      isCrypto ? Promise.resolve([]) : getCompanyNews(ticker).catch(() => []),
    ]);

    // Merge all sources and deduplicate by URL
    const seen = new Set<string>();
    const merged = [...yahooNews, ...newsApiResults, ...finnhubResults].filter(
      (a) => {
        if (!a.url || seen.has(a.url)) return false;
        seen.add(a.url);
        return true;
      }
    );

    // Sort by date descending
    merged.sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

    if (merged.length > 0) {
      cacheNews(ticker, merged);
    }

    return NextResponse.json(merged);
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to fetch news: ${error}` },
      { status: 500 }
    );
  }
}
