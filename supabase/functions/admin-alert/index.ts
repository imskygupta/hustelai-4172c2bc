// Centralized admin alerting endpoint. Frontend + edge functions call this
// to surface infra-class failures to operators (DB feed + Telegram admin chat)
// while users see only sanitized messages. Service-role insert is allowed
// from edge contexts; client calls are recorded via the user's JWT.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { dispatchToWorker, workerConfigured } from "../_shared/notifications/worker.ts";
import { mirrorToOwned } from "../_shared/ops-routing.ts";
import { getAdmin } from "../_shared/clients.ts";
import { normalizeOperationalAlert } from "../_shared/alerts/normalize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RECENT = new Map<string, number>();
const DEDUPE_MS = 30_000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    // Primary client used only to resolve user from JWT.
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    // Phase 7A.2: admin_alerts now lives on Admin DB. Zero primary writes.
    let admin;
    try { admin = getAdmin(); } catch (e: any) {
      return j({ ok: false, error: `Admin DB not configured: ${e?.message}` }, 500);
    }
    const body = await req.json().catch(() => ({}));
    const {
      kind = "client.unknown",
      severity = "warning",
      source = "client",
      user_id = null,
      feature = null,
      message = "Unspecified alert",
      meta = {},
    } = body || {};

    // Sprint D · Phase 5 — Hard normalization gate.
    // Anything not on the operator whitelist (or carrying HTML/stack frames /
    // legacy noise / empty payload) is dropped from the TG channel entirely
    // and recorded only as a structured drop-audit row.
    const norm = normalizeOperationalAlert({
      kind, severity, source, user_id, feature, message, meta,
      artifact_id: body.artifact_id, export_id: body.export_id,
      retry_count: body.retry_count, failure_reason: body.failure_reason,
      pipeline_stage: body.pipeline_stage,
    });
    if (!norm.alert) {
      // Best-effort audit write; never fail the request on it.
      try {
        await admin.from("admin_alerts_dropped").insert({
          original_kind: norm.audit.original_kind,
          original_message: norm.audit.original_message,
          reason: norm.audit.reason,
          source, feature, user_id,
        });
      } catch { /* table may not exist yet — silent */ }
      return j({ ok: true, dropped: norm.dropped_reason });
    }

    // Normalizer has already produced operator-grade fields.
    const effectiveSeverity = norm.alert.severity;
    const structuredMeta = norm.alert.meta;
    const normalizedKind = norm.alert.kind;
    const normalizedMessage = norm.alert.message;
    const normalizedFeature = norm.alert.feature;

    // Resolve user id from JWT if not explicitly provided
    let resolvedUser = norm.alert.user_id;
    if (!resolvedUser) {
      const auth = req.headers.get("Authorization") || "";
      if (auth.startsWith("Bearer ")) {
        const { data } = await sb.auth.getUser(auth.slice(7));
        resolvedUser = data?.user?.id || null;
      }
    }

    // Dedupe identical alerts within 30s
    const key = `${normalizedKind}::${resolvedUser || "anon"}::${normalizedMessage.slice(0, 80)}`;
    const now = Date.now();
    const last = RECENT.get(key) || 0;
    if (now - last < DEDUPE_MS) return j({ ok: true, deduped: true });
    RECENT.set(key, now);
    if (RECENT.size > 500) {
      // simple TTL prune
      for (const [k, t] of RECENT) if (now - t > DEDUPE_MS * 4) RECENT.delete(k);
    }

    const insertRow = {
      kind: normalizedKind, severity: effectiveSeverity, source: norm.alert.source,
      user_id: resolvedUser,
      feature: normalizedFeature,
      message: normalizedMessage,
      meta: structuredMeta,
    };
    const { data: row, error } = await admin.from("admin_alerts").insert(insertRow).select("id").single();
    if (error) return j({ ok: false, error: error.message }, 500);
    mirrorToOwned("admin_alerts", insertRow);

    // Forward error/critical to the external Telegram worker (Railway).
    if (workerConfigured() && (effectiveSeverity === "error" || effectiveSeverity === "critical")) {
      const sevIcon = effectiveSeverity === "critical" ? "🚨" : "⚠️";
      const text = [
        `${sevIcon} <b>${escape(normalizedKind)}</b>`,
        escape(normalizedMessage),
        normalizedFeature ? `Feature: <code>${escape(normalizedFeature)}</code>` : null,
        resolvedUser ? `User: <code>${escape(resolvedUser)}</code>` : null,
        structuredMeta?.context ? `Context: <code>${escape(String(structuredMeta.context))}</code>` : null,
        structuredMeta?.pipeline_stage ? `Stage: <code>${escape(String(structuredMeta.pipeline_stage))}</code>` : null,
        structuredMeta?.artifact_id ? `Artifact: <code>${escape(String(structuredMeta.artifact_id))}</code>` : null,
        structuredMeta?.export_id ? `Export: <code>${escape(String(structuredMeta.export_id))}</code>` : null,
        structuredMeta?.retry_count != null ? `Retries: <code>${escape(String(structuredMeta.retry_count))}</code>` : null,
        structuredMeta?.failure_reason ? `Reason: <code>${escape(String(structuredMeta.failure_reason).slice(0, 200))}</code>` : null,
        structuredMeta?.raw ? `Raw: <code>${escape(String(structuredMeta.raw).slice(0, 200))}</code>` : null,
      ].filter(Boolean).join("\n");
      const r = await dispatchToWorker({
        bot: "hustleai",
        message: text,
        kind: normalizedKind,
        severity: effectiveSeverity,
        source: norm.alert.source,
        user_id: resolvedUser,
        feature: normalizedFeature,
        meta: structuredMeta,
        force_telegram: true,
        dedupe_key: `admin-alert:${normalizedKind}:${(resolvedUser || "anon")}:${normalizedMessage.slice(0, 80)}`,
      });
      if (r.ok) {
        await admin.from("admin_alerts").update({ telegram_sent: true }).eq("id", row.id);
      }
    }

    return j({ ok: true, id: row?.id });
  } catch (e: any) {
    return j({ ok: false, error: String(e?.message || e) }, 500);
  }
});

function j(b: any, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function escape(s: string) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
