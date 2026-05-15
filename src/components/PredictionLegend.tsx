"use client";
import type { PredictionLine } from "@/types/prediction";

interface PredictionLegendProps {
  predictions: PredictionLine[];
  visibleModels: Set<string>;
  onToggle: (model: string) => void;
}

export default function PredictionLegend({ predictions, visibleModels, onToggle }: PredictionLegendProps) {
  return (
    <div className="flex flex-wrap gap-2 p-4 border border-white/10 animate-fade-in">
      <span className="text-xs tracking-[0.25em] uppercase text-white/25 self-center mr-2">Models</span>
      {predictions.map((pred) => {
        const active = visibleModels.has(pred.model);
        return (
          <button
            key={pred.model}
            onClick={() => onToggle(pred.model)}
            className={`flex items-center gap-2 px-3 py-1 text-xs tracking-wider border transition-all duration-150 ${
              active
                ? "border-white/30 text-white"
                : "border-white/8 text-white/25 hover:text-white/50 hover:border-white/20"
            }`}
          >
            <span
              className="w-2 h-px"
              style={{ background: active ? pred.color : "rgba(255,255,255,0.2)", display: "inline-block" }}
            />
            {pred.label}
          </button>
        );
      })}
    </div>
  );
}
