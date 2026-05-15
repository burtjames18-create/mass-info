import type { NewsArticle } from "@/types/news";
import { analyzeSentiment } from "@/lib/sentiment";

const API_KEY = process.env.NEWS_API_KEY;
const BASE_URL = "https://newsapi.org/v2";

export async function getNews(ticker: string, companyName?: string): Promise<NewsArticle[]> {
  if (!API_KEY) return [];

  const query = companyName ? `"${ticker}" OR "${companyName}"` : ticker;

  try {
    const res = await fetch(
      `${BASE_URL}/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=20&language=en`,
      { headers: { "X-Api-Key": API_KEY } }
    );

    if (!res.ok) return [];

    const data = await res.json();
    return (data.articles || []).map(
      (a: Record<string, unknown>) => {
        const title = (a.title || "") as string;
        const description = (a.description || "") as string;
        return {
          title,
          description,
          url: a.url as string,
          source: (a.source as Record<string, string>)?.name || "Unknown",
          publishedAt: a.publishedAt as string,
          sentiment: analyzeSentiment(`${title} ${description}`),
          imageUrl: a.urlToImage as string | undefined,
        };
      }
    );
  } catch {
    return [];
  }
}
