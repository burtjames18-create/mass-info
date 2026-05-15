"use client";
import Link from "next/link";
import { useStockQuote, useSparkline } from "@/hooks/useStockData";
import Sparkline from "./Sparkline";

interface WatchlistCardProps {
  ticker: string;
  onRemove: (ticker: string) => void;
}

export default function WatchlistCard({ ticker, onRemove }: WatchlistCardProps) {
  const { data: quote, isLoading, error } = useStockQuote(ticker);
  const { data: history } = useSparkline(ticker);

  if (isLoading) {
    return <div className="shimmer h-36" />;
  }

  if (error) {
    return (
      <div className="card-frame p-4 group">
        <div className="card-frame-inner">
          <Link href={`/stock/${ticker}`} className="text-xs tracking-[0.25em] uppercase text-white">{ticker}</Link>
          <p className="text-xs text-white/20 mt-1">Failed to load</p>
        </div>
      </div>
    );
  }

  const isPositive = (quote?.changePercent ?? 0) >= 0;

  return (
    <Link href={`/stock/${ticker}`} className="block group">
      <div className="card-frame hover-lift animate-fade-in-up cursor-pointer relative">
        <div className="card-frame-inner">
          {/* Header */}
          <div className="flex items-start justify-between px-4 pt-4 pb-2">
            <div>
              <div className="text-xs tracking-[0.3em] uppercase text-white/60 group-hover:text-white transition-colors">
                {ticker}
              </div>
              <div className="text-xs text-white/25 truncate mt-0.5 max-w-[120px]">
                {quote?.name || ticker}
              </div>
            </div>
            <div className="text-right">
              <div className="text-base font-light text-white tracking-tight">
                {quote?.price?.toFixed(2) ?? "—"}
              </div>
              <div className={`text-xs font-medium ${isPositive ? "text-green-400" : "text-red-400"}`}>
                {isPositive ? "+" : ""}{quote?.changePercent?.toFixed(2) ?? "0.00"}%
              </div>
            </div>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-white/20 hover:text-white transition-all p-1"
              title="Remove"
            />
          </div>

          {/* Mini 1D chart */}
          <div className="px-0 pb-0">
            {history && history.length >= 2 ? (
              <Sparkline data={history} width={300} height={56} />
            ) : (
              <div className="h-14 shimmer" />
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
