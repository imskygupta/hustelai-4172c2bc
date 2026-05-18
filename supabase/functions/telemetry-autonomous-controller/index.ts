// Autonomous Telemetry Evacuation Controller.
//
// Triggers (any of):
//   POST /telemetry-autonomous-controller { op: "tick" }         → controller_tick + replay drain
//   POST /telemetry-autonomous-controller { op: "replay" }       → replay drain only
//   POST /telemetry-autonomous-controller { op: "recommend" }    → refresh extraction ranking
//   POST /telemetry-autonomous-controller { op: "overview" }     → admin snapshot
//
// Safe to call on a cron schedule (e.g. every minute). No auth required for the
// controller ops (service-role internal); admin ops re-check role server-side.

import { getOwned, getPrimary, getPrimaryService, ownedReady } from "../_shared/clients.ts";
import { mirrorAsyncRuntime } from "../_shared/async-runtime.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const STREAMS = ["blog_events", "cta_events", "tool_launch_events"];

async function runTick() {
  const svc = getPrimaryService();
  // 1) Decide cutover/rollback per stream (computes confidence inside)
  const { data: tick, error: tickErr } = await svc.rpc("controller_tick");
  if (tickErr) throw tickErr;

  // 2) Drain replay queue (best-effort, capped)
  const replay = await drainReplayQueue(100);

  return { ok: true, tick, replay };
}

async function drainReplayQueue(limit: number) {
  const svc = getPrimaryService();
  const ownedAvail = ownedReady();
  const sink = ownedAvail ? getOwned() : svc;

  const { data: claimed, error } = await svc.rpc("replay_engine_claim", { _limit: limit });
  if (error) return { error: error.message, processed: 0 };
  const rows = (claimed ?? []) as Array<{
    id: string; event_name: string; target_table: string; payload: any;
  }>;
  let ok = 0, fail = 0, dead = 0;

  for (const r of rows) {
    try {
      const { error: insErr } = await sink.from(r.target_table).insert(r.payload);
      if (insErr) throw insErr;
      await svc.rpc("replay_engine_complete", { _id: r.id, _ok: true, _err: null });
      ok++;
      // Wave 1: mirror replay outcome into async_runtime.replay_history
      mirrorAsyncRuntime("replay_history", {
        stream: r.event_name,
        outcome: "ok",
        attempt: 1,
        error: null,
        payload: r.payload,
      }, "replay_history");
    } catch (e) {
      const msg = (e as Error).message || String(e);
      const { data } = await svc
        .from("telemetry_replay_queue")
        .select("attempts,dead_lettered")
        .eq("id", r.id)
        .maybeSingle();
      await svc.rpc("replay_engine_complete", { _id: r.id, _ok: false, _err: msg });
      const attempts = (data as any)?.attempts ?? 1;
      if (attempts >= 8) dead++; else fail++;
      mirrorAsyncRuntime("replay_history", {
        stream: r.event_name,
        outcome: attempts >= 8 ? "dead_letter" : "fail",
        attempt: attempts,
        error: msg.slice(0, 500),
        payload: r.payload,
      }, "replay_history");
      mirrorAsyncRuntime("retry_history", {
        job_id: r.id,
        attempt: attempts,
        reason: msg.slice(0, 500),
        next_retry_at: null,
      }, "retry_history");
    }
  }
  return { processed: rows.length, ok, fail, dead };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const op = String(body?.op || "tick");

    if (op === "overview") {
      // Admin-gated via RPC has_role check
      const authed = getPrimary(req.headers.get("authorization"));
      const { data: { user } } = await authed.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ error: "auth_required" }), {
          status: 401, headers: { ...corsHeaders, "content-type": "application/json" },
        });
      }
      const svc = getPrimaryService();
      const { data, error } = await svc.rpc("autonomous_controller_overview");
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    if (op === "recommend") {
      const svc = getPrimaryService();
      const { data, error } = await svc.rpc("recommend_next_extraction", { _limit: 15 });
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, recommendations: data }), {
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    if (op === "replay") {
      const r = await drainReplayQueue(Number(body?.limit) || 100);
      return new Response(JSON.stringify(r), {
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    if (op === "compute_confidence") {
      const svc = getPrimaryService();
      const out: any[] = [];
      for (const s of STREAMS) {
        const { data } = await svc.rpc("compute_confidence", { _stream: s });
        out.push(data);
      }
      return new Response(JSON.stringify({ ok: true, confidence: out }), {
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    // default: full tick
    const r = await runTick();
    return new Response(JSON.stringify(r), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});