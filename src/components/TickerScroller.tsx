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
  const scrollRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf: number;
    let paused = false;
    const tick = () => {
      if (!paused) {
        el.scrollLeft += 0.6;
        if (el.scrollLeft >= el.scrollWidth / 2) el.scrollLeft = 0;
      }
      raf = requestAnimationFrame(tick);
    };
    const pause = () => { paused = true; };
    const resume = () => { paused = false; };
    el.addEventListener("mouseenter", pause);
    el.addEventListener("mouseleave", resume);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("mouseenter", pause);
      el.removeEventListener("mouseleave", resume);
    };
  }, [quotes]);

  // Sort loaded quotes: top 5 gainers first, then top 5 losers, then rest
  const loaded = quotes.filter((q) => q.changePercent !== null);
  const pending = quotes.filter((q) => q.changePercent === null);
  const sorted = [...loaded].sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0));
  const gainers = sorted.slice(0, 5);
  const losers = sorted.slice(-5).reverse();
  const middle = sorted.slice(5, sorted.length - 5);
  const ordered = [...gainers, ...middle, ...losers, ...pending];

  const items = [...ordered, ...ordered];

  return (
    <div
      ref={scrollRef}
      className="ticker-scroller w-full bg-black border-b border-white/8 overflow-x-scroll whitespace-nowrap"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      <div className="inline-flex items-center gap-8 px-6 py-2">
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
              <span className="text-xs tracking-[0.2em] text-white/60 group-hover:text-white transition-colors">
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
