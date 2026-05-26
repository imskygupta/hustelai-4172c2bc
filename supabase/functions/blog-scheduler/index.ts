import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * Editorial publishing orchestrator.
 *
 * GET  → returns queue stats (drafts in review, scheduled, published-today).
 * POST → runs one orchestration tick:
 *   1. Promotes ready `in_review` AI drafts to `scheduled` (staggered, max/day cap).
 *   2. Publishes any `scheduled` post whose `scheduled_at <= now()`.
 *   3. Optionally generates new drafts from the topic bank up to a daily target.
 *   4. Pings Google + Bing sitemaps so freshly published posts are crawled fast.
 *
 * Designed to be invoked hourly by pg_cron, or manually from BlogAdmin.
 */

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const blog = createClient(
  Deno.env.get("BLOG_SUPABASE_URL")!,
  Deno.env.get("BLOG_SUPABASE_SERVICE_ROLE")!,
);

const SITEMAP = "https://blogs.hustlaiapp.in/sitemap.xml";
const DRAFT_FN = `${Deno.env.get("SUPABASE_URL")}/functions/v1/blog-ai-draft`;

const DEFAULT_DAILY_PUBLISH_TARGET = 2;       // calm cadence: 1–3 / day
const DEFAULT_DAILY_GENERATE_TARGET = 3;      // a small headroom over publish target
const MIN_GAP_HOURS_BETWEEN_PUBLISHES = 4;    // avoid bursty publishing

function startOfTodayIso(): string {
  const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d.toISOString();
}

async function pingSitemaps() {
  const urls = [
    `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP)}`,
    `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP)}`,
  ];
  const results = await Promise.allSettled(urls.map((u) => fetch(u, { method: "GET" })));
  return results.map((r, i) => ({ url: urls[i], ok: r.status === "fulfilled" && (r.value as Response).ok }));
}

async function getStats() {
  const today = startOfTodayIso();
  // Only count drafts started recently as "in flight". Older drafts stuck in
  // `generating` (lost to function timeouts) or sitting in `ready` after
  // already producing a post must not keep blocking new generations forever.
  const inFlightSince = new Date(Date.now() - 2 * 3600_000).toISOString();
  const [{ count: in_review }, { count: scheduled }, { count: published_today }, { count: drafts }] = await Promise.all([
    blog.from("blog_posts").select("id", { count: "exact", head: true }).eq("status", "in_review"),
    blog.from("blog_posts").select("id", { count: "exact", head: true }).eq("status", "scheduled"),
    blog.from("blog_posts").select("id", { count: "exact", head: true }).eq("status", "published").gte("published_at", today),
    blog.from("blog_ai_drafts").select("id", { count: "exact", head: true })
      .in("status", ["generating", "ready"])
      .gte("created_at", inFlightSince),
  ]);
  const { data: lastPublished } = await blog.from("blog_posts")
    .select("published_at").eq("status", "published").order("published_at", { ascending: false }).limit(1).maybeSingle();
  return {
    in_review: in_review ?? 0,
    scheduled: scheduled ?? 0,
    published_today: published_today ?? 0,
    drafts_in_flight: drafts ?? 0,
    last_published_at: lastPublished?.published_at ?? null,
  };
}

async function sweepStuckDrafts(): Promise<number> {
  // Drafts older than 2h still in `generating` are orphaned (function timed
  // out before status could be updated). Mark them failed so they stop
  // blocking the scheduler's headroom.
  const cutoff = new Date(Date.now() - 2 * 3600_000).toISOString();
  const { data } = await blog.from("blog_ai_drafts")
    .update({ status: "failed", error: "stale_generating_timeout" })
    .eq("status", "generating")
    .lt("created_at", cutoff)
    .select("id");
  return data?.length ?? 0;
}

