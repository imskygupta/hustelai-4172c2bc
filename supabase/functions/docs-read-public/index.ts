// Public docs/handbook reader backed by Admin DB (rqqiujmiagauzohdqjmi).
// Replaces the retired standalone Docs DB (rnyllarpzgamrkvgcjbg).
// 60s in-memory cache per shape — docs are slow-moving.
//
// Phase 10 — temporary legacy fallback:
//   If Admin DB docs tables are empty AND LEGACY_DOCS_SUPABASE_URL +
//   LEGACY_DOCS_SUPABASE_SERVICE_ROLE_KEY are configured, transparently
//   read from the legacy Docs DB so /docs never appears blank during the
//   content-recovery migration.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { getAdmin } from "../_shared/clients.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const cache = new Map<string, { at: number; data: unknown }>();
const TTL = 60_000;

async function getCached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data as T;
  const fresh = await fn();
  cache.set(key, { at: Date.now(), data: fresh });
  return fresh;
}

async function withDeadline<T>(p: PromiseLike<T>, label: string, ms = 5_000): Promise<T> {
  let timer: number | undefined;
  try {
    return await Promise.race([
      Promise.resolve(p),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label}_timeout`)), ms);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

function getLegacy() {
  const url = Deno.env.get("LEGACY_DOCS_SUPABASE_URL");
  const key = Deno.env.get("LEGACY_DOCS_SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  try { return createClient(url, key, { auth: { persistSession: false } }); }
  catch { return null; }
}

async function emptyArray(v: unknown) { return Array.isArray(v) && v.length === 0; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const op = url.searchParams.get("op") ?? "pages";
    const slug = url.searchParams.get("slug");
    const admin = getAdmin();
    const legacy = getLegacy();

    let data: unknown;
    let source: "admin" | "legacy" | "none" = "admin";
    if (op === "audit") {
      // Per-source integrity snapshot — never cached.
      const adminSnap = await snapshot(admin);
      const legacySnap = legacy ? await snapshot(legacy).catch(() => null) : null;
      data = {
        admin_db: adminSnap,
        legacy_db: legacySnap,
        legacy_configured: !!legacy,
        active_source:
          adminSnap.pages > 0 ? "admin" : legacySnap && legacySnap.pages > 0 ? "legacy" : "none",
        checked_at: new Date().toISOString(),
      };
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (op === "categories") {
      data = await getCached("categories", async () => {
        const { data } = await withDeadline(admin.from("docs_categories").select("*").order("sort_order"), "docs_categories_admin");
        if (data && data.length > 0) return data;
        if (legacy) {
          const { data: leg } = await withDeadline(legacy.from("docs_categories").select("*").order("sort_order"), "docs_categories_legacy");
          return leg ?? [];
        }
        return [];
      });
    } else if (op === "pages") {
      data = await getCached("pages", async () => {
        const { data } = await withDeadline(admin
          .from("docs_pages")
          .select("*")
          .eq("is_published", true)
          .order("sort_order"), "docs_pages_admin");
        if (data && data.length > 0) return data;
        if (legacy) {
          const { data: leg } = await withDeadline(legacy
            .from("docs_pages").select("*").eq("is_published", true).order("sort_order"), "docs_pages_legacy");
          return leg ?? [];
        }
        return [];
      });
    } else if (op === "page" && slug) {
      data = await getCached(`page:${slug}`, async () => {
        const { data } = await withDeadline(admin
          .from("docs_pages")
          .select("*")
          .eq("slug", slug)
          .maybeSingle(), "docs_page_admin");
        if (data) return data;
        if (legacy) {
          const { data: leg } = await withDeadline(legacy
            .from("docs_pages").select("*").eq("slug", slug).maybeSingle(), "docs_page_legacy");
          return leg ?? null;
        }
        return null;
      });
    } else {
      return new Response(JSON.stringify({ error: "unknown op" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (await emptyArray(data) && legacy) source = "legacy";
    return new Response(JSON.stringify({ data }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60",
        "X-Docs-Source": source,
      },
    });
  } catch (e: any) {
    // Never break docs UI — return empty.
    return new Response(JSON.stringify({ data: null, error: e?.message ?? String(e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function snapshot(sb: any) {
  const safe = async <T>(p: Promise<T>, fb: T): Promise<T> => {
    try { return await p; } catch { return fb; }
  };
  const cats = await safe(sb.from("docs_categories").select("id,slug,title", { count: "exact" }), { data: [], count: 0 } as any);
  const pages = await safe(sb.from("docs_pages").select("id,slug,category_id,is_published,content,updated_at", { count: "exact" }), { data: [], count: 0 } as any);
  const rows = (pages as any).data ?? [];
  const catIds = new Set(((cats as any).data ?? []).map((c: any) => c.id));
  const slugs = rows.map((r: any) => r.slug);
  const duplicateSlugs = slugs.filter((s: string, i: number) => slugs.indexOf(s) !== i);
  const orphaned = rows.filter((r: any) => r.category_id && !catIds.has(r.category_id)).map((r: any) => r.slug);
  const empty = rows.filter((r: any) => !r.content || (r.content as string).trim().length === 0).map((r: any) => r.slug);
  const unpublished = rows.filter((r: any) => !r.is_published).map((r: any) => r.slug);
  const lastUpdated = rows.map((r: any) => r.updated_at).filter(Boolean).sort().pop() ?? null;
  return {
    categories: (cats as any).count ?? ((cats as any).data ?? []).length,
    pages: (pages as any).count ?? rows.length,
    published: rows.filter((r: any) => r.is_published).length,
    unpublished_slugs: unpublished,
    orphaned_slugs: orphaned,
    empty_slugs: empty,
    duplicate_slugs: duplicateSlugs,
    last_updated: lastUpdated,
    category_titles: ((cats as any).data ?? []).map((c: any) => ({ slug: c.slug, title: c.title })),
  };
}