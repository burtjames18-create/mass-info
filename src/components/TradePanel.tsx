"use client";
import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { usePortfolio, executeTrade } from "@/hooks/useTrading";
import { useStockQuote } from "@/hooks/useStockData";

interface TradePanelProps {
  ticker: string;
}

export default function TradePanel({ ticker }: TradePanelProps) {
  const { user } = useAuth();
  const { data: portfolio, mutate } = usePortfolio();
  const { data: quote } = useStockQuote(ticker);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!user) return null;

  const price = quote?.price ?? 0;
  const qty = parseInt(quantity) || 0;
  const total = qty * price;
  const position = portfolio?.positions.find((p) => p.ticker === ticker);
  const maxBuy = price > 0 ? Math.floor((portfolio?.cash ?? 0) / price) : 0;
  const maxSell = position?.quantity ?? 0;

  const handleTrade = async () => {
    if (qty < 1) return;
    setSubmitting(true);
    setStatus(null);
    try {
      const result = await executeTrade(side, ticker, qty);
      setStatus({ type: "success", msg: result.message });
      setQuantity("");
      mutate();
    } catch (err: unknown) {
      setStatus({ type: "error", msg: err instanceof Error ? err.message : "Trade failed" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 border border-white/10">
      <div className="text-xs tracking-[0.25em] uppercase text-white/30 mb-4">Paper Trade</div>

      <div className="flex mb-4 border border-white/10">
        <button
          onClick={() => setSide("buy")}
          className={`flex-1 py-1.5 text-xs tracking-widest uppercase transition-all ${
            side === "buy" ? "bg-white text-black" : "text-white/30 hover:text-white"
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setSide("sell")}
          className={`flex-1 py-1.5 text-xs tracking-widest uppercase transition-all border-l border-white/10 ${
            side === "sell" ? "bg-white text-black" : "text-white/30 hover:text-white"
          }`}
        >
          Sell
        </button>
      </div>

      <div className="space-y-1.5 mb-4 text-xs text-white/30">
        <div className="flex justify-between">
          <span className="tracking-wider">Price</span>
          <span className="text-white">${price.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="tracking-wider">Cash</span>
          <span className="text-white">${(portfolio?.cash ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        {position && (
          <div className="flex justify-between">
            <span className="tracking-wider">Held</span>
            <span className="text-white">{position.quantity}</span>
          </div>
        )}
      </div>

      <input
        type="number"
        min="1"
        max={side === "buy" ? maxBuy : maxSell}
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        placeholder="QTY"
        className="w-full px-3 py-2 bg-black border border-white/15 text-white text-xs tracking-widest placeholder-white/20 focus:outline-none focus:border-white/40 mb-2"
      />

      <div className="flex gap-1 mb-4">
        {[1, 5, 10, 25, 100].map((n) => (
          <button
            key={n}
            onClick={() => setQuantity(String(n))}
            className="flex-1 py-1 text-xs text-white/25 hover:text-white border border-white/8 hover:border-white/30 transition-all"
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => setQuantity(String(side === "buy" ? maxBuy : maxSell))}
          className="flex-1 py-1 text-xs text-white/25 hover:text-white border border-white/8 hover:border-white/30 transition-all"
        >
          Max
        </button>
      </div>

      {qty > 0 && (
        <div className="text-xs text-white/25 mb-3 px-3 py-2 border border-white/8">
          <div className="flex justify-between">
            <span>{side === "buy" ? "Cost" : "Proceeds"}</span>
            <span className="text-white">${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      )}

      <button
        onClick={handleTrade}
        disabled={submitting || qty < 1 || (side === "buy" && total > (portfolio?.cash ?? 0)) || (side === "sell" && qty > maxSell)}
        className="w-full py-2 text-xs tracking-[0.25em] uppercase border border-white/30 hover:border-white hover:bg-white hover:text-black transition-all disabled:opacity-20 disabled:cursor-not-allowed"
      >
        {submitting ? "···" : `${side === "buy" ? "Buy" : "Sell"} ${qty > 0 ? qty : ""} ${ticker}`}
      </button>

      {status && (
        <div className={`mt-2 text-xs px-3 py-2 border ${status.type === "success" ? "border-white/20 text-white/60" : "border-white/10 text-white/30"}`}>
          {status.msg}
        </div>
      )}
    </div>
  );
}
