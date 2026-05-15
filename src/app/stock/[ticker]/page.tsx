"use client";
import { useState, useCallback, use, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useStockHistory, useStockQuote } from "@/hooks/useStockData";
import { useNews } from "@/hooks/useNews";
import { usePredictions } from "@/hooks/usePredictions";
import PredictionLegend from "@/components/PredictionLegend";
import SentimentBreakdown from "@/components/SentimentBreakdown";
import NewsFeed from "@/components/NewsFeed";
import SentimentGauge from "@/components/SentimentGauge";
import TradePanel from "@/components/TradePanel";
import { usePortfolio } from "@/hooks/useTrading";
import { useAuth } from "@/components/AuthProvider";
import type { ChartStyle } from "@/components/StockChart";

const INTRADAY_PERIODS = new Set(["1d", "5d", "1m"]);
const isCryptoTicker = (t: string) => t.includes("-USD") || t.includes("-BTC") || t.includes("-ETH");

const StockChart = dynamic(() => import("@/components/StockChart"), {
  ssr: false,
  loading: () => <div className="w-full h-[500px] shimmer" />,
});

export default function StockPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = use(params);
  const upperTicker = ticker.toUpperCase();

  const [period, setPeriod] = useState("1d");
  const [chartStyle, setChartStyle] = useState<ChartStyle>("line");
  const [forecastDays, setForecastDays] = useState(30);
  const [visibleModels, setVisibleModels] = useState<Set<string>>(
    new Set(["sma-20", "sma-50", "linear-trend", "linear-upper", "linear-lower", "exp-smoothing", "sentiment-composite"])
  );

  const { user } = useAuth();
  const { data: history, isLoading: historyLoading } = useStockHistory(upperTicker, period);
  const { data: quote } = useStockQuote(upperTicker);
  const { data: portfolio } = usePortfolio();
  const position = portfolio?.positions.find((p) => p.ticker === upperTicker);
  const { data: news, isLoading: newsLoading } = useNews(upperTicker);
  const { data: predictions } = usePredictions(upperTicker, forecastDays);

  const isIntraday = INTRADAY_PERIODS.has(period);
  const isCrypto = isCryptoTicker(upperTicker);

  // Use last candle close as display price — shows after-hours price on 1d.
  // Falls back to quote API for non-intraday periods.
  const displayPrice = (period === "1d" && history && history.length > 0)
    ? history[history.length - 1].close
    : quote?.price;

  // Flash price when it updates live
  const [priceFlash, setPriceFlash] = useState(false);
  const prevPrice = useRef<number | null>(null);
  useEffect(() => {
    if (displayPrice == null) return;
    if (prevPrice.current !== null && prevPrice.current !== displayPrice) {
      setPriceFlash(true);
      const t = setTimeout(() => setPriceFlash(false), 600);
      return () => clearTimeout(t);
    }
    prevPrice.current = displayPrice;
  }, [displayPrice]);

  const toggleModel = useCallback((model: string) => {
    setVisibleModels((prev) => {
      const next = new Set(prev);
      if (next.has(model)) next.delete(model); else next.add(model);
      return next;
    });
  }, []);

  const isPositive = (quote?.changePercent ?? 0) >= 0;
  const periods = ["1d", "5d", "1m", "3m", "6m", "1y", "2y", "5y"];

  const addToWatchlist = async () => {
    await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker: upperTicker }),
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

      {/* Header */}
      <div className="flex items-start justify-between mb-6 sm:mb-10 animate-fade-in-up">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl sm:text-2xl font-light tracking-[0.1em] text-white">{upperTicker}</h1>
            <button
              onClick={addToWatchlist}
              className="text-xs tracking-[0.2em] uppercase text-white/25 border border-white/12 hover:border-white/40 hover:text-white px-2 sm:px-3 py-1 transition-all"
            >
              + Watch
            </button>
          </div>
          <p className="text-xs text-white/25 tracking-wide">{quote?.name}</p>
        </div>
        <div className="text-right animate-count-up">
          <div
            className="text-2xl sm:text-3xl font-light tracking-tight transition-all duration-100"
            style={{
              color: priceFlash ? "#ffffff" : "rgba(255,255,255,0.9)",
              filter: priceFlash ? "brightness(2.5)" : "brightness(1)",
            }}
          >
            {displayPrice != null
              ? isCrypto && displayPrice < 1
                ? displayPrice.toFixed(6)
                : isCrypto && displayPrice < 100
                  ? displayPrice.toFixed(4)
                  : displayPrice.toFixed(2)
              : "···"}
          </div>
          <div className={`text-xs mt-1 font-medium ${isPositive ? "text-green-400" : "text-red-400"}`}>
            {isPositive ? "+" : ""}{quote?.changePercent?.toFixed(2) ?? "0.00"}%
          </div>
          {period === "1d" && (
            <div className="flex items-center justify-end gap-1.5 mt-1">
              <span className="pulse-dot" />
              <span className="text-xs text-white/25 tracking-widest">LIVE</span>
            </div>
          )}
        </div>
      </div>

      {/* Controls — horizontally scrollable on mobile */}
      <div className="mb-4 animate-fade-in stagger-1">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {periods.map((p) => {
            const isLive = p === "1d";
            const isActive = period === p;
            return (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs tracking-widest uppercase border transition-all shrink-0 ${
                  isActive
                    ? "border-white/50 text-white"
                    : "border-white/10 text-white/30 hover:text-white hover:border-white/30"
                }`}
              >
                {isLive && <span className={`pulse-dot w-1 h-1 ${isActive ? "opacity-100" : "opacity-40"}`} />}
                {isLive ? "1D LIVE" : p}
              </button>
            );
          })}

          <div className="flex border border-white/10 shrink-0 ml-1">
            <button
              onClick={() => setChartStyle("candlestick")}
              className={`px-2.5 py-1 text-xs tracking-wider uppercase transition-all ${
                chartStyle === "candlestick" ? "bg-white/10 text-white" : "text-white/30 hover:text-white"
              }`}
            >
              Candle
            </button>
            <button
              onClick={() => setChartStyle("line")}
              className={`px-2.5 py-1 text-xs tracking-wider uppercase border-l border-white/10 transition-all ${
                chartStyle === "line" ? "bg-white/10 text-white" : "text-white/30 hover:text-white"
              }`}
            >
              Line
            </button>
          </div>

          {!isIntraday && (
            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              <span className="text-xs text-white/20 tracking-widest uppercase hidden sm:inline">Forecast</span>
              {[14, 30, 60, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setForecastDays(d)}
                  className={`px-2 py-1 text-xs border transition-all shrink-0 ${
                    forecastDays === d
                      ? "border-white/40 text-white"
                      : "border-white/8 text-white/25 hover:text-white hover:border-white/30"
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Chart */}
      <div className="animate-fade-in-up stagger-2 mb-4">
        {historyLoading ? (
          <div className="w-full h-[280px] sm:h-[500px] shimmer" />
        ) : history && history.length > 0 ? (
          <StockChart
            data={history}
            predictions={isIntraday ? [] : (predictions || [])}
            visibleModels={visibleModels}
            chartStyle={chartStyle}
            period={period}
            isCrypto={isCrypto}
            ticker={upperTicker}
          />
        ) : (
          <div className="w-full h-[280px] sm:h-[500px] border border-white/8 flex items-center justify-center">
            <span className="text-xs text-white/20 tracking-widest uppercase">No data for {upperTicker}</span>
          </div>
        )}
      </div>

      {/* Prediction Legend */}
      {!isIntraday && predictions && predictions.length > 0 && (
        <div className="mb-6 animate-fade-in stagger-3">
          <PredictionLegend
            predictions={predictions}
            visibleModels={visibleModels}
            onToggle={toggleModel}
          />
        </div>
      )}

      {/* Position summary — shown when user holds this stock */}
      {user && position && (() => {
        const curPrice = displayPrice ?? position.currentPrice;
        const mktValue = curPrice * position.quantity;
        const costBasis = position.avgCost * position.quantity;
        const pnl = mktValue - costBasis;
        const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
        const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return (
        <div className="border border-white/10 mb-6 animate-fade-in-up stagger-3">
          <div className="px-5 py-3 border-b border-white/8">
            <span className="text-xs tracking-[0.25em] uppercase text-white/30">Your Position</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-px">
            <div className="p-4 border-r border-white/8">
              <div className="text-xs tracking-[0.2em] uppercase text-white/20 mb-1.5">Shares</div>
              <div className="text-sm font-light text-white">{position.quantity}</div>
            </div>
            <div className="p-4 border-r border-white/8">
              <div className="text-xs tracking-[0.2em] uppercase text-white/20 mb-1.5">Avg Cost</div>
              <div className="text-sm font-light text-white">${position.avgCost.toFixed(2)}</div>
            </div>
            <div className="p-4 border-r border-white/8">
              <div className="text-xs tracking-[0.2em] uppercase text-white/20 mb-1.5">Current Price</div>
              <div className="text-sm font-light text-white">${curPrice.toFixed(2)}</div>
            </div>
            <div className="p-4 border-r border-white/8">
              <div className="text-xs tracking-[0.2em] uppercase text-white/20 mb-1.5">Market Value</div>
              <div className="text-sm font-light text-white">${fmt(mktValue)}</div>
            </div>
            <div className="p-4">
              <div className="text-xs tracking-[0.2em] uppercase text-white/20 mb-1.5">P&amp;L</div>
              <div className={`text-sm font-medium ${pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                {pnl >= 0 ? "+" : ""}${fmt(pnl)}
              </div>
              <div className={`text-xs mt-0.5 ${pnl >= 0 ? "text-green-400/60" : "text-red-400/60"}`}>
                {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-px border border-white/8 mb-6 animate-fade-in-up stagger-3">
        <SentimentGauge articles={news || []} />

        <div className="p-4 border-r border-white/8">
          <div className="text-xs tracking-[0.2em] uppercase text-white/20 mb-3">Range</div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-white/30">High</span>
            <span className="text-white">{quote?.high?.toFixed(2) ?? "—"}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-white/30">Low</span>
            <span className="text-white">{quote?.low?.toFixed(2) ?? "—"}</span>
          </div>
        </div>

        <div className="p-4 border-r border-white/8">
          <div className="text-xs tracking-[0.2em] uppercase text-white/20 mb-3">Volume</div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-white/30">Vol</span>
            <span className="text-white">
              {quote?.volume ? (quote.volume / 1e6).toFixed(2) + "M" : "—"}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-white/30">Cap</span>
            <span className="text-white">
              {quote?.marketCap
                ? "$" + (quote.marketCap >= 1e12
                    ? (quote.marketCap / 1e12).toFixed(2) + "T"
                    : (quote.marketCap / 1e9).toFixed(2) + "B")
                : "—"}
            </span>
          </div>
        </div>

        <div className="p-4 border-r border-white/8 flex items-center">
          <p className="text-xs text-white/15 leading-relaxed">
            Statistical models only. Not financial advice.
          </p>
        </div>

        <TradePanel ticker={upperTicker} />
      </div>

      {/* Sentiment Breakdown */}
      {visibleModels.has("sentiment-composite") && (
        <div className="animate-fade-in-up stagger-4">
          <SentimentBreakdown articles={news || []} ticker={upperTicker} loading={newsLoading} />
        </div>
      )}

      {/* News */}
      <div className="mt-8 animate-fade-in-up stagger-5">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-xs tracking-[0.3em] uppercase text-white/25">Latest News</span>
          <div className="flex-1 h-px bg-white/8" />
        </div>
        <NewsFeed articles={news || []} loading={newsLoading} />
      </div>

    </div>
  );
}
