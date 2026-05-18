// Infrastructure probe — admin-only read-only diagnostic aggregator.
//
// For each registered Supabase project: ping reachability + latency.
// For each Railway service: GET health_url.
// Compute telegram delivery success % (24h).
// Persist a fresh infra_runtime_health sample per project.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function isAdmin(authHeader: string | null): Promise<{ ok: boolean; sb: any }> {
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  if (!authHeader?.startsWith("Bearer ")) return { ok: false, sb: null };
  const sb = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: claims } = await sb.auth.getClaims(authHeader.slice(7));
  const uid = claims?.claims?.sub as string | undefined;
  if (!uid) return { ok: false, sb: null };
  const svc = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data } = await svc.rpc("has_role", { _user_id: uid, _role: "admin" });
  return { ok: data === true, sb: svc };
}

async function pingSupabase(project_url: string | null): Promise<{ reachable: boolean; latency_ms: number; error: string | null }> {
  if (!project_url || project_url.startsWith("TBD") || project_url === "") {
    return { reachable: false, latency_ms: 0, error: "no_url" };
  }
  const t0 = Date.now();
  try {
    const r = await fetch(`${project_url}/auth/v1/health`, {
      method: "GET",
      headers: { apikey: "anon-probe" },
      signal: AbortSignal.timeout(5000),
    });
    return { reachable: r.status < 500, latency_ms: Date.now() - t0, error: r.status >= 500 ? `http_${r.status}` : null };
  } catch (e) {
    return { reachable: false, latency_ms: Date.now() - t0, error: (e as Error).message };
  }
}

async function pingRailway(domain: string | null, health_path: string | null) {
  if (!domain || !health_path) return { ok: false, error: "no_health_url", latency_ms: 0 };
  const url = domain.startsWith("http") ? `${domain}${health_path}` : `https://${domain}${health_path}`;
  const t0 = Date.now();
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return { ok: r.ok, latency_ms: Date.now() - t0, error: r.ok ? null : `http_${r.status}` };
  } catch (e) {
    return { ok: false, latency_ms: Date.now() - t0, error: (e as Error).message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { ok, sb } = await isAdmin(req.headers.get("Authorization"));
    if (!ok) return j({ error: "admin only" }, 403);

    const { data: projects } = await sb.from("infra_supabase_projects").select("id, name, project_ref, project_url, is_active");
    const supabase_results: any[] = [];
    for (const p of projects ?? []) {
      const ping = await pingSupabase(p.project_url);
      supabase_results.push({ project_ref: p.project_ref, name: p.name, ...ping });
      await sb.from("infra_runtime_health").insert({
        project_ref: p.project_ref,
        reachable: ping.reachable,
        latency_ms: ping.latency_ms,
        recent_errors: ping.error ? [{ at: new Date().toISOString(), error: ping.error }] : [],
      });
    }

    const { data: railway } = await sb.from("infra_railway_services").select("id, service_name, domain, health_url");
    const railway_results: any[] = [];
    for (const r of railway ?? []) {
      const ping = await pingRailway(r.domain, r.health_url);
      railway_results.push({ service_name: r.service_name, ...ping });
      await sb.from("infra_railway_services").update({
        last_seen_at: ping.ok ? new Date().toISOString() : undefined,
        status: ping.ok ? "healthy" : "unreachable",
      }).eq("id", r.id);
    }

    // Telegram delivery % 24h
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: tg } = await sb
      .from("notification_deliveries")
      .select("status")
      .eq("provider", "telegram")
      .gte("created_at", since);
    const total = (tg ?? []).length;
    const sent = (tg ?? []).filter((x: any) => x.status === "sent").length;
    const pct = total > 0 ? Math.round((sent / total) * 10000) / 100 : null;
    if (pct !== null) {
      await sb.from("infra_telegram_registry").update({ delivery_success_pct_24h: pct }).eq("routing_role", "admin");
    }

    return j({
      ok: true,
      generated_at: new Date().toISOString(),
      supabase: supabase_results,
      railway: railway_results,
      telegram: { total_24h: total, sent_24h: sent, success_pct_24h: pct },
    });
  } catch (e) {
    return j({ error: (e as Error).message }, 500);
  }
});

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}