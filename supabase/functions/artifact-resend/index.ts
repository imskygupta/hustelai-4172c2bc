// Owner-only re-delivery wrapper. Avoids dupe sends by short idempotency window.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { transitionArtifact, incrementResend } from "../_shared/artifacts/transition.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: u } = await sb.auth.getUser(jwt);
    if (!u?.user) return j({ error: "unauthorized" }, 401);

    const { artifact_id } = await req.json().catch(() => ({}));
    if (!artifact_id) return j({ error: "artifact_id required" }, 400);

    const { data: art } = await sb.from("workspace_artifacts")
      .select("id, user_id, ref_export_id, artifact_type, title, delivery_status, last_delivery_at, artifact_state, resend_count")
      .eq("id", artifact_id).maybeSingle();

    let exportId: string | null = null;
    let ownerId: string | null = null;
    let title = "Export";
    let type = "export";

    if (art) {
      if (art.user_id !== u.user.id) return j({ error: "forbidden" }, 403);
      // Idempotency window: ignore retries fired within 30s of last attempt.
      if (art.last_delivery_at && (Date.now() - new Date(art.last_delivery_at).getTime() < 30_000) &&
          (art.delivery_status === "sending" || art.delivery_status === "retrying")) {
        return j({ ok: false, reason: "in_flight", skipped: true });
      }
      exportId = art.ref_export_id;
      ownerId = art.user_id;
      title = art.title;
      type = art.artifact_type;
      // FSM re-entry: delivered/failed/partial -> queued (NEVER a new row).
      await transitionArtifact(artifact_id, "queued", {
        delivery_status: "retrying",
        delivery_attempts: 0,
      });
      void incrementResend(artifact_id);
    } else {
      // Legacy export row (no artifact yet) — verify ownership directly.
      const { data: exp } = await sb.from("generated_exports")
        .select("id, user_id, title, export_type").eq("id", artifact_id).maybeSingle();
      if (!exp || exp.user_id !== u.user.id) return j({ error: "not_found" }, 404);
      exportId = exp.id; ownerId = exp.user_id; title = exp.title; type = exp.export_type;
    }

    if (!exportId) return j({ error: "no_export_ref" }, 400);

    const r = await sb.functions.invoke("export-deliver-telegram", {
      body: { export_id: exportId, artifact_id, user_id: ownerId, title, artifact_type: type },
    });
    if (r.error) return j({ ok: false, reason: r.error.message }, 502);
    return j({ ok: true, result: r.data });
  } catch (e: any) {
    return j({ error: String(e?.message || e) }, 500);
  }
});

function j(b: any, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}