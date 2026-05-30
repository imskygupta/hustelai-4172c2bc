/**
 * CRUD helpers for the canonical CRM table `work_clients` on the workspace
 * DB (DB2). All client surfaces (Clients page, Deliver, ClientPickerDialog,
 * PersonaFlowCard, /dashboard/clients/:id) read/write this table — see
 * mem://tech/canonical-crm.
 */
import { workspaceDb } from "@/integrations/workspace/client";
import { supabase } from "@/integrations/supabase/client";

export type WorkClient = {
  id: string;
  owner_id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  delivery_count: number | null;
  last_delivery_at: string | null;
  last_contact: string | null;
  status: string | null;
  created_at: string;
};

const COLS = "id, owner_id, name, company, email, phone, notes, delivery_count, last_delivery_at, last_contact, status, created_at";

function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D+/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export async function listWorkClientsFull(ownerId: string): Promise<WorkClient[]> {
  const { data, error } = await workspaceDb
    .from("work_clients")
    .select(COLS)
    .eq("owner_id", ownerId)
    .order("last_delivery_at", { ascending: false, nullsFirst: false } as never);
  if (error) throw error;
  return (data as WorkClient[]) || [];
}

export type WorkClientDraft = Partial<Pick<WorkClient, "name" | "company" | "email" | "phone" | "notes">> & { id?: string };

export async function saveWorkClient(ownerId: string, draft: WorkClientDraft): Promise<WorkClient> {
  const payload = {
    name: (draft.name || "").trim().slice(0, 200),
    company: draft.company?.trim() || null,
    email: draft.email ? draft.email.trim().toLowerCase() : null,
    phone: normalizePhone(draft.phone),
    notes: draft.notes?.trim() || null,
  };
  if (!payload.name) throw new Error("Name is required");

  if (draft.id) {
    const { data, error } = await workspaceDb
      .from("work_clients")
      .update(payload)
      .eq("id", draft.id)
      .eq("owner_id", ownerId)
      .select(COLS)
      .maybeSingle();
    if (error) throw error;
    return data as WorkClient;
  }
  const { data, error } = await workspaceDb
    .from("work_clients")
    .insert({ owner_id: ownerId, ...payload })
    .select(COLS)
    .maybeSingle();
  if (error) throw error;
  return data as WorkClient;
}

export async function deleteWorkClient(ownerId: string, id: string): Promise<void> {
  const { error } = await workspaceDb
    .from("work_clients")
    .delete()
    .eq("id", id)
    .eq("owner_id", ownerId);
  if (error) throw error;
}

/**
 * Count rows the user still has on the legacy DB1 `client_profiles` table.
 * Used by the Clients page to decide whether to show the "Import legacy"
 * banner. Returns 0 if the table is gone / unreachable.
 */
export async function countLegacyClientProfiles(userId: string): Promise<number> {
  try {
    const { count } = await (supabase as unknown as { from: (t: string) => { select: (c: string, o: { count: "exact"; head: true }) => { eq: (k: string, v: string) => Promise<{ count: number | null }> } } })
      .from("client_profiles")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export type MigrationReport = {
  ok: boolean;
  total: number;
  migrated: number;
  merged: number;
  skipped: number;
  items?: Array<{ name: string; outcome: "migrated" | "merged" | "skipped"; reason?: string }>;
  error?: string;
};

/** Calls the migrate-clientprofile-to-work-clients edge function. */
export async function runLegacyClientMigration(): Promise<MigrationReport> {
  const { data: { session } } = await supabase.auth.getSession();
  const resp = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/migrate-clientprofile-to-work-clients`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
      body: "{}",
    },
  );
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    return { ok: false, total: 0, migrated: 0, merged: 0, skipped: 0, error: (json as { error?: string })?.error || `HTTP ${resp.status}` };
  }
  return json as MigrationReport;
}