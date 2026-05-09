import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createExport } from "../_shared/exports/createExport.ts";

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

    const body = await req.json().catch(() => ({}));
    const { export_type, title, mime_type, file_b64, storage_path, metadata, deliver_to_telegram } = body || {};
    if (!export_type || !title) return json({ error: "export_type and title required" }, 400);

    const row = await createExport({
      user_id: u.user.id,
      export_type, title, mime_type,
      file_b64, storage_path,
      metadata, deliver_to_telegram: !!deliver_to_telegram,
    });
    return json({ ok: true, export: row });
  } catch (e: any) {
    return json({ error: String(e?.message || e) }, 500);
  }
});

function json(b: any, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}