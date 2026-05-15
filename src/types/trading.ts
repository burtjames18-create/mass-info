export interface Position {
  ticker: string;
  quantity: number;
  avgCost: number;
}

export interface PositionWithPnL extends Position {
  currentPrice: number;
  marketValue: number;
  pnl: number;
  pnlPercent: number;
}

export interface Portfolio {
  cash: number;
  positions: PositionWithPnL[];
  totalValue: number;
  totalPnL: number;
  totalPnLPercent: number;
}

export interface Trade {
  id: number;
  ticker: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  total: number;
  executedAt: string;
}
