// Self-owned Supabase client — frontend stub.
//
// Phase 2 (operational backend migration) deliberately does NOT route any
// frontend writes to the owned project. All Tier-1 ops writes (telemetry,
// queues, worker state, audit) flow through edge functions, which use
// `getOwned()` from `supabase/functions/_shared/clients.ts` and read
// `OWNED_SUPABASE_URL` / `OWNED_SUPABASE_SERVICE_ROLE_KEY` from secrets.
//
// Keeping credentials OUT of the frontend bundle is an explicit constraint.
// If a future phase needs RLS-scoped reads from the browser against the
// owned project, wire it via env vars (VITE_OWNED_SUPABASE_URL /
// VITE_OWNED_SUPABASE_PUBLISHABLE_KEY) — never hardcode.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_OWNED_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_OWNED_SUPABASE_PUBLISHABLE_KEY as
  | string
  | undefined;

export const supabaseOwned: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

export const ownedClientReady = !!supabaseOwned;