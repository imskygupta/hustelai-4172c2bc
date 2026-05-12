import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { notifyOps } from "../_shared/notify-ops.ts";

/**
 * Editorial Intelligence layer for Blog Operations.
 *
 *   GET ?action=overview  → single aggregated payload powering every panel
 *   POST ?action=refresh_trends → force a new AI generation of trending topics
 *
 * Everything is derived from the existing blog_posts table on the blog DB.
 * No schema migrations are required — derived stage / cluster / quality data
 * is computed on the fly. Trending topics are generated via Lovable AI Gateway
 * and cached for 6 hours in module memory (warm function instance).
 */

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const BLOG_URL    = Deno.env.get("BLOG_SUPABASE_URL") ?? "";
const BLOG_SR     = Deno.env.get("BLOG_SUPABASE_SERVICE_ROLE") ?? "";
const MAIN_URL    = Deno.env.get("SUPABASE_URL") ?? "";
const MAIN_ANON   = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const MAIN_SR     = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";

const blog = (BLOG_URL && BLOG_SR) ? createClient(BLOG_URL, BLOG_SR) : null as any;
const main = (MAIN_URL && MAIN_ANON) ? createClient(MAIN_URL, MAIN_ANON) : null as any;

/* ───────────────────── helpers ───────────────────── */
function logErr(stage: string, err: any, ctx: Record<string, any> = {}) {
  const detail = err instanceof Error ? { name: err.name, message: err.message } : { message: String(err) };
  console.error(JSON.stringify({ scope: "blog-intelligence", stage, ...ctx, error: detail }));
}
function jsonOk(body: Record<string, any>, status = 200) {
  return new Response(JSON.stringify({ ok: true, ...body }), { status, headers: { ...cors, "content-type": "application/json" } });
}
function jsonFail(error: string, body: Record<string, any> = {}, status = 200) {
  return new Response(JSON.stringify({ ok: false, error, ...body }), { status, headers: { ...cors, "content-type": "application/json" } });
}

async function isAdmin(req: Request): Promise<boolean> {
  try {
    if (!main) return false;
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return false;
    const { data, error } = await main.auth.getUser(auth.replace("Bearer ", ""));
    if (error || !data?.user?.id) return false;
    const admin = createClient(MAIN_URL, MAIN_SR);
    const { data: r } = await admin.from("user_roles").select("role").eq("user_id", data.user.id).eq("role", "admin").maybeSingle();
    return !!r;
  } catch (e) { logErr("auth", e); return false; }
}

/* ───────────────────── clusters ───────────────────── */
const CLUSTERS: Array<{ key: string; title: string; keywords: string[] }> = [
  { key: "freelance-ops",     title: "Freelance Ops",     keywords: ["freelance", "freelancer", "client onboarding", "invoice", "proposal", "contract"] },
  { key: "async-workflows",   title: "Async Workflows",   keywords: ["async", "asynchronous", "workflow", "automation", "remote work"] },
  { key: "telegram-delivery", title: "Telegram Delivery", keywords: ["telegram", "bot", "delivery", "notification"] },
  { key: "ai-workspace",      title: "AI Workspace",      keywords: ["ai", "gpt", "llm", "workspace", "knowledge", "automation engine"] },
  { key: "client-systems",    title: "Client Systems",    keywords: ["client", "crm", "lead", "intake", "pipeline", "retainer"] },
  { key: "free-tools",        title: "Free Tools",        keywords: ["free tool", "calculator", "generator", "template", "builder"] },
];

function clusterFor(post: any): string {
  const hay = `${post.title ?? ""} ${post.focus_keyword ?? ""} ${post.meta_description ?? ""}`.toLowerCase();
  for (const c of CLUSTERS) {
    if (c.keywords.some(k => hay.includes(k))) return c.key;
  }
  return "freelance-ops";
}

/* ───────────────────── stage derivation ───────────────────── */
const STAGE_ORDER = [
  "queued", "researching", "drafting", "enriching",
  "generating_hero", "seo_scoring", "awaiting_review", "published", "indexed",
] as const;
type Stage = typeof STAGE_ORDER[number];

