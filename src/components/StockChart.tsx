"use client";
import { useEffect, useRef, useState } from "react";
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type SeriesType,
  ColorType,
  LineStyle,
  CandlestickSeries,
  LineSeries,
} from "lightweight-charts";
import type { OHLCV } from "@/types/stock";
import type { PredictionLine } from "@/types/prediction";

export type ChartStyle = "candlestick" | "line";

function hexToRgb(hex: string) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
}

const INTRADAY_PERIODS = new Set(["1d", "5d", "1m"]);

// Session zones in UTC — these are the fixed UTC times for US market sessions:
//   Pre-market:  08:00–13:30 UTC (4:00am–9:30am ET during EDT / 3:00am–8:30am ET during EST)
//   Regular:     13:30–20:00 UTC (9:30am–4:00pm ET)
//   After-hours: 20:00–00:00 UTC (4:00pm–8:00pm ET)
//   Overnight:   00:00–08:00 UTC
// Using UTC directly avoids browser timezone issues since the chart's timeToCoordinate
// operates on raw Unix seconds regardless of local timezone.
function getSession(unixSec: number): "pre-market" | "regular" | "after-hours" | "overnight" {
  const d = new Date(unixSec * 1000);
  const utcMinutes = d.getUTCHours() * 60 + d.getUTCMinutes();
  // All times in UTC minutes
  if (utcMinutes >= 480  && utcMinutes < 810)  return "pre-market";   // 08:00–13:30 UTC
  if (utcMinutes >= 810  && utcMinutes < 1200) return "regular";       // 13:30–20:00 UTC
  if (utcMinutes >= 1200 && utcMinutes < 1440) return "after-hours";   // 20:00–24:00 UTC
  return "overnight";                                                    // 00:00–08:00 UTC
}

const SESSION_COLORS = {
  "pre-market":   "rgba(255,255,255,0.03)",
  "regular":      "rgba(255,255,255,0.06)",
  "after-hours":  "rgba(255,255,255,0.03)",
  "overnight":    "rgba(0,0,0,0)",
};

const SESSION_LABELS = {
  "pre-market":  "PRE-MARKET",
  "regular":     "REGULAR HOURS",
  "after-hours": "AFTER HOURS",
  "overnight":   "OVERNIGHT",
};

// Normalize a date for lightweight-charts.
// intraday=true  → integer Unix seconds (UTCTimestamp)
// intraday=false → "yyyy-mm-dd" string (BusinessDay)
function normalizeDate(raw: string | number, intraday: boolean): number | string {
  // Get a reliable ms value regardless of input format
  let ms: number;
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    ms = new Date(raw).getTime();
  } else {
    const n = typeof raw === "number" ? raw : parseFloat(raw as string);
    // Distinguish Unix seconds from milliseconds
    ms = n < 1e10 ? n * 1000 : n;
  }

  if (intraday) return Math.floor(ms / 1000);
  return new Date(ms).toISOString().split("T")[0];
}

interface StockChartProps {
  data: OHLCV[];
  predictions: PredictionLine[];
  visibleModels: Set<string>;
  chartStyle: ChartStyle;
  period?: string;
  isCrypto?: boolean;
  ticker?: string;
}

