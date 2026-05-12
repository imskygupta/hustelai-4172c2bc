// Async/queue Supabase client — workflow runs, AI job state, retries, cron
// checkpoints, notification deliveries, broadcast/newsletter dispatch, email
// send logs, telegram command/send logs.
//
// HEAVY / append-only / queue workloads only. Auth, profiles, payments and
// entitlements MUST stay on the primary client (`@/integrations/supabase/client`).
//
// Frontend must NEVER write directly with this client. Enqueue via the
// existing edge functions (`enqueue-ai-job`, `workflow-emit`, etc.) — those
// run with the service role and write to the correct DB. This client exists
// only for low-volume, RLS-gated reads from admin surfaces.
//
// Until a dedicated async project is provisioned we fall back to the primary
// URL so existing tables keep working during the progressive cutover.
import { createClient } from "@supabase/supabase-js";

const URL =
  (import.meta.env.VITE_ASYNC_SUPABASE_URL as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_URL as string);
const PUBLISHABLE_KEY =
  (import.meta.env.VITE_ASYNC_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string);

export const asyncDb = createClient(URL, PUBLISHABLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    storageKey: "hustlai-async-anon",
  },
});