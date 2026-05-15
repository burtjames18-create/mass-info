"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { SearchResult } from "@/types/stock";

export default function TickerSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 1) { setResults([]); setOpen(false); return; }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stock/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query]);

  const handleSelect = (ticker: string) => {
    setQuery("");
    setOpen(false);
    router.push(`/stock/${ticker}`);
  };

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <div className="relative flex items-center">
        <svg
          className="absolute left-3 w-3.5 h-3.5 text-white/20"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search ticker or company"
          className="w-full pl-9 pr-4 py-2 bg-transparent border border-white/10 text-white text-xs tracking-wider placeholder-white/20 focus:outline-none focus:border-white/35 transition-colors"
        />
        {loading && (
          <div className="absolute right-3 w-3 h-3 border border-white/20 border-t-white/60 rounded-full animate-spin" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-black border border-white/15 shadow-2xl z-50 animate-fade-in-up">
          {results.map((r) => (
            <button
              key={r.ticker}
              onClick={() => handleSelect(r.ticker)}
              className="w-full px-4 py-2.5 text-left border-b border-white/6 last:border-b-0 hover:bg-white/5 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs tracking-[0.2em] text-white">{r.ticker}</span>
                <span className="text-xs text-white/30 truncate max-w-48">{r.name}</span>
              </div>
              <span className="text-xs text-white/15 tracking-wider">{r.exchange}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
