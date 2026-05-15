"use client";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { usePortfolio, useTradeHistory } from "@/hooks/useTrading";
import PortfolioChart from "@/components/PortfolioChart";

export default function PortfolioPage() {
  const { user, loading: authLoading } = useAuth();
  const { data: portfolio, isLoading } = usePortfolio();
  const { data: trades } = useTradeHistory();

  if (authLoading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="shimmer h-64" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10 text-center">
        <p className="text-xs text-white/30 tracking-widest uppercase">Sign in to access paper trading.</p>
      </div>
    );
  }

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="text-xs tracking-[0.3em] uppercase text-white/30 mb-8 animate-fade-in-up">
        Paper Portfolio
      </div>

      {/* Performance chart */}
      {user && <PortfolioChart />}

      {isLoading || !portfolio ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px mb-8">
          {[...Array(4)].map((_, i) => <div key={i} className="shimmer h-20" />)}
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px border border-white/10 mb-10 animate-fade-in-up stagger-1">
            {[
              { label: "Total Value", value: `$${fmt(portfolio.totalValue)}`, color: "text-white" },
              { label: "Cash", value: `$${fmt(portfolio.cash)}`, color: "text-white" },
              {
                label: "Total P&L",
                value: `${portfolio.totalPnL >= 0 ? "+" : ""}$${fmt(portfolio.totalPnL)}`,
                color: portfolio.totalPnL >= 0 ? "text-green-400" : "text-red-400",
              },
              {
                label: "Return",
                value: `${portfolio.totalPnLPercent >= 0 ? "+" : ""}${portfolio.totalPnLPercent.toFixed(2)}%`,
                color: portfolio.totalPnLPercent >= 0 ? "text-green-400" : "text-red-400",
              },
            ].map((card) => (
              <div key={card.label} className="p-5 border-r border-white/8 last:border-r-0">
                <div className="text-xs tracking-[0.2em] uppercase text-white/25 mb-2">{card.label}</div>
                <div className={`text-xl font-light ${card.color}`}>{card.value}</div>
              </div>
            ))}
          </div>

          {/* Positions */}
          <div className="mb-10 animate-fade-in-up stagger-2">
            <div className="flex items-center gap-4 mb-4">
              <span className="text-xs tracking-[0.3em] uppercase text-white/30">Positions</span>
              <div className="flex-1 h-px bg-white/8" />
            </div>
            {portfolio.positions.length === 0 ? (
              <div className="text-xs text-white/20 tracking-widest uppercase text-center py-10 border border-white/8">
                No positions yet
              </div>
            ) : (
              <div className="border border-white/10">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/8">
                      {["Ticker", "Shares", "Avg Cost", "Price", "Value", "P&L"].map((h, i) => (
                        <th key={h} className={`px-4 py-2 text-xs tracking-[0.2em] uppercase text-white/25 ${i === 0 ? "text-left" : "text-right"}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.positions.map((p, i) => (
                      <tr key={p.ticker} className={`border-b border-white/5 last:border-b-0 hover:bg-white/3 transition-colors animate-fade-in-up stagger-${Math.min(i + 1, 8)}`}>
                        <td className="px-4 py-3">
                          <Link href={`/stock/${p.ticker}`} className="text-xs tracking-[0.2em] text-white hover:text-white/60 transition-colors">
                            {p.ticker}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-white">{p.quantity}</td>
                        <td className="px-4 py-3 text-right text-xs text-white/50">${fmt(p.avgCost)}</td>
                        <td className="px-4 py-3 text-right text-xs text-white">${fmt(p.currentPrice)}</td>
                        <td className="px-4 py-3 text-right text-xs text-white">${fmt(p.marketValue)}</td>
                        <td className={`px-4 py-3 text-right text-xs font-medium ${p.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {p.pnl >= 0 ? "+" : ""}${fmt(p.pnl)}{" "}
                          <span className="text-white/30">({p.pnlPercent >= 0 ? "+" : ""}{p.pnlPercent.toFixed(2)}%)</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Trade history */}
      <div className="animate-fade-in-up stagger-3">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-xs tracking-[0.3em] uppercase text-white/30">Trade History</span>
          <div className="flex-1 h-px bg-white/8" />
        </div>
        {!trades || trades.length === 0 ? (
          <div className="text-xs text-white/20 tracking-widest uppercase text-center py-10 border border-white/8">
            No trades yet
          </div>
        ) : (
          <div className="border border-white/10">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/8">
                  {["Date", "Ticker", "Side", "Qty", "Price", "Total"].map((h, i) => (
                    <th key={h} className={`px-4 py-2 text-xs tracking-[0.2em] uppercase text-white/25 ${i < 3 ? "text-left" : "text-right"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trades.map((t, i) => (
                  <tr key={t.id} className={`border-b border-white/5 last:border-b-0 hover:bg-white/3 transition-colors animate-fade-in-up stagger-${Math.min(i + 1, 8)}`}>
                    <td className="px-4 py-3 text-xs text-white/30">
                      {new Date(t.executedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/stock/${t.ticker}`} className="text-xs tracking-[0.2em] text-white hover:text-white/60 transition-colors">
                        {t.ticker}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs tracking-widest ${t.side === "buy" ? "text-green-400" : "text-red-400"}`}>
                        {t.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-white">{t.quantity}</td>
                    <td className="px-4 py-3 text-right text-xs text-white/50">${fmt(t.price)}</td>
                    <td className="px-4 py-3 text-right text-xs text-white">${fmt(t.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
