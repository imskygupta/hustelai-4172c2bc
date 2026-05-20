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

console.info("Workspace DB connected");

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

export type CanvasNote = {
  id: string;
  owner_id: string;
  text: string;
  color: "red" | "yellow" | "blue" | "green";
  x: number;
  y: number;
  client_id: string | null;
  last_action_at: string | null;
  created_at: string;
};

/* ---------- Workspace Core (free layer) ---------- */

export type WorkInvoice = {
  id: string;
  owner_id: string;
  client_name: string;
  service: string;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "overdue";
  due_date: string | null;
  notes: string | null;
  created_at: string;
};

export type WorkChecklist = {
  id: string;
  owner_id: string;
  title: string;
  template: string;
  tasks: { label: string; done: boolean }[];
  created_at: string;
};

export type WorkDailyLog = {
  id: string;
  owner_id: string;
  log_date: string; // YYYY-MM-DD
  proposals_sent: number;
  leads_found: number;
  clients_contacted: number;
  notes: string | null;
  created_at: string;
};

export type WorkClient = {
  id: string; owner_id: string; name: string;
  email: string | null; phone: string | null; company: string | null;
  notes: string | null; status: string | null; hourly_rate: number;
  created_at: string;
};
export type WorkTimeEntry = {
  id: string; owner_id: string; client_id: string | null;
  description: string | null; started_at: string; ended_at: string | null;
  duration_seconds: number; hourly_rate: number; created_at: string;
};
export type WorkFile = {
  id: string; owner_id: string; client_id: string | null;
  name: string; url: string; version: string; is_final: boolean; created_at: string;
};
export type WorkNote = {
  id: string; owner_id: string; client_id: string | null;
  content: string; color: string; created_at: string;
};
export type WorkExpense = {
  id: string; owner_id: string; label: string; category: string;
  amount: number; expense_date: string; created_at: string;
};
export type WorkCommLog = {
  id: string; owner_id: string; client_id: string;
  channel: string; summary: string; occurred_at: string; created_at: string;
};
export type WorkDeadline = {
  id: string; owner_id: string; client_id: string | null;
  title: string; due_date: string; is_done: boolean; created_at: string;
};
export type WorkPortal = {
  id: string; owner_id: string; client_id: string; token: string; created_at: string;
};

/**
 * Lazily mirrors the user's primary-DB profile (id/email/tier) into the
 * secondary workspace DB the first time they touch a workspace feature.
 * Idempotent. Failures are silent — mirror is best-effort.
 */
export async function mirrorProfile(input: { user_id: string; email?: string | null; tier?: string | null }) {
  try {
    await workspaceDb
      .from("workspace_profiles")
      .upsert(
        {
          user_id: input.user_id,
          email: input.email || null,
          tier: input.tier || "free",
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
  } catch {
    /* silent */
  }
}