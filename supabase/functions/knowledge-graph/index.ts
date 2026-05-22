import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireVerifiedUser as __requireVerifiedUser } from "../_shared/require-verified.ts";

/**
 * Knowledge Graph queries for the narrative engine.
 * BLOG-DB only. Read-only neighbor + cluster lookups.
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

async function embedQuery(q: string): Promise<number[] | null> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return null;
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: "google/gemini-embedding-001", input: q }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j.data?.[0]?.embedding ?? null;
  } catch { return null; }
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

function parseEmbedding(v: any): number[] | null {
  if (!v) return null;
  if (Array.isArray(v)) return v as number[];
  if (typeof v === "string") {
    try { return JSON.parse(v); } catch { return null; }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const __gate = await __requireVerifiedUser(req, { denialEvent: "verification_blocked_ai", fn: "knowledge-graph" });
  if (!__gate.ok) return __gate.response;
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "neighbors";

    if (action === "neighbors") {
      const slug = url.searchParams.get("slug");
      if (!slug) return new Response(JSON.stringify({ error: "slug required" }), { status: 400, headers: cors });
      const { data: rels } = await blog.from("tool_relationships").select("target_slug, kind, weight").eq("source_slug", slug);
      const slugs = Array.from(new Set((rels ?? []).map((r: any) => r.target_slug)));
      const { data: tools } = slugs.length
        ? await blog.from("tool_registry").select("slug,name,description,category,tier,internal_url,internal_cta,premium_only").in("slug", slugs)
        : { data: [] as any[] };
      const byKind: Record<string, string[]> = {};
      for (const r of (rels ?? [])) {
        (byKind[r.kind] ??= []).push(r.target_slug);
      }
      return new Response(JSON.stringify({ slug, neighbors: tools ?? [], by_kind: byKind }), {
        headers: { ...cors, "content-type": "application/json" },
      });
    }

    if (action === "context") {
      // For narrative engine: given a topic/keyword, return top-K relevant tools.
      const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
      const q = body.query ?? url.searchParams.get("q") ?? "";
      const k = Math.min(8, Math.max(3, Number(body.k ?? 6)));
      if (!q) return new Response(JSON.stringify({ tools: [], reason: "no_query" }), { headers: { ...cors, "content-type": "application/json" } });

      const { data: tools } = await blog.from("tool_registry").select("*").eq("public_visible", true);
      const all = tools ?? [];

      // Try semantic match
      const qVec = await embedQuery(q);
      let scored: Array<{ t: any; s: number; reason: string }> = [];
      if (qVec) {
        scored = all.map((t: any) => {
          const e = parseEmbedding(t.embedding);
          return { t, s: e ? cosine(qVec, e) : 0, reason: e ? "semantic" : "keyword" };
        });
      }
      // Always overlay keyword overlap as a tiebreaker / fallback
      const ql = q.toLowerCase();
      const tokens = ql.split(/\s+/).filter(Boolean);
      const kwScore = (t: any) => {
        const hay = [
          t.name, t.description, t.feature_summary,
          ...(t.keywords ?? []), ...(t.seo_keywords ?? []),
          ...(t.workflows_supported ?? []),
        ].filter(Boolean).join(" ").toLowerCase();
        let s = 0;
        for (const tok of tokens) if (hay.includes(tok)) s += 1;
        return s / Math.max(1, tokens.length);
      };
      if (!scored.length) {
        scored = all.map((t: any) => ({ t, s: kwScore(t), reason: "keyword" }));
      } else {
        for (const x of scored) x.s = 0.7 * x.s + 0.3 * kwScore(x.t);
      }
      scored.sort((a, b) => b.s - a.s);
      const picked = scored.slice(0, k).filter(x => x.s > 0.05);

      return new Response(JSON.stringify({
        query: q,
        tools: picked.map(p => ({
          slug: p.t.slug, name: p.t.name, description: p.t.description,
          category: p.t.category, tier: p.t.tier,
          internal_url: p.t.internal_url, internal_cta: p.t.internal_cta,
          ideal_use_case: p.t.ideal_use_case,
          workflows: p.t.workflows_supported,
          score: Number(p.s.toFixed(3)), match: p.reason,
        })),
      }), { headers: { ...cors, "content-type": "application/json" } });
    }

    if (action === "graph") {
      const { data: tools } = await blog.from("tool_registry").select("slug,name,category,tier,premium_only");
      const { data: rels } = await blog.from("tool_relationships").select("source_slug,target_slug,kind,weight");
      return new Response(JSON.stringify({ nodes: tools ?? [], edges: rels ?? [] }), {
        headers: { ...cors, "content-type": "application/json" },
      });
    }

    if (action === "coverage") {
      const { data } = await blog.from("narrative_coverage").select("*").order("mention_count", { ascending: false });
      const { data: tools } = await blog.from("tool_registry").select("slug,name");
      const covered = new Set((data ?? []).map((r: any) => r.tool_slug));
      const uncovered = (tools ?? []).filter((t: any) => !covered.has(t.slug));
      const total = (tools ?? []).length || 1;
      return new Response(JSON.stringify({
        coverage_pct: Math.round(((tools?.length ?? 0) - uncovered.length) / total * 100),
        coverage: data ?? [], uncovered: uncovered.map((t: any) => t.slug),
      }), { headers: { ...cors, "content-type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "unknown_action" }), { status: 400, headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, "content-type": "application/json" } });
  }
});