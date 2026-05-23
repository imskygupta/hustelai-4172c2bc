import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendTelegram } from "../_shared/notifications/telegram.ts";
import { randomToken, siteOrigin, resolveDeliveryTarget } from "../_shared/exports/createExport.ts";
import { patchArtifactByExport } from "../_shared/artifacts/createArtifact.ts";
import { transitionArtifactByExport } from "../_shared/artifacts/transition.ts";
import { isFeatureEnabledServer } from "../_shared/flags/resolve.ts";
import { emitWorkflowEvent } from "../_shared/workflows/emit.ts";

const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" };
const FIFTY_MB = 50 * 1024 * 1024;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  let exportIdOuter: string | null = null;
  let userIdOuter: string | null = null;
  const sbOuter = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const sb = sbOuter;
    const { export_id } = await req.json().catch(() => ({}));
    exportIdOuter = export_id ?? null;
    if (!export_id) return j({ error: "export_id required" }, 400);
    const { data: exp } = await sb.from("generated_exports").select("*").eq("id", export_id).maybeSingle();
    if (!exp || !exp.storage_path) return j({ error: "not found" }, 404);
    userIdOuter = exp.user_id;

    // Mark sending. delivery_attempts uses a server-side increment fallback.
    {
      const { data: cur } = await sb.from("workspace_artifacts")
        .select("id, delivery_attempts").eq("ref_export_id", exp.id).maybeSingle();
      if (cur) {
        await transitionArtifactByExport(exp.id, "delivering", {
          delivery_status: "sending",
          delivery_attempts: (cur.delivery_attempts || 0) + 1,
          last_delivery_at: new Date().toISOString(),
          last_delivery_error: null,
        });
      }
    }

    // Hard gate: free tier or no connected TG = silently skip. Prevents retry
    // storms enqueueing dead TG jobs.
    const target = await resolveDeliveryTarget(sb, exp.user_id);
    if (!target.can_telegram) {
      void patchArtifactByExport(exp.id, {
        delivery_status: "skipped",
        last_delivery_error: target.telegram_connected ? "free_tier" : "no_telegram",
        last_delivery_at: new Date().toISOString(),
      });
      return j({ ok: false, reason: target.telegram_connected ? "free_tier" : "no_telegram", skipped: true });
    }

    // Runtime gate: telegram delivery can be disabled / put in maintenance.
    if (!(await isFeatureEnabledServer(exp.user_id, "telegram.notifications"))) {
      void patchArtifactByExport(exp.id, { delivery_status: "skipped", last_delivery_error: "telegram_notifications_disabled" });
      return j({ ok: false, reason: "telegram_notifications_disabled", deferred: true });
    }
    if (!(await isFeatureEnabledServer(exp.user_id, "telegram.storage"))) {
      void patchArtifactByExport(exp.id, { delivery_status: "skipped", last_delivery_error: "telegram_storage_disabled" });
      return j({ ok: false, reason: "telegram_storage_disabled", deferred: true });
    }

    const { data: integ } = await sb.from("notification_integrations")
      .select("*").eq("user_id", exp.user_id).eq("provider", "telegram").eq("status", "connected").maybeSingle();
    if (!integ?.provider_chat_id) {
      void patchArtifactByExport(exp.id, { delivery_status: "skipped", last_delivery_error: "no_telegram" });
      return j({ ok: false, reason: "no_telegram" });
    }

    // Always issue a fresh single-use share token
    const tok = randomToken(24);
    await sb.from("export_download_tokens").insert({
      export_id: exp.id, token: tok, user_id: exp.user_id,
      expires_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
      max_uses: 5, requires_otp: false,
    });
    const link = `${siteOrigin(req)}/d/${tok}`;

    let messageId: string | null = null;
    let cachedFileId: string | null = exp.telegram_file_id || null;
    const caption = `<b>${escape(exp.title)}</b>\n${escape(exp.export_type)}\n🔗 ${link}`;

    // Fast path: re-send by cached file_id (no re-upload)
    if (TG_TOKEN && cachedFileId) {
      try {
        const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendDocument`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: integ.provider_chat_id,
            document: cachedFileId,
            caption, parse_mode: "HTML",
          }),
        });
        const jr = await r.json().catch(() => ({}));
        if (jr?.ok) messageId = String(jr.result?.message_id || "");
      } catch (_e) { /* fall through */ }
    }

    // Slow path: upload from Supabase signed URL, then cache file_id
    if (!messageId && TG_TOKEN && exp.size_bytes > 0 && exp.size_bytes < FIFTY_MB) {
      try {
        const signed = await sb.storage.from(exp.storage_bucket).createSignedUrl(exp.storage_path, 60 * 5, { download: exp.title });
        const url = signed.data?.signedUrl;
        if (url) {
          const fileResp = await fetch(url);
          const blob = await fileResp.blob();
          const fd = new FormData();
          fd.append("chat_id", integ.provider_chat_id);
          fd.append("caption", caption);
          fd.append("parse_mode", "HTML");
          fd.append("document", blob, exp.title);
          const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendDocument`, { method: "POST", body: fd });
          const jr = await r.json().catch(() => ({}));
          if (jr?.ok) {
            messageId = String(jr.result?.message_id || "");
            cachedFileId = jr.result?.document?.file_id || null;
          }
        }
      } catch (_e) { /* fall through to link-only */ }
    }
    if (!messageId) {
      const r = await sendTelegram(integ.provider_chat_id, {
        title: `📦 ${exp.title}`,
        body: `Your ${exp.export_type} is ready.`,
        url: link,
      });
      messageId = r.external_message_id || null;
    }

    await sb.from("generated_exports").update({
      status: "delivered",
      telegram_chat_id: integ.provider_chat_id,
      telegram_message_id: messageId,
      telegram_file_id: cachedFileId || exp.telegram_file_id,
      delivery_method: cachedFileId ? "hybrid" : "telegram",
      delivered_at: new Date().toISOString(),
    }).eq("id", exp.id);
    // Canonical FSM transition: delivering -> delivered, mirror TG memory.
    void transitionArtifactByExport(exp.id, "delivered", {
      storage_mode: cachedFileId ? "hybrid" : "telegram",
      telegram_message_id: messageId,
      telegram_channel: integ.provider_chat_id,
      telegram_chat_id: integ.provider_chat_id,
      telegram_deep_link: link,
      status: "delivered",
      delivery_status: "delivered",
      last_delivery_at: new Date().toISOString(),
      last_delivery_error: null,
    });
    void emitWorkflowEvent(sb, "export.delivered", {
      user_id: exp.user_id, export_id: exp.id, channel: "telegram",
      title: exp.title, export_type: exp.export_type,
      telegram_chat_id: integ.provider_chat_id,
      telegram_message_id: messageId,
    }, { user_id: exp.user_id, dedupe_key: `export_deliv:${exp.id}:tg`, source: "export-deliver-telegram" });
    if (cachedFileId && cachedFileId !== exp.telegram_file_id) {
      void emitWorkflowEvent(sb, "export.telegram_uploaded", {
        user_id: exp.user_id, export_id: exp.id, telegram_file_id: cachedFileId,
      }, { user_id: exp.user_id, dedupe_key: `export_tg_up:${exp.id}`, source: "export-deliver-telegram" });
    }
    return j({ ok: true });
  } catch (e: any) {
    const errMsg = String(e?.message || e);
    if (exportIdOuter) {
      void emitWorkflowEvent(sbOuter, "export.failed", {
        export_id: exportIdOuter, user_id: userIdOuter, channel: "telegram",
        reason: errMsg,
      }, { user_id: userIdOuter, dedupe_key: `export_fail:${exportIdOuter}:tg:${Date.now()}`, source: "export-deliver-telegram" });
      // Mark failed + escalate to admin after 3+ attempts
      try {
        const { data: cur } = await sbOuter.from("workspace_artifacts")
          .select("id, delivery_attempts").eq("ref_export_id", exportIdOuter).maybeSingle();
        await transitionArtifactByExport(exportIdOuter, "failed", {
          delivery_status: "failed",
          last_delivery_at: new Date().toISOString(),
          last_delivery_error: errMsg.slice(0, 500),
        });
        const attempts = cur?.delivery_attempts || 0;
        if (attempts >= 3) {
          const alertKind = attempts >= 6 ? "delivery.retry_storm" : "delivery.failed";
          void fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/admin-alert`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
            body: JSON.stringify({
              kind: alertKind,
              severity: "error",
              source: "edge.export-deliver-telegram",
              feature: "telegram.exports",
              user_id: userIdOuter,
              message: `Export ${exportIdOuter} failed after ${attempts} attempts`,
              // Formal Sprint C payload — top-level structured fields
              artifact_id: cur?.id || null,
              export_id: exportIdOuter,
              retry_count: attempts,
              failure_reason: errMsg.slice(0, 300),
              pipeline_stage: "telegram.deliver",
              meta: { error: errMsg.slice(0, 200) },
            }),
          }).catch(() => {});
        }
      } catch {}
    }
    return j({ error: errMsg }, 500);
  }
});

function j(b: any, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function escape(s: string) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }