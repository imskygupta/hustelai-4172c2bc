import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const main = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
const blog = createClient(
  Deno.env.get("BLOG_SUPABASE_URL")!,
  Deno.env.get("BLOG_SUPABASE_SERVICE_ROLE")!,
);
const adminMain = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function requireAdmin(req: Request): Promise<boolean> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  const { data, error } = await main.auth.getUser(auth.replace("Bearer ", ""));
  if (error || !data?.user?.id) return false;
  const { data: roles } = await adminMain.from("user_roles")
    .select("role").eq("user_id", data.user.id).eq("role", "admin").maybeSingle();
  return !!roles;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });
}

const STOP = new Set("a an the and or for of to in on at is are be by with from as it this that these those your you we our i me my their they them his her she he".split(" "));
function tokenize(s: string) {
  return (s ?? "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 2 && !STOP.has(w));
}
function jaccard(a: Set<string>, b: Set<string>) {
  let inter = 0; for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}
function wordCount(md: string) { return (md ?? "").trim().split(/\s+/).filter(Boolean).length; }
function extractLinks(md: string) { return [...(md ?? "").matchAll(/\]\(([^)\s]+)\)/g)].map(m => m[1]); }
function extractImages(md: string) { return [...(md ?? "").matchAll(/!\[([^\]]*)\]\(([^)\s]+)\)/g)].map(m => ({ alt: m[1], src: m[2] })); }
function daysSince(iso?: string | null) {
  if (!iso) return Infinity;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function pipelineStage(p: any): string {
  const status = p.status ?? "draft";
  if (status === "draft" && !p.body_md) return "ideas";
  if (status === "draft") return "drafting";
  if (status === "review") return "internal_review";
  if (status === "scheduled") return "scheduled";
  if (status === "published") {
    const age = daysSince(p.published_at ?? p.updated_at);
    const wc = wordCount(p.body_md ?? "");
    if (age > 180 || wc < 600) return "needs_refresh";
    if (p._traffic && p._traffic.impressions === 0 && age > 14) return "decaying";
    return "published";
  }
  return "ideas";
}

function decayScore(p: any): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let s = 0;
  const md = p.body_md ?? "";
  const wc = wordCount(md);
  const updAge = daysSince(p.updated_at);
  const pubAge = daysSince(p.published_at);
  if (wc < 600) { s += 25; reasons.push(`thin (${wc}w)`); }
  if (updAge > 120) { s += 20; reasons.push(`stale ${updAge}d`); }
  if (pubAge > 365) { s += 10; reasons.push(`>1y old`); }
  const links = extractLinks(md);
  const internal = links.filter(h => /^\//.test(h) || /(^|\.)hustlaiapp\.in/.test(h));
  if (internal.length < 2) { s += 15; reasons.push(`only ${internal.length} internal links`); }
  if (!Array.isArray(p.faq) || p.faq.length === 0) { s += 10; reasons.push("no FAQ"); }
  if (!p.hero_image) { s += 10; reasons.push("no hero"); }
  if (!p.focus_keyword) { s += 5; reasons.push("no focus kw"); }
  if (p.published_at && !p.meta_title) { s += 10; reasons.push("no meta title"); }
  return { score: Math.min(100, s), reasons };
}

function adSafeScore(p: any): number {
  const md = (p.body_md ?? "").toLowerCase();
  let s = 100;
  for (const w of ["gambling", "casino", "porn", "weapon", "drug", "scam"]) if (md.includes(w)) s -= 25;
  return Math.max(0, s);
}
function ctaPlacementScore(p: any): number {
  const md = p.body_md ?? "";
  const ctas = (md.match(/\b(try|sign up|get started|use|launch)\b/gi) ?? []).length;
  const wc = wordCount(md);
  if (wc < 400) return 30;
  if (ctas === 0) return 25;
  if (ctas > 12) return 40;
  return Math.min(100, 60 + ctas * 4);
}
function rpmEstimate(p: any): number {
  const wc = wordCount(p.body_md ?? "");
  const base = 1.2;
  const lengthMult = Math.min(2.5, wc / 1000);
  return +(base * lengthMult * (adSafeScore(p) / 100) * 100 / 100).toFixed(2);
}
function scrollDepthEstimate(p: any): number {
  const wc = wordCount(p.body_md ?? "");
  if (wc < 400) return 35;
  if (wc > 2500) return 45;
  return Math.min(75, 50 + Math.round(wc / 100));
}
function affiliateBlocks(p: any): number {
  const md = p.body_md ?? "";
  return [...md.matchAll(/\[(?:[^\]]+)\]\((https?:\/\/[^)\s]+)\)/g)]
    .filter(m => /(\?|&)(ref|aff|utm_source)=/.test(m[1])).length;
}

