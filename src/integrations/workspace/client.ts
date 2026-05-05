// Secondary Supabase client — workspace data only (clients, notes, action log).
// Auth, profiles, payments stay on the primary Lovable Cloud client.
// User identity is taken from the primary client's auth.uid() and passed in as `owner_id`.
import { createClient } from "@supabase/supabase-js";

const URL = "https://utflzmecghdtcjupgdan.supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_riUGl3kMundQwxXEg5wcyA_evCjBvqA";

export const workspaceDb = createClient(URL, PUBLISHABLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    storageKey: "hustlai-workspace-anon", // separate from primary client storage
  },
});

export type WorkspaceClient = {
  id: string;
  owner_id: string;
  name: string;
  company: string | null;
  email: string | null;
  link: string | null;
  niche: string | null;
  vibe: string | null;
  budget: string | null;
  status: string;
  notes: string | null;
  last_contact: string | null;
  created_at: string;
};