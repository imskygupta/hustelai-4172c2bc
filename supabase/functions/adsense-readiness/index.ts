// AdSense readiness checks for blog_posts.
// Pure rule-based, BLOG_DB only.
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

function analyze(post: any) {
  const md: string = post.body_md ?? "";
  const words = md.trim().split(/\s+/).filter(Boolean).length;
  const internalLinks = (md.match(/\]\((\/[a-z0-9\-\/]+)\)/g) ?? []).length
    + (md.match(/hustlaiapp\.in/g) ?? []).length;
  const outboundRefs = (md.match(/\]\((https?:\/\/(?!.*hustlaiapp\.in)[^\s)]+)\)/g) ?? []).length;
  const heroOk = !!post.hero_image;
  const authorOk = !!post.author_id;
  const categoryOk = !!post.category_id;
  const faqCount = Array.isArray(post.faq) ? post.faq.length : 0;

  // Thin H2 sections (less than 60 words after a heading)
  const sections = md.split(/\n##\s/).slice(1);
  const thinSections = sections.filter((s) => s.trim().split(/\s+/).filter(Boolean).length < 60).length;

  // Readability: avg sentence length
  const sentences = md.split(/[.!?]+\s/).filter((s) => s.trim().length > 8);
  const avgSentence = sentences.length ? sentences.reduce((a, s) => a + s.split(/\s+/).length, 0) / sentences.length : 0;

  const checks = [
    { id: "word_count", pass: words >= 1100, value: words, target: "≥ 1100 words" },
    { id: "internal_links", pass: internalLinks >= 4, value: internalLinks, target: "≥ 4 internal links" },
    { id: "outbound_refs", pass: outboundRefs >= 1, value: outboundRefs, target: "≥ 1 outbound reference" },
    { id: "hero_image", pass: heroOk, value: heroOk, target: "Hero image set" },
    { id: "author", pass: authorOk, value: authorOk, target: "Author assigned" },
    { id: "category", pass: categoryOk, value: categoryOk, target: "Category assigned" },
    { id: "faq", pass: faqCount >= 2, value: faqCount, target: "≥ 2 FAQ entries" },
    { id: "thin_sections", pass: thinSections === 0, value: thinSections, target: "0 thin H2 sections" },
    { id: "readability", pass: avgSentence > 0 && avgSentence < 28, value: Math.round(avgSentence), target: "avg sentence < 28 words" },
    { id: "ad_safe", pass: !/casino|gambling|adult|porn|crypto pump/i.test(md), value: true, target: "No ad-restricted topics" },
  ];

  const passed = checks.filter((c) => c.pass).length;
  const score = Math.round((passed / checks.length) * 100);
  return {
    score,
    passed,
    total: checks.length,
    fails: checks.filter((c) => !c.pass),
    warnings: checks.filter((c) => c.pass && (c.id === "internal_links" && (c.value as number) < 6)),
    checks,
    metrics: { words, internalLinks, outboundRefs, faqCount, thinSections, avgSentence: Math.round(avgSentence) },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "check";

    if (action === "check" && req.method === "POST") {
      const body = await req.json();
      let post = body.post;
      if (!post && body.post_id) {
        const { data } = await blog.from("blog_posts").select("*").eq("id", body.post_id).maybeSingle();
        post = data;
      }
      if (!post) return new Response(JSON.stringify({ error: "post required" }), { status: 400, headers: cors });
      const report = analyze(post);
      if (post.id) {
        await blog.from("blog_posts").update({ adsense_score: report.score, adsense_report: report }).eq("id", post.id);
      }
      return new Response(JSON.stringify({ report }), { headers: { ...cors, "content-type": "application/json" } });
    }

    if (action === "overview") {
      const { data } = await blog.from("blog_posts")
        .select("id,slug,title,adsense_score,status,published_at")
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(100);
      const rows = data ?? [];
      const summary = {
        total: rows.length,
        avg: rows.filter(r => r.adsense_score != null).length
          ? Math.round(rows.reduce((a, r: any) => a + (r.adsense_score ?? 0), 0) / Math.max(1, rows.filter(r => r.adsense_score != null).length))
          : 0,
        below_70: rows.filter((r: any) => (r.adsense_score ?? 0) < 70).length,
      };
      return new Response(JSON.stringify({ rows, summary }), { headers: { ...cors, "content-type": "application/json" } });
    }

    if (action === "rescan_all" && req.method === "POST") {
      const { data: posts } = await blog.from("blog_posts").select("*").in("status", ["published", "in_review", "scheduled"]).limit(500);
      let n = 0;
      for (const p of posts ?? []) {
        const r = analyze(p);
        await blog.from("blog_posts").update({ adsense_score: r.score, adsense_report: r }).eq("id", p.id);
        n++;
      }
      return new Response(JSON.stringify({ rescanned: n }), { headers: { ...cors, "content-type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "unknown action" }), { status: 400, headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, "content-type": "application/json" } });
  }
});