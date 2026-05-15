export type ModelType =
  | "sma-20"
  | "sma-50"
  | "linear-trend"
  | "linear-upper"
  | "linear-lower"
  | "exp-smoothing"
  | "sentiment-composite";

export interface PredictionPoint {
  date: string;
  price: number;
}

export interface PredictionLine {
  model: ModelType;
  label: string;
  color: string;
  points: PredictionPoint[];
}
