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
  delivery_status?: string | null;
  delivery_attempts?: number | null;
  last_delivery_error?: string | null;
  last_delivery_at?: string | null;
  share_token?: string | null;
  share_expires_at?: string | null;
  share_revoked_at?: string | null;
}

export async function listArtifacts(opts: { search?: string; type?: string; deliveryStatus?: string; limit?: number } = {}): Promise<ArtifactRow[]> {
  let q = (supabase as any)
    .from("v_workspace_artifacts_unified")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 100);
  if (opts.type) q = q.eq("artifact_type", opts.type);
  if (opts.deliveryStatus) q = q.eq("delivery_status", opts.deliveryStatus);
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
  const { data, error } = await supabase.functions.invoke("artifact-resend", {
    body: { artifact_id: a.id },
  });
  if (error) return { ok: false, reason: error.message };
  return { ok: !!(data as any)?.ok, reason: (data as any)?.reason };
}

export async function issueShare(artifactId: string, expiresInHours = 24 * 7): Promise<{ ok: boolean; url?: string; token?: string; expires_at?: string; reason?: string }> {
  const { data, error } = await supabase.functions.invoke("artifact-share-issue", {
    body: { artifact_id: artifactId, expires_in_hours: expiresInHours },
  });
  if (error) return { ok: false, reason: error.message };
  const d = data as any;
  return { ok: !!d?.ok, url: d?.url, token: d?.token, expires_at: d?.expires_at, reason: d?.error };
}

export async function revokeShare(artifactId: string): Promise<{ ok: boolean; reason?: string }> {
  const { data, error } = await supabase.functions.invoke("artifact-share-revoke", {
    body: { artifact_id: artifactId },
  });
  if (error) return { ok: false, reason: error.message };
  return { ok: !!(data as any)?.ok, reason: (data as any)?.error };
}

export async function retryDelivery(artifactId: string): Promise<{ ok: boolean; reason?: string }> {
  return resendArtifactToTelegram({ id: artifactId } as ArtifactRow);
}

export interface PublicArtifactPayload {
  artifact: {
    id: string;
    title: string;
    artifact_type: string;
    source_module: string;
    preview_text: string | null;
    mime_type: string | null;
    size_bytes: number | null;
    created_at: string;
    share_expires_at: string | null;
  };
  signed_url: string | null;
}

export async function fetchPublicArtifact(token: string): Promise<{ ok: boolean; data?: PublicArtifactPayload; status?: "not_found" | "expired" | "revoked" | "error"; reason?: string }> {
  const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/artifact-public-view?token=${encodeURIComponent(token)}`;
  try {
    const r = await fetch(url, {
      headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string },
    });
    const j = await r.json().catch(() => ({}));
    if (r.status === 404) return { ok: false, status: "not_found" };
    if (!r.ok) return { ok: false, status: "error", reason: j?.error };
    return { ok: true, data: j as PublicArtifactPayload };
  } catch (e: any) {
    return { ok: false, status: "error", reason: e?.message };
  }
}