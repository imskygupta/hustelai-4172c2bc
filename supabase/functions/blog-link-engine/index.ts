// Internal Linking Engine.
//
// Actions (admin-only):
//   GET  ?action=overview             — summary (clusters, orphans, authority, anchors)
//   GET  ?action=suggest&id=<post>    — related posts + suggested anchor phrases
//   POST ?action=auto_insert          — body { id?, body_md, focus_keyword? } → md w/ links
//   GET  ?action=read_next&slug=<>    — read-next graph for a slug
//
// All scoring is derived from blog_posts (title, focus_keyword, body_md). No
// schema changes required.
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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });
}

async function isAdmin(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  const { data } = await main.auth.getUser(auth.replace("Bearer ", ""));
  if (!data?.user?.id) return false;
  const a = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: r } = await a.from("user_roles").select("role").eq("user_id", data.user.id).eq("role", "admin").maybeSingle();
  return !!r;
}

/* tokenization */
const STOP = new Set(("a an the and or for of to in on at is are be by with from as it this that these those your you we our i me my their they them his her she he have has do does will would can could should into about more most over under between not no").split(" "));
function tokenize(s: string) {
  return (s ?? "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 3 && !STOP.has(w));
}
function tokenSet(s: string) { return new Set(tokenize(s)); }
function jaccard(a: Set<string>, b: Set<string>) {
  let inter = 0; for (const x of a) if (b.has(x)) inter++;
  const u = a.size + b.size - inter; return u === 0 ? 0 : inter / u;
}

/* extract internal links from md */
function extractInternal(md: string) {
  const out: string[] = [];
  for (const m of (md ?? "").matchAll(/\]\(([^)\s]+)\)/g)) {
    const href = m[1];
    const slug = href.match(/^(?:https?:\/\/blogs\.hustlaiapp\.in)?\/([a-z0-9][a-z0-9-]+)$/i);
    if (slug) out.push(slug[1]);
  }
  return out;
}
function extractAnchors(md: string) {
  const out: { slug: string; anchor: string }[] = [];
  for (const m of (md ?? "").matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)) {
    const slug = m[2].match(/^(?:https?:\/\/blogs\.hustlaiapp\.in)?\/([a-z0-9][a-z0-9-]+)$/i);
    if (slug) out.push({ slug: slug[1], anchor: m[1] });
  }
  return out;
}

/* clustering: title token overlap groups */
function buildClusters(posts: any[]) {
  const sets = posts.map(p => ({ id: p.id, slug: p.slug, title: p.title, fk: p.focus_keyword, set: tokenSet(`${p.title} ${p.focus_keyword ?? ""}`) }));
  const clusters: { id: number; label: string; members: { slug: string; title: string }[] }[] = [];
  const assigned = new Map<string, number>();
  for (const a of sets) {
    if (assigned.has(a.id)) continue;
    const idx = clusters.length;
    const members = [{ slug: a.slug, title: a.title }];
    assigned.set(a.id, idx);
    for (const b of sets) {
      if (assigned.has(b.id)) continue;
      if (jaccard(a.set, b.set) >= 0.35) {
        members.push({ slug: b.slug, title: b.title });
        assigned.set(b.id, idx);
      }
    }
    clusters.push({ id: idx, label: a.fk || a.title.split(/[—–:|]/)[0].trim(), members });
  }
  return clusters.filter(c => c.members.length >= 2);
}

/* simple authority: in-degree weighted (PageRank-lite, single iteration) */
function authorityScores(posts: any[]) {
  const slugIdx = new Map<string, number>();
  posts.forEach((p, i) => slugIdx.set(p.slug, i));
  const score = new Array(posts.length).fill(1);
  const incoming: number[][] = posts.map(() => []);
  posts.forEach((p, i) => {
    const out = [...new Set(extractInternal(p.body_md ?? ""))];
    for (const s of out) {
      const j = slugIdx.get(s); if (j != null && j !== i) incoming[j].push(i);
    }
  });
  // 3 iterations
  for (let k = 0; k < 3; k++) {
    const next = new Array(posts.length).fill(0.15);
    incoming.forEach((srcs, j) => {
      for (const i of srcs) next[j] += 0.85 * (score[i] / Math.max(1, extractInternal(posts[i].body_md ?? "").length));
    });
    for (let i = 0; i < score.length; i++) score[i] = next[i];
  }
  return posts.map((p, i) => ({ slug: p.slug, title: p.title, score: +score[i].toFixed(3), inbound: incoming[i].length }));
}

