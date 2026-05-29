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

export type DeliveryRow = {
  id: string;
  tool_slug: string;
  channel: string;
  content_title: string | null;
  content_preview: string | null;
  client_id: string | null;
  created_at: string;
};

/** Recent deliveries for the current owner, joined with client name in-memory. */
export async function listRecentDeliveries(
  ownerId: string,
  limit = 100,
): Promise<Array<DeliveryRow & { client_name: string | null }>> {
  const { data: deliveries } = await workspaceDb
    .from("work_deliveries")
    .select("id, tool_slug, channel, content_title, content_preview, client_id, created_at")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = (deliveries as DeliveryRow[]) || [];
  if (rows.length === 0) return [];
  const ids = Array.from(new Set(rows.map(r => r.client_id).filter(Boolean) as string[]));
  let nameById = new Map<string, string>();
  if (ids.length) {
    const { data: clients } = await workspaceDb
      .from("work_clients")
      .select("id, name")
      .in("id", ids);
    nameById = new Map(((clients as Array<{ id: string; name: string }>) || []).map(c => [c.id, c.name]));
  }
  return rows.map(r => ({ ...r, client_name: r.client_id ? nameById.get(r.client_id) ?? null : null }));
}

/** Client profile + their delivery history. Used by /dashboard/clients/:id. */
export async function getClientDetail(
  ownerId: string,
  clientId: string,
): Promise<{
  client: WorkClientLite | null;
  deliveries: DeliveryRow[];
}> {
  const [{ data: c }, { data: d }] = await Promise.all([
    workspaceDb
      .from("work_clients")
      .select("id, name, phone, email, company, delivery_count, last_delivery_at")
      .eq("owner_id", ownerId)
      .eq("id", clientId)
      .maybeSingle(),
    workspaceDb
      .from("work_deliveries")
      .select("id, tool_slug, channel, content_title, content_preview, client_id, created_at")
      .eq("owner_id", ownerId)
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  return {
    client: (c as WorkClientLite) || null,
    deliveries: (d as DeliveryRow[]) || [],
  };
}