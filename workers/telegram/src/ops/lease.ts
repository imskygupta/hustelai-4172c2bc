// Singleton execution lease wrapper. Prevents two runtimes from owning the
// same operational domain. Fence token is stored locally so renewal/release
// can be guarded; the DB function never allows a steal of a live lease.
import { supabaseAdmin } from "../supabase.js";

export interface LeaseHandle {
  domain: string;
  identity: string;
  fence: number;
  release: () => Promise<void>;
  extend: (seconds?: number) => Promise<boolean>;
}

export async function acquireLease(
  domain: string,
  runtime: string,
  identity: string,
  opts: { hostname?: string; leaseSeconds?: number; meta?: Record<string, unknown> } = {},
): Promise<LeaseHandle | null> {
  const { data, error } = await supabaseAdmin.rpc("acquire_execution_lease" as any, {
    _domain: domain,
    _runtime: runtime,
    _identity: identity,
    _hostname: opts.hostname ?? null,
    _lease_seconds: opts.leaseSeconds ?? 30,
    _meta: opts.meta ?? {},
  });
  if (error) {
    console.error("[lease.acquire]", domain, error.message);
    return null;
  }
  const result = data as { acquired: boolean; fence_token: number | null; reason: string; holder?: string };
  if (!result?.acquired) {
    return null;
  }
  const fence = result.fence_token as number;
  return {
    domain,
    identity,
    fence,
    async extend(seconds = 30) {
      const { data: ok } = await supabaseAdmin.rpc("extend_execution_lease" as any, {
        _domain: domain, _identity: identity, _fence: fence, _lease_seconds: seconds,
      });
      return !!ok;
    },
    async release() {
      await supabaseAdmin.rpc("release_execution_lease" as any, {
        _domain: domain, _identity: identity, _fence: fence,
      });
    },
  };
}