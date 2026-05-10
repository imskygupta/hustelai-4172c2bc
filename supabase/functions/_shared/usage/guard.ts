// Edge-side quota guard. Mirrors flagGuard signature.
// Returns null when allowed, or a 429 Response when capped.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function client() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

export interface QuotaResult {
  allowed: boolean;
  bypass: boolean;
  used: number;
  max: number;
  reason: string;
}

export async function consumeServer(
  userId: string, meter: string, feature = "*", units = 1,
): Promise<QuotaResult> {
  try {
    const { data, error } = await client().rpc("consume_usage", {
      _user: userId, _meter: meter, _feature: feature, _units: units,
    });
    if (error) throw error;
    return data as QuotaResult;
  } catch {
    // Fail-open — never block due to a transient infra issue
    return { allowed: true, bypass: false, used: 0, max: 0, reason: "ok" };
  }
}

/**
 * Drop-in guard. Returns null when allowed, else a 429 Response with
 * a structured payload the frontend QuotaBoundary understands.
 */
export async function quotaGuard(
  userId: string | null,
  meter: string,
  feature: string,
  units: number,
  cors: Record<string, string>,
): Promise<Response | null> {
  if (!userId) return null; // anon allowed; client-side gate handles
  const r = await consumeServer(userId, meter, feature, units);
  if (r.allowed) return null;
  return new Response(JSON.stringify({
    error: `Quota exceeded for ${meter}`,
    locked: true, meter, feature, used: r.used, max: r.max,
    upgrade_url: "/pricing",
  }), { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
}