export default function StockChart({
  data,
  predictions,
  visibleModels,
  chartStyle,
  period = "1y",
  isCrypto = false,
  ticker = "",
}: StockChartProps) {
  const isIntraday = INTRADAY_PERIODS.has(period);
  const containerRef = useRef<HTMLDivElement>(null);
  const glintCanvasRef = useRef<HTMLCanvasElement>(null);
  const sessionCanvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
  const predSeriesRef = useRef<Map<string, ISeriesApi<SeriesType>>>(new Map());
  const predAnimRef = useRef<number[]>([]);
  const drawRaf = useRef<number>(0);
  const pulseRaf = useRef<number>(0);
  const [phase, setPhase] = useState<"animating" | "done">("animating");
  const dataIdRef = useRef(0);
  const hasAnimatedRef = useRef(false);
  const lastTickerRef = useRef<string>("");
  const [chartReady, setChartReady] = useState(0);
  const chartHeight = typeof window !== "undefined" && window.innerWidth < 640 ? 280 : 500;

  // Create chart
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#000000" },
        textColor: "rgba(255,255,255,0.25)",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      width: containerRef.current.clientWidth,
      height: chartHeight,
      crosshair: { mode: 0 },
      localization: isIntraday ? {
        timeFormatter: (time: number) => {
          const month = new Date(time * 1000).getUTCMonth();
          const isDST = month >= 2 && month <= 10;
          const etOffset = isDST ? -4 : -5;
          const et = new Date(time * 1000 + etOffset * 3600_000);
          const h = et.getUTCHours();
          const m = et.getUTCMinutes().toString().padStart(2, "0");
          const ampm = h >= 12 ? "PM" : "AM";
          const h12 = h % 12 || 12;
          const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
          return `${months[et.getUTCMonth()]} ${et.getUTCDate()}  ${h12}:${m} ${ampm} ET`;
        },
      } : undefined,
      timeScale: {
        borderColor: "rgba(255,255,255,0.08)",
        timeVisible: isIntraday,
        secondsVisible: false,
        rightOffset: 12,
        fixLeftEdge: false,
        fixRightEdge: false,
        tickMarkFormatter: isIntraday
          ? (time: number) => {
              const month = new Date(time * 1000).getUTCMonth();
              const isDST = month >= 2 && month <= 10;
              const etOffset = isDST ? -4 : -5;
              const et = new Date(time * 1000 + etOffset * 3600_000);
              const h = et.getUTCHours();
              const m = et.getUTCMinutes().toString().padStart(2, "0");
              const ampm = h >= 12 ? "PM" : "AM";
              const h12 = h % 12 || 12;
              return `${h12}:${m} ${ampm}`;
            }
          : undefined,
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.08)",
        autoScale: true,
        scaleMargins: { top: 0.05, bottom: 0.05 },
      },
    });

    chartRef.current = chart;
    hasAnimatedRef.current = false;

    if (chartStyle === "candlestick") {
      seriesRef.current = chart.addSeries(CandlestickSeries, {
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderDownColor: "#ef4444",
        borderUpColor: "#22c55e",
        wickDownColor: "#ef4444",
        wickUpColor: "#22c55e",
      });
    } else {
      seriesRef.current = chart.addSeries(LineSeries, {
        color: "rgba(255,255,255,0.7)",
        lineWidth: 1,
      });
    }

    // Signal to the data effect that chart+series are ready
    setChartReady((n) => n + 1);

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (drawRaf.current) cancelAnimationFrame(drawRaf.current);
      if (pulseRaf.current) cancelAnimationFrame(pulseRaf.current);
      predAnimRef.current.forEach(clearTimeout);
      predAnimRef.current = [];
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      predSeriesRef.current.clear();
    };
  }, [chartStyle, period, isIntraday]);

  // Load data + prediction placeholders + run glint animation (first load only)
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current || !data.length) return;

    const series = seriesRef.current;
    const chart = chartRef.current;
    const canvas = glintCanvasRef.current;
    // Reset animation only when ticker changes (not on period switch or live refresh)
    if (ticker !== lastTickerRef.current) {
      lastTickerRef.current = ticker;
      hasAnimatedRef.current = false;
    }
    const isFirstLoad = !hasAnimatedRef.current;

    dataIdRef.current += 1;
    const myId = dataIdRef.current;

    if (drawRaf.current) cancelAnimationFrame(drawRaf.current);

    // Clear old prediction series
    for (const [, s] of predSeriesRef.current) {
      try { chart.removeSeries(s); } catch {}
    }
    predSeriesRef.current.clear();

    // Convert _t (Unix seconds OR "yyyy-mm-dd") to milliseconds for safe comparison
    const toMs = (t: number | string): number =>
      typeof t === "number" ? t * 1000 : new Date(t).getTime();

    const nowMs = Date.now() + 86400_000;
    const normalized = data
      .map((d) => ({ ...d, _t: normalizeDate(d.date, isIntraday) }))
      .filter((d) => toMs(d._t) <= nowMs)
      .sort((a, b) => toMs(a._t) - toMs(b._t))
      .filter((d, i, arr) => i === 0 || toMs(d._t) !== toMs(arr[i - 1]._t));

    if (chartStyle === "candlestick") {
      series.setData(
        normalized.map((d) => ({
          time: d._t as any,
          open: d.open, high: d.high, low: d.low, close: d.close,
        }))
      );
    } else {
      series.setData(
        normalized.map((d) => ({ time: d._t as any, value: d.close }))
      );
    }

    // Add all prediction series — always, regardless of first/subsequent load
    for (const pred of predictions) {
      if (!visibleModels.has(pred.model)) continue;
      const isBand = pred.model.includes("upper") || pred.model.includes("lower");
      const predSeries = chart.addSeries(LineSeries, {
        color: "rgba(0,0,0,0)",
        lineWidth: isBand ? 1 : 2,
        lineStyle: isBand ? LineStyle.Dashed : LineStyle.Solid,
        title: "",
        lastValueVisible: false,
        priceLineVisible: false,
      });
      predSeries.setData(pred.points.map((p) => ({ time: normalizeDate(p.date, isIntraday) as any, value: p.price })));
      predSeriesRef.current.set(pred.model, predSeries);
    }

    // On live data updates (not first load): update silently, fade in predictions, keep pulse
    if (!isFirstLoad) {
      requestAnimationFrame(() => { chart.timeScale().fitContent(); });
      const lastD = normalized[normalized.length - 1];
      if (canvas) startPulse(canvas, lastD._t, lastD.close, myId);
      // Still fade in predictions if they just arrived
      setPhase("done");
      return;
    }

    hasAnimatedRef.current = true;
    setPhase("animating");
    if (pulseRaf.current) cancelAnimationFrame(pulseRaf.current);

    if (!canvas || !containerRef.current) {
      requestAnimationFrame(() => { chart.timeScale().fitContent(); });
      setPhase("done");
      return;
    }

    const fitTimer = setTimeout(() => {
      if (dataIdRef.current !== myId) return;
      chart.timeScale().fitContent();

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (dataIdRef.current !== myId) return;

          const w = containerRef.current!.clientWidth;
          const h = chartHeight;
          canvas.width = w * window.devicePixelRatio;
          canvas.height = h * window.devicePixelRatio;
          canvas.style.width = w + "px";
          canvas.style.height = h + "px";

          const ctx = canvas.getContext("2d");
          if (!ctx) { setPhase("done"); return; }
          ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

          const points: { x: number; y: number }[] = [];
          for (const d of normalized) {
            const tx = chart.timeScale().timeToCoordinate(d._t as any);
            if (tx === null) continue;
            const py = series.priceToCoordinate(d.close);
            if (py !== null) points.push({ x: tx, y: py });
          }

          if (points.length < 2) { setPhase("done"); return; }

          const lastDataX = points[points.length - 1].x;
          const lastDataY = points[points.length - 1].y;

          const candlePixels: { x: number; yHigh: number; yLow: number; yOpen: number; yClose: number; }[] = [];
          let halfBodyW = 3;
          if (chartStyle === "candlestick") {
            for (const d of normalized) {
              const tx = chart.timeScale().timeToCoordinate(d._t as any);
              if (tx === null) continue;
              const yHigh = series.priceToCoordinate(d.high);
              const yLow = series.priceToCoordinate(d.low);
              const yOpen = series.priceToCoordinate(d.open);
              const yClose = series.priceToCoordinate(d.close);
              if (yHigh === null || yLow === null || yOpen === null || yClose === null) continue;
              candlePixels.push({ x: tx, yHigh, yLow, yOpen, yClose });
            }
            if (candlePixels.length >= 2) {
              const spacing = (candlePixels[candlePixels.length - 1].x - candlePixels[0].x) / (candlePixels.length - 1);
              halfBodyW = Math.max(4, spacing * 0.48);
            }
          }

          const maskUnrevealed = (fromX: number, fromY: number) => {
            if (chartStyle === "candlestick") {
              ctx.fillStyle = "#000000";
              for (const cp of candlePixels) {
                if (cp.x > fromX) {
                  ctx.fillRect(cp.x - 2, cp.yHigh - 1, 4, cp.yLow - cp.yHigh + 2);
                  const bodyTop = Math.min(cp.yOpen, cp.yClose);
                  const bodyH = Math.max(1, Math.abs(cp.yClose - cp.yOpen));
                  ctx.fillRect(cp.x - halfBodyW - 1, bodyTop - 1, (halfBodyW + 1) * 2, bodyH + 2);
                }
              }
            } else if (fromX < lastDataX) {
              ctx.strokeStyle = "#000000";
              ctx.lineWidth = 5;
              ctx.lineJoin = "round";
              ctx.lineCap = "round";
              ctx.beginPath();
              ctx.moveTo(fromX, fromY);
              for (const pt of points) {
                if (pt.x > fromX) ctx.lineTo(pt.x, pt.y);
              }
              ctx.stroke();
            }
          };

          ctx.clearRect(0, 0, w, h);
          maskUnrevealed(-Infinity, 0);

          const segments: number[] = [0];
          let totalLen = 0;
          for (let i = 1; i < points.length; i++) {
            const dx = points[i].x - points[i - 1].x;
            const dy = points[i].y - points[i - 1].y;
            totalLen += Math.sqrt(dx * dx + dy * dy);
            segments.push(totalLen);
          }

          const duration = 2500;
          const startTime = performance.now();

          const tick = (now: number) => {
            if (dataIdRef.current !== myId) return;

            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 4);
            const targetLen = eased * totalLen;

            let endIdx = points.length - 1;
            let endFrac = 1;
            for (let i = 1; i < segments.length; i++) {
              if (segments[i] >= targetLen) {
                endIdx = i;
                const segStart = segments[i - 1];
                const segEnd = segments[i];
                endFrac = (targetLen - segStart) / (segEnd - segStart);
                break;
              }
            }

            const leadX = endIdx > 0
              ? points[endIdx - 1].x + (points[endIdx].x - points[endIdx - 1].x) * endFrac
              : points[0].x;
            const leadY = endIdx > 0
              ? points[endIdx - 1].y + (points[endIdx].y - points[endIdx - 1].y) * endFrac
              : points[0].y;

            ctx.clearRect(0, 0, w, h);
            maskUnrevealed(leadX, leadY);

            // Travelling glint
            const gradient = ctx.createRadialGradient(leadX, leadY, 0, leadX, leadY, 18);
            gradient.addColorStop(0, "rgba(255, 255, 255, 0.9)");
            gradient.addColorStop(0.3, "rgba(255, 255, 255, 0.3)");
            gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
            ctx.beginPath();
            ctx.arc(leadX, leadY, 18, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(leadX, leadY, 3, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
            ctx.fill();

            if (progress < 1) {
              drawRaf.current = requestAnimationFrame(tick);
            } else {
              ctx.clearRect(0, 0, w, h);
              setPhase("done");
              // Hand off to pulse — pass the last data point's time+price so it
              // can recalculate pixel position on every frame (stays correct on resize)
              const lastD = normalized[normalized.length - 1];
              startPulse(canvas, lastD._t, lastD.close, myId);
            }
          };

          drawRaf.current = requestAnimationFrame(tick);
        });
      });
    }, 50);

    return () => {
      clearTimeout(fitTimer);
      if (drawRaf.current) cancelAnimationFrame(drawRaf.current);
      if (pulseRaf.current) cancelAnimationFrame(pulseRaf.current);
    };
  }, [data, chartStyle, predictions, visibleModels, isIntraday, chartReady]);

  // Persistent pulse — recalculates pixel position each frame so it survives resize
  const startPulse = (
    canvas: HTMLCanvasElement,
    lastTime: number | string,
    lastPrice: number,
    myId: number
  ) => {
    if (pulseRaf.current) cancelAnimationFrame(pulseRaf.current);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pulseStart = performance.now();
    const PERIOD = 2000;

    const drawPulse = (now: number) => {
      if (dataIdRef.current !== myId) return;
      const chart = chartRef.current;
      const series = seriesRef.current;
      const container = containerRef.current;
      if (!chart || !series || !container) return;

      // Recalculate pixel position from data coords every frame
      const px = chart.timeScale().timeToCoordinate(lastTime as any);
      const py = series.priceToCoordinate(lastPrice);

      const w = container.clientWidth;
      const h = 500;
      const dpr = window.devicePixelRatio || 1;

      // Resize canvas if needed
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = w + "px";
        canvas.style.height = h + "px";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      ctx.clearRect(0, 0, w, h);

      if (px === null || py === null) {
        pulseRaf.current = requestAnimationFrame(drawPulse);
        return;
      }

      const t = ((now - pulseStart) % PERIOD) / PERIOD;
      for (const rt of [t, (t + 0.35) % 1]) {
        const radius = rt * 22;
        const alpha = (1 - rt) * 0.45;
        if (alpha <= 0 || radius <= 0) continue;
        const grad = ctx.createRadialGradient(px, py, 0, px, py, radius);
        grad.addColorStop(0, `rgba(255,255,255,0)`);
        grad.addColorStop(0.6, `rgba(255,255,255,${alpha * 0.4})`);
        grad.addColorStop(1, `rgba(255,255,255,0)`);
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fill();

      pulseRaf.current = requestAnimationFrame(drawPulse);
    };

    pulseRaf.current = requestAnimationFrame(drawPulse);
  };

  // Fade prediction lines in after glint finishes
  useEffect(() => {
    predAnimRef.current.forEach(clearTimeout);
    predAnimRef.current = [];

    if (!chartRef.current || phase !== "done") return;

    const visiblePreds = predictions.filter((p) => visibleModels.has(p.model));

    visiblePreds.forEach((pred, idx) => {
      const series = predSeriesRef.current.get(pred.model);
      if (!series) return;

      const timerId = window.setTimeout(() => {
        const rgb = hexToRgb(pred.color);
        if (!rgb) {
          series.applyOptions({ color: pred.color, lastValueVisible: true, priceLineVisible: false });
          return;
        }

        const fadeDuration = 700;
        const fadeStart = performance.now();

        const fadeIn = (now: number) => {
          const t = Math.min((now - fadeStart) / fadeDuration, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          series.applyOptions({ color: `rgba(${rgb.r},${rgb.g},${rgb.b},${eased})` });
          if (t < 1) {
            requestAnimationFrame(fadeIn);
          } else {
            series.applyOptions({ color: pred.color, lastValueVisible: true, priceLineVisible: false });
          }
        };
        requestAnimationFrame(fadeIn);
      }, idx * 200);

      predAnimRef.current.push(timerId);
    });

    return () => {
      predAnimRef.current.forEach(clearTimeout);
      predAnimRef.current = [];
    };
  }, [predictions, visibleModels, phase]);

  // Draw inline labels at the end of each prediction line
  useEffect(() => {
    const chart = chartRef.current;
    const canvas = glintCanvasRef.current;
    const container = containerRef.current;
    if (!chart || !canvas || !container || phase !== "done") return;

    const visiblePreds = predictions.filter((p) => visibleModels.has(p.model));
    if (visiblePreds.length === 0) return;

    let subbed = false;

    const drawLabels = () => {
      // Don't clobber the pulse — only draw labels on top
      const w = container.clientWidth;
      const h = 500;
      const dpr = window.devicePixelRatio;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const paneW = chart.timeScale().width();
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, paneW, h);
      ctx.clip();

      for (const pred of visiblePreds) {
        const series = predSeriesRef.current.get(pred.model);
        if (!series) continue;
        if (pred.model.includes("upper") || pred.model.includes("lower")) continue;

        let lx: number | null = null;
        let ly: number | null = null;
        for (let i = pred.points.length - 1; i >= 0; i--) {
          const px = chart.timeScale().timeToCoordinate(normalizeDate(pred.points[i].date, isIntraday) as any);
          const py = series.priceToCoordinate(pred.points[i].price);
          if (px !== null && py !== null) { lx = px; ly = py; break; }
        }
        if (lx === null || ly === null) continue;

        ctx.font = "bold 9px sans-serif";
        ctx.fillStyle = pred.color;
        ctx.textBaseline = "middle";
        ctx.textAlign = "left";
        ctx.fillText(pred.label, lx + 5, ly);
      }

      ctx.restore();
    };

    const delay = visiblePreds.length * 200 + 800;
    const delayTimer = setTimeout(() => {
      drawLabels();
      subbed = true;
      chart.timeScale().subscribeVisibleLogicalRangeChange(drawLabels);
      window.addEventListener("resize", drawLabels);
    }, delay);

    return () => {
      clearTimeout(delayTimer);
      if (subbed) {
        chart.timeScale().unsubscribeVisibleLogicalRangeChange(drawLabels);
        window.removeEventListener("resize", drawLabels);
      }
    };
  }, [phase, predictions, visibleModels]);

  // Session zone background + hover highlight — only on 1d intraday
  useEffect(() => {
    const canvas = sessionCanvasRef.current;
    const container = containerRef.current;
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!canvas || !container || !chart || !series || period !== "1d" || !data.length || isCrypto) return;

    const H = chartHeight;
    let mouseX = -1;
    let hoverRaf = 0;

    const draw = () => {
      const w = container.clientWidth;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = H + "px";

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, H);

      const paneW = chart.timeScale().width();

      // Build ordered list of { x, session } from actual data points
      // Sessions are derived per-candle so they match exactly what the chart renders
      const bands: { x: number; session: ReturnType<typeof getSession> }[] = [];
      for (const d of data) {
        if (typeof d.date !== "number") continue;
        const sec = Math.floor(d.date < 1e10 ? d.date : d.date / 1000);
        const x = chart.timeScale().timeToCoordinate(sec as any);
        if (x === null) continue;
        const session = getSession(sec);
        const last = bands[bands.length - 1];
        if (!last || last.session !== session) {
          bands.push({ x, session });
        }
      }

      // Draw background band for each session segment
      for (let i = 0; i < bands.length; i++) {
        const { x: startX, session } = bands[i];
        const endX = i + 1 < bands.length ? bands[i + 1].x : paneW;
        const col = SESSION_COLORS[session];
        if (col !== "rgba(0,0,0,0)") {
          ctx.fillStyle = col;
          ctx.fillRect(startX, 0, endX - startX, H);
        }
        // Divider line at session boundary
        if (startX > 0) {
          ctx.strokeStyle = "rgba(255,255,255,0.08)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(startX, 0);
          ctx.lineTo(startX, H);
          ctx.stroke();
        }
      }

      // Session label at top of each band (not just hover)
      for (let i = 0; i < bands.length; i++) {
        const { x: startX, session } = bands[i];
        const endX = i + 1 < bands.length ? bands[i + 1].x : paneW;
        const bandW = endX - startX;
        if (bandW < 40) continue; // too narrow to label
        const label = SESSION_LABELS[session];
        ctx.font = "8px monospace";
        ctx.textBaseline = "top";
        ctx.textAlign = "left";
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fillText(label, startX + 6, 8);
      }

      // Hover crosshair + session label
      if (mouseX >= 0 && mouseX <= paneW) {
        // Vertical line
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(mouseX, 0);
        ctx.lineTo(mouseX, H);
        ctx.stroke();
        ctx.setLineDash([]);

        // Highlight the hovered band
        // Highlight the current band
        let hoverBandIdx = -1;
        for (let i = bands.length - 1; i >= 0; i--) { if (mouseX >= bands[i].x) { hoverBandIdx = i; break; } }
        if (hoverBandIdx >= 0) {
          const hx = bands[hoverBandIdx].x;
          const hEnd = hoverBandIdx + 1 < bands.length ? bands[hoverBandIdx + 1].x : paneW;
          ctx.fillStyle = "rgba(255,255,255,0.04)";
          ctx.fillRect(hx, 0, hEnd - hx, H);
        }
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      cancelAnimationFrame(hoverRaf);
      hoverRaf = requestAnimationFrame(draw);
    };

    const onMouseLeave = () => {
      mouseX = -1;
      cancelAnimationFrame(hoverRaf);
      hoverRaf = requestAnimationFrame(draw);
    };

    // Initial draw + subscribe to time scale changes
    draw();
    chart.timeScale().subscribeVisibleLogicalRangeChange(draw);
    container.addEventListener("mousemove", onMouseMove);
    container.addEventListener("mouseleave", onMouseLeave);
    window.addEventListener("resize", draw);

    return () => {
      cancelAnimationFrame(hoverRaf);
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(draw);
      container.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("resize", draw);
    };
  }, [data, period, phase]);

  return (
    <div className="relative w-full" style={{ height: chartHeight }}>
      <div
        ref={containerRef}
        className="absolute inset-0 overflow-hidden border border-white/10"
      >
        <canvas
          ref={sessionCanvasRef}
          className="absolute inset-0 z-[5] pointer-events-none"
        />
        <canvas
          ref={glintCanvasRef}
          className="absolute inset-0 z-10 pointer-events-none"
        />
      </div>
    </div>
  );
}
