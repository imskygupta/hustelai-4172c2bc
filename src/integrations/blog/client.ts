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
  let payload: any = null;
  try { payload = await r.json(); } catch { /* non-json */ }
  if (!r.ok) {
    const detail = payload?.error ? ` — ${typeof payload.error === "string" ? payload.error : JSON.stringify(payload.error)}` : "";
    throw new Error(`${path} ${r.status}${detail}`);
  }
  return payload;
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
  seoHealth: () => call(`/blog-seo-health`, { admin: true }),
  schedulerStats: () => call(`/blog-scheduler`, { admin: true }),
  runScheduler: (opts: { dry_run?: boolean; publish_target?: number; generate_target?: number } = {}) =>
    call(`/blog-scheduler`, { admin: true, method: "POST", body: JSON.stringify(opts) }),

  // hero image pipeline
  imageStatus: () => call(`/blog-image-pipeline?action=status`, { admin: true }),
  ensureBucket: () => call(`/blog-image-pipeline?action=ensure_bucket`, { admin: true }),
  regenerateHero: (post_id: string, opts: { custom_url?: string; force?: boolean } = {}) =>
    call(`/blog-image-pipeline?action=regenerate`, { admin: true, method: "POST", body: JSON.stringify({ post_id, ...opts }) }),
  migrateHeroes: (limit = 25) =>
    call(`/blog-image-pipeline?action=migrate`, { admin: true, method: "POST", body: JSON.stringify({ limit }) }),

  // editorial intelligence
  intelligence: () => call(`/blog-intelligence?action=overview`, { admin: true }),
  refreshTrends: () => call(`/blog-intelligence?action=refresh_trends`, { admin: true, method: "POST" }),

  // IndexNow
  indexnowStatus: () => call(`/indexnow?action=status`, { admin: true }),
  indexnowEnqueue: (urls: string[], source_kind = "manual", source_id?: string) =>
    call(`/indexnow?action=enqueue`, { admin: true, method: "POST", body: JSON.stringify({ urls, source_kind, source_id }) }),
  indexnowFlush: (limit = 100) =>
    call(`/indexnow?action=flush`, { admin: true, method: "POST", body: JSON.stringify({ limit }) }),
  indexnowRetry: () => call(`/indexnow?action=retry`, { admin: true, method: "POST" }),

  // Internal linking engine
  linkOverview: () => call(`/blog-link-engine?action=overview`, { admin: true }),
  linkSuggest: (id: string) => call(`/blog-link-engine?action=suggest&id=${encodeURIComponent(id)}`, { admin: true }),
  linkReadNext: (slug: string) => call(`/blog-link-engine?action=read_next&slug=${encodeURIComponent(slug)}`, { admin: true }),
  linkAutoInsert: (payload: { id?: string; body_md: string; focus_keyword?: string; max?: number; append_cta?: boolean }) =>
    call(`/blog-link-engine?action=auto_insert`, { admin: true, method: "POST", body: JSON.stringify(payload) }),

  // Editorial Command Center
  editorialOverview: () => call(`/editorial-center?action=overview`, { admin: true }),
  editorialTopicIntel: () => call(`/editorial-center?action=topic_intel`, { admin: true }),
  editorialIndexing: (slug: string) => call(`/editorial-center?action=indexing&slug=${encodeURIComponent(slug)}`, { admin: true }),
  editorialRecrawl: (slug: string) =>
    call(`/editorial-center?action=recrawl`, { admin: true, method: "POST", body: JSON.stringify({ slug }) }),
  editorialAiRefresh: (id: string, intent: string) =>
    call(`/editorial-center?action=ai_refresh`, { admin: true, method: "POST", body: JSON.stringify({ id, intent }) }),
  editorialHumanize: (payload: { id?: string; body_md?: string }) =>
    call(`/editorial-center?action=humanize`, { admin: true, method: "POST", body: JSON.stringify(payload) }),

  // Product Narrative Engine — Tool Registry
  registryList: () => call(`/tool-registry-sync?action=list`, { admin: true }),
  registryHealth: () => call(`/tool-registry-sync?action=health`, { admin: true }),
  registrySync: (mode: "incremental" | "full" = "incremental") =>
    call(`/tool-registry-sync?action=sync&mode=${mode}`, { admin: true, method: "POST" }),
  registryBootstrapSql: () => call(`/narrative-bootstrap?action=bootstrap`, { admin: true }),
  registryBootstrapVerify: () => call(`/narrative-bootstrap?action=verify`, { admin: true }),

  // Knowledge graph
  graphAll: () => call(`/knowledge-graph?action=graph`, { admin: true }),
  graphNeighbors: (slug: string) => call(`/knowledge-graph?action=neighbors&slug=${encodeURIComponent(slug)}`, { admin: true }),
  graphContext: (query: string, k = 6) =>
    call(`/knowledge-graph?action=context`, { admin: true, method: "POST", body: JSON.stringify({ query, k }) }),
  graphCoverage: () => call(`/knowledge-graph?action=coverage`, { admin: true }),

  // Narrative engine
  narrativeRuns: (limit = 20) => call(`/narrative-generate?action=runs&limit=${limit}`, { admin: true }),
  narrativeEvents: (run_id: string) =>
    call(`/narrative-generate?action=events&run_id=${encodeURIComponent(run_id)}`, { admin: true }),
  narrativeGenerate: (payload: { topic?: string; angle?: string; keyword?: string; auto_publish?: boolean } = {}) =>
    call(`/narrative-generate?action=generate`, { admin: true, method: "POST", body: JSON.stringify(payload) }),

  // Tool media pipeline
  mediaList: () => call(`/tool-media-pipeline?action=list`, { admin: true }),
  mediaForTool: (slug: string) => call(`/tool-media-pipeline?action=for_tool&slug=${encodeURIComponent(slug)}`, { admin: true }),
  mediaCoverage: () => call(`/tool-media-pipeline?action=coverage`, { admin: true }),
  mediaCapture: (slug: string, kind: string) =>
    call(`/tool-media-pipeline?action=capture`, { admin: true, method: "POST", body: JSON.stringify({ slug, kind }) }),
  mediaQueue: (limit = 25) => call(`/tool-media-pipeline?action=queue&limit=${limit}`, { admin: true, method: "POST" }),

  // Crawl Orchestrator
  crawlBootstrapSql: () => call(`/crawl-orchestrator?action=bootstrap_sql`),
  crawlDiagnostics: () => call(`/crawl-orchestrator?action=diagnostics`, { admin: true }),
  crawlQueue: (limit = 50) => call(`/crawl-orchestrator?action=queue&limit=${limit}`, { admin: true }),
  crawlSyncBlog: () => call(`/crawl-orchestrator?action=sync_blog`, { admin: true, method: "POST" }),
  crawlSyncMain: (extra: string[] = []) =>
    call(`/crawl-orchestrator?action=sync_main`, { admin: true, method: "POST", body: JSON.stringify({ extra }) }),
  crawlRegister: (rows: any[]) =>
    call(`/crawl-orchestrator?action=register`, { admin: true, method: "POST", body: JSON.stringify({ rows }) }),
  crawlSubmit: (limit = 50) =>
    call(`/crawl-orchestrator?action=submit`, { admin: true, method: "POST", body: JSON.stringify({ limit }) }),
  crawlPing: () => call(`/crawl-orchestrator?action=ping`, { admin: true, method: "POST" }),
  crawlFreshness: () => call(`/crawl-orchestrator?action=freshness`, { admin: true, method: "POST" }),
  crawlRefreshPost: (slug: string) =>
    call(`/crawl-orchestrator?action=refresh_post`, { admin: true, method: "POST", body: JSON.stringify({ slug }) }),
};

