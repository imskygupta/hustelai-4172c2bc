import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * One-shot bootstrap: generates and publishes the first 3 operational articles
 * directly via the blog service role. Idempotent on slug — re-running skips
 * articles that already exist.
 *
 * Manual publish (status="published" immediately) so the editor can review
 * live on blogs.hustlaiapp.in. After this seed run, the regular
 * blog-scheduler / blog-ai-draft pipeline takes over.
 */

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const blog = createClient(
  Deno.env.get("BLOG_SUPABASE_URL")!,
  Deno.env.get("BLOG_SUPABASE_SERVICE_ROLE")!,
);

const SYSTEM = `You are a senior freelance operator writing editorial field notes for HustleAI — an operational workspace OS for freelancers, consultants and async operators.

TONE
- Calm, plain English, workflow-native. Sound like a senior freelancer writing internal notes for peers.
- Concrete and operational. Reference real artifacts: proposals, invoices, contracts, onboarding forms, async updates, Telegram delivery, exports, dashboards, client portals.
- Indian-freelancer aware where naturally relevant (INR pricing, GST mention, Indian payment rails, Upwork/Toptal context) without being forced.

HARD RULES
- No filler phrases: never use "in today's fast-paced world", "leverage", "unleash", "harness", "dive deep", "game-changer", "supercharge", "10x", "ultimate", "revolutionize".
- No AI-hype tone, no startup clichés, no listicle padding, no emoji.
- Use H2 (##) and H3 (###) only. Never H1. Start sections with the operational point, not preamble.
- 1000–1400 words. End the body BEFORE the FAQ — FAQs go in the structured "faq" field.
- Include at least 2 internal Markdown links to HustleAI surfaces (root-relative starting with "/", to URLs on hustlaiapp.in).
  Examples of valid internal targets:
    /tools/invoice-generator, /tools/proposal-generator, /tools/onboarding-form-builder,
    /tools/contract-generator, /tools/pricing-calculator, /workspaces, /work, /hustlebot,
    /knowledge-hub, /dashboard
- Include 1–2 subtle CTA blocks only (kind: "soft"), workflow-native, never sales-pitchy.
- Provide a clear, descriptive hero image alt text. Use a Unsplash placeholder URL: "https://images.unsplash.com/photo-..." OR leave hero_image as empty string and we will set a placeholder.

OUTPUT — return JSON ONLY with this exact shape:
{
  "title": "string (under 70 chars, editorial, no clickbait)",
  "subtitle": "string (one short sentence, optional but preferred)",
  "excerpt": "string (90–160 chars, operational hook)",
  "body_md": "string (Markdown, H2/H3 only, 1000–1400 words)",
  "faq": [{"q":"string","a":"string"}, ... 4 items],
  "meta_title": "string (45–62 chars, keyword-led)",
  "meta_description": "string (130–160 chars)",
  "focus_keyword": "string",
  "suggested_category_slug": "freelancer-workflows|async-operations|client-systems|ai-exports|operational-systems",
  "hero_image_query": "string (2-4 words to source a relevant Unsplash photo)",
  "cta_blocks": [{"kind":"soft","label":"string","href":"/...","note":"string (optional, short)"}]
}`;

