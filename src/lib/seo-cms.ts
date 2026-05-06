import { supabase } from "@/integrations/supabase/client";

export type SeoStatus = "draft" | "published" | "archived";

export interface SeoSectionDB { title: string; body: string }
export interface SeoFAQDB { q: string; a: string }
export interface SeoRelatedDB { label: string; to: string }

export interface SeoPageRow {
  id: string;
  slug: string;
  title: string;
  meta_description: string;
  h1: string;
  subhead: string;
  badge: string | null;
  bullets: string[];
  sections: SeoSectionDB[];
  faqs: SeoFAQDB[];
  related_links: SeoRelatedDB[];
  cta_label: string | null;
  cta_href: string | null;
  canonical_url: string | null;
  og_image: string | null;
  json_ld: any[];
  template_key: string | null;
  locale: string;
  status: SeoStatus;
  is_indexed: boolean;
  seo_score: number;
  priority: number;
  changefreq: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SeoBlogRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  meta_description: string;
  og_image: string | null;
  category: string | null;
  tags: string[];
  author_name: string | null;
  json_ld: any[];
  status: SeoStatus;
  is_indexed: boolean;
  seo_score: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

const PAGE = "seo_pages" as any;
const BLOG = "seo_blog_posts" as any;

export async function fetchPublishedPage(slug: string): Promise<SeoPageRow | null> {
  const { data } = await supabase.from(PAGE).select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  return (data as any) ?? null;
}

export async function fetchAnyPage(slug: string): Promise<SeoPageRow | null> {
  const { data } = await supabase.from(PAGE).select("*").eq("slug", slug).maybeSingle();
  return (data as any) ?? null;
}

export async function listPages(): Promise<SeoPageRow[]> {
  const { data } = await supabase.from(PAGE).select("*").order("updated_at", { ascending: false });
  return (data as any) ?? [];
}

export async function upsertPage(row: Partial<SeoPageRow>) {
  return supabase.from(PAGE).upsert(row as any, { onConflict: "slug" }).select().single();
}

export async function deletePage(id: string) {
  return supabase.from(PAGE).delete().eq("id", id);
}

export async function fetchPublishedBlog(slug: string): Promise<SeoBlogRow | null> {
  const { data } = await supabase.from(BLOG).select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  return (data as any) ?? null;
}

export async function fetchAnyBlog(slug: string): Promise<SeoBlogRow | null> {
  const { data } = await supabase.from(BLOG).select("*").eq("slug", slug).maybeSingle();
  return (data as any) ?? null;
}

export async function listBlogs(includeDrafts = false): Promise<SeoBlogRow[]> {
  let q = supabase.from(BLOG).select("*").order("updated_at", { ascending: false });
  if (!includeDrafts) q = q.eq("status", "published");
  const { data } = await q;
  return (data as any) ?? [];
}

export async function upsertBlog(row: Partial<SeoBlogRow>) {
  return supabase.from(BLOG).upsert(row as any, { onConflict: "slug" }).select().single();
}

export async function deleteBlog(id: string) {
  return supabase.from(BLOG).delete().eq("id", id);
}

export function calcPageSeoScore(p: Partial<SeoPageRow>): number {
  let s = 0;
  if (p.title && p.title.length >= 30 && p.title.length <= 65) s += 20;
  if (p.meta_description && p.meta_description.length >= 80 && p.meta_description.length <= 165) s += 20;
  if (p.h1) s += 15;
  if ((p.sections?.length ?? 0) >= 2) s += 15;
  if ((p.faqs?.length ?? 0) >= 2) s += 15;
  if ((p.related_links?.length ?? 0) >= 2) s += 10;
  if (p.og_image) s += 5;
  return s;
}

export function calcBlogSeoScore(b: Partial<SeoBlogRow>): number {
  let s = 0;
  if (b.title && b.title.length >= 30 && b.title.length <= 70) s += 20;
  if (b.meta_description && b.meta_description.length >= 80 && b.meta_description.length <= 165) s += 20;
  if (b.content && b.content.length >= 800) s += 25;
  if (b.excerpt) s += 10;
  if ((b.tags?.length ?? 0) >= 2) s += 10;
  if (b.cover_image) s += 10;
  if (b.category) s += 5;
  return s;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}