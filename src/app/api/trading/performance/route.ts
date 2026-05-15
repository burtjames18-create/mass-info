import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getLivePrice } from "@/lib/api/livePrice";

interface TradeRow {
  ticker: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  total: number;
  executedAt: string;
}

const PERIOD_DAYS: Record<string, number> = {
  "1d": 1, "5d": 5, "1m": 30, "3m": 90, "6m": 180, "1y": 365, "all": 99999,
};

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const period = request.nextUrl.searchParams.get("period") || "all";
  const days = PERIOD_DAYS[period] ?? 99999;
  const cutoffMs = period === "all" ? 0 : Date.now() - days * 24 * 60 * 60 * 1000;

  const db = getDb();
  const allTrades = db.prepare(
    `SELECT ticker, side, quantity, price, total, executed_at as executedAt
     FROM trades WHERE user_id = ? ORDER BY executed_at ASC`
  ).all(user.userId) as TradeRow[];

  if (allTrades.length === 0) return NextResponse.json([]);

  const STARTING_CASH = 100000;
  let cash = STARTING_CASH;
  const positions: Record<string, { qty: number; avgCost: number }> = {};

  // Replay all trades to build state, collecting points within the period window
  const points: { time: number; value: number }[] = [];

  // Starting point at account creation (before first trade)
  const firstTradeMs = new Date(allTrades[0].executedAt).getTime();
  if (firstTradeMs >= cutoffMs) {
    points.push({ time: Math.floor(firstTradeMs / 1000) - 60, value: STARTING_CASH });
  }

  for (const trade of allTrades) {
    const tradeMs = new Date(trade.executedAt).getTime();

    if (trade.side === "buy") {
      cash -= trade.total;
      if (!positions[trade.ticker]) positions[trade.ticker] = { qty: 0, avgCost: 0 };
      const pos = positions[trade.ticker];
      const newQty = pos.qty + trade.quantity;
      pos.avgCost = (pos.avgCost * pos.qty + trade.price * trade.quantity) / newQty;
      pos.qty = newQty;
    } else {
      cash += trade.total;
      if (positions[trade.ticker]) {
        positions[trade.ticker].qty -= trade.quantity;
        if (positions[trade.ticker].qty <= 0) delete positions[trade.ticker];
      }
    }

    if (tradeMs >= cutoffMs) {
      let posValue = 0;
      for (const [ticker, pos] of Object.entries(positions)) {
        posValue += pos.qty * (ticker === trade.ticker ? trade.price : pos.avgCost);
      }
      points.push({ time: Math.floor(tradeMs / 1000), value: cash + posValue });
    }
  }

  // Current live value as final point
  const tickers = Object.keys(positions);
  if (tickers.length > 0) {
    const livePrices = await Promise.all(tickers.map((t) => getLivePrice(t)));
    let liveValue = cash;
    tickers.forEach((t, i) => { liveValue += positions[t].qty * (livePrices[i] ?? positions[t].avgCost); });
    points.push({ time: Math.floor(Date.now() / 1000), value: liveValue });
  } else if (points.length === 0) {
    // No trades in period — show flat line at current cash
    points.push({ time: Math.floor(cutoffMs / 1000) || Math.floor(Date.now() / 1000) - 86400, value: cash });
    points.push({ time: Math.floor(Date.now() / 1000), value: cash });
  }

  return NextResponse.json(points);
}
