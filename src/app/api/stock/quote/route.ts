import { NextRequest, NextResponse } from "next/server";
import { getFinnhubQuote } from "@/lib/api/finnhub";
import { getQuote } from "@/lib/api/yahoo";

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get("ticker");
  if (!ticker) {
    return NextResponse.json({ error: "ticker is required" }, { status: 400 });
  }

  try {
    // Crypto tickers (BTC-USD etc) — use Yahoo directly, Finnhub doesn't cover crypto
    const isCrypto = ticker.includes("-USD") || ticker.includes("-BTC") || ticker.includes("-ETH");
    if (!isCrypto) {
      const finnhub = await getFinnhubQuote(ticker);
      if (finnhub) return NextResponse.json(finnhub);
    }

    const quote = await getQuote(ticker);
    return NextResponse.json(quote);
  } catch (error) {
    return NextResponse.json({ error: `Failed to fetch quote: ${error}` }, { status: 500 });
  }
}
