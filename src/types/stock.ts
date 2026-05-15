export interface OHLCV {
  date: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockQuote {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume: number;
  marketCap?: number;
}

export interface SearchResult {
  ticker: string;
  name: string;
  exchange: string;
  type: string;
}
