import { supabase } from "@/integrations/supabase/client";

export type LinkageResult =
  | { ok: true }
  | { ok: false; action: "force_signout"; reason: string; message?: string };

// Calls auth-link-verify exactly once per SIGNED_IN. Fail-open: any network
// or function error returns { ok: true } so a transient blip never locks
// users out. The server is the source of truth for collision detection.
const verified = new Set<string>();

export async function verifyAuthLinkage(accessToken: string): Promise<LinkageResult> {
  if (!accessToken) return { ok: true };
  const key = accessToken.slice(-32);
  if (verified.has(key)) return { ok: true };
  verified.add(key);
  // Cap the cache so it can't grow unbounded across long sessions.
  if (verified.size > 32) {
    const first = verified.values().next().value;
    if (first) verified.delete(first);
  }

  try {
    const { data, error } = await supabase.functions.invoke("auth-link-verify", {
      body: {},
    });
    if (error || !data) return { ok: true };
    if (data.ok === false) return data as LinkageResult;
    return { ok: true };
  } catch {
    return { ok: true };
  }
}