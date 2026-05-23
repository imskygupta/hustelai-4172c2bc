// Removes Supabase storage objects for free-tier exports that have already
// been cached on the Telegram storage channel and have expired. The DB row
// is kept (with telegram_file_id) so re-delivery still works via Telegram.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dry") === "1";
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "200"), 1000);

    // Mark expired first
    await sb.rpc("mark_expired_exports").catch(() => {});

    const { data: rows } = await sb.from("generated_exports")
      .select("id, storage_bucket, storage_path, tier_at_creation, telegram_file_id, expires_at, status, workspace_artifacts!ref_export_id(telegram_file_id)")
      .not("storage_path", "is", null)
      .lt("expires_at", new Date().toISOString())
      .limit(limit);

    let removed = 0;
    const errors: string[] = [];
    for (const r of rows || []) {
      const artifactFileId = (r as any).workspace_artifacts?.[0]?.telegram_file_id ?? null;
      const effectiveFileId = artifactFileId || r.telegram_file_id;
      if (!effectiveFileId) continue; // not cached on Telegram yet — skip
      if (dryRun) { removed++; continue; }
      const { error } = await sb.storage.from(r.storage_bucket || "exports").remove([r.storage_path!]);
      if (error) { errors.push(`${r.id}: ${error.message}`); continue; }
      await sb.from("generated_exports").update({
        storage_path: null,
        delivery_method: "telegram",
        status: "telegram_only",
      }).eq("id", r.id);
      removed++;
    }
    return j({ ok: true, scanned: rows?.length || 0, removed, dryRun, errors });
  } catch (e: any) {
    return j({ error: String(e?.message || e) }, 500);
  }
});

function j(b: any, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}