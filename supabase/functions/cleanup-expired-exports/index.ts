import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async () => {
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let marked: number | null = null;
  let markErr: string | null = null;
  try {
    const { data, error } = await sb.rpc("mark_expired_exports");
    if (error) markErr = error.message;
    else marked = (typeof data === "number" ? data : null);
  } catch (e) {
    markErr = (e as Error)?.message ?? String(e);
  }

  let removed = 0;
  const errors: string[] = [];
  try {
    const { data: rows, error: selErr } = await sb.from("generated_exports")
      .select("id, storage_bucket, storage_path")
      .eq("status", "expired")
      .not("storage_path", "is", null)
      .limit(500);
    if (selErr) errors.push(`select: ${selErr.message}`);
    for (const r of rows || []) {
      if (!r.storage_path) continue;
      try {
        const { error } = await sb.storage.from(r.storage_bucket || "exports").remove([r.storage_path]);
        if (error) { errors.push(`${r.id}: ${error.message}`); continue; }
        await sb.from("generated_exports").update({ storage_path: null }).eq("id", r.id);
        removed++;
      } catch (e) {
        errors.push(`${r.id}: ${(e as Error)?.message ?? String(e)}`);
      }
    }
  } catch (e) {
    errors.push(`scan: ${(e as Error)?.message ?? String(e)}`);
  }

  return new Response(
    JSON.stringify({ ok: true, marked, mark_error: markErr, removed, errors }),
    { headers: { "Content-Type": "application/json" } },
  );
});