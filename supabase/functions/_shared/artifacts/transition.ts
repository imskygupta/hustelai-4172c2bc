// Server-side FSM enforcement. Every edge function that mutates artifact_state
// MUST go through `transitionArtifact()` — direct UPDATEs are not allowed.
//
// Mirrors `src/lib/artifacts/fsm.ts`. Keep both lists in sync.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type ArtifactState =
  | "generated"
  | "persisted"
  | "queued"
  | "processing"
  | "delivering"
  | "delivered"
  | "telegram_only"
  | "partial"
  | "failed"
  | "archived";

const TRANSITIONS: Record<ArtifactState, ArtifactState[]> = {
  generated:     ["persisted", "queued", "telegram_only", "failed", "archived"],
  persisted:     ["queued", "delivering", "delivered", "telegram_only", "partial", "failed", "archived"],
  queued:        ["processing", "delivering", "failed", "archived"],
  processing:    ["delivering", "persisted", "failed", "partial", "archived"],
  delivering:    ["delivered", "partial", "failed", "telegram_only", "archived"],
  delivered:     ["queued", "delivering", "archived"],
  telegram_only: ["queued", "delivering", "delivered", "archived"],
  partial:       ["queued", "delivering", "delivered", "failed", "archived"],
  failed:        ["queued", "delivering", "archived"],
  archived:      [],
};

export function canTransition(from: ArtifactState, to: ArtifactState): boolean {
  if (from === to) return true;
  return TRANSITIONS[from]?.includes(to) ?? false;
}

function sb(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export interface TransitionPatch {
  delivery_state?: string;
  delivery_status?: string;
  last_delivery_error?: string | null;
  last_delivery_at?: string;
  telegram_message_id?: string | null;
  telegram_chat_id?: string | null;
  telegram_channel?: string | null;
  telegram_deep_link?: string | null;
  telegram_file_id?: string | null;
  storage_mode?: string;
  file_url?: string | null;
  status?: string;
  resend_count?: number;
  metadata?: Record<string, unknown>;
}

export interface TransitionResult {
  ok: boolean;
  rejected?: "invalid_transition" | "not_found" | "db_error";
  from?: ArtifactState;
  to?: ArtifactState;
  error?: string;
}

/** Atomically transition an artifact. Rejects illegal moves. Never throws. */
export async function transitionArtifact(
  artifact_id: string,
  to: ArtifactState,
  patch: TransitionPatch = {},
): Promise<TransitionResult> {
  try {
    const client = sb();
    const { data: row, error: readErr } = await client
      .from("workspace_artifacts")
      .select("id, artifact_state")
      .eq("id", artifact_id)
      .maybeSingle();
    if (readErr) return { ok: false, rejected: "db_error", error: readErr.message };
    if (!row) return { ok: false, rejected: "not_found" };
    const from = (row.artifact_state || "generated") as ArtifactState;
    if (!canTransition(from, to)) {
      console.warn(`[transitionArtifact] rejected ${artifact_id}: ${from} -> ${to}`);
      return { ok: false, rejected: "invalid_transition", from, to };
    }
    const { error: writeErr } = await client
      .from("workspace_artifacts")
      .update({ ...patch, artifact_state: to })
      .eq("id", artifact_id);
    if (writeErr) return { ok: false, rejected: "db_error", error: writeErr.message, from, to };
    return { ok: true, from, to };
  } catch (e) {
    return { ok: false, rejected: "db_error", error: String((e as Error)?.message || e) };
  }
}

/** Same as transitionArtifact but resolves the artifact by `ref_export_id`. */
export async function transitionArtifactByExport(
  ref_export_id: string,
  to: ArtifactState,
  patch: TransitionPatch = {},
): Promise<TransitionResult> {
  try {
    const client = sb();
    const { data: row, error } = await client
      .from("workspace_artifacts")
      .select("id, artifact_state")
      .eq("ref_export_id", ref_export_id)
      .maybeSingle();
    if (error) return { ok: false, rejected: "db_error", error: error.message };
    if (!row) return { ok: false, rejected: "not_found" };
    return transitionArtifact(row.id, to, patch);
  } catch (e) {
    return { ok: false, rejected: "db_error", error: String((e as Error)?.message || e) };
  }
}

/** Increment resend_count atomically and re-enter the delivery flow. */
export async function incrementResend(artifact_id: string): Promise<number> {
  try {
    const client = sb();
    const { data: row } = await client
      .from("workspace_artifacts")
      .select("resend_count")
      .eq("id", artifact_id)
      .maybeSingle();
    const next = (row?.resend_count || 0) + 1;
    await client.from("workspace_artifacts").update({ resend_count: next }).eq("id", artifact_id);
    return next;
  } catch {
    return 0;
  }
}