const TOPICS = [
  {
    title: "How freelancers can automate client onboarding in 2026",
    angle: "End-to-end async onboarding system: intake form → contract → kickoff → workspace handoff. Practical, no fluff.",
    keyword: "automate client onboarding freelancer",
    category: "client-systems",
    hero_query: "freelancer laptop minimal workspace",
  },
  {
    title: "Best free invoice generator for freelancers in India",
    angle: "Practical comparison + workflow recommendation. Focus on GST-aware invoicing, INR, recurring clients, and async delivery via Telegram/email.",
    keyword: "free invoice generator freelancers India",
    category: "operational-systems",
    hero_query: "invoice paperwork desk minimal",
  },
  {
    title: "How async workflows help freelancers manage multiple clients",
    angle: "Operational system for juggling 4–8 retainer clients without burnout. Async updates, Telegram delivery, weekly digests, status pages.",
    keyword: "async workflows freelancers multiple clients",
    category: "async-operations",
    hero_query: "calm focused remote work desk",
  },
];

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80);
}
function dedupHash(s: string): string {
  let h = 5381; for (const c of s.toLowerCase().replace(/[^a-z ]/g, "")) h = ((h << 5) + h) + c.charCodeAt(0);
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
function unsplash(q: string) {
  // Source-API redirect → real image. Stable, works without an account.
  return `https://source.unsplash.com/1600x900/?${encodeURIComponent(q)}`;
}

async function callAI(topic: { title: string; angle: string; keyword: string }) {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `Title: ${topic.title}\nAngle: ${topic.angle}\nFocus keyword: ${topic.keyword}\nReturn JSON only.` },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!r.ok) throw new Error(`ai_gateway ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return JSON.parse(j.choices[0].message.content);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const results: any[] = [];
  const { data: author } = await blog.from("blog_authors").select("id").eq("slug", "hustleai-editorial").maybeSingle();

  for (const t of TOPICS) {
    try {
      const desiredSlug = slugify(t.title);
      const { data: existing } = await blog.from("blog_posts").select("id, slug, status").eq("slug", desiredSlug).maybeSingle();
      if (existing) {
        results.push({ topic: t.title, skipped: "already_exists", slug: existing.slug, status: existing.status });
        continue;
      }

      const out = await callAI(t);
      const md: string = out.body_md ?? "";
      const hash = dedupHash((out.title ?? t.title) + " " + md.slice(0, 400));

      const { data: cat } = await blog.from("blog_categories").select("id")
        .eq("slug", out.suggested_category_slug ?? t.category).maybeSingle();

      const heroQ = out.hero_image_query || t.hero_query;
      const hero = (out.hero_image && /^https?:\/\//.test(out.hero_image)) ? out.hero_image : unsplash(heroQ);

      const slug = desiredSlug;
      const now = new Date().toISOString();

      const { data: post, error } = await blog.from("blog_posts").insert({
        slug,
        title: out.title ?? t.title,
        subtitle: out.subtitle ?? null,
        excerpt: out.excerpt ?? null,
        body_md: md,
        meta_title: out.meta_title ?? out.title ?? t.title,
        meta_description: out.meta_description ?? out.excerpt ?? "",
        focus_keyword: out.focus_keyword ?? t.keyword,
        faq: out.faq ?? [],
        cta_blocks: (out.cta_blocks ?? []).slice(0, 2),
        category_id: cat?.id ?? null,
        author_id: author?.id ?? null,
        ai_generated: true,
        ai_model: "google/gemini-2.5-pro",
        dedup_hash: hash,
        hero_image: hero,
        reading_time: readingMinutes(md),
        toc: buildToc(md),
        status: "published",
        published_at: now,
      }).select().single();
      if (error) throw error;

      results.push({
        topic: t.title,
        slug: post.slug,
        url: `https://blogs.hustlaiapp.in/${post.slug}`,
        words: md.trim().split(/\s+/).filter(Boolean).length,
        reading_time: post.reading_time,
        category: out.suggested_category_slug,
      });
    } catch (e) {
      results.push({ topic: t.title, error: String(e) });
    }
  }

  // Best-effort sitemap pings so Google/Bing recrawl quickly
  await Promise.allSettled([
    fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent("https://blogs.hustlaiapp.in/sitemap.xml")}`),
    fetch(`https://www.bing.com/ping?sitemap=${encodeURIComponent("https://blogs.hustlaiapp.in/sitemap.xml")}`),
  ]);

  return new Response(JSON.stringify({ results }, null, 2), {
    headers: { ...cors, "content-type": "application/json" },
  });
});