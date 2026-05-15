"use client";
import type { NewsArticle } from "@/types/news";

interface SentimentGaugeProps {
  articles: NewsArticle[];
}

export default function SentimentGauge({ articles }: SentimentGaugeProps) {
  if (!articles || articles.length === 0) return null;

  const avg = articles.reduce((sum, a) => sum + a.sentiment, 0) / articles.length;
  const percent = ((avg + 5) / 10) * 100;

  const label =
    avg > 2 ? "Very Bullish" :
    avg > 0.3 ? "Bullish" :
    avg < -2 ? "Very Bearish" :
    avg < -0.3 ? "Bearish" : "Neutral";

  const labelColor =
    avg > 0.3 ? "text-green-400" : avg < -0.3 ? "text-red-400" : "text-white/50";

  return (
    <div className="p-4 border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs tracking-[0.2em] uppercase text-white/30">Sentiment</span>
        <span className={`text-xs tracking-wide ${labelColor}`}>{label}</span>
      </div>
      <div className="h-px bg-white/10 relative">
        <div
          className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white border border-black transition-all"
          style={{ left: `${Math.min(Math.max(percent, 2), 98)}%`, transform: "translate(-50%, -50%) rotate(45deg)" }}
        />
      </div>
      <div className="flex justify-between mt-2 text-xs text-white/20">
        <span>Bear</span>
        <span>Bull</span>
      </div>
    </div>
  );
}
