"use client";
import type { NewsArticle } from "@/types/news";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function sentimentTag(score: number): { label: string; className: string } {
  if (score >= 2)  return { label: "Strong +", className: "text-white/70" };
  if (score > 0.5) return { label: "Positive",  className: "text-white/50" };
  if (score <= -2) return { label: "Strong −", className: "text-white/20" };
  if (score < -0.5)return { label: "Negative",  className: "text-white/25" };
  return { label: "Neutral", className: "text-white/35" };
}

interface Theme {
  name: string;
  keywords: RegExp;
  bullish: string;
  bearish: string;
  neutral: string;
}

const THEMES: Theme[] = [
  {
    name: "AI & Technology",
    keywords: /\b(ai|artificial intelligence|machine learning|chatgpt|openai|neural|deep learning|generative|llm|copilot)\b/i,
    bullish: "AI developments are creating new revenue opportunities and driving investor optimism across the tech sector",
    bearish: "Concerns around AI competition, regulation, or overspending on AI infrastructure are weighing on sentiment",
    neutral: "AI remains a major theme but markets are waiting for clearer signals on monetization and adoption",
  },
  {
    name: "Federal Reserve",
    keywords: /\b(fed|federal reserve|interest rate|rate cut|rate hike|monetary policy|inflation|cpi|fomc|powell|basis points?|hawkish|dovish)\b/i,
    bullish: "Expectations of rate cuts or dovish Fed signals are boosting equities as cheaper borrowing supports growth",
    bearish: "Hawkish Fed positioning or persistent inflation fears are pressuring stocks as higher rates reduce valuations",
    neutral: "The Fed's stance remains uncertain, leaving markets in a holding pattern until clearer rate guidance emerges",
  },
  {
    name: "Earnings",
    keywords: /\b(earnings|revenue|profit|quarter|beat|miss|guidance|forecast|eps|sales growth|margin|outlook)\b/i,
    bullish: "Strong earnings results or raised guidance are reinforcing confidence in the company's growth trajectory",
    bearish: "Disappointing earnings, missed estimates, or lowered guidance are raising concerns about near-term fundamentals",
    neutral: "Earnings season is creating mixed signals, with results largely in line with expectations",
  },
  {
    name: "Geopolitics",
    keywords: /\b(tariff|trade war|sanction|china|taiwan|geopolit|export ban|embargo|troops|military|war|conflict|invasion|nato)\b/i,
    bullish: "Easing geopolitical tensions or trade deal progress is reducing risk premiums and supporting equity markets",
    bearish: "Escalating geopolitical tensions or trade restrictions are increasing uncertainty and driving risk-off sentiment",
    neutral: "Geopolitical developments are being monitored but haven't materially shifted the market's risk calculus",
  },
  {
    name: "Consumer Demand",
    keywords: /\b(consumer|spending|retail|demand|shopping|e-commerce|sales data|consumer confidence|discretionary)\b/i,
    bullish: "Resilient consumer spending signals economic strength, supporting revenue expectations for consumer-facing companies",
    bearish: "Weakening consumer demand or declining confidence suggests headwinds for companies reliant on discretionary spending",
    neutral: "Consumer activity is holding steady, neither accelerating nor declining enough to significantly move forecasts",
  },
  {
    name: "Product & Innovation",
    keywords: /\b(launch|product|chip|device|iphone|pixel|vehicle|ev|electric|autonomous|robot|vision pro|headset|wearable|new model)\b/i,
    bullish: "New product launches or innovation breakthroughs are creating growth catalysts and expanding market opportunity",
    bearish: "Product delays, underwhelming launches, or competitive threats to key product lines are dampening growth expectations",
    neutral: "Product-related news is generating attention but the market impact remains to be seen",
  },
  {
    name: "Regulation",
    keywords: /\b(regulat|antitrust|lawsuit|legal|compliance|fda|sec|doj|ftc|ban|ruling|court|fine|penalty|legislation|bill)\b/i,
    bullish: "Favorable regulatory outcomes or legal clarity are removing overhanging risks and boosting investor confidence",
    bearish: "Regulatory crackdowns, lawsuits, or unfavorable legal developments are creating downside risk and uncertainty",
    neutral: "Regulatory developments are in progress but their ultimate impact on the business remains unclear",
  },
  {
    name: "Market Volatility",
    keywords: /\b(crash|plunge|surge|rally|sell-?off|correction|volatile|volatility|bear market|bull market|rebound|losses|gains|rout)\b/i,
    bullish: "Market momentum is turning positive as buyers step in, signaling renewed confidence and potential for further upside",
    bearish: "Broad market sell-offs and elevated volatility are dragging stocks lower as investors reduce risk exposure",
    neutral: "Mixed market action reflects tug-of-war between bulls and bears with no clear directional conviction",
  },
  {
    name: "Energy & Commodities",
    keywords: /\b(oil|crude|opec|natural gas|energy price|commodity|gold|copper|lithium|barrel)\b/i,
    bullish: "Favorable energy or commodity price moves are supporting margins and reducing cost pressures across supply chains",
    bearish: "Rising energy costs or commodity price spikes are squeezing margins and raising inflation concerns",
    neutral: "Commodity markets are relatively stable, with limited pass-through impact on corporate earnings",
  },
  {
    name: "Employment",
    keywords: /\b(jobs|employment|unemployment|layoff|hiring|workforce|recession|gdp|economic growth|payroll|labor market)\b/i,
    bullish: "Strong employment data or economic resilience is supporting the case for continued corporate earnings growth",
    bearish: "Rising layoffs or weakening economic indicators are fueling recession fears and weighing on growth expectations",
    neutral: "Economic data is sending mixed signals, keeping the growth outlook uncertain",
  },
];

