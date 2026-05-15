import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createExport } from "../_shared/exports/createExport.ts";
import { flagGuard } from "../_shared/flags/resolve.ts";
import { emitWorkflowEvent } from "../_shared/workflows/emit.ts";
import { parseJson, z } from "../_shared/validation.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { recordAnomaly } from "../_shared/anomaly.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const Body = z.object({
  export_type: z.string().trim().min(1).max(64),
  title: z.string().trim().min(1).max(200),
  mime_type: z.string().trim().max(120).optional(),
  // Cap inline base64 file at ~6MB to avoid OOM / abuse.
  file_b64: z.string().max(8 * 1024 * 1024).optional(),
  storage_path: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
  deliver_to_telegram: z.boolean().optional(),
});

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

    // 20 export creations per user per 5 min — generous for power users, blocks bots.
    const limit = await enforceRateLimit(sb, {
      key: `export-create:${u.user.id}`, windowSec: 300, max: 20,
    });
    if (!limit.ok) {
      void recordAnomaly(sb, {
        eventType: "rate_limit.exceeded", severity: "warn",
        userId: u.user.id, req, metadata: { surface: "export-create", hits: limit.hits },
      });
      return limit.response;
    }

    const parsed = await parseJson(req, Body, { maxBytes: 10 * 1024 * 1024 });
    if (!parsed.ok) return parsed.response;
    const { export_type, title, mime_type, file_b64, storage_path, metadata, deliver_to_telegram } = parsed.data;

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

    if (row?.id) {
      void emitWorkflowEvent(sb, "export.generated", {
        user_id: u.user.id, export_id: row.id, export_type, title,
        mime_type, size_bytes: (row as any).size_bytes ?? null,
        deliver_to_telegram: !!deliver_to_telegram,
      }, { user_id: u.user.id, dedupe_key: `export:${row.id}`, source: "export-create" });
    }

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