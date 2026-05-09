import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async () => {
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  // 1) Mark expired
  await sb.rpc("mark_expired_exports").catch(() => {});
  // 2) Delete storage objects of expired free-tier exports (chunked)
  const { data: rows } = await sb.from("generated_exports")
    .select("id, storage_bucket, storage_path")
    .eq("status", "expired")
    .not("storage_path", "is", null)
    .limit(500);
  let removed = 0;
  for (const r of rows || []) {
    if (!r.storage_path) continue;
    const { error } = await sb.storage.from(r.storage_bucket).remove([r.storage_path]);
    if (!error) {
      await sb.from("generated_exports").update({ storage_path: null }).eq("id", r.id);
      removed++;
    }
  }
  return new Response(JSON.stringify({ ok: true, removed }), { headers: { "Content-Type": "application/json" } });
});