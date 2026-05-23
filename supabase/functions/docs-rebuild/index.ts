// One-shot docs IA reset.
//
// Auth: requires Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
//        (the primary project's service role) — the same auth the
//        platform's other admin-only ops use. Refuses otherwise.
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

function authorized(req: Request): boolean {
  const expected = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : "";
  return token.length > 0 && token === expected;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  if (!authorized(req)) return json(401, { error: "unauthorized" });

  try {
    const admin = getAdmin();

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