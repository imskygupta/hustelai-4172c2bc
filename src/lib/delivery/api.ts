// Client-side helpers for the Universal Delivery Layer.
// All calls are scoped server-side by the user's JWT; the frontend never
// passes owner_id. Channels recorded: whatsapp_opened | telegram_sent |
// telegram_pdf_sent | saved_to_client.
import { supabase } from "@/integrations/supabase/client";
import { workspaceDb } from "@/integrations/workspace/client";

export type DeliverClient = {
  id?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  company?: string | null;
};

export type WorkClientLite = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  delivery_count?: number | null;
  last_delivery_at?: string | null;
};

async function invoke(path: string, body: unknown) {
  const { data: { session } } = await supabase.auth.getSession();
  const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token ?? ""}`,
    },
    body: JSON.stringify(body),
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error((json as { error?: string })?.error || `delivery failed (${resp.status})`);
  return json as Record<string, unknown>;
}

export function recordDelivery(payload: {
  tool_slug: string;
  channel: "whatsapp_opened" | "saved_to_client";
  content_title?: string | null;
  content_preview?: string | null;
  client?: DeliverClient | null;
}) {
  return invoke("delivery-record", payload);
}

export function sendDeliveryTelegram(payload: {
  tool_slug: string;
  title?: string;
  text: string;
  client?: DeliverClient | null;
}) {
  return invoke("delivery-telegram", payload);
}

export async function sendDeliveryTelegramPdf(payload: {
  tool_slug: string;
  title: string;
  filename: string;
  pdf?: Blob;
  pdf_url?: string;
  client?: DeliverClient | null;
}) {
  let pdf_base64: string | undefined;
  if (payload.pdf) {
    pdf_base64 = await blobToBase64(payload.pdf);
  }
  return invoke("delivery-telegram-pdf", {
    tool_slug: payload.tool_slug,
    title: payload.title,
    filename: payload.filename,
    pdf_url: payload.pdf_url,
    pdf_base64,
    client: payload.client,
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => {
      const s = String(r.result || "");
      resolve(s.slice(s.indexOf(",") + 1));
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export function normalizePhoneForWa(raw: string): string {
  const digits = String(raw || "").replace(/\D+/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export function buildWaUrl(phone: string, text: string): string {
  const digits = normalizePhoneForWa(phone);
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** Fetch the current user's existing clients from DB2 for the picker. */
export async function listWorkClients(ownerId: string): Promise<WorkClientLite[]> {
  const { data } = await workspaceDb
    .from("work_clients")
    .select("id, name, phone, email, company, delivery_count, last_delivery_at")
    .eq("owner_id", ownerId)
    .order("last_delivery_at", { ascending: false, nullsFirst: false } as never)
    .limit(50);
  return (data as WorkClientLite[]) || [];
}