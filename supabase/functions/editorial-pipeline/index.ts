// Editorial Pipeline (BLOG_DB) — unified state, auto-fix, route reconciliation.
// Surfaces every editorial state (queued, drafting, awaiting_review, indexed, published, failed, deduped, rejected)
// in one query and supports per-row + bulk auto-fix actions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });

const main = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
let _blog: ReturnType<typeof createClient> | null = null;
function blog() {
  if (_blog) return _blog;
  const url = Deno.env.get("BLOG_SUPABASE_URL");
  const key = Deno.env.get("BLOG_SUPABASE_SERVICE_ROLE");
  if (!url || !key) throw new Error("BLOG_DB env not configured");
  _blog = createClient(url, key);
  return _blog;
}

async function requireAdmin(req: Request): Promise<true | Response> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
  const { data, error } = await main.auth.getUser(auth.replace("Bearer ", ""));
  if (error || !data?.user?.id) return json({ error: "unauthorized" }, 401);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", data.user.id).eq("role", "admin").maybeSingle();
  if (!roles) return json({ error: "forbidden" }, 403);
  return true;
}

// ──────────────────────────────────────────────────────────────────────
// Stage derivation — single source of truth for the pipeline timeline.
// ──────────────────────────────────────────────────────────────────────
type Stage =
  | "queued" | "researching" | "drafting" | "enriching" | "tool_matching"
  | "screenshot_generation" | "seo_scoring" | "awaiting_review"
  | "indexed" | "published" | "failed" | "rejected" | "deduped";

// Defensive: any status value not in this set is coerced to "failed"
// so the pipeline never crashes on unknown/legacy enum values.
const SAFE_STATUS = new Set([
  "queued", "researching", "research", "draft", "enriching",
  "in_review", "review", "scheduled", "published", "indexed",
  "failed", "rejected", "deduped", "deleted",
]);
function normalizeStatus(s: any): string {
  const v = typeof s === "string" ? s : "";
  return SAFE_STATUS.has(v) ? v : "failed";
}

function deriveStage(p: any): Stage {
  const status = normalizeStatus(p.status);
  if (status === "rejected") return "rejected";
  if (status === "deduped" || p.deduped_at) return "deduped";
  if (status === "deleted") return "deduped";
  if (status === "failed" || p.last_error) return "failed";
  if (status === "published") {
    if (p.last_indexed_at) return "indexed";
    return "published";
  }
  if (status === "in_review" || status === "review") return "awaiting_review";
  if (status === "scheduled") return "awaiting_review";
  if (status === "draft") {
    const md: string = p.body_md ?? "";
    const hasBody = md.trim().split(/\s+/).filter(Boolean).length > 200;
    const hasTools = Array.isArray(p.tool_matches) && p.tool_matches.length > 0;
    const hasShots = Array.isArray(p.tool_matches) && p.tool_matches.length > 0; // proxy
    const hasScore = p.adsense_score != null;
    if (!hasBody) return "drafting";
    if (!hasTools) return "tool_matching";
    if (!hasShots) return "screenshot_generation";
    if (!hasScore) return "seo_scoring";
    return "enriching";
  }
  if (status === "queued" || status === "research" || status === "researching") {
    return status === "research" ? "researching" : "queued";
  }
  return "queued";
}

function deriveSummary(p: any) {
  const md: string = typeof p.body_md === "string" ? p.body_md : "";
  const internal = (md.match(/\]\((\/[a-z0-9\-/]+)\)/g) ?? []).length
    + (md.match(/hustlaiapp\.in/g) ?? []).length;
  const tools = Array.isArray(p.tool_matches) ? p.tool_matches.length : 0;
  const cta = Array.isArray(p.cta_blocks) ? p.cta_blocks.length : 0;
  const stage = deriveStage(p);
  return {
    id: p.id,
    slug: p.slug ?? null,
    title: p.title ?? null,
    cluster: p.cluster ?? p.focus_keyword ?? null,
    stage,
    status: p.status ?? null,
    adsense_score: p.adsense_score ?? null,
    generated_at: p.created_at ?? p.inserted_at ?? null,
    updated_at: p.updated_at ?? null,
    published_at: p.published_at ?? null,
    last_indexed_at: p.last_indexed_at ?? null,
    tool_matches: tools,
    rejection_reason: p.rejection_reason ?? p.last_error ?? null,
    batch_id: p.batch_id ?? null,
    hustle_template_slug: p.hustle_template_slug ?? null,
    internal_links: internal,
    cta_injected: cta > 0,
    screenshots: tools, // best-effort proxy
    auto_fix_eligible: stage !== "published" && stage !== "indexed" && stage !== "rejected",
    meta_title_ok: typeof p.meta_title === "string" && p.meta_title.length >= 30 && p.meta_title.length <= 65,
    meta_desc_ok: typeof p.meta_description === "string" && p.meta_description.length >= 70 && p.meta_description.length <= 165,
    has_category: !!p.category_id,
  };
}

