"use client";
import type { OHLCV } from "@/types/stock";

interface SparklineProps {
  data: OHLCV[];
  width?: number;
  height?: number;
}

// Session boundaries in UTC minutes
function getSessionUTC(unixSec: number): "pre" | "regular" | "after" | "night" {
  const d = new Date(unixSec * 1000);
  const m = d.getUTCHours() * 60 + d.getUTCMinutes();
  if (m >= 480  && m < 810)  return "pre";
  if (m >= 810  && m < 1200) return "regular";
  if (m >= 1200 && m < 1440) return "after";
  return "night";
}

export default function Sparkline({ data, width = 200, height = 60 }: SparklineProps) {
  if (!data || data.length < 2) return null;

  // Only use intraday Unix timestamp candles
  const candles = data.filter((d) => {
    const n = typeof d.date === "number" ? d.date : parseFloat(d.date as string);
    return !isNaN(n) && n > 1e8;
  });
  if (candles.length < 2) return null;

  const closes = candles.map((d) => d.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const isPositive = closes[closes.length - 1] >= closes[0];
  const lineColor = isPositive ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.35)";

  const pad = 1;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const toX = (i: number) => pad + (i / (candles.length - 1)) * w;
  const toY = (v: number) => pad + h - ((v - min) / range) * h;

  // Build polyline points
  const pts = candles.map((d, i) => `${toX(i)},${toY(d.close)}`).join(" ");
  const fillPts = `${pad},${pad + h} ${pts} ${pad + w},${pad + h}`;

  // Session zone background rects
  const zones: { x1: number; x2: number; session: ReturnType<typeof getSessionUTC> }[] = [];
  let curSession: ReturnType<typeof getSessionUTC> | null = null;
  let zoneStart = 0;
  candles.forEach((d, i) => {
    const sec = typeof d.date === "number" ? d.date : parseFloat(d.date as string);
    const sess = getSessionUTC(Math.floor(sec));
    if (sess !== curSession) {
      if (curSession !== null) zones.push({ x1: zoneStart, x2: toX(i), session: curSession });
      curSession = sess;
      zoneStart = toX(i);
    }
  });
  if (curSession !== null) zones.push({ x1: zoneStart, x2: pad + w, session: curSession });

  const zoneColors: Record<string, string> = {
    pre:     "rgba(255,255,255,0.02)",
    regular: "rgba(255,255,255,0.05)",
    after:   "rgba(255,255,255,0.02)",
    night:   "rgba(0,0,0,0)",
  };

  const gradId = `sf-${isPositive ? "up" : "dn"}-${Math.random().toString(36).slice(2, 6)}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="w-full block"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.2" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Session zones */}
      {zones.map((z, i) => (
        <rect
          key={i}
          x={z.x1}
          y={pad}
          width={Math.max(0, z.x2 - z.x1)}
          height={h}
          fill={zoneColors[z.session]}
        />
      ))}

      {/* Session dividers */}
      {zones.slice(1).map((z, i) => (
        <line
          key={i}
          x1={z.x1}
          y1={pad}
          x2={z.x1}
          y2={pad + h}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="0.5"
        />
      ))}

      {/* Area fill */}
      <polygon points={fillPts} fill={`url(#${gradId})`} />

      {/* Line */}
      <polyline
        points={pts}
        fill="none"
        stroke={lineColor}
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* End dot */}
      <circle
        cx={toX(candles.length - 1)}
        cy={toY(closes[closes.length - 1])}
        r="1.5"
        fill={lineColor}
      />
    </svg>
  );
}
