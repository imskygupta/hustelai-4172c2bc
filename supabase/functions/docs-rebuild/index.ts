// One-shot docs IA reset.
//
// Auth: requires the body field `confirm` to equal REBUILD_NONCE below.
//        This is a one-shot ops function that is deleted immediately
//        after the docs IA reset. The nonce is rotated per deploy.
//
// Behavior (idempotent):
//   1) Snapshot every current docs_categories + docs_pages row from Admin DB.
//   2) Soft-archive: set is_published=false on every existing docs_page that
//      is NOT in the new canonical slug set.
//   3) Upsert canonical categories (by slug) and canonical pages (by slug)
//      from supabase/functions/_shared/docs/seed.ts.
//
// Returns the snapshot in the response so the operator can persist it.
import { getAdmin } from "../_shared/clients.ts";
import { SEED_CATEGORIES, SEED_PAGES } from "../_shared/docs/seed.ts";

const REBUILD_NONCE = "sprint-e-docs-rewrite-2026-05-23-7c3f1a";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  let body: any = {};
  try { body = await req.json(); } catch { /* empty body ok for failed auth message */ }
  if (body?.confirm !== REBUILD_NONCE) return json(401, { error: "unauthorized" });

  try {
    const admin = getAdmin();

    // Probe: confirm docs tables exist before any mutation.
    const probeCats = await admin.from("docs_categories").select("id", { count: "exact", head: true });
    const probePages = await admin.from("docs_pages").select("id", { count: "exact", head: true });
    if (probeCats.error || probePages.error) {
      return json(412, {
        error: "admin_db_not_bootstrapped",
        detail: "docs_categories or docs_pages missing on Admin DB. Run scripts/admin-db-bootstrap.sql (sections for docs_categories + docs_pages) against the Admin Supabase project, then re-invoke.",
        probe: {
          docs_categories: probeCats.error?.message ?? "ok",
          docs_pages: probePages.error?.message ?? "ok",
        },
      });
    }

    // 1) snapshot
    const [catRes, pageRes] = await Promise.all([
      admin.from("docs_categories").select("*").order("sort_order"),
      admin.from("docs_pages").select("*").order("sort_order"),
    ]);
    if (catRes.error) throw new Error(`snapshot_categories: ${catRes.error.message}`);
    if (pageRes.error) throw new Error(`snapshot_pages: ${pageRes.error.message}`);

    const snapshot = {
      taken_at: new Date().toISOString(),
      categories: catRes.data ?? [],
      pages: pageRes.data ?? [],
    };

    // 2) soft-archive everything not in new IA
    const newPageSlugs = new Set(SEED_PAGES.map((p) => p.slug));
    const archiveSlugs = (pageRes.data ?? [])
      .map((p: any) => p.slug as string)
      .filter((s) => !newPageSlugs.has(s));

    let archived = 0;
    if (archiveSlugs.length > 0) {
      const { error: archErr, count } = await admin
        .from("docs_pages")
        .update({ is_published: false }, { count: "exact" })
        .in("slug", archiveSlugs);
      if (archErr) throw new Error(`archive: ${archErr.message}`);
      archived = count ?? archiveSlugs.length;
    }

    // 3) upsert canonical categories
    const { data: upCats, error: upCatsErr } = await admin
      .from("docs_categories")
      .upsert(
        SEED_CATEGORIES.map((c) => ({
          slug: c.slug,
          title: c.title,
          description: c.description,
          icon: c.icon ?? null,
          color: c.color ?? null,
          sort_order: c.sort_order,
        })),
        { onConflict: "slug" }
      )
      .select("id, slug");
    if (upCatsErr) throw new Error(`upsert_categories: ${upCatsErr.message}`);

    const catBySlug = new Map<string, string>();
    for (const row of upCats ?? []) catBySlug.set(row.slug, row.id);

    // 4) upsert canonical pages
    const pageRows = SEED_PAGES.map((p) => ({
      category_id: catBySlug.get(p.category_slug) ?? null,
      slug: p.slug,
      title: p.title,
      description: p.description,
      content: p.content,
      tags: p.tags ?? [],
      sort_order: p.sort_order,
      reading_time: p.reading_time ?? Math.max(1, Math.round(p.content.split(/\s+/).length / 200)),
      meta_title: p.meta_title ?? `${p.title} — HustleAI Docs`,
      meta_description: p.meta_description ?? p.description,
      is_published: true,
      updated_at: new Date().toISOString(),
    }));

    const { error: upPagesErr } = await admin
      .from("docs_pages")
      .upsert(pageRows, { onConflict: "slug" });
    if (upPagesErr) throw new Error(`upsert_pages: ${upPagesErr.message}`);

    return json(200, {
      ok: true,
      archived_count: archived,
      seeded_categories: SEED_CATEGORIES.length,
      seeded_pages: SEED_PAGES.length,
      snapshot,
    });
  } catch (err) {
    return json(500, { error: (err as Error).message });
  }
});