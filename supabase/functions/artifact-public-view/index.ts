// Public, no-JWT artifact resolver for /a/:token share pages.
// Returns sanitized metadata + a short-lived signed URL for the underlying file.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const url = new URL(req.url);
    const token = url.searchParams.get("token") || (await req.json().catch(() => ({}))).token;
    if (!token || typeof token !== "string") return j({ error: "missing_token" }, 400);

    const { data, error } = await sb.rpc("public_artifact_get", { _token: token });
    if (error) return j({ error: error.message }, 500);
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return j({ error: "not_found" }, 404);

    // Try to resolve a signed file URL for legacy exports.
    let signed_url: string | null = row.file_url ?? null;
    if (!signed_url && row.ref_export_id) {
      const { data: exp } = await sb.from("generated_exports")
        .select("storage_bucket, storage_path, title, status").eq("id", row.ref_export_id).maybeSingle();
      if (exp?.storage_path && exp.status !== "revoked" && exp.status !== "expired") {
        const s = await sb.storage.from(exp.storage_bucket).createSignedUrl(exp.storage_path, 60, { download: exp.title });
        signed_url = s.data?.signedUrl ?? null;
      }
    }

    return j({
      ok: true,
      artifact: {
        id: row.id,
        title: row.title,
        artifact_type: row.artifact_type,
        source_module: row.source_module,
        preview_text: row.preview_text,
        mime_type: row.mime_type,
        size_bytes: row.size_bytes,
        created_at: row.created_at,
        share_expires_at: row.share_expires_at,
      },
      signed_url,
    });
  } catch (e: any) {
    return j({ error: String(e?.message || e) }, 500);
  }
});

function j(b: any, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}