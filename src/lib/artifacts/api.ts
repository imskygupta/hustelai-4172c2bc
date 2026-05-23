import { supabase } from "@/integrations/supabase/client";

export interface ArtifactRow {
  id: string;
  user_id: string;
  workspace_id: string | null;
  artifact_type: string;
  source_module: string;
  title: string;
  preview_text: string | null;
  file_url: string | null;
  telegram_message_id: string | null;
  telegram_channel: string | null;
  telegram_deep_link: string | null;
  storage_mode: "local" | "telegram" | "hybrid" | string;
  mime_type: string | null;
  size_bytes: number | null;
  metadata: Record<string, any>;
  status: string;
  is_favorite: boolean;
  ref_export_id: string | null;
  created_at: string;
  updated_at: string;
  origin?: "artifact" | "legacy_export";
}

export async function listArtifacts(opts: { search?: string; type?: string; limit?: number } = {}): Promise<ArtifactRow[]> {
  let q = (supabase as any)
    .from("v_workspace_artifacts_unified")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 100);
  if (opts.type) q = q.eq("artifact_type", opts.type);
  if (opts.search) q = q.ilike("title", `%${opts.search}%`);
  const { data, error } = await q;
  if (error) {
    console.warn("[listArtifacts] failed:", error.message);
    return [];
  }
  return (data || []) as ArtifactRow[];
}

export async function toggleArtifactFavorite(a: ArtifactRow, fav: boolean): Promise<void> {
  // Legacy export rows live in generated_exports — toggle there.
  if (a.origin === "legacy_export" || a.ref_export_id === a.id) {
    await (supabase as any).from("generated_exports").update({ is_favorite: fav }).eq("id", a.id);
    return;
  }
  await (supabase as any).from("workspace_artifacts").update({ is_favorite: fav }).eq("id", a.id);
}

export async function deleteArtifact(a: ArtifactRow): Promise<void> {
  if (a.origin === "legacy_export" || a.ref_export_id === a.id) {
    await (supabase as any).from("generated_exports").update({ status: "revoked" }).eq("id", a.id);
    return;
  }
  await (supabase as any).from("workspace_artifacts").delete().eq("id", a.id);
}

export async function resendArtifactToTelegram(a: ArtifactRow): Promise<{ ok: boolean; reason?: string }> {
  const exportId = a.ref_export_id || a.id;
  const { data, error } = await supabase.functions.invoke("export-deliver-telegram", {
    body: {
      export_id: exportId,
      artifact_id: a.id,
      artifact_type: a.artifact_type,
      title: a.title,
      user_id: a.user_id,
    },
  });
  if (error) return { ok: false, reason: error.message };
  return { ok: !!(data as any)?.ok, reason: (data as any)?.reason };
}