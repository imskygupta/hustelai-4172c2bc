import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireVerifiedUser as __requireVerifiedUser } from "../_shared/require-verified.ts";

/**
 * Narrative Generate — orchestrated, product-aware blog generation.
 * Stages emit live events into generation_events for the admin UI feed.
 * BLOG-DB only. Reads tool_registry + tool_relationships, writes blog_posts.
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

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80);
}
function dedupHash(s: string): string {
  let h = 5381;
  for (const c of s.toLowerCase().replace(/[^a-z ]/g, "")) h = ((h << 5) + h) + c.charCodeAt(0);
  return String(h >>> 0);
}
function readingMinutes(md: string) {
  const w = (md ?? "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(w / 200));
}
function buildToc(md: string) {
  const out: { level: number; text: string; slug: string }[] = [];
  for (const line of (md ?? "").split("\n")) {
    const m = line.match(/^(#{2,3})\s+(.+)$/);
    if (m) out.push({ level: m[1].length, text: m[2].trim(), slug: slugify(m[2]) });
  }
  return out;
}

async function emit(run_id: string, stage: string, status: string, message: string, payload: any = {}) {
  await blog.from("generation_events").insert({ run_id, stage, status, message, payload });
  await blog.from("generation_runs").update({ current_stage: stage, status: status === "error" ? "failed" : "running" }).eq("id", run_id);
}

const SYSTEM_NARRATIVE = `You are a senior freelance operator writing editorial field notes for HustleAI — an operational workspace OS for freelancers.

You are given a CONTEXT BUNDLE listing the actual product surfaces (tools, workflows) the article should weave in naturally. You MUST cite at least 3 of these tools using inline Markdown links to their internal_url, written editorially (not as a list).

TONE
- Calm, plain English, workflow-native. Senior freelancer writing notes for peers.
- Operational and concrete. Reference real artifacts: proposals, invoices, contracts, intake forms, async updates, Telegram delivery.
- Indian-freelancer aware where relevant (INR, GST) without forcing it.

HARD RULES
- No filler ("leverage", "unleash", "harness", "dive deep", "supercharge", "10x", "ultimate", "revolutionize", "in today's fast-paced world"). No emoji. No H1.
- 1000-1400 words. H2/H3 only.
- Include at least 2 inline Markdown links to internal_url targets from the bundle.
- Include a short "Recommended workflow stack" H2 section that names 3-4 tools in narrative form (not a bullet list).
- End body BEFORE the FAQ. FAQs go in structured "faq" field.
- Provide cta_blocks (1-2, kind: "soft") drawn from bundle's internal_cta entries.

OUTPUT — JSON only:
{
  "title": "string (<70 chars)",
  "subtitle": "string",
  "excerpt": "string (90-160 chars)",
  "body_md": "string (Markdown, 1000-1400 words)",
  "faq": [{"q":"string","a":"string"}, x4],
  "meta_title": "string (45-62 chars)",
  "meta_description": "string (130-160 chars)",
  "focus_keyword": "string",
  "suggested_category_slug": "freelancer-workflows|async-operations|client-systems|ai-exports|operational-systems",
  "hero_image_query": "string (2-4 words)",
  "cta_blocks": [{"kind":"soft","label":"string","href":"/...","note":"string"}],
  "tools_cited": ["slug", ...]
}`;

async function callAI(topic: string, angle: string, keyword: string, bundle: any[]) {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_NARRATIVE },
        {
          role: "user",
          content: `TOPIC: ${topic}\nANGLE: ${angle || "operational, workflow-native"}\nFOCUS KEYWORD: ${keyword || topic}\n\nCONTEXT BUNDLE (HustleAI tools you must cite):\n${JSON.stringify(bundle, null, 2)}\n\nReturn JSON only.`,
        },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!r.ok) throw new Error(`ai_gateway ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return JSON.parse(j.choices[0].message.content);
}

async function pingIndexNow(urls: string[]) {
  const fnBase = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "") + "/functions/v1";
  fetch(`${fnBase}/indexnow?action=enqueue`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: Deno.env.get("SUPABASE_ANON_KEY")! },
    body: JSON.stringify({ urls, source_kind: "narrative" }),
  }).catch(() => {});
}

async function fetchContextBundle(query: string): Promise<any[]> {
  const fnBase = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "") + "/functions/v1";
  try {
    const r = await fetch(`${fnBase}/knowledge-graph?action=context`, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: Deno.env.get("SUPABASE_ANON_KEY")! },
      body: JSON.stringify({ query, k: 6 }),
    });
    if (!r.ok) return [];
    const j = await r.json();
    return j.tools ?? [];
  } catch { return []; }
}

function scoreContent(md: string, citedSlugs: string[]) {
  const words = (md ?? "").trim().split(/\s+/).filter(Boolean).length;
  const internalLinks = (md.match(/\]\((\/[a-z0-9\-\/]+)\)/g) ?? []).length;
  const thin = words < 700;
  const ad_safe = !/casino|gambling|adult|porn|crypto pump/i.test(md);
  return {
    word_count: words,
    internal_link_count: internalLinks,
    tools_cited: citedSlugs.length,
    thin_content: thin,
    ad_safe,
    content_quality: Math.max(0, Math.min(100, Math.round(
      (words / 14) + (internalLinks * 4) + (citedSlugs.length * 3)
    ))),
    commercial_intent: Math.min(100, citedSlugs.length * 12 + internalLinks * 3),
    rpm_estimate_usd: thin ? 0.5 : Math.min(8, 1 + words / 500 + citedSlugs.length * 0.4),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const __gate = await __requireVerifiedUser(req, { denialEvent: "verification_blocked_ai", fn: "narrative-generate" });
  if (!__gate.ok) return __gate.response;
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "generate";

    if (action === "runs") {
      const limit = Math.min(50, Number(url.searchParams.get("limit") ?? 20));
      const { data } = await blog.from("generation_runs").select("*").order("started_at", { ascending: false }).limit(limit);
      return new Response(JSON.stringify({ runs: data ?? [] }), { headers: { ...cors, "content-type": "application/json" } });
    }
    if (action === "events") {
      const run_id = url.searchParams.get("run_id");
      if (!run_id) return new Response(JSON.stringify({ error: "run_id required" }), { status: 400, headers: cors });
      const { data } = await blog.from("generation_events").select("*").eq("run_id", run_id).order("id");
      return new Response(JSON.stringify({ events: data ?? [] }), { headers: { ...cors, "content-type": "application/json" } });
    }

    // generate (POST)
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    let { topic, angle, keyword, auto_publish } = body;

    if (!topic) {
      const { data: s } = await blog.from("blog_settings").select("topic_bank").eq("id", 1).maybeSingle();
      const bank: string[] = (s?.topic_bank as any) ?? [];
      if (!bank.length) return new Response(JSON.stringify({ error: "no_topic" }), { status: 400, headers: cors });
      topic = bank[Math.floor(Math.random() * bank.length)];
    }

    const startedAt = Date.now();
    const { data: run, error: runErr } = await blog.from("generation_runs").insert({
      topic, focus_keyword: keyword ?? topic, status: "running", current_stage: "init",
      context: { angle, requested_at: new Date().toISOString() },
    }).select().single();
    if (runErr) throw runErr;
    const run_id = run!.id as string;

    try {
      await emit(run_id, "keyword", "ok", `Resolved topic: ${topic}`, { keyword, angle });

      await emit(run_id, "graph_query", "running", "Querying product knowledge graph…");
      const bundle = await fetchContextBundle([topic, keyword].filter(Boolean).join(" "));
      await emit(run_id, "graph_query", "ok", `Mapped ${bundle.length} relevant tools`, { tools: bundle.map(b => b.slug) });

      await emit(run_id, "tool_resolution", "ok", `Resolved CTAs and workflows`, {
        ctas: bundle.map(b => b.internal_cta).filter(Boolean),
      });

      await emit(run_id, "outline", "running", "Generating narrative outline…");
      const out = await callAI(topic, angle ?? "", keyword ?? topic, bundle);
      const md: string = out.body_md ?? "";
      await emit(run_id, "draft", "ok", `Drafted ${md.trim().split(/\s+/).length} words`);

      await emit(run_id, "links", "ok", "Internal links woven in by model");
      await emit(run_id, "cta", "ok", `Inserted ${(out.cta_blocks ?? []).length} CTA blocks`);

      // De-dup
      const hash = dedupHash((out.title ?? "") + " " + md.slice(0, 400));
      const { data: dup } = await blog.from("blog_posts").select("id").eq("dedup_hash", hash).maybeSingle();
      if (dup) {
        await emit(run_id, "publish", "skipped", "Duplicate detected, discarded");
        await blog.from("generation_runs").update({ status: "succeeded", finished_at: new Date().toISOString(), duration_ms: Date.now() - startedAt }).eq("id", run_id);
        return new Response(JSON.stringify({ run_id, skipped: "duplicate" }), { headers: { ...cors, "content-type": "application/json" } });
      }

      await emit(run_id, "hero", "running", "Resolving hero image…");
      const hero = (out.hero_image && /^https?:\/\//.test(out.hero_image))
        ? out.hero_image
        : `https://source.unsplash.com/1600x900/?${encodeURIComponent(out.hero_image_query || keyword || topic)}`;
      await emit(run_id, "hero", "ok", "Hero image resolved");

      // Trigger lazy screenshot capture for tools cited in this run.
      try {
        await emit(run_id, "screenshots", "running", "Queuing tool screenshot captures…");
        const cited = bundle.filter(b => md.includes(b.internal_url)).map(b => b.slug);
        const fnUrl = `${Deno.env.get("BLOG_SUPABASE_URL")}/functions/v1/tool-media-pipeline?action=queue&limit=${Math.min(20, cited.length || 10)}`;
        // fire-and-forget — never block publishing on media
        fetch(fnUrl, {
          method: "POST",
          headers: { "content-type": "application/json", apikey: Deno.env.get("BLOG_SUPABASE_SERVICE_ROLE")!, authorization: `Bearer ${Deno.env.get("BLOG_SUPABASE_SERVICE_ROLE")!}` },
        }).catch(() => {});
        await emit(run_id, "screenshots", "ok", `Capture queued for ${cited.length} tools`);
      } catch (_) { /* non-fatal */ }

      const { data: cat } = await blog.from("blog_categories").select("id").eq("slug", out.suggested_category_slug ?? "freelancer-workflows").maybeSingle();
      const { data: author } = await blog.from("blog_authors").select("id").eq("slug", "hustleai-editorial").maybeSingle();

      let slug = slugify(out.title ?? topic);
      const { data: exists } = await blog.from("blog_posts").select("id").eq("slug", slug).maybeSingle();
      if (exists) slug = `${slug}-${Math.floor(Math.random() * 9999)}`;

      const tools_cited: string[] = Array.isArray(out.tools_cited)
        ? out.tools_cited
        : bundle.filter(b => md.includes(b.internal_url)).map(b => b.slug);

      const scoring = scoreContent(md, tools_cited);
      await emit(run_id, "seo", "ok", `Quality ${scoring.content_quality}/100 · words ${scoring.word_count} · ad_safe=${scoring.ad_safe}`, scoring);

      const status = auto_publish ? "published" : "in_review";
      const { data: post, error: pErr } = await blog.from("blog_posts").insert({
        slug,
        title: out.title,
        subtitle: out.subtitle ?? null,
        excerpt: out.excerpt ?? null,
        body_md: md,
        meta_title: out.meta_title ?? out.title,
        meta_description: out.meta_description ?? out.excerpt,
        focus_keyword: out.focus_keyword ?? keyword ?? topic,
        faq: out.faq ?? [],
        cta_blocks: (out.cta_blocks ?? []).slice(0, 2),
        category_id: cat?.id,
        author_id: author?.id,
        ai_generated: true,
        ai_model: "google/gemini-2.5-flash",
        dedup_hash: hash,
        hero_image: hero,
        reading_time: readingMinutes(md),
        toc: buildToc(md),
        status,
        published_at: auto_publish ? new Date().toISOString() : null,
      }).select().single();
      if (pErr) throw pErr;

      // Update narrative coverage
      for (const slugCited of tools_cited) {
        await blog.from("narrative_coverage").upsert({
          tool_slug: slugCited,
          mention_count: 1,
          last_mentioned_at: new Date().toISOString(),
          last_post_slug: post.slug,
          updated_at: new Date().toISOString(),
        }, { onConflict: "tool_slug" });
      }

      if (auto_publish) {
        pingIndexNow([
          `https://blogs.hustlaiapp.in/${post.slug}`,
          `https://hustlaiapp.in/insights/${post.slug}`,
        ]);
        await emit(run_id, "indexnow", "ok", "Queued for IndexNow");
        await emit(run_id, "publish", "ok", `Published as /${post.slug}`);
      } else {
        await emit(run_id, "publish", "ok", `Saved as in_review draft`);
      }

      await blog.from("generation_runs").update({
        status: "succeeded",
        post_id: post.id,
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - startedAt,
        context: { ...((run as any).context ?? {}), tools_cited, scoring },
      }).eq("id", run_id);

      return new Response(JSON.stringify({ run_id, post_id: post.id, slug: post.slug, scoring, tools_cited }), {
        headers: { ...cors, "content-type": "application/json" },
      });
    } catch (e) {
      const msg = String((e as Error).message ?? e);
      await emit(run_id, "error", "error", msg);
      await blog.from("generation_runs").update({
        status: "failed", error: msg, finished_at: new Date().toISOString(),
        duration_ms: Date.now() - startedAt,
      }).eq("id", run_id);
      throw e;
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, "content-type": "application/json" } });
  }
});