async function fetchPosts() {
  const { data } = await blog.from("blog_posts")
    .select("id, slug, title, status, scheduled_at, published_at, updated_at, category_id, hero_image, body_md, focus_keyword, meta_title, meta_description, faq, toc, noindex, ai_generated")
    .order("updated_at", { ascending: false })
    .limit(500);
  return data ?? [];
}

function buildLinkGraph(posts: any[]) {
  const slugs = new Set(posts.filter(p => p.status === "published").map(p => p.slug));
  const inbound = new Map<string, Set<string>>();
  const outbound = new Map<string, Set<string>>();
  for (const p of posts) {
    const out = new Set<string>();
    for (const href of extractLinks(p.body_md ?? "")) {
      const m = href.match(/^(?:https?:\/\/blogs\.hustlaiapp\.in)?\/([a-z0-9][a-z0-9-]+)$/i);
      if (!m) continue;
      const target = m[1];
      if (target === p.slug || !slugs.has(target)) continue;
      out.add(target);
      if (!inbound.has(target)) inbound.set(target, new Set());
      inbound.get(target)!.add(p.slug);
    }
    outbound.set(p.slug, out);
  }
  // PageRank-lite (one pass)
  const auth = new Map<string, number>();
  for (const p of posts) auth.set(p.slug, 1);
  for (let i = 0; i < 8; i++) {
    const next = new Map<string, number>();
    for (const p of posts) next.set(p.slug, 0.15);
    for (const [src, outs] of outbound) {
      const share = (auth.get(src) ?? 1) / Math.max(1, outs.size);
      for (const t of outs) next.set(t, (next.get(t) ?? 0) + 0.85 * share);
    }
    for (const [k, v] of next) auth.set(k, v);
  }
  return { inbound, outbound, auth };
}

function clusters(posts: any[]) {
  const pubs = posts.filter(p => p.status === "published");
  const seen = new Set<string>();
  const out: { name: string; slugs: string[] }[] = [];
  for (const p of pubs) {
    if (seen.has(p.id)) continue;
    const tokA = new Set(tokenize(`${p.title} ${p.focus_keyword ?? ""}`));
    const cluster = [p.slug]; seen.add(p.id);
    for (const o of pubs) {
      if (seen.has(o.id)) continue;
      const tokB = new Set(tokenize(`${o.title} ${o.focus_keyword ?? ""}`));
      if (jaccard(tokA, tokB) >= 0.25) { cluster.push(o.slug); seen.add(o.id); }
    }
    if (cluster.length > 1) out.push({ name: p.focus_keyword || p.title.slice(0, 40), slugs: cluster });
  }
  return out.slice(0, 30);
}

function guardrails(posts: any[]) {
  const pubs = posts.filter(p => p.status === "published");
  const dupTitles: { value: string; slugs: string[] }[] = [];
  const dupKw: { value: string; slugs: string[] }[] = [];
  const tMap = new Map<string, string[]>();
  const kMap = new Map<string, string[]>();
  for (const p of pubs) {
    const tk = (p.title ?? "").trim().toLowerCase();
    if (tk) tMap.set(tk, [...(tMap.get(tk) ?? []), p.slug]);
    const kw = (p.focus_keyword ?? "").trim().toLowerCase();
    if (kw) kMap.set(kw, [...(kMap.get(kw) ?? []), p.slug]);
  }
  for (const [k, v] of tMap) if (v.length > 1) dupTitles.push({ value: k, slugs: v });
  for (const [k, v] of kMap) if (v.length > 1) dupKw.push({ value: k, slugs: v });

  const stuffing: { slug: string; word: string; density: number }[] = [];
  const overOpt: { slug: string; ratio: number }[] = [];
  const thin: { slug: string; words: number }[] = [];
  for (const p of pubs) {
    const md = p.body_md ?? "";
    const wc = wordCount(md);
    if (wc < 500) thin.push({ slug: p.slug, words: wc });
    const tokens = tokenize(md);
    const counts = new Map<string, number>();
    for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    for (const [w, c] of top) {
      const d = +(c / Math.max(1, tokens.length) * 100).toFixed(2);
      if (d > 4) stuffing.push({ slug: p.slug, word: w, density: d });
    }
    const links = extractLinks(md);
    const internal = links.filter(h => /^\//.test(h));
    if (internal.length > 0 && p.focus_keyword) {
      // anchor over-optimization: count anchors equal to focus kw
      const anchors = [...md.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)].map(m => m[1].toLowerCase());
      const exact = anchors.filter(a => a.includes(p.focus_keyword.toLowerCase())).length;
      const ratio = exact / Math.max(1, anchors.length);
      if (ratio > 0.4) overOpt.push({ slug: p.slug, ratio: +ratio.toFixed(2) });
    }
  }
  return { dupTitles, dupKw, stuffing, overOpt, thin };
}

