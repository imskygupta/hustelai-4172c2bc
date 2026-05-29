// Universal Delivery Layer — delivery-telegram-pdf
// Uploads a PDF (either from a public URL or a base64 blob) to the user's
// connected Telegram chat via sendDocument, then records a delivery row.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { recordDelivery } from "../delivery-record/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const FIFTY_MB = 50 * 1024 * 1024;

function esc(s: string) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return j({ error: "unauthenticated" }, 401);
    if (!TG_TOKEN) return j({ error: "telegram_not_configured" }, 500);

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return j({ error: "unauthenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const title: string = String(body?.title || "Document").slice(0, 200);
    const toolSlug: string = String(body?.tool_slug || "unknown");
    const filename: string = String(body?.filename || `${title.replace(/\s+/g, "_").slice(0, 80)}.pdf`);
    const pdfUrl: string | null = body?.pdf_url || null;
    const pdfBase64: string | null = body?.pdf_base64 || null;
    if (!pdfUrl && !pdfBase64) return j({ error: "pdf_url or pdf_base64 required" }, 400);

    const svc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: integ } = await svc.from("notification_integrations")
      .select("provider_chat_id")
      .eq("user_id", user.id).eq("provider", "telegram").eq("status", "connected")
      .maybeSingle();
    if (!integ?.provider_chat_id) return j({ error: "telegram_not_connected" }, 412);

    // Build blob
    let blob: Blob;
    if (pdfBase64) {
      const bytes = b64ToBytes(pdfBase64);
      if (bytes.byteLength > FIFTY_MB) return j({ error: "pdf_too_large" }, 413);
      blob = new Blob([bytes], { type: "application/pdf" });
    } else {
      const r = await fetch(pdfUrl!);
      if (!r.ok) return j({ error: `fetch_pdf_failed: ${r.status}` }, 502);
      blob = await r.blob();
      if (blob.size > FIFTY_MB) return j({ error: "pdf_too_large" }, 413);
    }

    const caption = `<b>${esc(title)}</b>\n<i>via HustleAI · ${esc(toolSlug)}</i>`;
    const fd = new FormData();
    fd.append("chat_id", integ.provider_chat_id);
    fd.append("caption", caption);
    fd.append("parse_mode", "HTML");
    fd.append("document", blob, filename);
    const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendDocument`, {
      method: "POST", body: fd,
    });
    const jr = await r.json().catch(() => ({}));
    if (!jr?.ok) return j({ error: `telegram: ${jr?.description || r.status}` }, 502);

    const rec = await recordDelivery({
      user_id: user.id,
      tool_slug: toolSlug,
      channel: "telegram_pdf_sent",
      content_title: title,
      content_preview: filename,
      ref_kind: "pdf",
      client: body?.client || null,
    });

    return j({ ok: true, message_id: jr.result?.message_id, ...rec });
  } catch (e) {
    return j({ error: String((e as Error)?.message || e) }, 500);
  }
});

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}