import { NextRequest, NextResponse } from "next/server";
import { getHistoricalData } from "@/lib/api/yahoo";
import { getCachedPrices, cachePrices } from "@/lib/cache";
import { generatePredictions } from "@/lib/predictions";
import { averageSentiment } from "@/lib/sentiment";
import { getCachedNews } from "@/lib/cache";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const ticker = searchParams.get("ticker");
  const days = parseInt(searchParams.get("days") || "30", 10);

  if (!ticker) {
    return NextResponse.json({ error: "ticker is required" }, { status: 400 });
  }

  try {
    // Get historical data (from cache or API)
    let data = getCachedPrices(ticker);
    if (data.length < 50) {
      const fresh = await getHistoricalData(ticker, "1y");
      if (fresh.length > 0) {
        cachePrices(ticker, fresh);
        data = fresh;
      }
    }

    if (data.length < 50) {
      return NextResponse.json(
        { error: "Not enough historical data for predictions" },
        { status: 400 }
      );
    }

    // Get sentiment from cached news
    const news = getCachedNews(ticker, 24 * 60); // 24 hours
    const sentimentScores = news.map((n) => n.sentiment);
    const avgSent = averageSentiment(sentimentScores);

    const predictions = generatePredictions(data, avgSent, days);
    return NextResponse.json(predictions);
  } catch (error) {
    return NextResponse.json(
      { error: `Prediction failed: ${error}` },
      { status: 500 }
    );
  }
}