// ──────────────────────────────────────────────────────────────────────
// Auto-fix: meta + tool match + internal links + category + CTA + scoring.
// ──────────────────────────────────────────────────────────────────────
async function callFn(name: string, body: unknown, query = "") {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/${name}${query}`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify(body ?? {}),
  });
  try { return await r.json(); } catch { return { ok: r.ok }; }
}

function deriveMetaFallback(p: any) {
  const t = (p.title ?? "").trim();
  const fk = (p.focus_keyword ?? "").trim();
  const ex = (p.excerpt ?? "").trim();
  const meta_title = p.meta_title?.length >= 30 && p.meta_title?.length <= 65
    ? p.meta_title
    : (t + (fk && !t.toLowerCase().includes(fk.toLowerCase()) ? ` — ${fk}` : "") + " | HustleAI").slice(0, 64);
  const meta_description = p.meta_description?.length >= 70 && p.meta_description?.length <= 165
    ? p.meta_description
    : (ex || `${t}. Practical playbook with workflows, tools, and operational steps to ship faster.`).slice(0, 160);
  return { meta_title, meta_description };
}

async function pickCategory(p: any) {
  if (p.category_id) return p.category_id;
  const { data } = await blog().from("blog_categories").select("id,slug,title").order("sort_order").limit(20);
  if (!data?.length) return null;
  const t = (p.title + " " + (p.focus_keyword ?? "")).toLowerCase();
  const hit = data.find((c: any) => t.includes((c.slug ?? "").replace(/-/g, " ")) || t.includes((c.title ?? "").toLowerCase()));
  return (hit ?? data[0]).id;
}

async function autoFixOne(id: string) {
  const events: string[] = [];
  const { data: post } = await blog().from("blog_posts").select("*").eq("id", id).maybeSingle();
  if (!post) return { ok: false, error: "not_found" };

  const patch: any = {};
  // 1. Meta
  const meta = deriveMetaFallback(post);
  if (meta.meta_title !== post.meta_title) { patch.meta_title = meta.meta_title; events.push("meta_title"); }
  if (meta.meta_description !== post.meta_description) { patch.meta_description = meta.meta_description; events.push("meta_description"); }

  // 2. Category
  if (!post.category_id) {
    const cat = await pickCategory(post);
    if (cat) { patch.category_id = cat; events.push("category"); }
  }

  if (Object.keys(patch).length) await blog().from("blog_posts").update(patch).eq("id", id);

  // 3. Tool matching (writes tool_matches + hustle_template_slug directly)
  await callFn("tool-matcher", { post_id: id, body_md: post.body_md, title: post.title, focus_keyword: post.focus_keyword, mode: "auto" }, "?action=match");
  events.push("tool_match");

  // 4. Internal link injection
  const li = await callFn("blog-link-engine", { id, body_md: post.body_md, focus_keyword: post.focus_keyword, append_cta: true, max: 4 }, "?action=auto_insert");
  if (li?.body_md && li.body_md !== post.body_md) {
    await blog().from("blog_posts").update({ body_md: li.body_md }).eq("id", id);
    events.push("internal_links");
  }

  // 5. CTA block — ensure at least one
  const fresh = (await blog().from("blog_posts").select("*").eq("id", id).maybeSingle()).data ?? post;
  let ctas = Array.isArray(fresh.cta_blocks) ? fresh.cta_blocks : [];
  const tm = Array.isArray(fresh.tool_matches) ? fresh.tool_matches : [];
  if (!ctas.length && tm[0]) {
    ctas = [{ kind: "tool", label: `Try ${tm[0].title}`, href: tm[0].href, note: "Recommended workflow" }];
    await blog().from("blog_posts").update({ cta_blocks: ctas }).eq("id", id);
    events.push("cta");
  }

  // 6. AdSense rescore
  const ads = await callFn("adsense-readiness", { post_id: id }, "?action=check");
  const score = ads?.report?.score ?? null;
  events.push(`adsense:${score ?? "?"}`);

  // 7. Promote to in_review if score crosses threshold
  let promoted = false;
  if (typeof score === "number" && score >= 70 && (fresh.status === "draft" || fresh.status === "queued")) {
    await blog().from("blog_posts").update({ status: "in_review" }).eq("id", id);
    promoted = true;
    events.push("→ in_review");
  }

  return { ok: true, id, score, promoted, events };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "list";

    // Public action: surface env so the UI can show a friendly bootstrap hint.
    if (action === "ping") return json({ ok: true, db: "BLOG_DB" });

    const guard = await requireAdmin(req);
    if (guard !== true) return guard;

    if (action === "list") {
      const stage = url.searchParams.get("stage");
      const include_hidden = url.searchParams.get("hidden") === "1";
      const limit = Math.min(500, Number(url.searchParams.get("limit") ?? 200));
      // Defensive: select * and DO NOT filter by status at the SQL level —
      // a `.neq("status", "deleted")` will crash if "deleted" is not a valid
      // enum value in BLOG_DB. Filter in JS after normalization instead.
      const q = blog().from("blog_posts").select("*")
        .order("updated_at", { ascending: false }).limit(limit);
      const { data, error } = await q;
      if (error) return json({ error: error.message, where: "list.select" }, 500);
      const rows: any[] = [];
      const failedRows: { id?: string; slug?: string; error: string }[] = [];
      for (const p of data ?? []) {
        try {
          const summary = deriveSummary(p);
          // Hide soft-deleted rows unless explicitly requested
          if (!include_hidden && (summary.status === "deleted" || summary.stage === "deduped")) continue;
          rows.push(summary);
        }
        catch (e) { failedRows.push({ id: p?.id, slug: p?.slug, error: String((e as Error)?.message ?? e) }); }
      }
      const filtered = stage ? rows.filter((r) => r.stage === stage) : rows;
      const counts: Record<string, number> = {};
      for (const r of rows) counts[r.stage] = (counts[r.stage] ?? 0) + 1;
      return json({ rows: filtered, counts, total: rows.length, failedRows, db: "BLOG_DB" });
    }

    if (action === "diagnostics") {
      const out: any = { db: "BLOG_DB", checked_at: new Date().toISOString() };
      try {
        const { data, error } = await blog().from("blog_posts").select("*").limit(1000);
        if (error) { out.fatal = error.message; return json(out, 200); }
        const all = data ?? [];
        out.total_rows = all.length;
        const slugs = all.map((r: any) => r?.slug).filter(Boolean);
        const seen = new Set<string>(); const dups = new Set<string>();
        for (const s of slugs) { if (seen.has(s)) dups.add(s); else seen.add(s); }
        out.null_slugs = all.filter((r: any) => !r?.slug).length;
        out.duplicate_slugs = [...dups];
        out.missing_title = all.filter((r: any) => !r?.title).length;
        out.missing_status = all.filter((r: any) => !r?.status).length;
        out.missing_body = all.filter((r: any) => !r?.body_md).length;
        const stageCounts: Record<string, number> = {};
        const serFail: any[] = [];
        const badStages: any[] = [];
        for (const r of all) {
          let s: string | null = null;
          try { s = deriveStage(r); } catch (e) { badStages.push({ id: r?.id, error: String(e) }); }
          if (s) stageCounts[s] = (stageCounts[s] ?? 0) + 1;
          try { JSON.stringify(deriveSummary(r)); }
          catch (e) { serFail.push({ id: r?.id, slug: r?.slug, error: String(e) }); }
        }
        out.stage_counts = stageCounts;
        out.bad_stages = badStages;
        out.serialization_failures = serFail;
        out.sample_columns = all[0] ? Object.keys(all[0]).sort() : [];
      } catch (e) { out.fatal = String(e); }
      return json(out);
    }

    if (action === "raw") {
      const limit = Math.min(200, Number(url.searchParams.get("limit") ?? 50));
      const batch_id = url.searchParams.get("batch_id");
      let q = blog().from("blog_posts").select("*")
        .order("created_at", { ascending: false }).limit(limit);
      if (batch_id) q = q.eq("batch_id", batch_id);
      const { data, error } = await q;
      if (error) return json({ error: error.message }, 500);
      return json({ db: "BLOG_DB", rows: data ?? [] });
    }

    if (action === "batch_articles") {
      const batch_id = url.searchParams.get("batch_id");
      if (!batch_id) return json({ error: "batch_id required" }, 400);
      const { data, error } = await blog().from("blog_posts").select("*").eq("batch_id", batch_id).order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 500);
      const rows: any[] = []; const failedRows: any[] = [];
      for (const p of data ?? []) {
        try { rows.push(deriveSummary(p)); }
        catch (e) { failedRows.push({ id: p?.id, error: String(e) }); }
      }
      return json({ db: "BLOG_DB", batch_id, rows, failedRows });
    }

    if (action === "recover" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const limit = Math.min(100, Number(body.limit ?? 50));
      const { data } = await blog().from("blog_posts").select("*").limit(limit);
      const fixed: string[] = [];
      for (const p of data ?? []) {
        const patch: any = {};
        if (!p.slug && p.title) {
          patch.slug = String(p.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || `post-${p.id?.slice(0, 8)}`;
        }
        if (!p.status) patch.status = "draft";
        const meta = deriveMetaFallback(p);
        if (!p.meta_title) patch.meta_title = meta.meta_title;
        if (!p.meta_description) patch.meta_description = meta.meta_description;
        if (Object.keys(patch).length) {
          const { error } = await blog().from("blog_posts").update(patch).eq("id", p.id);
          if (!error) fixed.push(p.id);
        }
      }
      return json({ db: "BLOG_DB", fixed: fixed.length, ids: fixed });
    }

    if (action === "auto_fix" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const ids: string[] = Array.isArray(body.ids) && body.ids.length
        ? body.ids
        : body.id ? [body.id] : [];
      if (!ids.length) {
        const { data } = await blog().from("blog_posts").select("id,status,adsense_score").in("status", ["draft", "queued", "in_review"]).limit(50);
        for (const r of data ?? []) ids.push(r.id);
      }
      const results = [];
      for (const id of ids.slice(0, 25)) results.push(await autoFixOne(id));
      return json({ db: "BLOG_DB", processed: results.length, results });
    }

    if (action === "publish_passing" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const min = Number(body.min_score ?? 70);
      const { data } = await blog().from("blog_posts").select("id,slug,status,adsense_score").gte("adsense_score", min).in("status", ["in_review", "draft"]).limit(50);
      const published: string[] = [];
      for (const p of data ?? []) {
        const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/blog-admin?action=transition`, {
          method: "POST",
          headers: { "content-type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
          body: JSON.stringify({ id: p.id, status: "published", force: false }),
        });
        if (r.ok) published.push(p.slug);
      }
      return json({ db: "BLOG_DB", published, attempted: (data ?? []).length });
    }

    if (action === "retry" && req.method === "POST") {
      const { id } = await req.json().catch(() => ({}));
      if (!id) return json({ error: "id required" }, 400);
      await blog().from("blog_posts").update({ last_error: null, status: "draft" }).eq("id", id);
      return autoFixOne(id).then((r) => json(r));
    }

    if (action === "reconcile_routes") {
      const { data: posts } = await blog().from("blog_posts").select("id,slug,status,published_at").eq("status", "published").limit(500);
      const slugs = (posts ?? []).map((p: any) => p.slug);
      const dupSlugs = slugs.filter((s, i) => slugs.indexOf(s) !== i);
      const orphans: string[] = [];
      for (const p of posts ?? []) {
        const md = (await blog().from("blog_posts").select("body_md").eq("id", p.id).maybeSingle()).data?.body_md ?? "";
        const referenced = (md.match(/blogs\.hustlaiapp\.in\/([a-z0-9-]+)/g) ?? []).map((s: string) => s.split("/").pop());
        for (const ref of referenced) if (ref && !slugs.includes(ref)) orphans.push(ref);
      }
      return json({
        db: "BLOG_DB",
        total_published: slugs.length,
        duplicate_slugs: [...new Set(dupSlugs)],
        broken_internal_refs: [...new Set(orphans)].slice(0, 100),
        checked_at: new Date().toISOString(),
      });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});