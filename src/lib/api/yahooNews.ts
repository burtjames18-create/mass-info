import YahooFinance from "yahoo-finance2";
import type { NewsArticle } from "@/types/news";
import { analyzeSentiment } from "@/lib/sentiment";

/* eslint-disable @typescript-eslint/no-explicit-any */

const yahooFinance = new YahooFinance();

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Request timeout")), ms)
    ),
  ]);
}

function parseYahooNews(news: any[]): NewsArticle[] {
  return (news || [])
    .filter((n: any) => n.title && n.link)
    .map((n: any) => {
      const title = n.title || "";
      const description = n.summary || n.description || "";
      return {
        title,
        description,
        url: n.link,
        source: n.publisher || "Yahoo Finance",
        publishedAt: n.providerPublishTime
          ? new Date(n.providerPublishTime).toISOString()
          : new Date().toISOString(),
        sentiment: analyzeSentiment(`${title} ${description}`),
        imageUrl: n.thumbnail?.resolutions?.[0]?.url,
      };
    });
}

// Crypto sector queries — maps the base symbol (before -USD) to relevant topics
const CRYPTO_QUERIES: Record<string, string[]> = {
  BTC:   ["Bitcoin price", "crypto market", "Bitcoin ETF", "digital assets"],
  ETH:   ["Ethereum price", "Ethereum network", "DeFi", "crypto market"],
  SOL:   ["Solana price", "Solana network", "crypto market"],
  BNB:   ["Binance coin", "Binance exchange", "crypto market"],
  XRP:   ["XRP price", "Ripple", "crypto regulation"],
  DOGE:  ["Dogecoin price", "meme coin", "crypto market"],
  ADA:   ["Cardano price", "ADA crypto", "crypto market"],
  AVAX:  ["Avalanche crypto", "AVAX price", "DeFi"],
  LINK:  ["Chainlink price", "LINK crypto", "DeFi oracle"],
  DOT:   ["Polkadot price", "DOT crypto", "crypto market"],
  MATIC: ["Polygon price", "MATIC crypto", "Layer 2"],
  LTC:   ["Litecoin price", "LTC crypto", "digital payments"],
};

const CRYPTO_MARKET_QUERIES = ["crypto market today", "cryptocurrency regulation", "Bitcoin"];

// Sector mapping for broader context
const SECTOR_QUERIES: Record<string, string[]> = {
  // Tech
  AAPL: ["tech sector", "consumer electronics", "AI technology"],
  MSFT: ["tech sector", "cloud computing", "AI technology"],
  GOOGL: ["tech sector", "digital advertising", "AI technology"],
  GOOG: ["tech sector", "digital advertising", "AI technology"],
  META: ["social media", "digital advertising", "AI technology"],
  AMZN: ["e-commerce", "cloud computing", "consumer spending"],
  NVDA: ["semiconductor", "AI chips", "tech sector"],
  AMD: ["semiconductor", "AI chips", "tech sector"],
  INTC: ["semiconductor", "tech sector"],
  TSM: ["semiconductor", "AI chips"],
  // Finance
  JPM: ["banking sector", "interest rates", "federal reserve"],
  BAC: ["banking sector", "interest rates", "federal reserve"],
  GS: ["banking sector", "wall street", "federal reserve"],
  V: ["consumer spending", "fintech", "payments"],
  MA: ["consumer spending", "fintech", "payments"],
  // Energy
  XOM: ["oil prices", "energy sector", "OPEC"],
  CVX: ["oil prices", "energy sector", "OPEC"],
  // Healthcare
  JNJ: ["healthcare sector", "pharmaceutical", "FDA"],
  PFE: ["pharmaceutical", "FDA", "healthcare sector"],
  UNH: ["healthcare sector", "health insurance"],
  // Auto
  TSLA: ["electric vehicles", "EV market", "auto industry"],
  F: ["auto industry", "EV market", "consumer spending"],
  GM: ["auto industry", "EV market", "consumer spending"],
  // Retail
  WMT: ["retail sector", "consumer spending", "inflation"],
  TGT: ["retail sector", "consumer spending", "inflation"],
  COST: ["retail sector", "consumer spending", "inflation"],
};

// Fallback: broad market queries that affect everything
const MARKET_QUERIES = [
  "stock market today",
  "federal reserve interest rates",
  "US economy",
];

export async function getYahooNews(ticker: string): Promise<NewsArticle[]> {
  // For crypto pairs like BTC-USD, extract the base symbol (BTC)
  const isCrypto = ticker.includes("-USD") || ticker.includes("-BTC");
  const baseSymbol = isCrypto ? ticker.split("-")[0].toUpperCase() : ticker.toUpperCase();

  const queries = isCrypto
    ? [
        baseSymbol,
        ...(CRYPTO_QUERIES[baseSymbol] || [`${baseSymbol} cryptocurrency`, "crypto market"]),
        ...CRYPTO_MARKET_QUERIES.slice(0, 1),
      ]
    : [
        ticker,
        ...(SECTOR_QUERIES[ticker.toUpperCase()] || []),
        ...MARKET_QUERIES.slice(0, 1),
      ];

  const allArticles: NewsArticle[] = [];
  const seenUrls = new Set<string>();

  for (const query of queries) {
    try {
      const result: any = await withTimeout(
        yahooFinance.search(query),
        10000
      );
      const articles = parseYahooNews(result.news || []);
      for (const article of articles) {
        if (!seenUrls.has(article.url)) {
          seenUrls.add(article.url);
          allArticles.push(article);
        }
      }
    } catch {
      // Skip failed queries, continue with others
    }
  }

  // Sort by date descending
  allArticles.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  return allArticles;
}