async function publishDuePosts(): Promise<string[]> {
  const now = new Date().toISOString();
  const { data: due } = await blog.from("blog_posts")
    .select("id, slug, scheduled_at")
    .eq("status", "scheduled")
    .lte("scheduled_at", now)
    .limit(10);
  const published: string[] = [];
  for (const p of due ?? []) {
    await blog.from("blog_posts").update({ status: "published", published_at: now }).eq("id", p.id);
    published.push(p.slug);
  }
  // Fire-and-forget: hand the freshly published slugs to the unified
  // indexing-dispatcher (sitemap + link-engine + IndexNow + GSC + crawl
  // refresh + validate). Dispatcher manages retries + GSC pending_auth.
  if (published.length) {
    fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/indexing-dispatcher?action=dispatch`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ slugs: published, reason: "auto" }),
    }).catch(() => null);
  }
  return published;
}

async function promoteReadyDrafts(target: number, lastPublishedAt: string | null): Promise<string[]> {
  if (target <= 0) return [];
  const { data: ready } = await blog.from("blog_posts")
    .select("id, slug")
    .eq("status", "in_review")
    .eq("ai_generated", true)
    .order("updated_at", { ascending: true })
    .limit(target);

  const scheduled: string[] = [];
  let cursor = lastPublishedAt ? new Date(lastPublishedAt).getTime() : Date.now();
  const gap = MIN_GAP_HOURS_BETWEEN_PUBLISHES * 3600 * 1000;
  for (const p of ready ?? []) {
    cursor = Math.max(cursor + gap, Date.now() + 5 * 60 * 1000);
    const when = new Date(cursor).toISOString();
    const { error } = await blog.from("blog_posts").update({ status: "scheduled", scheduled_at: when }).eq("id", p.id);
    if (!error) scheduled.push(`${p.slug} @ ${when}`);
  }
  return scheduled;
}

async function generateDrafts(target: number, anonKey: string): Promise<{ topic: string; ok: boolean }[]> {
  if (target <= 0) return [];
  const { data: settings } = await blog.from("blog_settings").select("topic_bank").eq("id", 1).maybeSingle();
  const bank: string[] = (settings?.topic_bank as any) ?? [];
  if (!bank.length) return [];

  const picks = [...bank].sort(() => Math.random() - 0.5).slice(0, target);
  const out: { topic: string; ok: boolean }[] = [];
  const internalSecret = Deno.env.get("INTERNAL_SERVICE_SECRET") ?? "";
  for (const topic of picks) {
    try {
      const r = await fetch(DRAFT_FN, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          apikey: anonKey,
          authorization: `Bearer ${anonKey}`,
          "x-internal-secret": internalSecret,
        },
        body: JSON.stringify({ topic, auto: true }),
      });
      out.push({ topic, ok: r.ok });
    } catch {
      out.push({ topic, ok: false });
    }
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, "content-type": "application/json" } });

  try {
    if (req.method === "GET") {
      return json({ stats: await getStats() });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = !!body.dry_run;
    const publishTarget = Math.max(0, Math.min(5, body.publish_target ?? DEFAULT_DAILY_PUBLISH_TARGET));
    const generateTarget = Math.max(0, Math.min(5, body.generate_target ?? DEFAULT_DAILY_GENERATE_TARGET));

    const stats = await getStats();
    const remainingPublish = Math.max(0, publishTarget - stats.published_today - stats.scheduled);
    const remainingGenerate = Math.max(0, generateTarget - (stats.drafts_in_flight + stats.in_review));

    if (dryRun) {
      return json({ dry_run: true, stats, would_schedule: remainingPublish, would_generate: remainingGenerate });
    }

    const published = await publishDuePosts();
    const sweptDrafts = await sweepStuckDrafts();
    const scheduled = await promoteReadyDrafts(remainingPublish, stats.last_published_at);
    // Pass anon key as the surface auth token; the internal-caller bypass
    // in blog-ai-draft is keyed off the x-internal-secret header sent inside
    // generateDrafts().
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const generated = await generateDrafts(remainingGenerate, anonKey);
    const pings = published.length > 0 ? await pingSitemaps() : [];

    return json({
      stats: await getStats(),
      published,
      scheduled,
      swept_drafts: sweptDrafts,
      generated,
      pings,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});