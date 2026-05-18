// Phase 2 ops-write router.
//
// Single switch point for "which Supabase project receives ops writes".
// When MIGRATE_OPS_WRITES === "owned", new telemetry/alerts/audit/queue
// rows go to the user-owned project (wguuipsikboqqinqeehv). When unset
// or "legacy" (default), they go to the Lovable-managed project — same
// behavior as today.
//
// Reads always check ownedReady() so we never crash a production write
// path because secrets aren't configured yet.
//
// Rollback: set MIGRATE_OPS_WRITES=legacy (or delete the secret). All
// subsequent writes resume against the old project. No code change.
import { getOwned, getPrimaryService, ownedReady } from "./clients.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

export type OpsTarget = "legacy" | "owned";

export function opsTarget(): OpsTarget {
  const flag = (Deno.env.get("MIGRATE_OPS_WRITES") ?? "").toLowerCase();
  if (flag === "owned" && ownedReady()) return "owned";
  return "legacy";
}

/** Returns the client that owns ops writes right now. */
export function getOpsClient(): SupabaseClient {
  return opsTarget() === "owned" ? getOwned() : getPrimaryService();
}

/**
 * Dual-write during cutover windows.
 * When `MIGRATE_OPS_DUAL_WRITE=1`, writes go to BOTH clients. The legacy
 * write is authoritative (its error is returned); the owned write is
 * fire-and-forget so a misconfigured new project can't break production.
 */
export async function dualWriteOps(
  table: string,
  row: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  const dual = Deno.env.get("MIGRATE_OPS_DUAL_WRITE") === "1";
  const primary = getPrimaryService();

  const { error } = await primary.from(table).insert(row);

  if (dual && ownedReady()) {
    // fire-and-forget mirror write
    void getOwned()
      .from(table)
      .insert(row)
      .then(({ error: e }) => {
        if (e) console.warn(`dualWriteOps mirror ${table}: ${e.message}`);
      });
  }

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Fire-and-forget mirror write to the owned project ONLY.
 * Use for tables whose legacy home is NOT the primary DB (e.g. event_log
 * lives in the analytics DB). Caller is responsible for the legacy write.
 * No-op unless MIGRATE_OPS_DUAL_WRITE=1 AND OWNED_SUPABASE_ENABLED=1.
 */
export function mirrorToOwned(table: string, row: Record<string, unknown>): void {
  if (Deno.env.get("MIGRATE_OPS_DUAL_WRITE") !== "1") return;
  if (!ownedReady()) return;
  void getOwned()
    .from(table)
    .insert(row)
    .then(({ error }) => {
      if (error) console.warn(`mirrorToOwned ${table}: ${error.message}`);
    });
}