function deriveStage(p: any): Stage {
  const md = (p.body_md ?? "").length;
  const heroInternal = !!p.hero_image && p.hero_image.includes("/storage/v1/object/public/blog-assets/");
  if (p.status === "published") {
    return p.indexed_at ? "indexed" : "published";
  }
  if (p.status === "scheduled") return "awaiting_review";
  if (p.status === "in_review") return "seo_scoring";
  if (p.status === "draft") {
    if (md === 0) return "researching";
    if (md > 0 && md < 1500) return "drafting";
    if (!heroInternal) return "generating_hero";
    return "enriching";
  }
  return "queued";
}

/* ───────────────────── quality scoring ───────────────────── */
function wordCount(md: string) { return (md ?? "").trim().split(/\s+/).filter(Boolean).length; }
function avgSentenceLen(md: string) {
  const sentences = (md ?? "").split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  if (!sentences.length) return 0;
  return sentences.reduce((a, s) => a + s.split(/\s+/).length, 0) / sentences.length;
}

function scorePost(p: any): { total: number; readability: number; depth: number; stuffing: number; headings: number; internal_links: number; cta: number; uniqueness: number; warnings: string[] } {
  const md: string = p.body_md ?? "";
  const warnings: string[] = [];
  const wc = wordCount(md);
  const asl = avgSentenceLen(md);
  const h2 = (md.match(/^##\s/gm) ?? []).length;
  const h3 = (md.match(/^###\s/gm) ?? []).length;
  const paragraphs = md.split(/\n{2,}/).filter(s => s.trim() && !s.trim().startsWith("#")).length;
  const internalLinks = [...md.matchAll(/\]\((\/[^)\s]+)\)/g)].length;
  const externalLinks = [...md.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].length;
  const ctaBlocks = (p.cta_blocks?.length ?? 0) + (md.match(/\bTry\b|\bGet started\b|\bExplore\b/gi)?.length ?? 0);
  const kw = (p.focus_keyword ?? "").toLowerCase().trim();
  const kwHits = kw ? (md.toLowerCase().match(new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g"))?.length ?? 0) : 0;
  const density = wc ? kwHits / wc : 0;

  // Sub-scores 0-100
  const readability = Math.round(100 - Math.min(100, Math.abs(asl - 16) * 6));
  const depth = Math.round(Math.min(100, (wc / 1200) * 100));
  const stuffing = Math.round(100 - Math.min(100, Math.abs(density - 0.012) * 8000));
  const headings = Math.round(Math.min(100, ((h2 >= 3 ? 60 : h2 * 20) + Math.min(40, h3 * 8))));
  const internal_links_score = Math.round(Math.min(100, internalLinks * 25));
  const cta = Math.round(Math.min(100, ctaBlocks >= 1 && ctaBlocks <= 4 ? 100 : ctaBlocks === 0 ? 30 : 60));
  const uniqueness = Math.round(Math.min(100, (h2 * 8 + paragraphs * 3 + (kw ? 10 : 0))));

  if (wc < 800) warnings.push("thin content");
  if (h2 < 3)   warnings.push("not enough H2 sections");
  if (internalLinks < 2) warnings.push("low internal linking");
  if (density > 0.03) warnings.push("possible keyword stuffing");
  if (!p.meta_description) warnings.push("missing meta description");
  if (externalLinks === 0) warnings.push("no outbound references");

  const total = Math.round((readability + depth + stuffing + headings + internal_links_score + cta + uniqueness) / 7);
  return { total, readability, depth, stuffing, headings, internal_links: internal_links_score, cta, uniqueness, warnings };
}

/* ───────────────────── internal link suggestions ───────────────────── */
function tokenize(s: string): Set<string> {
  return new Set((s ?? "").toLowerCase().match(/[a-z0-9]{4,}/g) ?? []);
}
function jaccard(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let inter = 0; for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}
function suggestLinks(posts: any[]) {
  const enriched = posts.map(p => ({ ...p, _tokens: tokenize(`${p.title} ${p.focus_keyword ?? ""} ${p.meta_description ?? ""}`) }));
  return enriched.map(p => {
    const md = (p.body_md ?? "").toLowerCase();
    const candidates = enriched
      .filter(o => o.id !== p.id && o.status === "published")
      .map(o => ({ id: o.id, slug: o.slug, title: o.title, score: jaccard(p._tokens, o._tokens), already_linked: md.includes(`/${o.slug}`) }))
      .filter(c => c.score > 0.05 && !c.already_linked)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    return { id: p.id, slug: p.slug, title: p.title, suggestions: candidates };
  });
}

/* ───────────────────── trending topics (AI) ───────────────────── */
let TRENDING_CACHE: { at: number; items: any[] } | null = null;
const TREND_TTL_MS = 6 * 60 * 60 * 1000;

async function generateTrends(force = false): Promise<{ items: any[]; cached: boolean }> {
  if (!force && TRENDING_CACHE && Date.now() - TRENDING_CACHE.at < TREND_TTL_MS) {
    return { items: TRENDING_CACHE.items, cached: true };
  }
  if (!LOVABLE_KEY) return { items: [], cached: false };

  const prompt = `You are an editorial SEO strategist for an Indian freelancer/remote-work publication.
Suggest 12 high-intent trending topic opportunities sourced from current Google Trends signals,
Reddit (r/freelance, r/digitalnomad, r/IndianFreelancers), and Upwork/Fiverr search patterns.
Return strict JSON: {"items":[{"keyword":"…","intent":"informational|commercial|navigational",
"difficulty":"low|medium|high","freshness":"rising|steady|seasonal",
"cluster":"freelance-ops|async-workflows|telegram-delivery|ai-workspace|client-systems|free-tools",
"recommended_cta":"…","source":"google_trends|reddit|upwork|internal"}]}.
Only return JSON.`;

  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${LOVABLE_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      logErr("ai_provider", `status ${r.status}`, { body: body.slice(0, 300) });
      if (r.status === 402 || r.status === 429) {
        try { notifyOps("webhook_failed", { note: `blog-intelligence trends: ${r.status}` }); } catch { /* */ }
      }
      return { items: [], cached: false };
    }
    const j = await r.json();
    const content = j?.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);
    const items = Array.isArray(parsed.items) ? parsed.items.slice(0, 20) : [];
    TRENDING_CACHE = { at: Date.now(), items };
    return { items, cached: false };
  } catch (e) {
    logErr("ai_provider", e);
    return { items: TRENDING_CACHE?.items ?? [], cached: !!TRENDING_CACHE };
  }
}

/* ───────────────────── editorial calendar ───────────────────── */
function buildCalendar(posts: any[]) {
  // Group last 14 days + next 14 days by ISO date.
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const days: Record<string, { date: string; published: any[]; scheduled: any[] }> = {};
  for (let d = -14; d <= 14; d++) {
    const dt = new Date(today.getTime() + d * 86400000);
    const key = dt.toISOString().slice(0, 10);
    days[key] = { date: key, published: [], scheduled: [] };
  }
  for (const p of posts) {
    const ts = p.status === "scheduled" ? p.scheduled_at : p.published_at;
    if (!ts) continue;
    const key = String(ts).slice(0, 10);
    if (!days[key]) continue;
    const slot = { id: p.id, slug: p.slug, title: p.title, cluster: clusterFor(p), at: ts };
    if (p.status === "scheduled") days[key].scheduled.push(slot); else days[key].published.push(slot);
  }
  // India-prime publishing window (UTC 03:30 = 09:00 IST). Surface as guidance.
  return {
    days: Object.values(days),
    suggested_window_utc: { start: "03:30", end: "06:30" },
    suggested_window_ist: { start: "09:00", end: "12:00" },
  };
}

/* ───────────────────── handler ───────────────────── */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "overview";

  try {
    if (!BLOG_URL || !BLOG_SR || !MAIN_URL) {
      return jsonFail("ENV_VALIDATION_FAILED");
    }
    if (!(await isAdmin(req))) return jsonFail("forbidden", {}, 403);

    if (action === "refresh_trends") {
      const { items, cached } = await generateTrends(true);
      return jsonOk({ trending: { items, cached, generated_at: new Date().toISOString() } });
    }

    // overview ─ single aggregated payload
    let posts: any[] = [];
    try {
      const { data, error } = await blog.from("blog_posts")
        .select("id, slug, title, status, scheduled_at, published_at, updated_at, category_id, ai_generated, body_md, hero_image, focus_keyword, meta_title, meta_description, faq, cta_blocks")
        .order("updated_at", { ascending: false })
        .limit(300);
      if (error) { logErr("db_read", error); return jsonFail("DB_READ_FAILED", { details: error.message }); }
      posts = data ?? [];
    } catch (e) { logErr("db_read", e); return jsonFail("DB_READ_FAILED"); }

    // Per-post intelligence
    const enriched = posts.map(p => {
      const stage = deriveStage(p);
      const score = scorePost(p);
      return { ...p, _stage: stage, _cluster: clusterFor(p), _score: score };
    });

    // ── stages
    const stagesMap = STAGE_ORDER.reduce((acc, s) => { acc[s] = []; return acc; }, {} as Record<Stage, any[]>);
    for (const p of enriched) {
      const last = p.published_at ?? p.scheduled_at ?? p.updated_at;
      const ageMs = last ? Date.now() - new Date(last).getTime() : null;
      stagesMap[p._stage].push({
        id: p.id, slug: p.slug, title: p.title,
        cluster: p._cluster,
        duration_ms: ageMs,
        retries: p.ai_generated ? 0 : 0, // no retry counter on table — placeholder
        timestamp: last,
        source: p.ai_generated ? "ai-draft" : "manual",
        score: p._score.total,
      });
    }
    const stages = STAGE_ORDER.map(key => ({
      key,
      label: key.replace(/_/g, " "),
      count: stagesMap[key].length,
      items: stagesMap[key].slice(0, 6),
    }));

    // ── clusters
    const clusters = CLUSTERS.map(c => {
      const inCluster = enriched.filter(p => p._cluster === c.key);
      const published = inCluster.filter(p => p.status === "published");
      const indexed = published.filter(p => (p as any).indexed_at);
      const avg = published.length ? Math.round(published.reduce((a, p) => a + (p._score.total ?? 0), 0) / published.length) : 0;
      const internalLinkSum = published.reduce((a, p) => a + ([...(p.body_md ?? "").matchAll(/\]\((\/[^)\s]+)\)/g)].length), 0);
      const orphans = published.filter(p => [...(p.body_md ?? "").matchAll(/\]\((\/[^)\s]+)\)/g)].length === 0).length;
      return {
        key: c.key, title: c.title,
        article_count: inCluster.length,
        indexed_count: indexed.length,
        internal_links: internalLinkSum,
        avg_seo_score: avg,
        orphan_pages: orphans,
      };
    });

    // ── linking engine
    const linkSuggestions = suggestLinks(enriched).filter(s => s.suggestions.length > 0).slice(0, 25);

    // ── quality table (lowest scoring published first)
    const quality = enriched
      .filter(p => p.status === "published")
      .map(p => ({ id: p.id, slug: p.slug, title: p.title, cluster: p._cluster, score: p._score }))
      .sort((a, b) => a.score.total - b.score.total)
      .slice(0, 50);

    // ── calendar
    const calendar = buildCalendar(enriched);

    // ── trending (cached)
    const trending = await generateTrends(false);

    return jsonOk({
      generated_at: new Date().toISOString(),
      stages,
      clusters,
      link_suggestions: linkSuggestions,
      quality,
      calendar,
      trending: { items: trending.items, cached: trending.cached },
      summary: {
        total_posts: enriched.length,
        published: enriched.filter(p => p.status === "published").length,
        in_pipeline: enriched.filter(p => p.status !== "published").length,
        avg_score: quality.length ? Math.round(quality.reduce((a, q) => a + q.score.total, 0) / quality.length) : 0,
      },
    });
  } catch (e: any) {
    logErr("unexpected", e);
    try { notifyOps("webhook_failed", { note: `blog-intelligence: ${e?.message ?? e}` }); } catch { /* */ }
    return jsonFail("UNEXPECTED_FAILURE", { details: String(e?.message ?? e) });
  }
});