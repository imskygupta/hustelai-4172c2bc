// shared-link-repair — scans the export-token catalog on the PRIMARY
// (read-only) and repairs broken signed URLs / stale share-links.
// All telemetry, audit rows, and incidents are persisted on the OWNED DB.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { getOwned, getPrimaryService } from "../_shared/clients.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function isAdmin(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return false;
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const sb = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data } = await sb.auth.getClaims(authHeader.slice(7));
  const uid = (data?.claims?.sub as string) ?? null;
  if (!uid) return false;
  const svc = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: role } = await svc.rpc("has_role", { _user_id: uid, _role: "admin" });
  return role === true;
}

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!(await isAdmin(req.headers.get("Authorization")))) return j({ error: "admin only" }, 403);
    const body = await req.json().catch(() => ({}));
    const op = String(body.op ?? "scan");
    const limit = Math.min(200, Number(body.limit ?? 100));
    const owned = getOwned();
    const primary = getPrimaryService();

    // Pull a window of recent tokens + their exports
    const { data: tokens, error: tErr } = await primary
      .from("export_download_tokens")
      .select("id, export_id, expires_at, max_uses, use_count, revoked_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (tErr) return j({ error: tErr.message }, 500);

    const exportIds = Array.from(new Set((tokens ?? []).map((t: any) => t.export_id).filter(Boolean)));
    const { data: exports } = await primary
      .from("generated_exports")
      .select("id, storage_bucket, storage_path, status, title")
      .in("id", exportIds.length ? exportIds : ["00000000-0000-0000-0000-000000000000"]);
    const expMap = new Map<string, any>((exports ?? []).map((e: any) => [e.id, e]));

    const audit: any[] = [];
    const repaired: any[] = [];
    const broken: any[] = [];
    const now = Date.now();
    for (const t of tokens ?? []) {
      const exp = expMap.get(t.export_id);
      let state = "ok";
      let detail: any = {};
      if (!exp) state = "file-missing";
      else if (t.revoked_at) state = "revoked";
      else if (new Date(t.expires_at).getTime() < now) state = "expired";
      else if (t.use_count >= t.max_uses) state = "expired";
      else if (exp.status === "expired" || exp.status === "revoked") state = "expired";
      else if (!exp.storage_path || !exp.storage_bucket) state = "file-missing";

      // Optional repair: regenerate signed URL probe for healthy rows
      if (op === "repair" && state === "ok" && exp) {
        try {
          const signed = await primary.storage.from(exp.storage_bucket).createSignedUrl(exp.storage_path, 60);
          if (signed.error) { state = "signing-failed"; detail = { error: signed.error.message }; }
          else { detail = { regen: true }; state = "regenerated"; repaired.push({ token_id: t.id }); }
        } catch (e) {
          state = "signing-failed"; detail = { error: (e as Error).message };
        }
      }

      audit.push({
        token_id: t.id, export_id: t.export_id,
        bucket: exp?.storage_bucket ?? null, storage_path: exp?.storage_path ?? null,
        state, detail,
      });
      if (state !== "ok" && state !== "regenerated") broken.push({ token_id: t.id, state });
    }

    if (audit.length) await owned.from("ops.shared_link_audit").insert(audit);

    // Raise an aggregated incident if signing-failed or file-missing exceeds threshold
    const counts: Record<string, number> = {};
    for (const a of audit) counts[a.state] = (counts[a.state] ?? 0) + 1;
    if ((counts["signing-failed"] ?? 0) >= 3 || (counts["file-missing"] ?? 0) >= 5) {
      await owned.rpc("ops.upsert_incident" as any, {
        _surface: "shared-link", _component: "export-signing", _severity: "degraded",
        _failure_class: counts["signing-failed"] ? "signing" : "bucket-missing",
        _evidence: { counts },
        _impacted: ["shared-links", "exports"], _user_facing: true,
        _suggested_rollback: "verify storage bucket exists + service-role key valid",
      });
    }

    return j({ ok: true, scanned: audit.length, counts, repaired: repaired.length, broken: broken.length });
  } catch (e) {
    return j({ error: (e as Error).message }, 500);
  }
});