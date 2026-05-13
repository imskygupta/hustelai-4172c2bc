// Authority Batch Generator — kicks off N high-quality narrative runs,
// staggered, balanced across clusters, deduped, tool-matched, AdSense-scored.
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

const FN_BASE = `${Deno.env.get("BLOG_SUPABASE_URL")}/functions/v1`;
const SR = Deno.env.get("BLOG_SUPABASE_SERVICE_ROLE")!;

const CLUSTER_TOPICS: Record<string, string[]> = {
  "freelancer-operations": [
    "How to run weekly freelancer ops in 90 minutes",
    "Freelancer revenue stack: pipeline, retainers, productized offers",
    "The async freelancer week: a working template",
  ],
  "async-workflows": [
    "Designing async client updates that don't need meetings",
    "Status digest format for async client communication",
    "When to break async and run a 20-minute call",
  ],
  "client-delivery": [
    "Client delivery cadences for solo operators",
    "How to deliver design and dev work over Telegram cleanly",
    "Delivery debriefs that turn one project into three",
  ],
  "proposal-systems": [
    "Proposal close rate playbook for solo freelancers",
    "Modular proposals: rebuild once, ship in minutes",
    "Pricing anchors and tier framing inside proposals",
  ],
  "crm-automation": [
    "Lightweight CRM for freelancers without HubSpot",
    "Renewal motion: quarterly retainer recap that closes itself",
    "Lead pipeline stages that map to real freelancer reality",
  ],
  "solo-agency-systems": [
    "Solo agency operating model: roles you play in a week",
    "Productizing your solo agency without losing custom work",
    "Subcontractor stack for solo agencies that scale carefully",
  ],
  "ai-operations": [
    "AI for client work: where it speeds you up vs slows you down",
    "Prompt libraries for repeat freelancer tasks",
    "AI exports that survive client review",
  ],
  "telegram-workflows": [
    "Telegram delivery system for client work updates",
    "Telegram bots that replace status meetings",
    "Async approvals over Telegram without losing audit trail",
  ],
  "workflow-templates": [
    "Workflow templates worth building once and reusing forever",
    "Mapping client engagements to reusable workflow blocks",
    "Versioning your workflow templates as you scale",
  ],
  "operational-sops": [
    "SOPs every freelance operator should write down",
    "Discovery → kickoff → delivery SOP, written for solo operators",
    "SOP review cadence: how to keep your playbooks alive",
  ],
};

const DEFAULT_CLUSTERS = Object.keys(CLUSTER_TOPICS);

function pickTopic(cluster: string, used: Set<string>): string | null {
  const pool = CLUSTER_TOPICS[cluster] ?? [];
  for (const t of pool) if (!used.has(t)) return t;
  return pool[0] ?? null;
}

