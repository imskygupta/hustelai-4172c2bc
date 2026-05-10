import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createExport } from "../_shared/exports/createExport.ts";
import { flagGuard } from "../_shared/flags/resolve.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const auth = req.headers.get("Authorization") || "";
    const jwt = auth.replace(/^Bearer\s+/i, "");
    const { data: u } = await sb.auth.getUser(jwt);
    if (!u?.user) return json({ error: "unauthorized" }, 401);

    // Master export switch — kill switch + maintenance honored automatically.
    const blocked = await flagGuard(u.user.id, "exports.ai_exports", corsHeaders, { endpoint: "export-create" });
    if (blocked) return blocked;

    const body = await req.json().catch(() => ({}));
    const { export_type, title, mime_type, file_b64, storage_path, metadata, deliver_to_telegram } = body || {};
    if (!export_type || !title) return json({ error: "export_type and title required" }, 400);

    // Telegram delivery is independently flagged.
    if (deliver_to_telegram) {
      const tgBlocked = await flagGuard(u.user.id, "telegram.exports", corsHeaders, { endpoint: "export-create:tg" });
      if (tgBlocked) return tgBlocked;
    }

    const row = await createExport({
      user_id: u.user.id,
      export_type, title, mime_type,
      file_b64, storage_path,
      metadata, deliver_to_telegram: !!deliver_to_telegram,
    });

    // Fire-and-forget: cache to private Telegram storage channel for fast future delivery.
    if (row?.storage_path && Deno.env.get("TELEGRAM_STORAGE_CHANNEL_ID")) {
      void fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/export-cache-telegram`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ export_id: row.id }),
      }).catch(() => {});
    }

    return json({ ok: true, export: row });
  } catch (e: any) {
    return json({ error: String(e?.message || e) }, 500);
  }
});

function json(b: any, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}