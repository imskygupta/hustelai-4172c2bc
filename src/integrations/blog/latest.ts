import { swr, prefetch, readCache } from "@/lib/blog-cache";

export interface LatestBlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  thumbnail: string | null;
  reading_time: number | null;
  published_at: string | null;
}

const PROJECT_ID = (import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined) ?? "";
const ENDPOINT = PROJECT_ID
  ? `https://${PROJECT_ID}.supabase.co/functions/v1/blog-latest`
  : "/functions/v1/blog-latest";

async function fetchLatest(limit: number): Promise<LatestBlogPost[]> {
  const res = await fetch(`${ENDPOINT}?limit=${limit}`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`blog-latest ${res.status}`);
  const json = await res.json();
  return Array.isArray(json?.posts) ? json.posts : [];
}

/**
 * Stale-while-revalidate latest blog posts.
 * onData fires immediately with cached data (if any), then again with fresh data.
 * The dashboard renders skeletons before the first call returns.
 */
export function getLatestBlogPosts(
  limit = 9,
  onData: (posts: LatestBlogPost[], fromCache: boolean) => void,
) {
  const key = `blog-latest:${limit}`;
  return swr<LatestBlogPost[]>(key, () => fetchLatest(limit), onData);
}

export function readLatestBlogPostsCache(limit = 9): LatestBlogPost[] | null {
  return readCache<LatestBlogPost[]>(`blog-latest:${limit}`);
}

export function prefetchLatestBlogPosts(limit = 9) {
  prefetch(`blog-latest:${limit}`, () => fetchLatest(limit));
}
