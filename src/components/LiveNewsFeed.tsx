"use client";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import type { NewsArticle } from "@/types/news";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function sentimentColor(score: number) {
  if (score > 1) return "text-green-400";
  if (score < -1) return "text-red-400";
  return "text-white/30";
}

export default function LiveNewsFeed() {
  const { data: articles, isLoading } = useSWR<NewsArticle[]>(
    "/api/news/top",
    fetcher,
    { refreshInterval: 60000, revalidateOnFocus: false }
  );

  const listRef = useRef<HTMLDivElement>(null);
  const [flash, setFlash] = useState(false);
  const prevCountRef = useRef(0);

  // Flash when new articles arrive
  useEffect(() => {
    if (!articles) return;
    if (prevCountRef.current > 0 && articles.length !== prevCountRef.current) {
      setFlash(true);
      setTimeout(() => setFlash(false), 600);
    }
    prevCountRef.current = articles.length;
  }, [articles]);

  // Auto-scroll slowly
  useEffect(() => {
    const el = listRef.current;
    if (!el || !articles || articles.length === 0) return;
    let raf: number;
    let paused = false;
    let pos = 0;

    const tick = () => {
      if (!paused) {
        pos += 0.2;
        if (pos >= el.scrollHeight / 2) pos = 0;
        el.scrollTop = pos;
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
  }, [articles]);

  return (
    <div className="border border-white/10 flex flex-col animate-fade-in-up stagger-2" style={{ height: 320 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8 shrink-0">
        <span className="text-xs tracking-[0.3em] uppercase text-white/30">Live News</span>
        <div className="flex items-center gap-1.5">
          <span
            className="pulse-dot"
            style={{ filter: flash ? "brightness(3)" : "brightness(1)", transition: "filter 0.3s" }}
          />
          <span className="text-xs text-white/15 tracking-widest">60s</span>
        </div>
      </div>

      {/* Feed */}
      <div
        ref={listRef}
        className="overflow-hidden flex-1"
        style={{ WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)" }}
      >
        {isLoading ? (
          <div className="space-y-px p-2">
            {[...Array(6)].map((_, i) => <div key={i} className="shimmer h-12" />)}
          </div>
        ) : !articles || articles.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs text-white/20 tracking-widest uppercase">No data</span>
          </div>
        ) : (
          // Duplicate for seamless scroll loop
          <div>
            {[...articles, ...articles].map((a, i) => (
              <a
                key={`${a.url}-${i}`}
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/3 transition-colors group"
              >
                {a.imageUrl && (
                  <img
                    src={a.imageUrl}
                    alt=""
                    className="w-14 h-14 object-cover shrink-0 opacity-60 group-hover:opacity-90 transition-opacity"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/60 group-hover:text-white transition-colors leading-relaxed line-clamp-2">
                    {a.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-white/20">{a.source}</span>
                    <span className="text-white/10">·</span>
                    <span className="text-xs text-white/20">{timeAgo(a.publishedAt)}</span>
                    <span className={`text-xs ml-auto ${sentimentColor(a.sentiment)}`}>
                      {a.sentiment > 1 ? "▲" : a.sentiment < -1 ? "▼" : "—"}
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
