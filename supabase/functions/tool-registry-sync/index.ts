import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { TOOL_MANIFEST, manifestHash, type ToolEntry } from "./manifest.ts";

/**
 * Tool Registry Sync — diff-based, BLOG-DB-only.
 * - Reads static manifest of HustleAI tools.
 * - Compares against tool_registry.hash; only upserts changed rows.
 * - Generates Gemini embeddings for new/changed entries (batched).
 * - Recomputes manifest-declared `tool_relationships`.
 * - Skips embedding generation when LOVABLE_API_KEY missing.
 * NEVER writes to primary DB.
 */

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const blog = createClient(
  Deno.env.get("BLOG_SUPABASE_URL")!,
  Deno.env.get("BLOG_SUPABASE_SERVICE_ROLE")!,
);

function embedText(t: ToolEntry): string {
  return [
    t.name, t.description, t.feature_summary, t.ideal_use_case,
    t.category, t.tier,
    t.keywords.join(" "), t.workflows_supported.join(" "),
    t.seo_keywords.join(" "),
  ].filter(Boolean).join(" \n ");
}

async function batchEmbed(inputs: string[]): Promise<number[][] | null> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key || !inputs.length) return null;
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: "google/gemini-embedding-001", input: inputs }),
    });
    if (!r.ok) {
      console.warn("embed failed", r.status, await r.text());
      return null;
    }
    const j = await r.json();
    return (j.data ?? []).map((d: any) => d.embedding as number[]);
  } catch (e) {
    console.warn("embed threw", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "sync";
    const mode = url.searchParams.get("mode") ?? "incremental"; // 'incremental' | 'full'

    if (action === "list") {
      const { data } = await blog.from("tool_registry").select("slug,name,category,tier,premium_only,last_synced_at,hash").order("name");
      return new Response(JSON.stringify({ tools: data ?? [], manifest_count: TOOL_MANIFEST.length }), {
        headers: { ...cors, "content-type": "application/json" },
      });
    }

    if (action === "health") {
      const { data } = await blog.from("tool_registry").select("slug,hash,last_synced_at");
      const dbBySlug = new Map((data ?? []).map((r: any) => [r.slug, r]));
      const stale: string[] = [];
      const missing: string[] = [];
      for (const t of TOOL_MANIFEST) {
        const row = dbBySlug.get(t.slug);
        if (!row) { missing.push(t.slug); continue; }
        if (row.hash !== manifestHash(t)) stale.push(t.slug);
      }
      const orphans = (data ?? []).filter((r: any) => !TOOL_MANIFEST.some(t => t.slug === r.slug)).map((r: any) => r.slug);
      const last = (data ?? []).reduce((a: any, r: any) => !a || r.last_synced_at > a ? r.last_synced_at : a, null);
      return new Response(JSON.stringify({
        manifest: TOOL_MANIFEST.length, db: (data ?? []).length,
        missing, stale, orphans, last_synced_at: last,
      }), { headers: { ...cors, "content-type": "application/json" } });
    }

    // sync
    const { data: existing } = await blog.from("tool_registry").select("slug,hash");
    const dbBySlug = new Map((existing ?? []).map((r: any) => [r.slug, r.hash as string]));

    const toUpsert: ToolEntry[] = [];
    for (const t of TOOL_MANIFEST) {
      const h = manifestHash(t);
      if (mode === "full" || dbBySlug.get(t.slug) !== h) toUpsert.push(t);
    }

    let embeddings: number[][] | null = null;
    if (toUpsert.length) {
      embeddings = await batchEmbed(toUpsert.map(embedText));
    }

    const now = new Date().toISOString();
    const rows = toUpsert.map((t, i) => ({
      slug: t.slug, name: t.name, description: t.description, category: t.category,
      tier: t.tier, access_level: t.access_level,
      workflows_supported: t.workflows_supported, keywords: t.keywords, tags: t.tags,
      related_tools: t.related_tools, feature_summary: t.feature_summary,
      seo_keywords: t.seo_keywords, ideal_use_case: t.ideal_use_case,
      conversion_goal: t.conversion_goal, internal_cta: t.internal_cta,
      internal_url: t.internal_url, public_visible: t.public_visible,
      premium_only: t.premium_only, hash: manifestHash(t),
      embedding: embeddings?.[i] ? `[${embeddings[i].join(",")}]` : null,
      last_synced_at: now, updated_at: now,
    }));

    let upserted = 0;
    if (rows.length) {
      // upsert in chunks; cast embedding via raw insert if present
      for (const r of rows) {
        const { error } = await blog.from("tool_registry").upsert(r as any, { onConflict: "slug" });
        if (error) { console.warn("upsert", r.slug, error.message); continue; }
        upserted++;
      }
    }

    // Rebuild manifest-declared relationships (workflow_pair + category_sibling)
    let edges = 0;
    if (mode === "full" || toUpsert.length) {
      // Wipe existing manifest-derived edges
      await blog.from("tool_relationships").delete().in("kind", ["manifest", "category_sibling"]);
      const newEdges: Array<{ source_slug: string; target_slug: string; kind: string; weight: number }> = [];
      for (const t of TOOL_MANIFEST) {
        for (const r of t.related_tools) {
          newEdges.push({ source_slug: t.slug, target_slug: r, kind: "manifest", weight: 1.0 });
        }
      }
      // category siblings
      const byCat = new Map<string, string[]>();
      for (const t of TOOL_MANIFEST) {
        if (!byCat.has(t.category)) byCat.set(t.category, []);
        byCat.get(t.category)!.push(t.slug);
      }
      for (const slugs of byCat.values()) {
        for (const a of slugs) for (const b of slugs) if (a !== b) {
          newEdges.push({ source_slug: a, target_slug: b, kind: "category_sibling", weight: 0.5 });
        }
      }
      if (newEdges.length) {
        const { error } = await blog.from("tool_relationships").upsert(newEdges as any, { onConflict: "source_slug,target_slug,kind" });
        if (!error) edges = newEdges.length;
      }
    }

    // Snapshot the product graph
    if (mode === "full" || toUpsert.length) {
      await blog.from("feature_snapshots").insert({
        kind: "product_graph",
        json_graph: {
          tools: TOOL_MANIFEST.map(t => ({ slug: t.slug, name: t.name, category: t.category, tier: t.tier })),
          edges: TOOL_MANIFEST.flatMap(t => t.related_tools.map(r => ({ s: t.slug, t: r }))),
        },
        notes: `sync mode=${mode} upserted=${upserted}`,
      });
    }

    return new Response(JSON.stringify({
      ok: true, mode, examined: TOOL_MANIFEST.length, upserted, edges,
      embeddings_generated: embeddings ? embeddings.length : 0,
    }), { headers: { ...cors, "content-type": "application/json" } });
  } catch (e) {
    console.error("tool-registry-sync", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, "content-type": "application/json" } });
  }
});