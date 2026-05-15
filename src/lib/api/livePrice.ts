import { getHistoricalData } from "./yahoo";
import { getQuote } from "./yahoo";

// Shared utility: get the most recent price for a ticker.
// Uses last intraday candle close (same source as the stock page display price).
export async function getLivePrice(ticker: string): Promise<number | null> {
  try {
    const history = await getHistoricalData(ticker, "1d");
    const intraday = history.filter((d) => {
      const n = typeof d.date === "number" ? d.date : parseFloat(d.date as string);
      return !isNaN(n) && n > 1e8;
    });
    if (intraday.length > 0) return intraday[intraday.length - 1].close;
  } catch {}
  try {
    const q = await getQuote(ticker);
    if (q.price > 0) return q.price;
  } catch {}
  return null;
}
