// Self-owned Supabase client (project: wguuipsikboqqinqeehv).
//
// This is a SECOND client that points at the user's own Supabase project.
// The default `supabase` client in ./client.ts is Lovable-managed and stays
// connected to the original project for auth + unmigrated tables.
//
// Use this client ONLY for tables that have been migrated to the new
// project (see docs/migration/inventory.md → "Migration tier map").
//
// The publishable key is safe to commit (anon-equivalent, RLS-enforced).
import { createClient } from "@supabase/supabase-js";

const OWNED_SUPABASE_URL = "https://wguuipsikboqqinqeehv.supabase.co";
const OWNED_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_7fCbxUtzxHwAGQjHhWaR-Q_cc1lY8Dc";

export const supabaseOwned = createClient(
  OWNED_SUPABASE_URL,
  OWNED_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      // Do NOT persist a second session — auth stays on the Lovable-managed
      // client. This client only uses the user's JWT when explicitly passed
      // via `global.headers.Authorization` from callers that need RLS to see
      // `auth.uid()`. For most call sites RLS will treat it as anon.
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

export const OWNED_PROJECT_REF = "wguuipsikboqqinqeehv";