interface DetectedTheme {
  theme: Theme;
  articles: NewsArticle[];
  avgSentiment: number;
  explanation: string;
}

function detectThemes(articles: NewsArticle[]): DetectedTheme[] {
  return THEMES.reduce<DetectedTheme[]>((acc, theme) => {
    const matching = articles.filter(
      (a) => theme.keywords.test(a.title) || theme.keywords.test(a.description || "")
    );
    if (matching.length === 0) return acc;
    const avg = matching.reduce((sum, a) => sum + a.sentiment, 0) / matching.length;
    const explanation = avg > 0.5 ? theme.bullish : avg < -0.5 ? theme.bearish : theme.neutral;
    acc.push({ theme, articles: matching, avgSentiment: avg, explanation });
    return acc;
  }, []).sort((a, b) => b.articles.length - a.articles.length);
}

function formatList(items: string[]): string {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return items.slice(0, -1).join(", ") + ", and " + items[items.length - 1];
}

function generateSummary(articles: NewsArticle[], ticker: string) {
  if (!articles || articles.length === 0) {
    return {
      overview: `No recent news found for ${ticker}. The sentiment-adjusted forecast defaults to the model average.`,
      themes: [] as DetectedTheme[],
      direction: "neutral" as "up" | "down" | "neutral",
      adjustment: "0.0%",
    };
  }
  const avg = articles.reduce((a, b) => a + b.sentiment, 0) / articles.length;
  const adjustmentPct = Math.abs((avg / 5) * 5);
  const direction: "up" | "down" | "neutral" = avg > 0.5 ? "up" : avg < -0.5 ? "down" : "neutral";
  const themes = detectThemes(articles);
  let overview: string;
  if (themes.length === 0) {
    overview = `Recent news around ${ticker} shows no strong directional signal. Forecast adjustment is minimal.`;
  } else {
    const topThemes = themes.slice(0, 3);
    overview = `Key themes: ${formatList(topThemes.map((t) => t.theme.name))}. ` +
      topThemes.map((t) => t.explanation).join(". ") +
      `. Net adjustment: ${adjustmentPct < 0.5 ? "negligible" : `~${adjustmentPct.toFixed(1)}%`} ${direction === "up" ? "upward" : direction === "down" ? "downward" : ""}.`;
  }
  return {
    overview,
    themes,
    direction,
    adjustment: `${direction === "down" ? "-" : "+"}${adjustmentPct.toFixed(1)}%`,
  };
}

interface SentimentBreakdownProps {
  articles: NewsArticle[];
  ticker: string;
  loading?: boolean;
}

export default function SentimentBreakdown({ articles, ticker, loading }: SentimentBreakdownProps) {
  if (loading) {
    return (
      <div className="mt-2 space-y-px">
        <div className="shimmer h-20" />
        <div className="shimmer h-16" />
        <div className="shimmer h-16" />
      </div>
    );
  }

  const { overview, themes, direction, adjustment } = generateSummary(articles, ticker);

  const adjColor = direction === "up" ? "text-green-400" : direction === "down" ? "text-red-400" : "text-white/40";
  const arrow = direction === "up" ? "↑" : direction === "down" ? "↓" : "→";

  return (
    <div className="mt-6 border border-white/10">
      <div className="px-5 py-4 border-b border-white/8 flex items-start gap-4">
        <span className={`text-base font-light shrink-0 ${adjColor}`}>{arrow}</span>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1.5">
            <span className="text-xs tracking-[0.2em] uppercase text-white/40">Sentiment Impact</span>
            <span className={`text-xs tracking-widest ${adjColor}`}>{adjustment}</span>
          </div>
          <p className="text-xs text-white/40 leading-relaxed">{overview}</p>
        </div>
      </div>

      {themes.length > 0 && (
        <div>
          {themes.map((t, ti) => {
            const dir = t.avgSentiment > 0.5 ? "bullish" : t.avgSentiment < -0.5 ? "bearish" : "mixed";
            const dirColor = dir === "bullish" ? "text-green-400" : dir === "bearish" ? "text-red-400" : "text-white/35";

            return (
              <div key={ti} className="border-b border-white/6 last:border-b-0">
                <div className="px-5 py-3 flex items-center justify-between border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="text-xs tracking-wider text-white/50">{t.theme.name}</span>
                    <span className={`text-xs tracking-widest uppercase ${dirColor}`}>{dir}</span>
                  </div>
                  <span className="text-xs text-white/20">{t.articles.length}</span>
                </div>
                <div className="px-5 py-2 border-b border-white/5">
                  <p className="text-xs text-white/30 leading-relaxed">{t.explanation}</p>
                </div>
                <div>
                  {t.articles.slice(0, 4).map((article, ai) => {
                    const tag = sentimentTag(article.sentiment);
                    return (
                      <a
                        key={ai}
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start justify-between gap-3 px-5 py-2.5 border-b border-white/4 last:border-b-0 hover:bg-white/3 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white/40 line-clamp-1">{article.title}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-white/15">
                            <span>{article.source}</span>
                            <span>·</span>
                            <span>{timeAgo(article.publishedAt)}</span>
                          </div>
                        </div>
                        <span className={`text-xs shrink-0 ${tag.className}`}>{tag.label}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
