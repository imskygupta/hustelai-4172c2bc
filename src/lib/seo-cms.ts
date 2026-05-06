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
  topic_id?: string | null;
  is_pillar?: boolean;
  parent_page_id?: string | null;
  breadcrumb_label?: string | null;
  related_page_ids?: string[];
  related_tool_ids?: string[];
  faq_blocks?: SeoFAQDB[];
  auto_link_enabled?: boolean;
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
  topic_id?: string | null;
  author_id?: string | null;
  reading_time_minutes?: number;
  toc?: { level: number; text: string; slug: string }[];
  related_post_ids?: string[];
  related_tool_ids?: string[];
  faq_blocks?: SeoFAQDB[];
  frequently_used_with?: string[];
  auto_link_enabled?: boolean;
}

const PAGE = "seo_pages" as any;
const BLOG = "seo_blog_posts" as any;
const TOPICS = "seo_topics" as any;
const AUTHORS = "seo_authors" as any;
const TAGS = "seo_tags" as any;
const POST_TAGS = "seo_post_tags" as any;
const TOOLS = "seo_related_tools" as any;
const LINKS = "seo_internal_links" as any;

export interface SeoTopicRow {
  id: string; slug: string; title: string; description: string;
  hero_keyword: string; keywords: string[]; cover_image: string | null;
  color: string; icon: string; pillar_page_id: string | null;
  priority: number; seo_score: number; is_published: boolean;
  created_at: string; updated_at: string;
}
export interface SeoAuthorRow {
  id: string; slug: string; display_name: string; bio: string;
  avatar_url: string | null; expertise: string[]; social_links: Record<string, string>;
  user_id: string | null; is_published: boolean;
  created_at: string; updated_at: string;
}
export interface SeoTagRow { id: string; slug: string; name: string; description: string; created_at: string }
export interface SeoToolRow {
  id: string; slug: string; label: string; description: string;
  url: string; icon: string; category: string; is_active: boolean;
}
export interface SeoInternalLinkRow {
  id: string; keyword: string; target_slug: string; target_type: string;
  priority: number; is_active: boolean;
}

// ---- topics
export async function listTopics(): Promise<SeoTopicRow[]> {
  const { data } = await supabase.from(TOPICS).select("*").order("priority", { ascending: false });
  return (data as any) ?? [];
}
export async function fetchTopic(slug: string): Promise<SeoTopicRow | null> {
  const { data } = await supabase.from(TOPICS).select("*").eq("slug", slug).maybeSingle();
  return (data as any) ?? null;
}
export async function upsertTopic(row: Partial<SeoTopicRow>) {
  return supabase.from(TOPICS).upsert(row as any, { onConflict: "slug" }).select().single();
}
export async function deleteTopic(id: string) { return supabase.from(TOPICS).delete().eq("id", id); }

// ---- authors
export async function listAuthors(): Promise<SeoAuthorRow[]> {
  const { data } = await supabase.from(AUTHORS).select("*").order("display_name");
  return (data as any) ?? [];
}
export async function fetchAuthor(slug: string): Promise<SeoAuthorRow | null> {
  const { data } = await supabase.from(AUTHORS).select("*").eq("slug", slug).maybeSingle();
  return (data as any) ?? null;
}
export async function upsertAuthor(row: Partial<SeoAuthorRow>) {
  return supabase.from(AUTHORS).upsert(row as any, { onConflict: "slug" }).select().single();
}
export async function deleteAuthor(id: string) { return supabase.from(AUTHORS).delete().eq("id", id); }

// ---- tags
export async function listTags(): Promise<SeoTagRow[]> {
  const { data } = await supabase.from(TAGS).select("*").order("name");
  return (data as any) ?? [];
}
export async function fetchTag(slug: string): Promise<SeoTagRow | null> {
  const { data } = await supabase.from(TAGS).select("*").eq("slug", slug).maybeSingle();
  return (data as any) ?? null;
}
export async function upsertTag(row: Partial<SeoTagRow>) {
  return supabase.from(TAGS).upsert(row as any, { onConflict: "slug" }).select().single();
}
export async function deleteTag(id: string) { return supabase.from(TAGS).delete().eq("id", id); }

