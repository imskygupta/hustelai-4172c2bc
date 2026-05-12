import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * Tool Media Pipeline — lazy auto-screenshot capture for tools/features.
 * Uses WordPress mShots (no API key, free, returns PNG) as the capture
 * provider. WebP conversion happens upstream at the CDN; we cache the
 * stable URL in the BLOG DB so consumers get instant images on subsequent
 * loads. Variants: dashboard, card, hero, mobile, desktop.
 * Lives entirely on BLOG DB — never touches primary.
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

const SITE = Deno.env.get("PUBLIC_SITE_URL") ?? "https://hustlaiapp.in";

type Variant = "dashboard" | "card" | "hero" | "mobile" | "desktop" | "feature";
const VARIANT_DIMS: Record<Variant, { w: number; h: number }> = {
  dashboard: { w: 1440, h: 900 },
  card: { w: 800, h: 500 },
  hero: { w: 1920, h: 1000 },
  feature: { w: 1280, h: 720 },
  desktop: { w: 1440, h: 900 },
  mobile: { w: 414, h: 896 },
};

function captureUrl(target: string, v: Variant): string {
  const { w, h } = VARIANT_DIMS[v];
  // mShots is free + cached; query string ensures fresh capture key per variant
  return `https://s.wordpress.com/mshots/v1/${encodeURIComponent(target)}?w=${w}&h=${h}`;
}

function aspect(v: Variant): number {
  const { w, h } = VARIANT_DIMS[v];
  return +(w / h).toFixed(3);
}

async function capture(slug: string, internalUrl: string | null, kind: Variant) {
  const target = internalUrl?.startsWith("http") ? internalUrl : `${SITE}${internalUrl ?? `/${slug}`}`;
  const url = captureUrl(target, kind);
  const { w, h } = VARIANT_DIMS[kind];
  const row = {
    tool_slug: slug,
    kind,
    url,
    width: w,
    height: h,
    alt: `${slug} ${kind} preview`,
    status: "ready",
  };
  const { error } = await blog.from("tool_media").upsert(row as any, { onConflict: "tool_slug,kind" });
  if (error) throw error;
  return { ...row, aspect: aspect(kind) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "list";

    if (action === "list") {
      const { data } = await blog.from("tool_media").select("*").order("created_at", { ascending: false }).limit(500);
      return new Response(JSON.stringify({ media: data ?? [] }), { headers: { ...cors, "content-type": "application/json" } });
    }

    if (action === "for_tool") {
      const slug = url.searchParams.get("slug");
      if (!slug) return new Response(JSON.stringify({ error: "slug required" }), { status: 400, headers: cors });
      const { data } = await blog.from("tool_media").select("*").eq("tool_slug", slug);
      return new Response(JSON.stringify({ media: data ?? [] }), { headers: { ...cors, "content-type": "application/json" } });
    }

    if (action === "coverage") {
      const [{ data: tools }, { data: media }] = await Promise.all([
        blog.from("tool_registry").select("slug,name,internal_url"),
        blog.from("tool_media").select("tool_slug,kind"),
      ]);
      const haveByTool = new Map<string, Set<string>>();
      for (const m of media ?? []) {
        if (!haveByTool.has(m.tool_slug)) haveByTool.set(m.tool_slug, new Set());
        haveByTool.get(m.tool_slug)!.add(m.kind);
      }
      const required: Variant[] = ["dashboard", "card", "hero", "feature"];
      const rows = (tools ?? []).map((t: any) => {
        const have = haveByTool.get(t.slug) ?? new Set();
        const missing = required.filter((k) => !have.has(k));
        return { slug: t.slug, name: t.name, internal_url: t.internal_url, have: [...have], missing };
      });
      const total = rows.length * required.length;
      const captured = rows.reduce((a, r) => a + (required.length - r.missing.length), 0);
      return new Response(JSON.stringify({
        total_required: total, captured, pct: total ? Math.round((captured / total) * 100) : 0,
        tools: rows,
      }), { headers: { ...cors, "content-type": "application/json" } });
    }

    if (action === "capture") {
      const body = await req.json().catch(() => ({}));
      const slug = String(body.slug ?? "").trim();
      const kind = (body.kind ?? "card") as Variant;
      if (!slug || !VARIANT_DIMS[kind]) {
        return new Response(JSON.stringify({ error: "slug + valid kind required" }), { status: 400, headers: cors });
      }
      const { data: tool } = await blog.from("tool_registry").select("internal_url").eq("slug", slug).maybeSingle();
      const r = await capture(slug, tool?.internal_url ?? null, kind);
      return new Response(JSON.stringify({ ok: true, media: r }), { headers: { ...cors, "content-type": "application/json" } });
    }

    if (action === "queue") {
      // Capture all missing media for all tools (lazy batch).
      const limit = Math.min(100, Number(url.searchParams.get("limit") ?? 25));
      const { data: tools } = await blog.from("tool_registry").select("slug,internal_url");
      const { data: media } = await blog.from("tool_media").select("tool_slug,kind");
      const have = new Map<string, Set<string>>();
      for (const m of media ?? []) {
        if (!have.has(m.tool_slug)) have.set(m.tool_slug, new Set());
        have.get(m.tool_slug)!.add(m.kind);
      }
      const required: Variant[] = ["dashboard", "card", "hero", "feature"];
      const jobs: Array<{ slug: string; kind: Variant; internal_url: string | null }> = [];
      for (const t of tools ?? []) {
        const h = have.get(t.slug) ?? new Set();
        for (const k of required) if (!h.has(k)) jobs.push({ slug: t.slug, kind: k, internal_url: t.internal_url });
        if (jobs.length >= limit) break;
      }
      let done = 0;
      for (const j of jobs.slice(0, limit)) {
        try { await capture(j.slug, j.internal_url, j.kind); done++; } catch (e) { console.warn("capture failed", j, e); }
      }
      return new Response(JSON.stringify({ ok: true, queued: jobs.length, captured: done }), {
        headers: { ...cors, "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "unknown_action" }), { status: 400, headers: cors });
  } catch (e) {
    console.error("tool-media-pipeline", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, "content-type": "application/json" } });
  }
});