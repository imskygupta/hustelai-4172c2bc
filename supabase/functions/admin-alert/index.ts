// Centralized admin alerting endpoint. Frontend + edge functions call this
// to surface infra-class failures to operators (DB feed + Telegram admin chat)
// while users see only sanitized messages. Service-role insert is allowed
// from edge contexts; client calls are recorded via the user's JWT.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { dispatchToWorker, workerConfigured } from "../_shared/notifications/worker.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RECENT = new Map<string, number>();
const DEDUPE_MS = 30_000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
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

    // Resolve user id from JWT if not explicitly provided
    let resolvedUser = user_id;
    if (!resolvedUser) {
      const auth = req.headers.get("Authorization") || "";
      if (auth.startsWith("Bearer ")) {
        const { data } = await sb.auth.getUser(auth.slice(7));
        resolvedUser = data?.user?.id || null;
      }
    }

    // Dedupe identical alerts within 30s
    const key = `${kind}::${resolvedUser || "anon"}::${(message || "").slice(0, 80)}`;
    const now = Date.now();
    const last = RECENT.get(key) || 0;
    if (now - last < DEDUPE_MS) return j({ ok: true, deduped: true });
    RECENT.set(key, now);
    if (RECENT.size > 500) {
      // simple TTL prune
      for (const [k, t] of RECENT) if (now - t > DEDUPE_MS * 4) RECENT.delete(k);
    }

    const { data: row, error } = await sb.from("admin_alerts").insert({
      kind, severity, source,
      user_id: resolvedUser,
      feature,
      message: String(message).slice(0, 500),
      meta,
    }).select("id").single();
    if (error) return j({ ok: false, error: error.message }, 500);

    // Forward error/critical to the external Telegram worker (Railway).
    if (workerConfigured() && (severity === "error" || severity === "critical")) {
      const sevIcon = severity === "critical" ? "🚨" : "⚠️";
      const text = [
        `${sevIcon} <b>${escape(kind)}</b>`,
        escape(message),
        feature ? `Feature: <code>${escape(feature)}</code>` : null,
        resolvedUser ? `User: <code>${escape(resolvedUser)}</code>` : null,
        meta?.context ? `Context: <code>${escape(String(meta.context))}</code>` : null,
        meta?.raw ? `Raw: <code>${escape(String(meta.raw).slice(0, 200))}</code>` : null,
      ].filter(Boolean).join("\n");
      const r = await dispatchToWorker({
        bot: "hustleai",
        message: text,
        kind,
        severity,
        source,
        user_id: resolvedUser,
        feature,
        meta,
        force_telegram: true,
        dedupe_key: `admin-alert:${kind}:${(resolvedUser || "anon")}:${String(message).slice(0, 80)}`,
      });
      if (r.ok) {
        await sb.from("admin_alerts").update({ telegram_sent: true }).eq("id", row.id);
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