async function indexingStatus(slug: string) {
  const url = `https://blogs.hustlaiapp.in/${slug}`;
  const out: any = { url, bing: null, google: null, yandex: null, last_ping: null };
  try {
    const { data } = await adminMain.from("indexnow_log")
      .select("created_at,status,target,url")
      .eq("url", url)
      .order("created_at", { ascending: false })
      .limit(5);
    out.last_ping = data?.[0]?.created_at ?? null;
    out.recent = data ?? [];
  } catch (_) { /* indexnow_log lives in main DB */ }
  // best-effort live probes (no JS, may be blocked, just inform)
  async function probe(u: string) {
    try { const r = await fetch(u, { redirect: "follow" }); return { ok: r.ok, status: r.status }; }
    catch { return { ok: false, status: 0 }; }
  }
  const [bing, google, yandex] = await Promise.all([
    probe(`https://www.bing.com/search?q=site%3Ablogs.hustlaiapp.in%2F${encodeURIComponent(slug)}`),
    probe(`https://www.google.com/search?q=site%3Ablogs.hustlaiapp.in%2F${encodeURIComponent(slug)}`),
    probe(`https://yandex.com/search/?text=site%3Ablogs.hustlaiapp.in%2F${encodeURIComponent(slug)}`),
  ]);
  out.bing = bing; out.google = google; out.yandex = yandex;
  return out;
}