// ──────────────────────────────────────────────────────────────────────────
// Editorial Acquisition + Tool Conversion (Phase 11)
// ──────────────────────────────────────────────────────────────────────────
export const conversionApi = {
  // Hustle templates
  templatesList: () => call(`/hustle-templates?action=list`),
  templateGet: (slug: string) => call(`/hustle-templates?action=get&slug=${encodeURIComponent(slug)}`),
  templateSave: (template: any) =>
    call(`/hustle-templates?action=save`, { admin: true, method: "POST", body: JSON.stringify(template) }),
  templateDelete: (id: string) =>
    call(`/hustle-templates?action=delete`, { admin: true, method: "POST", body: JSON.stringify({ id }) }),
  templatesBootstrapSql: () => call(`/hustle-templates?action=bootstrap_sql`),

  // Tool matcher
  matchTools: (payload: { post_id?: string; body_md?: string; title?: string; focus_keyword?: string; cluster?: string; mode?: "auto" | "manual" | "hybrid"; overrides?: any }) =>
    call(`/tool-matcher?action=match`, { admin: true, method: "POST", body: JSON.stringify(payload) }),

  // AdSense readiness
  adsenseCheck: (post_id: string) =>
    call(`/adsense-readiness?action=check`, { admin: true, method: "POST", body: JSON.stringify({ post_id }) }),
  adsenseOverview: () => call(`/adsense-readiness?action=overview`, { admin: true }),
  adsenseRescanAll: () => call(`/adsense-readiness?action=rescan_all`, { admin: true, method: "POST" }),

  // Authority batch
  batchList: () => call(`/authority-batch?action=list`, { admin: true }),
  batchGet: (id: string) => call(`/authority-batch?action=get&id=${encodeURIComponent(id)}`, { admin: true }),
  batchStart: (payload: { count?: number; clusters?: string[]; stagger_hours?: number; auto_publish?: boolean; min_adsense_score?: number }) =>
    call(`/authority-batch?action=start`, { admin: true, method: "POST", body: JSON.stringify(payload) }),
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