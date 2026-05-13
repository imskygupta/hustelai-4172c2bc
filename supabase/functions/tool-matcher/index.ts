// Tool matcher: ranks tool_registry entries against a draft.
// BLOG_DB only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const blog = createClient(
  Deno.env.get("BLOG_SUPABASE_URL")!,
  Deno.env.get("BLOG_SUPABASE_SERVICE_ROLE")!,
);

function tokenize(s: string): Set<string> {
  return new Set(
    (s ?? "").toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((w) => w.length > 3),
  );
}
function jaccard(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

async function loadTools() {
  const { data } = await blog.from("tool_registry").select("slug,title,summary,tags,internal_url,cluster,internal_cta").limit(500);
  return data ?? [];
}

async function loadTemplates() {
  const { data } = await blog.from("hustle_templates").select("slug,title,summary,cluster,tool_slugs,cta_label,cta_href").eq("status", "active");
  return data ?? [];
}

function rankTools(tools: any[], draftText: string, focus: string, cluster?: string) {
  const dt = tokenize(`${focus} ${draftText}`);
  const scored = tools.map((t) => {
    const tt = tokenize(`${t.title} ${t.summary} ${(t.tags ?? []).join(" ")}`);
    let score = jaccard(dt, tt);
    if (cluster && t.cluster && t.cluster === cluster) score += 0.15;
    if (focus && (t.title?.toLowerCase().includes(focus.toLowerCase()) || (t.tags ?? []).some((x: string) => focus.toLowerCase().includes(x.toLowerCase())))) score += 0.1;
    return { ...t, score: Number(score.toFixed(4)) };
  }).sort((a, b) => b.score - a.score);
  return scored;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "match";

    if (action === "match" && req.method === "POST") {
      const { post_id, body_md, title, focus_keyword, cluster, mode = "auto", overrides = {} } = await req.json();

      let draftText = body_md ?? "";
      let focus = focus_keyword ?? "";
      let cl = cluster ?? "";
      let pid = post_id;

      if (post_id && (!body_md || !title)) {
        const { data: post } = await blog
          .from("blog_posts")
          .select("id,title,body_md,focus_keyword,blog_categories(slug)")
          .eq("id", post_id).maybeSingle();
        if (post) {
          draftText = (post as any).body_md ?? draftText;
          focus = focus || (post as any).focus_keyword || (post as any).title;
          cl = cl || ((post as any).blog_categories?.slug ?? "");
          pid = post.id;
        }
      }

      const [tools, templates] = await Promise.all([loadTools(), loadTemplates()]);
      const ranked = rankTools(tools, draftText, focus, cl);
      const topTools = mode === "manual"
        ? (overrides.tools ?? []).map((s: string) => ranked.find((t) => t.slug === s)).filter(Boolean)
        : ranked.slice(0, 5);

      // Pick template (manual override else cluster match)
      let template: any = null;
      if (overrides.template_slug) {
        template = templates.find((x) => x.slug === overrides.template_slug) ?? null;
      } else if (cl) {
        template = templates.find((x) => x.cluster === cl) ?? templates[0] ?? null;
      } else {
        template = templates[0] ?? null;
      }

      const cta = overrides.cta ?? (template
        ? { label: template.cta_label, href: template.cta_href, kind: "template" }
        : (topTools[0] ? { label: `Open ${topTools[0].title}`, href: topTools[0].internal_url, kind: "tool" } : null));

      const matches = {
        tools: topTools.slice(0, 5).map((t: any) => ({ slug: t.slug, title: t.title, href: t.internal_url, summary: t.summary, score: t.score })),
        workflow: topTools[0] ? { slug: topTools[0].slug, href: topTools[0].internal_url } : null,
        template: template ? { slug: template.slug, title: template.title, href: template.cta_href, label: template.cta_label } : null,
        cta,
        mode,
        scored: ranked.slice(0, 12).map((t) => ({ slug: t.slug, score: t.score })),
      };

      if (pid) {
        await blog.from("blog_posts").update({
          tool_matches: matches.tools,
          hustle_template_slug: matches.template?.slug ?? null,
        }).eq("id", pid);
      }

      return new Response(JSON.stringify({ matches }), { headers: { ...cors, "content-type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "unknown action" }), { status: 400, headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, "content-type": "application/json" } });
  }
});