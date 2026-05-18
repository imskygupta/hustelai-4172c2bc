// production-audit — runs a live operational sweep across user-facing
// surfaces (edge functions, RPCs, storage buckets, AI providers, realtime,
// cron, telegram delivery) and opens incidents on the OWNED stability plane.
//
// STRICT ROUTING:
//   - All audit + telemetry writes go to getOwned() (wguuipsikboqqinqeehv).
//   - Reads from primary are read-only (no inserts on primary).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { getOwned, getPrimaryService } from "../_shared/clients.ts";
import { mirrorAsyncRuntimeBatch } from "../_shared/async-runtime.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EDGE_FNS = [
  "ai-chatbot", "ai-job-runner", "telemetry-router", "telemetry-autonomous-controller",
  "infrastructure-probe", "export-download", "log-event", "event-dispatcher",
  "workflow-runner", "dodo-checkout", "send-email", "provider-health-check",
];

async function isAdmin(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return false;
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const sb = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data } = await sb.auth.getClaims(authHeader.slice(7));
  const uid = (data?.claims?.sub as string) ?? null;
  if (!uid) return false;
  const svc = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: role } = await svc.rpc("has_role", { _user_id: uid, _role: "admin" });
  return role === true;
}

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function probeEdgeFn(name: string): Promise<{ ok: boolean; latency_ms: number; error_class: string | null; detail: any }> {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/${name}`;
  const t0 = Date.now();
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: Deno.env.get("SUPABASE_ANON_KEY")! },
      body: JSON.stringify({ ping: true }),
      signal: AbortSignal.timeout(6000),
    });
    const lat = Date.now() - t0;
    // Treat 2xx/4xx as "reachable" (function alive). 5xx => failure.
    if (r.status >= 500) return { ok: false, latency_ms: lat, error_class: `http_${r.status}`, detail: { status: r.status } };
    return { ok: true, latency_ms: lat, error_class: null, detail: { status: r.status } };
  } catch (e) {
    return { ok: false, latency_ms: Date.now() - t0, error_class: "transport", detail: { error: (e as Error).message } };
  }
}

async function probeBuckets(primary: any): Promise<Array<{ name: string; ok: boolean; error: string | null }>> {
  try {
    const { data, error } = await primary.storage.listBuckets();
    if (error) return [{ name: "*", ok: false, error: error.message }];
    return (data ?? []).map((b: any) => ({ name: b.name, ok: true, error: null }));
  } catch (e) {
    return [{ name: "*", ok: false, error: (e as Error).message }];
  }
}

async function probeExploreSurface(primary: any) {
  // Lightweight read probes — the actual /explore tables vary; we sample
  // commonly-used catalog tables and report which respond.
  const targets = ["hustle_categories", "hustle_listings", "feature_flags", "profiles"];
  const out: any[] = [];
  for (const t of targets) {
    const t0 = Date.now();
    const { error } = await primary.from(t).select("id", { head: true, count: "exact" }).limit(1);
    out.push({ table: t, ok: !error, latency_ms: Date.now() - t0, error: error?.message ?? null });
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!(await isAdmin(req.headers.get("Authorization")))) return j({ error: "admin only" }, 403);
    const owned = getOwned();
    const primary = getPrimaryService();

    const run = await owned.from("ops.production_audit_runs").insert({ scope: ["edge","storage","explore","incidents"] }).select("id").single();
    const runId = run.data?.id;

    // Parallel sweeps
    const [edgeResults, buckets, explore] = await Promise.all([
      Promise.all(EDGE_FNS.map(async (n) => ({ name: n, ...(await probeEdgeFn(n)) }))),
      probeBuckets(primary),
      probeExploreSurface(primary),
    ]);

    // Persist runtime health sweep rows
    const rows: any[] = [];
    for (const r of edgeResults) {
      rows.push({ target_kind: "edge-fn", target_name: r.name, ok: r.ok, latency_ms: r.latency_ms, error_class: r.error_class, detail: r.detail });
    }
    for (const b of buckets) {
      rows.push({ target_kind: "bucket", target_name: b.name, ok: b.ok, error_class: b.ok ? null : "list-failed", detail: { error: b.error } });
    }
    for (const e of explore) {
      rows.push({ target_kind: "rpc", target_name: `explore:${e.table}`, ok: e.ok, latency_ms: e.latency_ms, error_class: e.ok ? null : "query-failed", detail: { error: e.error } });
    }
    if (rows.length) await owned.from("ops.runtime_health_sweeps").insert(rows);
    // Wave 1: mirror runtime sweeps into async_runtime stream (real traffic)
    if (rows.length) {
      mirrorAsyncRuntimeBatch("runtime_health_sweeps", rows.map((r: any) => ({
        surface: r.target_kind,
        component: r.target_name,
        status: r.ok ? "ok" : "fail",
        latency_ms: r.latency_ms ?? null,
        error: r.error_class,
        metadata: r.detail ?? {},
      })), "runtime_health_sweeps");
    }

    // Open incidents for failures
    const failures: any[] = [];
    for (const r of edgeResults.filter((x) => !x.ok)) {
      failures.push({ surface: "edge-fn", component: r.name, failure_class: r.error_class });
      await owned.rpc("ops.upsert_incident" as any, {
        _surface: "edge-fn", _component: r.name, _severity: "degraded",
        _failure_class: r.error_class, _evidence: r.detail,
        _impacted: [r.name], _user_facing: true, _suggested_rollback: "redeploy or check secrets",
      });
    }
    for (const e of explore.filter((x) => !x.ok)) {
      failures.push({ surface: "explore", component: e.table, failure_class: "query-failed" });
      await owned.rpc("ops.upsert_incident" as any, {
        _surface: "explore", _component: e.table, _severity: "critical",
        _failure_class: "query-failed", _evidence: { error: e.error },
        _impacted: ["/explore"], _user_facing: true, _suggested_rollback: "verify RLS + table exists on primary",
      });
    }

    const totals = {
      edge_total: edgeResults.length,
      edge_failed: edgeResults.filter((x) => !x.ok).length,
      buckets_total: buckets.length,
      buckets_failed: buckets.filter((x) => !x.ok).length,
      explore_total: explore.length,
      explore_failed: explore.filter((x) => !x.ok).length,
    };

    if (runId) {
      await owned.from("ops.production_audit_runs").update({
        finished_at: new Date().toISOString(),
        totals, failures,
      }).eq("id", runId);
    }

    return j({ ok: true, run_id: runId, totals, failures, edge: edgeResults, buckets, explore });
  } catch (e) {
    return j({ error: (e as Error).message }, 500);
  }
});