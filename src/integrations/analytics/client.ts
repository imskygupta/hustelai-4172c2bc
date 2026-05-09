// Analytics Supabase client — telemetry, audit logs, event queue, AI generation
// history, email logs, provider metrics, status history, activity streams.
//
// IMPORTANT: For HEAVY / append-only / high-growth workloads only.
// Auth, profiles, subscriptions, payments, wallets, entitlements MUST stay on
// the primary Lovable Cloud client (`@/integrations/supabase/client`).
//
// Frontend writes should go through the `log-event` edge function — never write
// directly with this client from the browser. Reads from admin panels are fine
// because admin role is checked on the primary DB before exposing data.
//
// Until a dedicated analytics project is provisioned we co-locate analytics
// tables on the community DB (qeswhaytgvosfzzgraef). Splitting later requires
// only swapping URL + key.
import { createClient } from "@supabase/supabase-js";

const URL = "https://qeswhaytgvosfzzgraef.supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_MfXLYdThZHM45f6V9DyNsw_ADD2HqIv";

export const analyticsDb = createClient(URL, PUBLISHABLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    storageKey: "hustlai-analytics-anon",
  },
});

/**
 * Fire-and-forget analytics event sender. Calls the `log-event` edge function
 * which writes to the analytics DB with the service role. Never blocks the UI.
 */
export async function logEvent(
  category: string,
  action: string,
  payload: Record<string, unknown> = {},
) {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    void supabase.functions
      .invoke("log-event", { body: { category, action, payload } })
      .catch(() => {});
  } catch {
    // Analytics must never throw into the app.
  }
}
