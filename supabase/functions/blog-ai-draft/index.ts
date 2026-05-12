import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const blog = createClient(
  Deno.env.get("BLOG_SUPABASE_URL")!,
  Deno.env.get("BLOG_SUPABASE_SERVICE_ROLE")!,
);
const main = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);

const SYSTEM = `You are an editorial writer for HustleAI, an operational workspace OS for freelancers.
Write workflow-native, practical articles. STRICT RULES:
- No filler: do not use phrases like "in today's fast-paced world", "leverage", "unleash", "harness", "dive deep", "game-changer", "supercharge".
- No generic listicle padding. No emoji.
- Use H2 (##) and occasionally H3 (###). Start sections with the operational point, not a preamble.
- Sound like a senior freelancer writing internal notes for peers. Plain English. Indian-freelancer aware where relevant.
- 900-1300 words. End with 4 short FAQ questions and short answers.
- Mention concrete workflows (proposals, invoices, async delivery, Telegram delivery, exports, onboarding) where naturally relevant.
Return JSON only with shape: {"title","subtitle","excerpt","body_md","faq":[{"q","a"}],"meta_title","meta_description","focus_keyword","suggested_category_slug","cta_blocks":[{"kind","label","href","note"}]}.`;

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80);
}
function dedupHash(s: string): string {
  let h = 5381; for (const c of s.toLowerCase().replace(/[^a-z ]/g, "")) h = ((h << 5) + h) + c.charCodeAt(0);
  return String(h >>> 0);
}

async function callAI(topic: string, angle: string, keyword: string): Promise<any> {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", "authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `Topic: ${topic}\nAngle: ${angle || "operational, workflow-native"}\nFocus keyword: ${keyword || topic}\nReturn JSON only.` },
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
  try {
    let topic = "", angle = "", keyword = "", auto = false;
    if (req.method === "POST") {
      const b = await req.json().catch(() => ({}));
      topic = b.topic ?? ""; angle = b.angle ?? ""; keyword = b.keyword ?? ""; auto = !!b.auto;
    }
    if (!topic) {
      // pick from topic bank
      const { data: s } = await blog.from("blog_settings").select("topic_bank").eq("id", 1).maybeSingle();
      const bank: string[] = (s?.topic_bank as any) ?? [];
      if (!bank.length) return new Response(JSON.stringify({ error: "no_topic" }), { status: 400, headers: { ...cors, "content-type": "application/json" } });
      topic = bank[Math.floor(Math.random() * bank.length)];
    }

    const { data: draft } = await blog.from("blog_ai_drafts")
      .insert({ topic, brief: angle, target_keyword: keyword, status: "generating" })
      .select().single();

    try {
      const out = await callAI(topic, angle, keyword);
      const md = out.body_md ?? "";
      const hash = dedupHash((out.title ?? "") + " " + md.slice(0, 400));
      const { data: dup } = await blog.from("blog_posts").select("id").eq("dedup_hash", hash).maybeSingle();
      if (dup) {
        await blog.from("blog_ai_drafts").update({ status: "discarded", error: "duplicate" }).eq("id", draft!.id);
        return new Response(JSON.stringify({ skipped: "duplicate" }), { headers: { ...cors, "content-type": "application/json" } });
      }

      const { data: cat } = await blog.from("blog_categories").select("id").eq("slug", out.suggested_category_slug ?? "freelancer-workflows").maybeSingle();
      const { data: author } = await blog.from("blog_authors").select("id").eq("slug", "hustleai-editorial").maybeSingle();

      const slugBase = slugify(out.title ?? topic);
      let slug = slugBase;
      const { data: exists } = await blog.from("blog_posts").select("id").eq("slug", slug).maybeSingle();
      if (exists) slug = `${slugBase}-${Math.floor(Math.random() * 9999)}`;

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
        cta_blocks: out.cta_blocks ?? [],
        category_id: cat?.id,
        author_id: author?.id,
        ai_generated: true,
        ai_model: "google/gemini-2.5-flash",
        dedup_hash: hash,
        status: "in_review",
      }).select().single();
      if (pErr) throw pErr;

      await blog.from("blog_ai_drafts").update({ status: "ready", generated_post_id: post.id }).eq("id", draft!.id);
      return new Response(JSON.stringify({ post }), { headers: { ...cors, "content-type": "application/json" } });
    } catch (e) {
      await blog.from("blog_ai_drafts").update({ status: "failed", error: String(e) }).eq("id", draft!.id);
      throw e;
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, "content-type": "application/json" } });
  }
});