// One-shot docs reseed against the Admin DB.
// Reads SEED_CATEGORIES + SEED_PAGES from _shared/docs/seed.ts and upserts
// them into docs_categories / docs_pages. Idempotent — safe to re-run.
//
// Auth: requires header `x-rebuild-token: <DOCS_REBUILD_TOKEN>`.
// Set DOCS_REBUILD_TOKEN as a secret before calling.
//
// Usage:
//   curl -X POST "$SUPABASE_URL/functions/v1/docs-rebuild" \
//        -H "Authorization: Bearer $ANON_KEY" \
//        -H "x-rebuild-token: $DOCS_REBUILD_TOKEN"
import { getAdmin } from "../_shared/clients.ts";
import { SEED_CATEGORIES, SEED_PAGES, type SeedPage } from "../_shared/docs/seed.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-rebuild-token",
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function buildToc(content: string) {
  const out: { level: number; text: string; slug: string }[] = [];
  for (const line of content.split("\n")) {
    const m = /^(#{2,4})\s+(.+?)\s*$/.exec(line);
    if (!m) continue;
    const level = m[1].length;
    const text = m[2].replace(/[*_`]/g, "").trim();
    out.push({ level, text, slug: slugify(text) });
  }
  return out;
}

function readingTime(content: string): number {
  const words = content.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const token = req.headers.get("x-rebuild-token") ?? "";
  const expected = Deno.env.get("DOCS_REBUILD_TOKEN") ?? "";
  if (!expected || token !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const dryRun = new URL(req.url).searchParams.get("dry") === "1";
  const admin = getAdmin();
  const report: Record<string, unknown> = {
    seed_categories: SEED_CATEGORIES.length,
    seed_pages: SEED_PAGES.length,
    dry_run: dryRun,
  };

  try {
    // 1) Upsert categories by slug.
    const catRows = SEED_CATEGORIES.map((c) => ({
      slug: c.slug,
      title: c.title,
      description: c.description,
      icon: c.icon ?? "book",
      color: c.color ?? "#6366F1",
      sort_order: c.sort_order,
    }));

    if (!dryRun) {
      const { error: catErr } = await admin
        .from("docs_categories")
        .upsert(catRows, { onConflict: "slug" });
      if (catErr) throw new Error(`categories_upsert: ${catErr.message}`);
    }

    // 2) Resolve category_id map.
    const { data: cats, error: catReadErr } = await admin
      .from("docs_categories")
      .select("id, slug");
    if (catReadErr) throw new Error(`categories_read: ${catReadErr.message}`);
    const catBySlug = new Map<string, string>((cats ?? []).map((c: any) => [c.slug, c.id]));
    report.categories_resolved = catBySlug.size;

    // 3) Build page rows.
    const missing: string[] = [];
    const now = new Date().toISOString();
    const pageRows = SEED_PAGES.map((p: SeedPage) => {
      const category_id = catBySlug.get(p.category_slug);
      if (!category_id) missing.push(`${p.slug}::${p.category_slug}`);
      return {
        slug: p.slug,
        category_id,
        title: p.title,
        description: p.description,
        content: p.content,
        toc: buildToc(p.content),
        meta_title: p.meta_title ?? p.title,
        meta_description: p.meta_description ?? p.description,
        og_image: null,
        tags: p.tags ?? [],
        reading_time: p.reading_time ?? readingTime(p.content),
        is_published: true,
        sort_order: p.sort_order,
        version: "wave-1",
        updated_at: now,
      };
    }).filter((r) => !!r.category_id);

    report.pages_prepared = pageRows.length;
    report.pages_skipped_missing_category = missing;

    // 4) Upsert pages by slug.
    let upserted = 0;
    if (!dryRun) {
      // Chunk to keep payloads small.
      const CHUNK = 25;
      for (let i = 0; i < pageRows.length; i += CHUNK) {
        const chunk = pageRows.slice(i, i + CHUNK);
        const { error } = await admin
          .from("docs_pages")
          .upsert(chunk, { onConflict: "slug" });
        if (error) throw new Error(`pages_upsert@${i}: ${error.message}`);
        upserted += chunk.length;
      }
    }
    report.pages_upserted = upserted;

    // 5) Snapshot final counts.
    const { count: pageCount } = await admin
      .from("docs_pages")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true);
    report.published_pages_after = pageCount ?? null;

    return new Response(JSON.stringify({ ok: true, report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? String(e), report }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});