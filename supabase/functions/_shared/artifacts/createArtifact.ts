// Canonical artifact creator. Used by every generation path
// (exports, roadmaps, proposals, invoices, AI chats, workspace docs)
// to register a row in workspace_artifacts — the single source of
// truth for "everything generated inside HustleAI".
//
// Never throws. Returns the inserted row id or null on failure.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface CreateArtifactInput {
  user_id: string;
  artifact_type: string;       // e.g. "resume_pdf", "roadmap_pdf", "proposal", "ai_chat"
  source_module: string;       // e.g. "export-create", "roadmap-engine", "proposal-generator"
  title: string;
  preview_text?: string | null;
  file_url?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  metadata?: Record<string, any>;
  ref_export_id?: string | null;
  workspace_id?: string | null;
  storage_mode?: "local" | "telegram" | "hybrid";
  deliver_to_telegram?: boolean;
  dedupe_key?: string;
  artifact_origin?: "export" | "ai_tool" | "workflow" | "manual" | "operational";
  generation_source?: string;
}

function truncate(s: string | null | undefined, n = 280): string | null {
  if (!s) return null;
  const t = String(s).trim();
  if (!t) return null;
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

function inferDedupeKey(input: CreateArtifactInput): string {
  if (input.dedupe_key) return input.dedupe_key;
  if (input.ref_export_id) return `${input.source_module}:export:${input.ref_export_id}`;
  // Title + module is the safest fallback to avoid double-inserts in retry loops.
  return `${input.source_module}:${input.artifact_type}:${(input.title || "").slice(0, 80)}`;
}

function sb() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export async function createArtifact(input: CreateArtifactInput): Promise<{ id: string } | null> {
  try {
    const client = sb();
    const row = {
      user_id: input.user_id,
      workspace_id: input.workspace_id ?? null,
      artifact_type: input.artifact_type,
      source_module: input.source_module,
      title: input.title || "Untitled artifact",
      preview_text: truncate(input.preview_text ?? input.title, 280),
      file_url: input.file_url ?? null,
      mime_type: input.mime_type ?? null,
      size_bytes: input.size_bytes ?? null,
      metadata: input.metadata || {},
      ref_export_id: input.ref_export_id ?? null,
      storage_mode: input.storage_mode ?? "local",
      status: "ready",
      dedupe_key: inferDedupeKey(input),
      // Canonical FSM seeding — every new artifact starts at `persisted` if it
      // has a file_url, otherwise `generated`. transitionArtifact() enforces
      // every subsequent move from here onwards.
      artifact_state: input.file_url ? "persisted" : "generated",
      artifact_origin: input.artifact_origin ?? (input.ref_export_id ? "export" : "manual"),
      generation_source: input.generation_source ?? input.source_module,
    };

    const { data, error } = await client
      .from("workspace_artifacts")
      .upsert(row, { onConflict: "user_id,dedupe_key", ignoreDuplicates: false })
      .select("id")
      .single();
    if (error) {
      console.warn("[createArtifact] insert failed:", error.message);
      return null;
    }

    // Fire-and-forget Telegram delivery (helper does its own paid + connected gating)
    if (input.deliver_to_telegram && input.ref_export_id) {
      void fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/export-deliver-telegram`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          export_id: input.ref_export_id,
          artifact_id: data.id,
          artifact_type: input.artifact_type,
          artifact_key: row.dedupe_key,
          title: input.title,
          user_id: input.user_id,
        }),
      }).catch(() => {});
    }

    return { id: data.id };
  } catch (e) {
    console.warn("[createArtifact] error:", e);
    return null;
  }
}

/** Patch an existing artifact row by id. Never throws. */
export async function patchArtifact(id: string, patch: Partial<{
  storage_mode: string;
  telegram_message_id: string | null;
  telegram_channel: string | null;
  telegram_deep_link: string | null;
  status: string;
  file_url: string | null;
  size_bytes: number;
  metadata: Record<string, any>;
  delivery_status: string;
  delivery_attempts: number;
  last_delivery_error: string | null;
  last_delivery_at: string;
}>): Promise<boolean> {
  try {
    const { error } = await sb().from("workspace_artifacts").update(patch).eq("id", id);
    if (error) { console.warn("[patchArtifact] failed:", error.message); return false; }
    return true;
  } catch (e) { console.warn("[patchArtifact] error:", e); return false; }
}

/** Patch the artifact row that references a given export id. Used by delivery functions. */
export async function patchArtifactByExport(ref_export_id: string, patch: Parameters<typeof patchArtifact>[1]): Promise<boolean> {
  try {
    const { error } = await sb().from("workspace_artifacts").update(patch).eq("ref_export_id", ref_export_id);
    if (error) { console.warn("[patchArtifactByExport] failed:", error.message); return false; }
    return true;
  } catch (e) { console.warn("[patchArtifactByExport] error:", e); return false; }
}