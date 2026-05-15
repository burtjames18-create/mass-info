"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const CRYPTO_TICKERS = [
  { symbol: "BTC-USD",  name: "BTC" },
  { symbol: "ETH-USD",  name: "ETH" },
  { symbol: "SOL-USD",  name: "SOL" },
  { symbol: "BNB-USD",  name: "BNB" },
  { symbol: "XRP-USD",  name: "XRP" },
  { symbol: "DOGE-USD", name: "DOGE" },
  { symbol: "ADA-USD",  name: "ADA" },
  { symbol: "AVAX-USD", name: "AVAX" },
  { symbol: "LINK-USD", name: "LINK" },
  { symbol: "DOT-USD",  name: "DOT" },
  { symbol: "MATIC-USD",name: "MATIC" },
  { symbol: "LTC-USD",  name: "LTC" },
];

interface CryptoQuote {
  symbol: string;
  name: string;
  price: number | null;
  changePercent: number | null;
}

export default function CryptoScroller() {
  const [quotes, setQuotes] = useState<CryptoQuote[]>(
    CRYPTO_TICKERS.map((t) => ({ ...t, price: null, changePercent: null }))
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchQuotes() {
      const results = await Promise.allSettled(
        CRYPTO_TICKERS.map((t) =>
          fetch(`/api/stock/quote?ticker=${t.symbol}`).then((r) => r.json())
        )
      );
      if (cancelled) return;
      setQuotes(
        CRYPTO_TICKERS.map((t, i) => {
          const r = results[i];
          if (r.status === "fulfilled" && r.value?.price) {
            return { ...t, price: r.value.price, changePercent: r.value.changePercent ?? null };
          }
          return { ...t, price: null, changePercent: null };
        })
      );
    }
    fetchQuotes();
    const interval = setInterval(fetchQuotes, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf: number;
    let paused = false;
    const tick = () => {
      if (!paused && el.scrollWidth > el.clientWidth) {
        el.scrollLeft += 1.0;
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

  const items = [...quotes, ...quotes];

  const formatPrice = (price: number) => {
    if (price >= 1000) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(6);
  };

  return (
    <div
      ref={scrollRef}
      className="w-full bg-black border-b border-white/8 overflow-x-scroll whitespace-nowrap"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      <div className="inline-flex items-center gap-8 px-6 py-2">
        {items.map((q, i) => {
          const pct = q.changePercent ?? 0;
          const isPositive = pct >= 0;
          return (
            <Link
              key={`${q.symbol}-${i}`}
              href={`/stock/${q.symbol}`}
              className="flex items-center gap-3 shrink-0 group"
            >
              <span className="text-xs tracking-[0.2em] text-white/50 group-hover:text-white transition-colors">
                {q.name}
              </span>
              {q.price !== null ? (
                <>
                  <span className="text-xs text-white/80 group-hover:text-white transition-colors">
                    ${formatPrice(q.price)}
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
