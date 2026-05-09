// Shared helper for creating an export record. Used by other edge functions
// that produce files (PDFs, CSVs, AI exports). Frontend uses the
// `export-create` edge function instead.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface CreateExportInput {
  user_id: string;
  export_type: string;
  title: string;
  mime_type?: string;
  // either provide bytes (base64) OR a pre-uploaded storage_path inside the `exports` bucket
  file_b64?: string;
  storage_path?: string;
  size_bytes?: number;
  metadata?: Record<string, any>;
  deliver_to_telegram?: boolean;
}

const FREE_TTL_HOURS = 24 * 7; // 7 days for free tier (Telegram-cached delivery)
const PERSISTENT_TIERS = new Set(["pro", "elite", "infinity"]);

export async function createExport(input: CreateExportInput) {
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: profile } = await sb.from("profiles")
    .select("subscription_tier").eq("user_id", input.user_id).maybeSingle();
  const tier = (profile?.subscription_tier || "free").toLowerCase();
  const isPersistent = PERSISTENT_TIERS.has(tier);
  const expiresAt = isPersistent ? null : new Date(Date.now() + FREE_TTL_HOURS * 3600_000).toISOString();

  let storagePath = input.storage_path || null;
  let sizeBytes = input.size_bytes || 0;
  const mime = input.mime_type || "application/octet-stream";

  if (!storagePath && input.file_b64) {
    const bytes = Uint8Array.from(atob(input.file_b64), (c) => c.charCodeAt(0));
    sizeBytes = bytes.byteLength;
    const ext = mime.includes("pdf") ? "pdf" : mime.includes("csv") ? "csv" : mime.includes("json") ? "json" : "bin";
    const safeTitle = input.title.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60);
    storagePath = `${input.user_id}/${input.export_type}/${Date.now()}_${safeTitle}.${ext}`;
    const up = await sb.storage.from("exports").upload(storagePath, bytes, {
      contentType: mime, upsert: false,
    });
    if (up.error) throw new Error(`upload failed: ${up.error.message}`);
  }

  const { data: row, error } = await sb.from("generated_exports").insert({
    user_id: input.user_id,
    tier_at_creation: tier,
    export_type: input.export_type,
    title: input.title,
    mime_type: mime,
    size_bytes: sizeBytes,
    storage_bucket: "exports",
    storage_path: storagePath,
    status: storagePath ? "ready" : "pending",
    expires_at: expiresAt,
    metadata: input.metadata || {},
  }).select("*").single();
  if (error) throw error;

  if (input.deliver_to_telegram) {
    // Fire-and-forget Telegram delivery (don't block creator)
    void fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/export-deliver-telegram`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ export_id: row.id }),
    }).catch(() => {});
  }

  // Fire-and-forget cache to Telegram storage channel (CDN layer).
  // No-op if TELEGRAM_STORAGE_CHANNEL_ID is not configured.
  if (storagePath) {
    void fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/export-cache-telegram`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ export_id: row.id }),
    }).catch(() => {});
  }

  return row;
}

export function siteOrigin(req: Request): string {
  const h = req.headers.get("origin") || req.headers.get("referer") || "";
  if (h) {
    try { return new URL(h).origin; } catch { /* ignore */ }
  }
  return Deno.env.get("PUBLIC_SITE_URL") || "https://hustlaiapp.in";
}

export function randomToken(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return btoa(String.fromCharCode(...buf)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}