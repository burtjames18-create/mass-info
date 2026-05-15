"use client";
import type { NewsArticle } from "@/types/news";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function sentimentLabel(score: number) {
  if (score > 1) return { text: "POS", color: "text-green-400" };
  if (score < -1) return { text: "NEG", color: "text-red-400" };
  return { text: "NEU", color: "text-white/40" };
}

interface NewsFeedProps {
  articles: NewsArticle[];
  loading?: boolean;
}

export default function NewsFeed({ articles, loading }: NewsFeedProps) {
  if (loading) {
    return (
      <div className="space-y-px">
        {[...Array(5)].map((_, i) => (
          <div key={i} className={`shimmer h-16 stagger-${i + 1}`} />
        ))}
      </div>
    );
  }

  if (!articles || articles.length === 0) {
    return (
      <div className="text-xs text-white/20 tracking-widest uppercase text-center py-8 border border-white/8">
        No data — add API keys in .env.local
      </div>
    );
  }

  return (
    <div className="space-y-px max-h-[600px] overflow-y-auto">
      {articles.map((article, i) => {
        const s = sentimentLabel(article.sentiment);
        return (
          <a
            key={i}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`block px-4 py-3 border-b border-white/5 hover:bg-white/3 transition-colors group animate-fade-in-up stagger-${Math.min(i + 1, 8)}`}
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-xs text-white/60 group-hover:text-white transition-colors line-clamp-2 leading-relaxed">
                {article.title}
              </h3>
              <span className={`text-xs tracking-widest shrink-0 ${s.color}`}>{s.text}</span>
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-white/20">
              <span>{article.source}</span>
              <span>·</span>
              <span>{timeAgo(article.publishedAt)}</span>
            </div>
          </a>
        );
      })}
    </div>
  );
}
