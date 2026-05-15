"use client";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import {
  createChart,
  ColorType,
  LineSeries,
  type IChartApi,
} from "lightweight-charts";

interface PerfPoint { time: number; value: number; }

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error("Not authenticated");
  return r.json();
});

const PERIODS = ["1d", "5d", "1m", "3m", "6m", "1y", "all"] as const;
type Period = typeof PERIODS[number];

const STARTING = 100000;

export default function PortfolioChart() {
  const [period, setPeriod] = useState<Period>("all");
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ReturnType<IChartApi["addSeries"]> | null>(null);

  const { data, isLoading } = useSWR<PerfPoint[]>(
    `/api/trading/performance?period=${period}`,
    fetcher,
    { refreshInterval: period === "1d" ? 5000 : 30000, revalidateOnFocus: true }
  );

  // Create chart on mount only
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: "#000" }, textColor: "rgba(255,255,255,0.25)" },
      grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
      width: containerRef.current.clientWidth,
      height: 260,
      crosshair: { mode: 1 },
      timeScale: {
        borderColor: "rgba(255,255,255,0.08)",
        timeVisible: period === "1d",
        secondsVisible: false,
        rightOffset: 8,
        tickMarkFormatter: period === "1d"
          ? (time: number) => {
              const month = new Date(time * 1000).getUTCMonth();
              const isDST = month >= 2 && month <= 10;
              const et = new Date(time * 1000 + (isDST ? -4 : -5) * 3600_000);
              const h = et.getUTCHours(), m = et.getUTCMinutes().toString().padStart(2, "0");
              return `${h % 12 || 12}:${m} ${h >= 12 ? "PM" : "AM"}`;
            }
          : undefined,
      },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.08)", autoScale: true, scaleMargins: { top: 0.1, bottom: 0.1 } },
      localization: {
        priceFormatter: (p: number) => `$${p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      },
    });
    chartRef.current = chart;
    const handleResize = () => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener("resize", handleResize);
    return () => { window.removeEventListener("resize", handleResize); chart.remove(); chartRef.current = null; seriesRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update time scale options when period changes
  useEffect(() => {
    if (!chartRef.current) return;
    const isIntraday = period === "1d";
    chartRef.current.applyOptions({
      timeScale: {
        timeVisible: isIntraday,
        tickMarkFormatter: isIntraday
          ? (time: number) => {
              const month = new Date(time * 1000).getUTCMonth();
              const isDST = month >= 2 && month <= 10;
              const et = new Date(time * 1000 + (isDST ? -4 : -5) * 3600_000);
              const h = et.getUTCHours(), m = et.getUTCMinutes().toString().padStart(2, "0");
              return `${h % 12 || 12}:${m} ${h >= 12 ? "PM" : "AM"}`;
            }
          : undefined,
      },
    });
  }, [period]);

  // Load data into chart
  useEffect(() => {
    if (!chartRef.current || !data || data.length < 2) return;
    const chart = chartRef.current;

    // Remove old series if exists
    if (seriesRef.current) {
      try { chart.removeSeries(seriesRef.current); } catch {}
      seriesRef.current = null;
    }

    const isPositive = data[data.length - 1].value >= STARTING;
    const color = isPositive ? "#22c55e" : "#ef4444";

    const series = chart.addSeries(LineSeries, {
      color,
      lineWidth: 1,
      priceLineVisible: true,
      priceLineColor: "rgba(255,255,255,0.15)",
      lastValueVisible: true,
    });
    seriesRef.current = series;

    series.createPriceLine({ price: STARTING, color: "rgba(255,255,255,0.1)", lineWidth: 1, lineStyle: 3, axisLabelVisible: false });

    const sorted = [...data].sort((a, b) => a.time - b.time);
    const seen = new Set<number>();
    const deduped = sorted.filter((p) => { if (seen.has(p.time)) return false; seen.add(p.time); return true; });
    series.setData(deduped.map((p) => ({ time: p.time as any, value: p.value })));
    chart.timeScale().fitContent();
  }, [data]);

  const current = data && data.length > 0 ? data[data.length - 1].value : STARTING;
  const pnl = current - STARTING;
  const pnlPct = (pnl / STARTING) * 100;
  const isPositive = pnl >= 0;
  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="border border-white/10 mb-10 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
        <div className="flex items-center gap-4">
          <span className="text-xs tracking-[0.25em] uppercase text-white/30">Portfolio Value</span>
          {period === "1d" && <span className="pulse-dot" />}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-base font-light text-white">${fmt(current)}</span>
          <span className={`text-xs font-medium ${isPositive ? "text-green-400" : "text-red-400"}`}>
            {isPositive ? "+" : ""}${fmt(pnl)} ({isPositive ? "+" : ""}{pnlPct.toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-white/8">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1 text-xs tracking-widest uppercase border transition-all ${
              period === p
                ? "border-white/50 text-white"
                : "border-white/10 text-white/30 hover:text-white hover:border-white/30"
            }`}
          >
            {p === "all" ? "ALL" : p.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="relative">
        {isLoading && <div className="absolute inset-0 shimmer h-[260px] z-10" />}
        <div ref={containerRef} className="w-full" style={{ height: 260 }} />
      </div>
    </div>
  );
}