/* suggest related posts via semantic overlap (token jaccard) */
function suggestRelated(target: any, others: any[], n = 6) {
  const tSet = tokenSet(`${target.title} ${target.focus_keyword ?? ""} ${target.body_md ?? ""}`);
  const ranked = others.filter(o => o.id !== target.id).map(o => ({
    slug: o.slug, title: o.title,
    score: jaccard(tSet, tokenSet(`${o.title} ${o.focus_keyword ?? ""} ${o.body_md ?? ""}`)),
    focus_keyword: o.focus_keyword,
  })).sort((a, b) => b.score - a.score).slice(0, n);
  return ranked;
}

/* anchor diversity report */
function anchorDiversity(posts: any[]) {
  const map = new Map<string, Set<string>>();
  for (const p of posts) {
    for (const a of extractAnchors(p.body_md ?? "")) {
      const set = map.get(a.slug) ?? new Set();
      set.add(a.anchor.toLowerCase().trim());
      map.set(a.slug, set);
    }
  }
  return [...map.entries()].map(([slug, anchors]) => ({
    slug, unique_anchors: anchors.size, anchors: [...anchors].slice(0, 8),
  })).sort((a, b) => a.unique_anchors - b.unique_anchors);
}

/* auto-insert links (uses lib pattern) */
function escapeReg(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function autoInsert(md: string, targets: { href: string; phrases: string[] }[], max = 6) {
  let out = md; let injected = 0;
  for (const t of targets) {
    if (injected >= max) break;
    for (const phrase of t.phrases) {
      if (!phrase || phrase.length < 4) continue;
      const re = new RegExp(`(?<![\\w-\\(\\[])(${escapeReg(phrase)})(?![\\w-\\)\\]])`, "i");
      if (re.test(out)) {
        out = out.replace(re, `[$1](${t.href})`);
        injected++;
        break;
      }
    }
  }
  return { md: out, injected };
}

/* CTA injection toward HustleAI tools (heuristic) */
function ctaForKeyword(fk?: string) {
  const k = (fk ?? "").toLowerCase();
  if (/proposal|pitch|cold/.test(k)) return { label: "Generate a proposal in 30 seconds", href: "https://hustlaiapp.in/proposal-draft" };
  if (/invoice|payment|billing/.test(k)) return { label: "Create a branded invoice for free", href: "https://hustlaiapp.in/tools/invoice-generator" };
  if (/resume|cv|career/.test(k)) return { label: "Optimize your resume with AI", href: "https://hustlaiapp.in/resume-optimizer" };
  if (/price|rate|charge/.test(k)) return { label: "Find your sweet-spot rate", href: "https://hustlaiapp.in/gig-price-calculator" };
  if (/freelance|gig|client/.test(k)) return { label: "Get matched to today's best gigs", href: "https://hustlaiapp.in/sure-hit-jobs" };
  return { label: "Try HustleAI free", href: "https://hustlaiapp.in" };
}

/* Wave 4 — curated cross-surface anchor map (blog → docs/tools/main).
 * Keyed by phrase fragments. Each entry contributes one href + phrases
 * to the auto_insert_slug target list so authority flows from blogs
 * outward to docs and inward to high-value product pages. */
const CROSS_LINK_MAP: { match: RegExp; href: string; phrases: string[] }[] = [
  { match: /proposal|pitch|cold email/i, href: "https://hustlaiapp.in/proposal-generator",
    phrases: ["AI proposal generator", "proposal generator", "client proposal"] },
  { match: /invoice|billing/i, href: "https://hustlaiapp.in/tools/invoice-generator",
    phrases: ["free invoice generator", "invoice generator", "branded invoice"] },
  { match: /contract|nda/i, href: "https://hustlaiapp.in/tools/contract-generator",
    phrases: ["contract generator", "NDA generator", "freelance contract"] },
  { match: /resume|cv/i, href: "https://hustlaiapp.in/resume-optimizer",
    phrases: ["resume optimizer", "AI resume builder", "ATS-friendly resume"] },
  { match: /price|rate|charge/i, href: "https://hustlaiapp.in/gig-price-calculator",
    phrases: ["pricing calculator", "gig price calculator", "freelance rate calculator"] },
  { match: /portal|client|onboard/i, href: "https://hustlaiapp.in/client-portal-software",
    phrases: ["client portal software", "freelancer client portal", "client portal"] },
  { match: /workflow|automation|async/i, href: "https://hustlaiapp.in/workflows/async-ai-workflow-platform",
    phrases: ["async AI workflow platform", "AI workflow automation", "async workflows"] },
  { match: /workspace|os|productivity/i, href: "https://hustlaiapp.in/workspace-os",
    phrases: ["workspace OS", "freelancer workspace", "AI workspace"] },
  { match: /telegram|notification|delivery/i, href: "https://hustlaiapp.in/integrations/telegram-export-delivery",
    phrases: ["Telegram delivery", "Telegram export", "Telegram notifications"] },
  { match: /stripe|payment|payout/i, href: "https://hustlaiapp.in/integrations/stripe-payments",
    phrases: ["Stripe payments", "Stripe integration", "accept payments"] },
  // Docs (authority sink — sends crawl budget to docs subdomain)
  { match: /how (?:to|do)|setup|getting started|first/i, href: "https://docs.hustlaiapp.in/account-setup",
    phrases: ["account setup guide", "getting started guide", "creating your account"] },
  { match: /roadmap|plan|playbook/i, href: "https://docs.hustlaiapp.in/first-roadmap",
    phrases: ["first roadmap", "AI roadmap", "roadmap generator"] },
  { match: /export|pdf|continuity/i, href: "https://docs.hustlaiapp.in/exports-continuity",
    phrases: ["exports & continuity", "workspace continuity", "export delivery"] },
  { match: /pricing|plan|tier|upgrade/i, href: "https://docs.hustlaiapp.in/pricing",
    phrases: ["pricing & plans", "tier comparison", "plan upgrade"] },
];

function crossLinkTargets(target: { title: string; focus_keyword?: string; body_md?: string }) {
  const blob = `${target.title ?? ""} ${target.focus_keyword ?? ""} ${(target.body_md ?? "").slice(0, 2000)}`;
  const out: { href: string; phrases: string[] }[] = [];
  const seen = new Set<string>();
  for (const e of CROSS_LINK_MAP) {
    if (!e.match.test(blob)) continue;
    if (seen.has(e.href)) continue;
    seen.add(e.href);
    out.push({ href: e.href, phrases: e.phrases });
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  // Service-role short-circuit so indexing-dispatcher can run
  // auto_insert_slug without an admin user session.
  const authHdr = req.headers.get("Authorization") ?? "";
  const isServiceRole = authHdr === `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`;
  if (!isServiceRole && !(await isAdmin(req))) return json({ ok: false, error: "forbidden" }, 403);
  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "overview";

  try {
    const { data: posts } = await blog.from("blog_posts")
      .select("id, slug, title, focus_keyword, body_md, status, category_id")
      .eq("status", "published")
      .limit(500);
    const all = posts ?? [];

    if (action === "overview") {
      const slugSet = new Set(all.map(p => p.slug));
      const inbound = new Map<string, number>();
      for (const p of all) {
        for (const s of new Set(extractInternal(p.body_md ?? ""))) {
          if (slugSet.has(s) && s !== p.slug) inbound.set(s, (inbound.get(s) ?? 0) + 1);
        }
      }
      const orphans = all.filter(p => (inbound.get(p.slug) ?? 0) === 0)
        .map(p => ({ slug: p.slug, title: p.title })).slice(0, 50);
      const authority = authorityScores(all).sort((a, b) => b.score - a.score).slice(0, 25);
      const clusters = buildClusters(all);
      const anchors = anchorDiversity(all).slice(0, 25);
      const total_internal_links = all.reduce((s, p) => s + extractInternal(p.body_md ?? "").length, 0);
      return json({
        ok: true,
        summary: {
          total_posts: all.length,
          orphans: orphans.length,
          clusters: clusters.length,
          total_internal_links,
          avg_links_per_post: +(total_internal_links / Math.max(1, all.length)).toFixed(2),
        },
        clusters, orphans, authority, anchors,
      });
    }

    if (action === "suggest") {
      const id = url.searchParams.get("id");
      const target = all.find(p => p.id === id) ?? (await blog.from("blog_posts").select("id,slug,title,focus_keyword,body_md").eq("id", id).maybeSingle()).data;
      if (!target) return json({ ok: false, error: "post not found" }, 404);
      const related = suggestRelated(target, all, 8);
      const cta = ctaForKeyword(target.focus_keyword);
      return json({ ok: true, related, cta });
    }

    if (action === "read_next") {
      const slug = url.searchParams.get("slug");
      const target = all.find(p => p.slug === slug);
      if (!target) return json({ ok: false, error: "post not found" }, 404);
      const next = suggestRelated(target, all, 5);
      return json({ ok: true, slug, next });
    }

    if (action === "auto_insert" && req.method === "POST") {
      const body = await req.json();
      const target = body.id ? all.find(p => p.id === body.id) : { id: "tmp", title: body.title ?? "", focus_keyword: body.focus_keyword, body_md: body.body_md };
      if (!target) return json({ ok: false, error: "post not found" }, 404);
      const md = body.body_md ?? target.body_md ?? "";
      const related = suggestRelated({ ...target, body_md: md }, all, 6).filter(r => r.score > 0.05);
      const targets = [
        ...related.map(r => ({
          href: `/${r.slug}`,
          phrases: phrasesFromTitle(r.title).concat(r.focus_keyword ? [r.focus_keyword] : []),
        })),
        ...crossLinkTargets({ ...target, body_md: md }),
      ];
      const inserted = autoInsert(md, targets, body.max ?? 6);
      const cta = ctaForKeyword(target.focus_keyword);
      const withCta = inserted.md +
        (body.append_cta === false ? "" : `\n\n> [${cta.label}](${cta.href})\n`);
      return json({ ok: true, body_md: withCta, injected: inserted.injected, related, cta });
    }

    // Service-callable variant: looks up the post by slug, runs auto_insert,
    // and PERSISTS the result. Used by indexing-dispatcher post-publish.
    if (action === "auto_insert_slug" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const slug = body.slug as string | undefined;
      if (!slug) return json({ ok: false, error: "slug_required" }, 400);
      const target = all.find(p => p.slug === slug);
      if (!target) return json({ ok: true, skipped: "not_published" });
      const md = (target as any).body_md ?? "";
      const related = suggestRelated(target, all, 6).filter(r => r.score > 0.05);
      const targets = [
        ...related.map(r => ({
          href: `/${r.slug}`,
          phrases: phrasesFromTitle(r.title).concat(r.focus_keyword ? [r.focus_keyword] : []),
        })),
        ...crossLinkTargets(target as any),
      ];
      // Allow more injections now that we have docs+tools targets too.
      const inserted = autoInsert(md, targets, body.max ?? 6);
      if (inserted.injected > 0 && inserted.md !== md) {
        await blog.from("blog_posts")
          .update({ body_md: inserted.md, updated_at: new Date().toISOString() })
          .eq("id", (target as any).id);
      }
      return json({ ok: true, slug, injected: inserted.injected, related_count: related.length, cross_link_targets: targets.length - related.length });
    }

    return json({ ok: false, error: "unsupported action" }, 400);
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});

function phrasesFromTitle(title: string): string[] {
  const t = (title ?? "").replace(/[—–:|].*$/, "").trim();
  const out = [t];
  const stripped = t.replace(/^(how to|why|the|a|an|guide to|best)\s+/i, "");
  if (stripped.length >= 6 && stripped !== t) out.push(stripped);
  return out;
}