async function callJson(path: string, body?: any, method = "POST") {
  const r = await fetch(`${FN_BASE}${path}`, {
    method,
    headers: { "content-type": "application/json", apikey: SR, authorization: `Bearer ${SR}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  try { return JSON.parse(text); } catch { return { ok: r.ok, raw: text, status: r.status }; }
}

function clusterToCategorySlug(cluster: string): string {
  const map: Record<string, string> = {
    "freelancer-operations": "freelancer-workflows",
    "async-workflows": "async-operations",
    "client-delivery": "client-systems",
    "proposal-systems": "client-systems",
    "crm-automation": "client-systems",
    "solo-agency-systems": "freelancer-workflows",
    "ai-operations": "ai-operations",
    "telegram-workflows": "telegram-delivery",
    "workflow-templates": "freelancer-workflows",
    "operational-sops": "operational-systems",
  };
  return map[cluster] ?? "freelancer-workflows";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "list";

    if (action === "list") {
      const { data } = await blog.from("authority_batches").select("*").order("created_at", { ascending: false }).limit(20);
      return new Response(JSON.stringify({ batches: data ?? [] }), { headers: { ...cors, "content-type": "application/json" } });
    }

    if (action === "get") {
      const id = url.searchParams.get("id");
      const { data } = await blog.from("authority_batches").select("*").eq("id", id).maybeSingle();
      return new Response(JSON.stringify({ batch: data }), { headers: { ...cors, "content-type": "application/json" } });
    }

    if (action === "start" && req.method === "POST") {
      const body = await req.json();
      const count = Math.min(30, Math.max(1, Number(body.count ?? 20)));
      const stagger_hours = Number(body.stagger_hours ?? 6);
      const clusters: string[] = (body.clusters?.length ? body.clusters : DEFAULT_CLUSTERS) as string[];
      const auto_publish = body.auto_publish === true;
      const min_score = Number(body.min_adsense_score ?? 70);

      // Existing recent titles for dedup
      const { data: recent } = await blog.from("blog_posts")
        .select("title,focus_keyword,published_at")
        .gte("created_at", new Date(Date.now() - 60 * 86400000).toISOString())
        .limit(500);
      const recentSet = new Set((recent ?? []).map((r: any) => (r.title ?? "").toLowerCase()));

      const { data: batchRow } = await blog.from("authority_batches").insert({
        count, clusters, stagger_hours, status: "running",
      }).select().single();
      const batch_id = batchRow!.id as string;

      const used = new Set<string>();
      const results: any[] = [];
      let firstScheduled: string | null = null;
      let lastScheduled: string | null = null;

      // Spread requested count across selected clusters round-robin
      const plan: { cluster: string; topic: string }[] = [];
      let i = 0;
      while (plan.length < count) {
        const cluster = clusters[i % clusters.length];
        const topic = pickTopic(cluster, used);
        if (!topic) { i++; if (i > count * 4) break; continue; }
        if (recentSet.has(topic.toLowerCase())) { used.add(topic); i++; continue; }
        used.add(topic);
        plan.push({ cluster, topic });
        i++;
      }

      // Process serially to avoid AI rate limits; schedule staggered times.
      const baseTs = Date.now() + 30 * 60 * 1000; // first publish 30 min from now
      for (let idx = 0; idx < plan.length; idx++) {
        const { cluster, topic } = plan[idx];
        const scheduledAt = new Date(baseTs + idx * stagger_hours * 3600_000).toISOString();
        if (idx === 0) firstScheduled = scheduledAt;
        lastScheduled = scheduledAt;

        try {
          // 1. Generate (do not auto-publish from generator; we'll set scheduled status below)
          const gen = await callJson(`/narrative-generate?action=generate`, {
            topic,
            angle: `${cluster} — operational systems for working freelancers`,
            keyword: topic,
            auto_publish: false,
          });
          if (!gen?.post_id) {
            results.push({ topic, cluster, ok: false, error: gen?.error ?? gen?.skipped ?? "no_post" });
            await blog.from("authority_batches").update({ results }).eq("id", batch_id);
            continue;
          }

          // 2. Tool-match
          const match = await callJson(`/tool-matcher?action=match`, {
            post_id: gen.post_id,
            cluster: clusterToCategorySlug(cluster),
            mode: "auto",
          });

          // 3. AdSense readiness
          const ready = await callJson(`/adsense-readiness?action=check`, { post_id: gen.post_id });
          const score = ready?.report?.score ?? 0;

          // 4. Schedule (or hold if score too low and auto_publish requested)
          const targetStatus = score >= min_score && auto_publish ? "scheduled" : "in_review";
          await blog.from("blog_posts").update({
            status: targetStatus,
            scheduled_at: targetStatus === "scheduled" ? scheduledAt : null,
            batch_id,
          }).eq("id", gen.post_id);

          results.push({
            topic, cluster, ok: true, post_id: gen.post_id, slug: gen.slug,
            score, scheduled_at: targetStatus === "scheduled" ? scheduledAt : null,
            tools: match?.matches?.tools?.map((t: any) => t.slug) ?? [],
            template: match?.matches?.template?.slug ?? null,
            status: targetStatus,
          });
          await blog.from("authority_batches").update({ results }).eq("id", batch_id);
        } catch (e) {
          results.push({ topic, cluster, ok: false, error: String(e) });
          await blog.from("authority_batches").update({ results }).eq("id", batch_id);
        }
      }

      await blog.from("authority_batches").update({
        status: "succeeded",
        scheduled_first_at: firstScheduled,
        scheduled_last_at: lastScheduled,
        finished_at: new Date().toISOString(),
        results,
      }).eq("id", batch_id);

      return new Response(JSON.stringify({ batch_id, results, scheduled_first_at: firstScheduled, scheduled_last_at: lastScheduled }), {
        headers: { ...cors, "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "unknown action" }), { status: 400, headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, "content-type": "application/json" } });
  }
});