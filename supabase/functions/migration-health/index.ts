// Migration health diagnostics endpoint.
//
// Admin-only. Returns:
//   - flag state (OWNED_SUPABASE_ENABLED, MIGRATE_OPS_DUAL_WRITE, MIGRATE_OPS_WRITES)
//   - owned-project reachability (live ping)
//   - per-table mirror counts, latency, last error (last 24h)
//
// Read-only. Powers /admin/runtime/migration.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { getOwned, getPrimaryService, ownedReady } from "../_shared/clients.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function isAdmin(authHeader: string | null): Promise<boolean> {
  if (!authHeader?.startsWith("Bearer ")) return false;
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: claims } = await sb.auth.getClaims(authHeader.slice(7));
  const uid = claims?.claims?.sub as string | undefined;
  if (!uid) return false;
  const svc = getPrimaryService();
  const { data } = await svc.rpc("has_role", { _user_id: uid, _role: "admin" });
  return data === true;
}

async function pingOwned(): Promise<{ reachable: boolean; latency_ms: number | null; error: string | null }> {
  if (!ownedReady()) {
    return { reachable: false, latency_ms: null, error: "owned_not_ready" };
  }
  const t0 = Date.now();
  try {
    const sb = getOwned();
    // Lightweight check: head request against a table we just created.
    const { error } = await sb
      .from("migration_mirror_log")
      .select("id", { count: "exact", head: true })
      .limit(1);
    const ms = Date.now() - t0;
    if (error) {
      // Table may not exist on owned yet — still means project responded.
      return { reachable: true, latency_ms: ms, error: error.message };
    }
    return { reachable: true, latency_ms: ms, error: null };
  } catch (e) {
    return { reachable: false, latency_ms: Date.now() - t0, error: (e as Error).message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!(await isAdmin(req.headers.get("Authorization")))) {
      return new Response(JSON.stringify({ error: "admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const flags = {
      OWNED_SUPABASE_ENABLED: Deno.env.get("OWNED_SUPABASE_ENABLED") ?? null,
      MIGRATE_OPS_DUAL_WRITE: Deno.env.get("MIGRATE_OPS_DUAL_WRITE") ?? null,
      MIGRATE_OPS_WRITES: Deno.env.get("MIGRATE_OPS_WRITES") ?? "legacy",
      MIGRATE_MIRROR_SAMPLE_RATE: Deno.env.get("MIGRATE_MIRROR_SAMPLE_RATE") ?? "1",
      owned_ready: ownedReady(),
    };

    const [ping, healthResult] = await Promise.all([
      pingOwned(),
      getPrimaryService().rpc("migration_mirror_health"),
    ]);

    return new Response(JSON.stringify({
      flags,
      owned: ping,
      tables: healthResult.data ?? [],
      generated_at: new Date().toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});