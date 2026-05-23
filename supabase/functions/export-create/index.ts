import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createExport } from "../_shared/exports/createExport.ts";
import { createArtifact } from "../_shared/artifacts/createArtifact.ts";
import { flagGuard } from "../_shared/flags/resolve.ts";
import { emitWorkflowEvent } from "../_shared/workflows/emit.ts";
import { parseJson, z } from "../_shared/validation.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { recordAnomaly } from "../_shared/anomaly.ts";
import { requireCapability, guardErrorBody } from "../_shared/tier/guard.ts";
import { consumeAndCheck } from "../_shared/tier/quota.ts";

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

    // Sprint E Phase 3 — canonical capability + quota enforcement.
    const capExport = await requireCapability(sb, u.user.id, "export_generation");
    if (!capExport.ok) return json(guardErrorBody(capExport), 403);
    const q = await consumeAndCheck(sb, u.user.id, "export", capExport.capabilities.export_quota);
    if (!q.ok) {
      return json({
        error: "export_quota_exceeded",
        kind: q.kind, count: q.count, limit: q.limit, remaining: q.remaining,
        tier: capExport.tier,
        message: `Daily export limit reached (${q.count}/${q.limit}). Upgrade for more.`,
      }, 429);
    }

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

    // Telegram delivery — capability + flag + quota all enforced.
    if (deliver_to_telegram) {
      const tgCap = await requireCapability(sb, u.user.id, "telegram_exports");
      if (!tgCap.ok) return json(guardErrorBody(tgCap), 403);
      const tgBlocked = await flagGuard(u.user.id, "telegram.exports", corsHeaders, { endpoint: "export-create:tg" });
      if (tgBlocked) return tgBlocked;
      const tgQ = await consumeAndCheck(sb, u.user.id, "telegram_delivery", tgCap.capabilities.telegram_delivery_quota);
      if (!tgQ.ok) {
        return json({
          error: "telegram_delivery_quota_exceeded",
          count: tgQ.count, limit: tgQ.limit, tier: tgCap.tier,
          message: `Daily Telegram delivery limit reached (${tgQ.count}/${tgQ.limit}).`,
        }, 429);
      }
    }

    const row = await createExport({
      user_id: u.user.id,
      export_type, title, mime_type,
      file_b64, storage_path,
      metadata, deliver_to_telegram: !!deliver_to_telegram,
    });

    // Register canonical artifact (single source of truth for the Exports page).
    if (row?.id) {
      void createArtifact({
        user_id: u.user.id,
        artifact_type: export_type,
        source_module: (metadata as any)?.source_module || "export-create",
        title,
        preview_text: (metadata as any)?.preview_text || null,
        mime_type: mime_type || (row as any).mime_type || null,
        size_bytes: (row as any).size_bytes ?? null,
        metadata: { ...(metadata || {}), export_type },
        ref_export_id: row.id,
        storage_mode: "local",
      });
    }

    if (row?.id) {
      void emitWorkflowEvent(sb, "export.generated", {
        user_id: u.user.id, export_id: row.id, export_type, title,
        mime_type, size_bytes: (row as any).size_bytes ?? null,
        deliver_to_telegram: !!deliver_to_telegram,
      }, { user_id: u.user.id, dedupe_key: `export:${row.id}`, source: "export-create" });
    }

    // NOTE: TG cache enqueue is handled centrally inside createExport() with
    // proper plan + telegram_connected guards. Duplicate enqueue here removed
    // to prevent retry storms and ghost TG jobs for free users.

    return json({ ok: true, export: row });
  } catch (e: any) {
    return json({ error: String(e?.message || e) }, 500);
  }
});

function json(b: any, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}