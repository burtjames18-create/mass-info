"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const TOP_TICKERS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK-B",
  "JPM", "V", "UNH", "XOM", "MA", "JNJ", "PG", "HD", "COST", "ABBV",
  "BAC", "KO",
];

interface TickerQuote {
  ticker: string;
  price: number | null;
  changePercent: number | null;
}

export default function TickerScroller() {
  const [quotes, setQuotes] = useState<TickerQuote[]>(
    TOP_TICKERS.map((t) => ({ ticker: t, price: null, changePercent: null }))
  );
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchQuotes() {
      const results = await Promise.allSettled(
        TOP_TICKERS.map((t) =>
          fetch(`/api/stock/quote?ticker=${t}`).then((r) => r.json())
        )
      );
      if (cancelled) return;
      setQuotes(
        TOP_TICKERS.map((ticker, i) => {
          const r = results[i];
          if (r.status === "fulfilled" && r.value) {
            return { ticker, price: r.value.price ?? null, changePercent: r.value.changePercent ?? null };
          }
          return { ticker, price: null, changePercent: null };
        })
      );
    }
    fetchQuotes();
    return () => { cancelled = true; };
  }, []);

  // Sort: top 5 gainers first, then middle, then top 5 losers
  const loaded = quotes.filter((q) => q.changePercent !== null);
  const pending = quotes.filter((q) => q.changePercent === null);
  const sorted = [...loaded].sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0));
  const gainers = sorted.slice(0, 5);
  const losers = sorted.slice(-5).reverse();
  const middle = sorted.slice(5, sorted.length - 5);
  const ordered = [...gainers, ...middle, ...losers, ...pending];
  const items = [...ordered, ...ordered];

  // Measure one copy width and set animation duration proportionally
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const halfW = el.scrollWidth / 2;
    if (halfW === 0) return;
    // 80px per second — adjust for feel
    const duration = halfW / 80;
    el.style.setProperty("--scroll-width", `${halfW}px`);
    el.style.setProperty("--scroll-duration", `${duration}s`);
  }, [quotes]);

  return (
    <div className="ticker-scroller w-full bg-black border-b border-white/8 overflow-hidden">
      <div
        ref={trackRef}
        className="ticker-track flex items-center gap-8 px-6 py-2 whitespace-nowrap w-max"
      >
        {items.map((q, i) => {
          const pct = q.changePercent ?? 0;
          const isPositive = pct >= 0;
          const isTopGainer = gainers.some((g) => g.ticker === q.ticker);
          const isTopLoser = losers.some((l) => l.ticker === q.ticker);
          return (
            <Link
              key={`${q.ticker}-${i}`}
              href={`/stock/${q.ticker}`}
              className="flex items-center gap-3 shrink-0 group"
            >
              <span className={`text-xs tracking-[0.2em] transition-colors ${
                isTopGainer ? "text-green-400 group-hover:text-green-300" :
                isTopLoser  ? "text-red-400 group-hover:text-red-300" :
                "text-white/60 group-hover:text-white"
              }`}>
                {q.ticker}
              </span>
              {q.price !== null ? (
                <>
                  <span className="text-xs text-white/80 group-hover:text-white transition-colors">
                    {q.price.toFixed(2)}
                  </span>
                  <span className={`text-xs font-medium ${isPositive ? "text-green-400" : "text-red-400"}`}>
                    {isPositive ? "+" : ""}{pct.toFixed(2)}%
                  </span>
                </>
              ) : (
                <span className="text-xs text-white/15">···</span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
