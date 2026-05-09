import { supabase } from "@/integrations/supabase/client";

export interface ExportRow {
  id: string;
  user_id: string;
  export_type: string;
  title: string;
  mime_type: string;
  size_bytes: number;
  status: string;
  storage_path: string | null;
  expires_at: string | null;
  delivered_at: string | null;
  created_at: string;
  metadata: any;
  telegram_file_id?: string | null;
  delivery_method?: string;
  download_count?: number;
  download_limit?: number | null;
  last_accessed_at?: string | null;
  is_favorite?: boolean;
  tags?: string[];
  watermarked?: boolean;
}

export async function listExports(opts: { search?: string; type?: string; status?: string; limit?: number } = {}) {
  let q = supabase.from("generated_exports" as any).select("*").order("created_at", { ascending: false }).limit(opts.limit || 50);
  if (opts.search) q = q.ilike("title", `%${opts.search}%`);
  if (opts.type) q = q.eq("export_type", opts.type);
  if (opts.status) q = q.eq("status", opts.status);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as unknown as ExportRow[];
}

export async function toggleFavorite(export_id: string, value: boolean) {
  const { error } = await supabase.from("generated_exports" as any)
    .update({ is_favorite: value } as any).eq("id", export_id);
  if (error) throw error;
}

export async function getTelegramDeeplink(export_id: string) {
  const { data, error } = await supabase.functions.invoke("export-tg-deeplink", { body: { export_id } });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as { ok: true; deep_link: string; bot_username: string; token: string };
}

export async function recentAccessLogs(limit = 10) {
  const { data, error } = await supabase
    .from("export_access_logs" as any)
    .select("id, export_id, action, created_at, ip_address")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function issueShareLink(input: { export_id: string; expires_in_minutes?: number; requires_otp?: boolean; max_uses?: number }) {
  const { data, error } = await supabase.functions.invoke("export-issue-token", { body: input });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).message || (data as any).error);
  return data as { ok: true; token: string; url: string; otp?: string | null; expires_at: string };
}

export async function deliverToTelegram(export_id: string) {
  const { data, error } = await supabase.functions.invoke("export-deliver-telegram", { body: { export_id } });
  if (error) throw error;
  return data;
}

export async function revokeExport(input: { export_id?: string; token_id?: string; delete_file?: boolean }) {
  const { data, error } = await supabase.functions.invoke("export-revoke", { body: input });
  if (error) throw error;
  return data;
}

export async function createExport(input: {
  export_type: string; title: string; mime_type?: string;
  file_b64?: string; storage_path?: string;
  metadata?: Record<string, any>; deliver_to_telegram?: boolean;
}) {
  const { data, error } = await supabase.functions.invoke("export-create", { body: input });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return (data as any).export as ExportRow;
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result || "");
      const i = s.indexOf(",");
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}