async function aiCall(system: string, user: string): Promise<string> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
  });
  if (!r.ok) throw new Error(`gateway ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (!(await requireAdmin(req))) return json({ ok: false, error: "forbidden" }, 403);
  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "overview";
  try {
    if (action === "overview") {
      const posts = await fetchPosts();
      const graph = buildLinkGraph(posts);
      const cl = clusters(posts);

      const stages: Record<string, any[]> = {
        ideas: [], drafting: [], internal_review: [], scheduled: [],
        published: [], needs_refresh: [], decaying: [],
      };
      const decay: any[] = [];
      const monetization: any[] = [];
      for (const p of posts) {
        const stage = pipelineStage(p);
        const inbound = graph.inbound.get(p.slug)?.size ?? 0;
        const auth = +(graph.auth.get(p.slug) ?? 0).toFixed(3);
        const card = {
          id: p.id, slug: p.slug, title: p.title, status: p.status,
          updated_at: p.updated_at, published_at: p.published_at,
          scheduled_at: p.scheduled_at, focus_keyword: p.focus_keyword,
          words: wordCount(p.body_md ?? ""), inbound, authority: auth,
          stage_age_days: daysSince(p.updated_at),
        };
        stages[stage].push(card);
        if (p.status === "published") {
          const d = decayScore(p);
          if (d.score >= 30) decay.push({ ...card, ...d });
          monetization.push({
            id: p.id, slug: p.slug, title: p.title,
            ad_safe: adSafeScore(p),
            cta_score: ctaPlacementScore(p),
            rpm_est: rpmEstimate(p),
            scroll_depth_est: scrollDepthEstimate(p),
            affiliate_blocks: affiliateBlocks(p),
          });
        }
      }
      decay.sort((a, b) => b.score - a.score);
      monetization.sort((a, b) => b.rpm_est - a.rpm_est);

      const topAuthority = [...graph.auth.entries()]
        .sort((a, b) => b[1] - a[1]).slice(0, 10)
        .map(([slug, score]) => ({ slug, score: +score.toFixed(3), inbound: graph.inbound.get(slug)?.size ?? 0 }));
      const orphans = posts
        .filter(p => p.status === "published" && (graph.inbound.get(p.slug)?.size ?? 0) === 0)
        .map(p => ({ slug: p.slug, title: p.title, age_days: daysSince(p.published_at) }));

      const gr = guardrails(posts);

      return json({
        ok: true,
        generated_at: new Date().toISOString(),
        counts: {
          total: posts.length,
          published: posts.filter(p => p.status === "published").length,
          drafts: posts.filter(p => p.status !== "published").length,
          orphans: orphans.length,
          decaying: decay.length,
          clusters: cl.length,
        },
        pipeline: stages,
        decay,
        authority: { top: topAuthority, orphans, clusters: cl },
        monetization,
        guardrails: gr,
      });
    }

    if (action === "topic_intel") {
      // Reads optional traffic snapshots persisted client-side via ingest_traffic.
      const posts = await fetchPosts();
      const graph = buildLinkGraph(posts);
      // Without GSC, surface link-based proxies + post age.
      const mostLinked = [...graph.inbound.entries()]
        .sort((a, b) => b[1].size - a[1].size).slice(0, 10)
        .map(([slug, set]) => ({ slug, inbound: set.size }));
      const orphans14 = posts
        .filter(p => p.status === "published" && daysSince(p.published_at) > 14 && (graph.inbound.get(p.slug)?.size ?? 0) === 0)
        .map(p => ({ slug: p.slug, title: p.title, age_days: daysSince(p.published_at) }));
      return json({ ok: true, mostLinked, orphans14 });
    }

    if (action === "indexing" && req.method === "GET") {
      const slug = url.searchParams.get("slug");
      if (!slug) return json({ ok: false, error: "slug required" }, 400);
      const out = await indexingStatus(slug);
      return json({ ok: true, ...out });
    }

    if (req.method === "POST" && action === "recrawl") {
      const { slug } = await req.json();
      const u = `https://blogs.hustlaiapp.in/${slug}`;
      const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/indexnow?action=enqueue`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ urls: [u], source_kind: "manual_recrawl", source_id: slug }),
      });
      const ok = r.ok;
      fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/indexnow?action=flush`, {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
        body: "{}",
      }).catch(() => null);
      return json({ ok, url: u });
    }

    if (req.method === "POST" && action === "ai_refresh") {
      const { id, intent } = await req.json();
      const { data: post } = await blog.from("blog_posts").select("*").eq("id", id).maybeSingle();
      if (!post) return json({ ok: false, error: "not found" }, 404);
      const ctx = `Title: ${post.title}\nKeyword: ${post.focus_keyword ?? ""}\nMeta: ${post.meta_description ?? ""}\n\n---\n${(post.body_md ?? "").slice(0, 8000)}`;
      const intents: Record<string, { sys: string; user: string }> = {
        rewrite_intro: { sys: "You rewrite blog intros for clarity, hook, and SEO. Return only the new opening 2 paragraphs in markdown.", user: ctx },
        improve_title: { sys: "Suggest a stronger SEO title under 60 chars. Return only the title.", user: ctx },
        regen_meta: { sys: "Write a 140-160 char meta description that drives clicks. Return only the meta.", user: ctx },
        add_faq: { sys: "Generate 5 FAQ pairs as JSON array of {q,a}. Return ONLY JSON.", user: ctx },
        expand_depth: { sys: "List 5 concrete sections to add for depth. Return as markdown bullets only.", user: ctx },
        inject_cta: { sys: "Suggest 2 natural in-content CTA sentences linking to a HustleAI tool. Return as markdown bullets.", user: ctx },
        refresh: { sys: "Suggest a refresh plan: which sections to update, screenshots to refresh, internal links to add. Markdown bullets only.", user: ctx },
      };
      const def = intents[intent] ?? intents.refresh;
      const out = await aiCall(def.sys, def.user);
      return json({ ok: true, intent, output: out });
    }

    if (req.method === "POST" && action === "humanize") {
      const { id, body_md } = await req.json();
      let md = body_md;
      if (!md && id) {
        const { data } = await blog.from("blog_posts").select("body_md").eq("id", id).maybeSingle();
        md = data?.body_md;
      }
      if (!md) return json({ ok: false, error: "no content" }, 400);
      const out = await aiCall(
        "You rewrite AI-sounding text to feel human and operational. Vary sentence length, remove filler ('In today's fast-paced world', 'Let's dive in'), eliminate repeated AI phrases, keep markdown structure intact, retain all links and code, preserve all H2/H3 headings exactly. Return ONLY the rewritten markdown.",
        md.slice(0, 12000),
      );
      return json({ ok: true, humanized: out });
    }

    return json({ ok: false, error: "unknown action" }, 400);
  } catch (e) {
    return json({ ok: false, error: String(e?.message ?? e) }, 500);
  }
});