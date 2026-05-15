"use client";
import { useEffect, useState, useCallback } from "react";
import WatchlistCard from "@/components/WatchlistCard";
import TopMarketNews from "@/components/TopMarketNews";

interface WatchlistItem {
  ticker: string;
  addedAt: string;
}

const DEFAULT_TICKERS = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA"];

// Deterministic scatter positions for + markers
const MARKERS = [
  { top: "8%",  left: "3%" },
  { top: "15%", left: "91%" },
  { top: "32%", left: "7%" },
  { top: "28%", left: "78%" },
  { top: "51%", left: "95%" },
  { top: "60%", left: "2%" },
  { top: "72%", left: "88%" },
  { top: "85%", left: "12%" },
  { top: "91%", left: "68%" },
  { top: "44%", left: "52%" },
];

export default function HomePage() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWatchlist = useCallback(async () => {
    try {
      const res = await fetch("/api/watchlist");
      const data = await res.json();
      setWatchlist(Array.isArray(data) ? data : []);
    } catch {
      setWatchlist([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWatchlist(); }, [fetchWatchlist]);

  const removeFromWatchlist = async (ticker: string) => {
    await fetch("/api/watchlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker }),
    });
    setWatchlist((prev) => prev.filter((w) => w.ticker !== ticker));
  };

  const addDefaultTickers = async () => {
    for (const ticker of DEFAULT_TICKERS) {
      await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      });
    }
    fetchWatchlist();
  };

  return (
    <div className="relative min-h-screen">
      {/* Astrographic background markers */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        {MARKERS.map((m, i) => (
          <span
            key={i}
            className="marker animate-marker-pop"
            style={{ top: m.top, left: m.left, animationDelay: `${i * 0.12}s` }}
          >
            +
          </span>
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16 relative">

        {/* Hero */}
        <div className="mb-20 animate-fade-in-up">
          <div className="text-xs tracking-[0.5em] uppercase text-white/20 mb-4">
            Market Intelligence System
          </div>
          <h1 className="text-5xl font-extralight tracking-tight text-white leading-none mb-4">
            Mass Info
          </h1>
          <div className="w-12 h-px bg-white/20 mb-6" />
          <p className="text-xs text-white/30 max-w-md leading-relaxed tracking-wide">
            Stock data, news aggregation, and multi-model prediction lines.
            Search for any ticker to view historical charts with forecasts.
          </p>
        </div>

        {/* Quick access tickers */}
        <div className="mb-16 animate-fade-in-up stagger-2">
          <div className="text-xs tracking-[0.3em] uppercase text-white/20 mb-4">Quick Access</div>
          <div className="flex items-center gap-3 flex-wrap">
            {DEFAULT_TICKERS.map((t, i) => (
              <a
                key={t}
                href={`/stock/${t}`}
                className={`px-4 py-2 text-xs tracking-[0.2em] uppercase border border-white/15 text-white/40 hover:text-white hover:border-white/50 transition-all animate-fade-in-up stagger-${i + 1}`}
              >
                {t}
              </a>
            ))}
          </div>
        </div>

        {/* Watchlist */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-6 animate-fade-in">
            <div className="flex items-center gap-4">
              <span className="text-xs tracking-[0.3em] uppercase text-white/40">Watchlist</span>
              <div className="w-8 h-px bg-white/10" />
              <span className="text-xs text-white/15">{watchlist.length}</span>
            </div>
            {watchlist.length === 0 && !loading && (
              <button
                onClick={addDefaultTickers}
                className="text-xs tracking-[0.2em] uppercase text-white/25 border border-white/12 hover:border-white/40 hover:text-white px-4 py-1.5 transition-all"
              >
                Add Defaults
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px">
              {[...Array(6)].map((_, i) => (
                <div key={i} className={`shimmer h-28 stagger-${i + 1}`} />
              ))}
            </div>
          ) : watchlist.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px">
              {watchlist.map((item, i) => (
                <div key={item.ticker} className={`stagger-${Math.min(i + 1, 8)}`}>
                  <WatchlistCard ticker={item.ticker} onRemove={removeFromWatchlist} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 border border-white/8 animate-fade-in">
              <p className="text-xs text-white/20 tracking-widest uppercase">No stocks in watchlist</p>
              <p className="text-xs text-white/10 mt-2">Search for a stock above or add defaults</p>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-10 animate-fade-in">
          <div className="flex-1 h-px bg-white/8" />
          <span className="text-xs tracking-[0.3em] uppercase text-white/15">Market Stories</span>
          <div className="flex-1 h-px bg-white/8" />
        </div>

        {/* Top Market News */}
        <div className="mb-16 animate-fade-in-up stagger-3">
          <TopMarketNews />
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px border border-white/8 animate-fade-in-up stagger-4">
          {[
            {
              id: "01",
              title: "Multi-Model Predictions",
              desc: "7 prediction lines from 4 models: Moving Averages, Linear Regression, Exponential Smoothing, Sentiment-Adjusted Composite.",
            },
            {
              id: "02",
              title: "News Aggregation",
              desc: "Real-time news from multiple sources with automatic sentiment analysis. See how market sentiment affects predictions.",
            },
            {
              id: "03",
              title: "Interactive Charts",
              desc: "TradingView-powered candlestick charts with toggleable prediction overlays. Adjust timeframes and forecast horizons.",
            },
          ].map((feat) => (
            <div key={feat.id} className="p-6 border-r border-white/8 last:border-r-0">
              <div className="text-xs tracking-[0.4em] text-white/15 mb-4">{feat.id}</div>
              <div className="text-xs tracking-wider text-white/60 mb-3">{feat.title}</div>
              <p className="text-xs text-white/25 leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
