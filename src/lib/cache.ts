import { getDb } from "./db";
import type { OHLCV } from "@/types/stock";
import type { NewsArticle } from "@/types/news";

export function getCachedPrices(ticker: string): OHLCV[] {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT date, open, high, low, close, volume FROM price_cache WHERE ticker = ? ORDER BY date ASC"
    )
    .all(ticker.toUpperCase()) as OHLCV[];
  return rows;
}

export function cachePrices(ticker: string, data: OHLCV[]): void {
  const db = getDb();
  const stmt = db.prepare(
    "INSERT OR REPLACE INTO price_cache (ticker, date, open, high, low, close, volume) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  const tx = db.transaction(() => {
    for (const d of data) {
      // Only cache daily bars (yyyy-mm-dd strings) — never intraday Unix timestamps
      if (typeof d.date === "number") continue;
      const n = parseFloat(d.date as string);
      if (!isNaN(n) && n > 1e8) continue; // skip intraday float strings
      stmt.run(ticker.toUpperCase(), d.date, d.open, d.high, d.low, d.close, d.volume);
    }
  });
  tx();
}

export function getCachedNews(ticker: string, maxAgeMinutes = 60): NewsArticle[] {
  const db = getDb();
  const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000).toISOString();
  const rows = db
    .prepare(
      "SELECT title, description, url, source, published_at as publishedAt, sentiment_score as sentiment, image_url as imageUrl FROM news_cache WHERE ticker = ? AND fetched_at > ? ORDER BY published_at DESC"
    )
    .all(ticker.toUpperCase(), cutoff) as NewsArticle[];
  return rows;
}

export function cacheNews(ticker: string, articles: NewsArticle[]): void {
  const db = getDb();
  const now = new Date().toISOString();
  // Clear old cache for this ticker
  db.prepare("DELETE FROM news_cache WHERE ticker = ?").run(ticker.toUpperCase());
  const stmt = db.prepare(
    "INSERT INTO news_cache (ticker, title, description, url, source, published_at, sentiment_score, image_url, fetched_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const tx = db.transaction(() => {
    for (const a of articles) {
      stmt.run(
        ticker.toUpperCase(),
        a.title,
        a.description,
        a.url,
        a.source,
        a.publishedAt,
        a.sentiment,
        a.imageUrl || null,
        now
      );
    }
  });
  tx();
}
