import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getCashBalance, getPositions } from "@/lib/trading";
import { getLivePrice } from "@/lib/api/livePrice";

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const cash = getCashBalance(user.userId);
    const positions = getPositions(user.userId);
    const prices = await Promise.all(positions.map((p) => getLivePrice(p.ticker)));

    const positionsWithPnL = positions.map((p, i) => {
      const currentPrice = prices[i] ?? p.avg_cost;
      const marketValue = currentPrice * p.quantity;
      const costBasis = p.avg_cost * p.quantity;
      const pnl = marketValue - costBasis;
      const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
      return { ticker: p.ticker, quantity: p.quantity, avgCost: p.avg_cost, currentPrice, marketValue, pnl, pnlPercent };
    });

    const investedValue = positionsWithPnL.reduce((sum, p) => sum + p.marketValue, 0);
    const totalValue = cash + investedValue;
    const totalPnL = totalValue - 100000;
    const totalPnLPercent = (totalPnL / 100000) * 100;

    return NextResponse.json({ cash, positions: positionsWithPnL, totalValue, totalPnL, totalPnLPercent });
  } catch (error) {
    return NextResponse.json({ error: `Failed to load portfolio: ${error}` }, { status: 500 });
  }
}
