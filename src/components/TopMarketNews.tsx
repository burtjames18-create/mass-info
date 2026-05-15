"use client";
import useSWR from "swr";
import type { NewsArticle } from "@/types/news";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function sentimentLabel(score: number) {
  if (score > 1) return { text: "BULLISH", color: "text-green-400" };
  if (score < -1) return { text: "BEARISH", color: "text-red-400" };
  return { text: "NEUTRAL", color: "text-white/35" };
}

export default function TopMarketNews() {
  const { data: articles, isLoading } = useSWR<NewsArticle[]>(
    "/api/news/top",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="shimmer h-48" />
        ))}
      </div>
    );
  }

  if (!articles || articles.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-px border border-white/10">
      {articles.map((article, i) => {
        const s = sentimentLabel(article.sentiment);
        return (
          <a
            key={article.url}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`group relative flex flex-col bg-black border-r border-white/8 last:border-r-0 p-5 hover:bg-white/3 transition-colors animate-fade-in-up stagger-${i + 1}`}
          >
            {article.imageUrl && (
              <div className="h-24 overflow-hidden mb-4 border border-white/8">
                <img
                  src={article.imageUrl}
                  alt=""
                  className="w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity duration-300"
                />
              </div>
            )}

            <div className="flex items-center gap-3 mb-3">
              <span className={`text-xs tracking-[0.25em] ${s.color}`}>{s.text}</span>
              <span className="text-xs text-white/20">{timeAgo(article.publishedAt)}</span>
            </div>

            <h3 className="text-xs text-white/60 group-hover:text-white transition-colors leading-relaxed line-clamp-3">
              {article.title}
            </h3>

            <div className="mt-auto pt-4 text-xs text-white/20 tracking-wider">
              {article.source}
            </div>
          </a>
        );
      })}
    </div>
  );
}
