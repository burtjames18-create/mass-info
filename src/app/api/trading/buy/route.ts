import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { executeBuy } from "@/lib/trading";
import { getQuote } from "@/lib/api/yahoo";

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { ticker, quantity } = await request.json();

    if (!ticker || !quantity || quantity < 1) {
      return NextResponse.json({ error: "Valid ticker and quantity required" }, { status: 400 });
    }

    const quote = await getQuote(ticker);
    const price = quote.price;

    executeBuy(user.userId, ticker.toUpperCase(), Math.floor(quantity), price);

    return NextResponse.json({
      message: `Bought ${quantity} shares of ${ticker} at $${price.toFixed(2)}`,
      price,
      total: price * quantity,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
