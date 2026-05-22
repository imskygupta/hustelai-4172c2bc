import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// --- Per-DB scoped clients (least-privilege) ---
// Each loop must only import the client for the DB it actually needs.
// PRIMARY is the one allowed exception for workflow-loop (workflow_runs table)
// and for the existing telegram/admin_alerts/ops.* writes. Everything else
// must use a scoped client and a service role key bound to that DB only.
//
// Missing keys throw lazily on first use — the worker boots even if a given
// DB credential pair is not configured yet.
function lazyClient(urlVar: string, keyVar: string, label: string) {
  let cached: ReturnType<typeof createClient> | null = null;
  return () => {
    if (cached) return cached;
    const url = process.env[urlVar];
    const key = process.env[keyVar];
    if (!url || !key) {
      throw new Error(`[supabase:${label}] missing ${urlVar} or ${keyVar} — configure in Railway env`);
    }
    cached = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    return cached;
  };
}

// PRIMARY alias — explicit name so loops that need it are auditable in code search.
export const primaryAdmin = supabaseAdmin;

export const getBlogAdmin = lazyClient("BLOG_SUPABASE_URL", "BLOG_SUPABASE_SERVICE_ROLE_KEY", "blog");
export const getAiAdmin = lazyClient("AI_SUPABASE_URL", "AI_SUPABASE_SERVICE_ROLE_KEY", "ai");
export const getAdminAdmin = lazyClient("ADMIN_SUPABASE_URL", "ADMIN_SUPABASE_SERVICE_ROLE_KEY", "admin");