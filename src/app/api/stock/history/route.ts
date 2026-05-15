import { NextRequest, NextResponse } from "next/server";
import { getHistoricalData } from "@/lib/api/yahoo";
import { getCachedPrices, cachePrices } from "@/lib/cache";
import type { OHLCV } from "@/types/stock";

const INTRADAY_PERIODS = new Set(["1d", "5d", "1m"]);

const PERIOD_DAYS: Record<string, number> = {
  "3m":  90,
  "6m":  180,
  "1y":  365,
  "2y":  730,
  "5y":  1825,
};

function toMs(date: string | number): number {
  if (typeof date === "number") return date < 1e10 ? date * 1000 : date;
  // yyyy-mm-dd string — parse directly, don't use parseFloat (would give year as number)
  if (/^\d{4}-\d{2}-\d{2}/.test(date)) return new Date(date).getTime();
  const n = parseFloat(date);
  if (!isNaN(n)) return n < 1e10 ? n * 1000 : n;
  return new Date(date).getTime();
}

function isUnixTimestamp(date: string | number): boolean {
  if (typeof date === "number") return date > 1e8;
  // yyyy-mm-dd is never a Unix timestamp
  if (/^\d{4}-\d{2}-\d{2}/.test(date as string)) return false;
  const n = parseFloat(date as string);
  return !isNaN(n) && n > 1e8;
}

function clean(data: OHLCV[], intradayOnly = false): OHLCV[] {
  const nowMs = Date.now() + 86400_000;
  const seen = new Set<number>();
  return data
    .filter((d) => {
      // For intraday periods, discard daily string dates (yyyy-mm-dd) mixed in by Yahoo
      if (intradayOnly && !isUnixTimestamp(d.date)) return false;
      const ms = toMs(d.date);
      return ms > 0 && ms <= nowMs;
    })
    .sort((a, b) => toMs(a.date) - toMs(b.date))
    .filter((d) => {
      const ms = toMs(d.date);
      if (seen.has(ms)) return false;
      seen.add(ms);
      return true;
    });
}

function sliceToPeriod(data: OHLCV[], period: string): OHLCV[] {
  const days = PERIOD_DAYS[period];
  if (!days || data.length === 0) return data;
  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
  // Always compare via toMs() so string/number/float all work correctly
  return data.filter((d) => {
    // Reject intraday Unix timestamps from daily cache
    if (isUnixTimestamp(d.date)) return false;
    return toMs(d.date) >= cutoffMs;
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const ticker = searchParams.get("ticker");
  const period = searchParams.get("period") || "1y";

  if (!ticker) {
    return NextResponse.json({ error: "ticker is required" }, { status: 400 });
  }

  try {
    if (INTRADAY_PERIODS.has(period)) {
      const data = await getHistoricalData(ticker, period);
      const cleaned = clean(data, true);

      // For 1d stocks: filter to today's session (4am ET onward)
      // Crypto trades 24/7 — skip the session filter entirely
      const isCrypto = ticker.toUpperCase().includes("-USD") || ticker.toUpperCase().includes("-BTC");
      if (period === "1d" && !isCrypto) {
        const now = Date.now();
        const edtMidnight = Math.floor(now / 86400_000) * 86400_000 + 8 * 3600_000;
        const estMidnight = Math.floor(now / 86400_000) * 86400_000 + 9 * 3600_000;
        const cutoffMs = edtMidnight <= now ? edtMidnight : estMidnight - 86400_000;
        const todayOnly = cleaned.filter((d) => toMs(d.date) >= cutoffMs);
        return NextResponse.json(todayOnly.length >= 5 ? todayOnly : cleaned);
      }

      return NextResponse.json(cleaned);
    }

    const cached = getCachedPrices(ticker);
    if (cached.length > 10) {
      const lastDate = cached[cached.length - 1].date;
      const lastCachedDate = new Date(toMs(lastDate));
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      if (lastCachedDate > threeDaysAgo) {
        return NextResponse.json(clean(sliceToPeriod(cached, period)));
      }
    }

    const data = await getHistoricalData(ticker, period);
    if (data.length > 0) cachePrices(ticker, data);
    return NextResponse.json(clean(sliceToPeriod(data, period)));

  } catch (error) {
    const cached = getCachedPrices(ticker);
    if (cached.length > 0) return NextResponse.json(clean(sliceToPeriod(cached, period)));
    return NextResponse.json({ error: `Failed to fetch data: ${error}` }, { status: 500 });
  }
}
