// Caches an export's file in a private Telegram storage channel.
// Records telegram_file_id / message_id / channel_id so subsequent deliveries
// can re-send by file_id (no re-upload). Telegram is cache, NOT source of truth.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { patchArtifactByExport } from "../_shared/artifacts/createArtifact.ts";

const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const STORAGE_CHANNEL = Deno.env.get("TELEGRAM_STORAGE_CHANNEL_ID") || "";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};
const FIFTY_MB = 50 * 1024 * 1024;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!TG_TOKEN || !STORAGE_CHANNEL) {
      return j({ ok: false, skipped: true, reason: "no_storage_channel" });
    }
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { export_id } = await req.json().catch(() => ({}));
    if (!export_id) return j({ error: "export_id required" }, 400);

    const { data: exp } = await sb.from("generated_exports").select("*").eq("id", export_id).maybeSingle();
    if (!exp || !exp.storage_path) return j({ ok: false, reason: "no_file" });
    if (exp.telegram_file_id) return j({ ok: true, cached: true });
    if (exp.size_bytes > FIFTY_MB) return j({ ok: false, reason: "too_large" });

    const signed = await sb.storage.from(exp.storage_bucket || "exports")
      .createSignedUrl(exp.storage_path, 60 * 5, { download: exp.title });
    const url = signed.data?.signedUrl;
    if (!url) return j({ ok: false, reason: "signed_url_failed" });

    const fileResp = await fetch(url);
    const blob = await fileResp.blob();
    const fd = new FormData();
    fd.append("chat_id", STORAGE_CHANNEL);
    fd.append("caption", `cache:${exp.id}`);
    fd.append("disable_notification", "true");
    fd.append("document", blob, exp.title);
    const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendDocument`, { method: "POST", body: fd });
    const jr = await r.json().catch(() => ({}));
    if (!jr?.ok) return j({ ok: false, reason: "tg_upload_failed", detail: jr?.description });

    const fileId = jr.result?.document?.file_id || jr.result?.video?.file_id || jr.result?.audio?.file_id || null;
    const messageId = String(jr.result?.message_id || "");
    const channelId = String(jr.result?.chat?.id || STORAGE_CHANNEL);

    await sb.from("generated_exports").update({
      telegram_file_id: fileId,
      telegram_storage_message_id: messageId,
      telegram_storage_channel_id: channelId,
      delivery_method: "hybrid",
    }).eq("id", exp.id);
    void patchArtifactByExport(exp.id, {
      storage_mode: "hybrid",
      telegram_message_id: messageId,
      telegram_channel: channelId,
    });

    return j({ ok: true, file_id: fileId });
  } catch (e: any) {
    return j({ error: String(e?.message || e) }, 500);
  }
});

function j(b: any, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}