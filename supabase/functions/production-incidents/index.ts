// production-incidents — admin NOC layer for the OWNED stability plane.
// All reads/writes target the OWNED DB (wguuipsikboqqinqeehv) via getOwned().
// Never touches the primary except to verify caller is an admin.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { getOwned } from "../_shared/clients.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function isAdmin(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return { ok: false as const, uid: null };
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const sb = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data } = await sb.auth.getClaims(authHeader.slice(7));
  const uid = (data?.claims?.sub as string) ?? null;
  if (!uid) return { ok: false as const, uid: null };
  const svc = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: role } = await svc.rpc("has_role", { _user_id: uid, _role: "admin" });
  return { ok: role === true, uid };
}

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { ok, uid } = await isAdmin(req.headers.get("Authorization"));
    if (!ok) return j({ error: "admin only" }, 403);
    const body = await req.json().catch(() => ({}));
    const op = String(body.op ?? "overview");
    const owned = getOwned();

    if (op === "overview") {
      const [inc, sweeps, links, traces] = await Promise.all([
        owned.from("ops.production_incidents").select("*").neq("status", "resolved").order("detected_at", { ascending: false }).limit(100),
        owned.from("ops.runtime_health_sweeps").select("target_kind,target_name,ok,latency_ms,error_class,sampled_at").order("sampled_at", { ascending: false }).limit(200),
        owned.from("ops.shared_link_audit").select("state").order("scanned_at", { ascending: false }).limit(500),
        owned.from("ops.explore_dependency_traces").select("dep_kind,dep_name,target_db,hard_coupling,quota_sensitive,notes").order("traced_at", { ascending: false }).limit(200),
      ]);
      const linkCounts: Record<string, number> = {};
      for (const r of (links.data ?? [])) linkCounts[r.state] = (linkCounts[r.state] ?? 0) + 1;
      return j({
        incidents: inc.data ?? [],
        sweeps: sweeps.data ?? [],
        link_state_counts: linkCounts,
        explore_deps: traces.data ?? [],
      });
    }

    if (op === "ack") {
      const id = String(body.id);
      await owned.from("ops.production_incidents").update({ status: "acknowledged", acknowledged_by: uid }).eq("id", id);
      return j({ ok: true });
    }
    if (op === "resolve") {
      const id = String(body.id);
      const notes = body.notes ? String(body.notes) : null;
      await owned.from("ops.production_incidents").update({ status: "resolved", resolved_at: new Date().toISOString(), resolution_notes: notes }).eq("id", id);
      return j({ ok: true });
    }
    return j({ error: "unknown op" }, 400);
  } catch (e) {
    return j({ error: (e as Error).message }, 500);
  }
});