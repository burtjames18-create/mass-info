export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  sentiment: number; // -5 to 5 scale
  imageUrl?: string;
}