export async function setPostTags(postId: string, tagIds: string[]) {
  await supabase.from(POST_TAGS).delete().eq("post_id", postId);
  if (tagIds.length === 0) return;
  await supabase.from(POST_TAGS).insert(tagIds.map((t) => ({ post_id: postId, tag_id: t })) as any);
}
export async function fetchPostTagIds(postId: string): Promise<string[]> {
  const { data } = await supabase.from(POST_TAGS).select("tag_id").eq("post_id", postId);
  return (data ?? []).map((r: any) => r.tag_id);
}
export async function fetchPostsByTagSlug(tagSlug: string): Promise<SeoBlogRow[]> {
  const tag = await fetchTag(tagSlug);
  if (!tag) return [];
  const { data } = await supabase.from(POST_TAGS).select("post_id").eq("tag_id", tag.id);
  const ids = (data ?? []).map((r: any) => r.post_id);
  if (!ids.length) return [];
  const { data: posts } = await supabase.from(BLOG).select("*").in("id", ids).eq("status", "published").eq("is_indexed", true);
  return (posts as any) ?? [];
}

// ---- tools
export async function listTools(): Promise<SeoToolRow[]> {
  const { data } = await supabase.from(TOOLS).select("*").order("label");
  return (data as any) ?? [];
}
export async function fetchToolsByIds(ids: string[]): Promise<SeoToolRow[]> {
  if (!ids?.length) return [];
  const { data } = await supabase.from(TOOLS).select("*").in("id", ids).eq("is_active", true);
  return (data as any) ?? [];
}
export async function upsertTool(row: Partial<SeoToolRow>) {
  return supabase.from(TOOLS).upsert(row as any, { onConflict: "slug" }).select().single();
}
export async function deleteTool(id: string) { return supabase.from(TOOLS).delete().eq("id", id); }

// ---- internal links
export async function listInternalLinks(): Promise<SeoInternalLinkRow[]> {
  const { data } = await supabase.from(LINKS).select("*").order("priority", { ascending: false });
  return (data as any) ?? [];
}
export async function upsertInternalLink(row: Partial<SeoInternalLinkRow>) {
  return supabase.from(LINKS).insert(row as any).select().single();
}
export async function deleteInternalLink(id: string) { return supabase.from(LINKS).delete().eq("id", id); }

// ---- related lookups
export async function fetchPagesByIds(ids: string[]): Promise<SeoPageRow[]> {
  if (!ids?.length) return [];
  const { data } = await supabase.from(PAGE).select("*").in("id", ids).eq("status", "published");
  return (data as any) ?? [];
}
export async function fetchPostsByIds(ids: string[]): Promise<SeoBlogRow[]> {
  if (!ids?.length) return [];
  const { data } = await supabase.from(BLOG).select("*").in("id", ids).eq("status", "published");
  return (data as any) ?? [];
}
export async function listPagesByTopic(topicId: string): Promise<SeoPageRow[]> {
  const { data } = await supabase.from(PAGE).select("*").eq("topic_id", topicId).eq("status", "published").order("is_pillar", { ascending: false });
  return (data as any) ?? [];
}
export async function listPostsByTopic(topicId: string, limit = 20): Promise<SeoBlogRow[]> {
  const { data } = await supabase.from(BLOG).select("*").eq("topic_id", topicId).eq("status", "published").order("published_at", { ascending: false }).limit(limit);
  return (data as any) ?? [];
}
export async function listPostsByAuthor(authorId: string): Promise<SeoBlogRow[]> {
  const { data } = await supabase.from(BLOG).select("*").eq("author_id", authorId).eq("status", "published").order("published_at", { ascending: false });
  return (data as any) ?? [];
}
export async function listPostsByCategory(category: string): Promise<SeoBlogRow[]> {
  const { data } = await supabase.from(BLOG).select("*").eq("category", category).eq("status", "published").order("published_at", { ascending: false });
  return (data as any) ?? [];
}

// ---- helpers
export function extractToc(markdown: string): { level: number; text: string; slug: string }[] {
  const out: { level: number; text: string; slug: string }[] = [];
  const re = /^(#{2,3})\s+(.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(markdown))) {
    const text = m[2].trim();
    const slug = text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-");
    out.push({ level: m[1].length, text, slug });
  }
  return out;
}
export function readingTime(markdown: string): number {
  const wc = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wc / 200));
}

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