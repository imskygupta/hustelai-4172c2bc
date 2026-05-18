// infra-discovery-scan — admin-only auto-discovery of orphaned/unknown infra refs.
// Reads several signals from DB and persists findings into infra_discovery_findings.
// Filesystem scan is intentionally NOT performed here (edge runtime) — that's done
// from a separate developer script. This function focuses on runtime signals.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function isAdmin(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return { ok: false, sb: null as any };
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const sb = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: claims } = await sb.auth.getClaims(authHeader.slice(7));
  const uid = claims?.claims?.sub as string | undefined;
  if (!uid) return { ok: false, sb: null as any };
  const svc = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data } = await svc.rpc("has_role", { _user_id: uid, _role: "admin" });
  return { ok: data === true, sb: svc };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { ok, sb } = await isAdmin(req.headers.get("Authorization"));
    if (!ok) return j({ error: "admin only" }, 403);

    const findings: Array<{ kind: string; identifier: string; confidence: number; metadata?: any; notes?: string }> = [];

    // 1. Inactive bots — no admin_alerts in 7d for the bot
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: bots } = await sb.from("telegram_bots").select("id,username,role,enabled");
    for (const b of bots ?? []) {
      const { count } = await sb
        .from("admin_alerts")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since)
        .filter("meta->>bot", "ilike", `%${b.username || ""}%`);
      if ((count || 0) === 0 && b.enabled) {
        findings.push({
          kind: "inactive_bot",
          identifier: `bot:${b.username || b.id}`,
          confidence: 70,
          notes: "No admin_alerts activity in last 7d",
        });
      }
    }

    // 2. Orphan edge functions — listed as alert source but no entry in infra_dependencies
    const { data: srcs } = await sb
      .from("admin_alerts")
      .select("source")
      .gte("created_at", since)
      .not("source", "is", null)
      .limit(1000);
    const seenSources = new Set<string>((srcs || []).map((r: any) => (r.source || "").split(":")[0]).filter(Boolean));
    const { data: knownDeps } = await sb.from("infra_dependencies").select("source_name");
    const known = new Set((knownDeps || []).map((d: any) => d.source_name));
    for (const s of seenSources) {
      if (!known.has(s)) {
        findings.push({
          kind: "unregistered_source",
          identifier: `source:${s}`,
          confidence: 60,
          notes: "Producing alerts but not registered in infra_dependencies",
        });
      }
    }

    // 3. Stale recipient — enabled, never received alert (no easy join, just flag deprecated=false + muted_until past)
    const { data: recips } = await sb
      .from("ops_telegram_recipients")
      .select("chat_id,label,enabled,deprecated,muted_until,created_at")
      .eq("enabled", true);
    for (const r of recips ?? []) {
      if (r.muted_until && new Date(r.muted_until).getTime() < Date.now() - 30 * 86400000) {
        findings.push({
          kind: "stale_recipient",
          identifier: `recipient:${r.chat_id}`,
          confidence: 50,
          notes: `Muted >30d ago (${r.muted_until})`,
        });
      }
    }

    // Upsert
    for (const f of findings) {
      await sb.from("infra_discovery_findings").upsert(
        {
          kind: f.kind,
          identifier: f.identifier,
          confidence: f.confidence,
          last_seen_at: new Date().toISOString(),
          notes: f.notes,
          metadata: f.metadata || {},
        },
        { onConflict: "kind,identifier" },
      );
    }

    // Snapshot extraction-readiness for each project
    const { data: projects } = await sb
      .from("infra_supabase_projects")
      .select("project_ref,lovable_dependency_score,extraction_readiness,est_daily_writes,est_storage_mb,criticality");
    for (const p of projects ?? []) {
      const { count } = await sb
        .from("infra_dependencies")
        .select("id", { count: "exact", head: true })
        .eq("target_project_ref", p.project_ref);
      await sb.from("infra_extraction_snapshots").insert({
        project_ref: p.project_ref,
        dependency_count: count || 0,
        lovable_dependency_score: p.lovable_dependency_score,
        extraction_readiness: p.extraction_readiness,
        est_daily_writes: p.est_daily_writes,
        est_storage_mb: p.est_storage_mb,
        criticality: p.criticality,
      });
    }

    return j({ ok: true, findings_count: findings.length, generated_at: new Date().toISOString() });
  } catch (e) {
    return j({ error: (e as Error).message }, 500);
  }
});

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}