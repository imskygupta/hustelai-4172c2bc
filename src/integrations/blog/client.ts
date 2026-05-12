import { supabase } from "@/integrations/supabase/client";

const BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

async function call<T = any>(path: string, init?: RequestInit & { admin?: boolean }): Promise<T> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    apikey: ANON,
    ...(init?.headers as any),
  };
  if (init?.admin) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) headers["authorization"] = `Bearer ${data.session.access_token}`;
  } else if (!headers["authorization"]) {
    headers["authorization"] = `Bearer ${ANON}`;
  }
  const r = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!r.ok) throw new Error(`${path} ${r.status}`);
  return r.json();
}

export const blogApi = {
  feed: (params: { category?: string; tag?: string; limit?: number; offset?: number; mode?: "cluster" } = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v != null && q.set(k, String(v)));
    return call(`/blog-feed?${q}`);
  },
  post: (slug: string) => call(`/blog-post?slug=${encodeURIComponent(slug)}`),
  track: (kind: string, post_id?: string, ref?: string) =>
    call(`/blog-track`, { method: "POST", body: JSON.stringify({ kind, post_id, ref }) }).catch(() => null),

  // admin
  adminList: (status?: string) => call(`/blog-admin?action=list${status ? `&status=${status}` : ""}`, { admin: true }),
  adminGet: (id: string) => call(`/blog-admin?action=get&id=${id}`, { admin: true }),
  adminDrafts: () => call(`/blog-admin?action=drafts`, { admin: true }),
  adminSave: (post: any) => call(`/blog-admin?action=save`, { admin: true, method: "POST", body: JSON.stringify({ post }) }),
  adminTransition: (id: string, status: string, scheduled_at?: string) =>
    call(`/blog-admin?action=transition`, { admin: true, method: "POST", body: JSON.stringify({ id, status, scheduled_at }) }),
  adminDelete: (id: string) => call(`/blog-admin?action=delete`, { admin: true, method: "POST", body: JSON.stringify({ id }) }),
  adminGenerate: (topic?: string, angle?: string, keyword?: string) =>
    call(`/blog-ai-draft`, { admin: true, method: "POST", body: JSON.stringify({ topic, angle, keyword }) }),
};

export type BlogPost = {
  id: string; slug: string; title: string; subtitle?: string; excerpt?: string;
  body_md?: string; hero_image?: string; reading_time?: number;
  published_at?: string; updated_at?: string;
  category_id?: string; status?: string;
  meta_title?: string; meta_description?: string; focus_keyword?: string;
  faq?: { q: string; a: string }[]; toc?: { level: number; text: string; slug: string }[];
  cta_blocks?: { kind: string; label: string; href: string; note?: string }[];
  blog_categories?: { slug: string; title: string };
  blog_authors?: { slug: string; name: string; avatar_url?: string; bio?: string };
};