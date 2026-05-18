// Blog automation audit.
//
// GET → returns posting health for the blogs.hustlaiapp.in autonomous system
//       (blogs Supabase, blog-scheduler edge function, sitemap, providers).
// POST { snapshot:true } → records a blog_automation_health_snapshots row.
//
// Read-only against the BLOG project (uses BLOG_SUPABASE_URL/SERVICE_ROLE).
// Writes snapshots to PRIMARY (admin-readable).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { getPrimaryService } from "../_shared/clients.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function blogClient() {
  const url = Deno.env.get("BLOG_SUPABASE_URL");
  const key = Deno.env.get("BLOG_SUPABASE_SERVICE_ROLE");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function startOfDay() {
  const d = new Date(); d.setUTCHours(0,0,0,0); return d.toISOString();
}

async function audit() {
  const result: Record<string, unknown> = {
    sampled_at: new Date().toISOString(),
    blog_db_reachable: false,
    scheduler_endpoint_ok: false,
  };

  const blog = blogClient();
  if (!blog) {
    result.error = "BLOG_SUPABASE_URL/SERVICE_ROLE not configured";
    return result;
  }

  try {
    const today = startOfDay();
    const since24 = new Date(Date.now() - 24*3600_000).toISOString();

    const [inReview, scheduled, publishedToday, inFlight, failed24, lastPub, nextSched] = await Promise.all([
      blog.from("blog_posts").select("id", { count: "exact", head: true }).eq("status","in_review"),
      blog.from("blog_posts").select("id", { count: "exact", head: true }).eq("status","scheduled"),
      blog.from("blog_posts").select("id", { count: "exact", head: true }).eq("status","published").gte("published_at", today),
      blog.from("blog_ai_drafts").select("id", { count: "exact", head: true }).in("status",["generating","ready"]),
      blog.from("blog_ai_drafts").select("id", { count: "exact", head: true }).eq("status","failed").gte("created_at", since24),
      blog.from("blog_posts").select("published_at,slug,title").eq("status","published").order("published_at",{ascending:false}).limit(1).maybeSingle(),
      blog.from("blog_posts").select("scheduled_at,slug,title").eq("status","scheduled").order("scheduled_at",{ascending:true}).limit(1).maybeSingle(),
    ]);

    result.blog_db_reachable = true;
    result.in_review = inReview.count ?? 0;
    result.scheduled = scheduled.count ?? 0;
    result.published_today = publishedToday.count ?? 0;
    result.drafts_in_flight = inFlight.count ?? 0;
    result.failed_drafts_24h = failed24.count ?? 0;
    result.last_published_at = lastPub.data?.published_at ?? null;
    result.last_published_slug = lastPub.data?.slug ?? null;
    result.next_scheduled_at = nextSched.data?.scheduled_at ?? null;
    result.next_scheduled_slug = nextSched.data?.slug ?? null;

    // Throughput: published in last 7 days
    const since7 = new Date(Date.now() - 7*24*3600_000).toISOString();
    const { count: published7d } = await blog.from("blog_posts")
      .select("id",{count:"exact",head:true}).eq("status","published").gte("published_at", since7);
    result.published_7d = published7d ?? 0;

    // Provider error sample (if a provider_log table exists; tolerate missing)
    try {
      const { count: provErrors } = await blog.from("blog_provider_errors")
        .select("id",{count:"exact",head:true}).gte("created_at", since24);
      result.provider_errors_24h = provErrors ?? 0;
    } catch { result.provider_errors_24h = 0; }
  } catch (e) {
    result.blog_db_error = (e as Error).message;
  }

  // Ping scheduler health (GET, returns stats per scheduler code)
  try {
    const schedUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/blog-scheduler`;
    const t0 = Date.now();
    const r = await fetch(schedUrl, {
      headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` },
    });
    result.scheduler_endpoint_ok = r.ok;
    result.scheduler_latency_ms = Date.now() - t0;
    if (r.ok) {
      try { result.scheduler_stats = await r.json(); } catch { /* ignore */ }
    }
  } catch (e) {
    result.scheduler_error = (e as Error).message;
  }

  // Sitemap check
  try {
    const t0 = Date.now();
    const r = await fetch("https://blogs.hustlaiapp.in/sitemap.xml", { method: "HEAD" });
    result.sitemap_ok = r.ok;
    result.sitemap_latency_ms = Date.now() - t0;
    result.sitemap_last_modified = r.headers.get("last-modified");
  } catch (e) {
    result.sitemap_error = (e as Error).message;
  }

  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.method === "GET") {
    try {
      const data = await audit();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: (e as Error).message }), {
        status: 500, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
  }

  if (req.method === "POST") {
    try {
      const body = await req.json().catch(() => ({}));
      if (body?.snapshot) {
        const data = await audit() as any;
        const primary = getPrimaryService();
        await primary.from("blog_automation_health_snapshots").insert({
          in_review: data.in_review ?? 0,
          scheduled: data.scheduled ?? 0,
          published_today: data.published_today ?? 0,
          drafts_in_flight: data.drafts_in_flight ?? 0,
          last_published_at: data.last_published_at ?? null,
          next_scheduled_at: data.next_scheduled_at ?? null,
          failed_drafts_24h: data.failed_drafts_24h ?? 0,
          sitemap_last_pinged_at: data.sitemap_ok ? new Date().toISOString() : null,
          scheduler_last_run_at: data.scheduler_endpoint_ok ? new Date().toISOString() : null,
          provider_errors_24h: data.provider_errors_24h ?? 0,
          details: data,
        });
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "no_op" }), {
        status: 400, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: (e as Error).message }), {
        status: 500, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
  }

  return new Response("method_not_allowed", { status: 405, headers: corsHeaders });
});