// Universal Delivery Layer — delivery-record
// Validates the caller, finds or creates the client on DB2 (work_clients),
// and appends a work_deliveries row. Channels: whatsapp_opened |
// telegram_sent | telegram_pdf_sent | saved_to_client.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getWorkspace } from "../_shared/clients.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CHANNELS = new Set([
  "whatsapp_opened",
  "telegram_sent",
  "telegram_pdf_sent",
  "saved_to_client",
]);

function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D+/g, "");
  if (!digits) return null;
  // Default India CC if number is 10 digits and no leading country code
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export async function recordDelivery(input: {
  user_id: string;
  tool_slug: string;
  channel: string;
  content_title?: string | null;
  content_preview?: string | null;
  ref_kind?: string | null;
  ref_id?: string | null;
  client?: {
    id?: string | null;
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    company?: string | null;
  } | null;
}) {
  if (!CHANNELS.has(input.channel)) {
    throw new Error(`invalid channel: ${input.channel}`);
  }
  const ws = getWorkspace();
  let clientId: string | null = input.client?.id ?? null;

  if (!clientId && (input.client?.phone || input.client?.email)) {
    const phone = normalizePhone(input.client?.phone);
    const emailLc = input.client?.email ? String(input.client.email).trim().toLowerCase() : null;

    // Dedupe: phone first, then email
    if (phone) {
      const { data } = await ws.from("work_clients")
        .select("id").eq("owner_id", input.user_id).eq("phone", phone).maybeSingle();
      if (data?.id) clientId = data.id as string;
    }
    if (!clientId && emailLc) {
      const { data } = await ws.from("work_clients")
        .select("id").eq("owner_id", input.user_id).ilike("email", emailLc).maybeSingle();
      if (data?.id) clientId = data.id as string;
    }
    if (!clientId) {
      const { data, error } = await ws.from("work_clients").insert({
        owner_id: input.user_id,
        name: (input.client?.name || "Untitled client").slice(0, 200),
        phone,
        email: emailLc,
        company: input.client?.company || null,
      }).select("id").maybeSingle();
      if (error) throw new Error(`client_create_failed: ${error.message}`);
      clientId = data?.id as string;
    }
  }

  const { data: delivery, error: delErr } = await ws.from("work_deliveries").insert({
    owner_id: input.user_id,
    client_id: clientId,
    tool_slug: input.tool_slug.slice(0, 120),
    channel: input.channel,
    content_title: input.content_title ? String(input.content_title).slice(0, 200) : null,
    content_preview: input.content_preview ? String(input.content_preview).slice(0, 280) : null,
    ref_kind: input.ref_kind || null,
    ref_id: input.ref_id || null,
  }).select("id").maybeSingle();
  if (delErr) throw new Error(`delivery_insert_failed: ${delErr.message}`);

  // Best-effort rollup on the client row.
  if (clientId) {
    try {
      const { data: cur } = await ws.from("work_clients")
        .select("delivery_count").eq("id", clientId).maybeSingle();
      await ws.from("work_clients").update({
        last_delivery_at: new Date().toISOString(),
        delivery_count: ((cur?.delivery_count as number) || 0) + 1,
      }).eq("id", clientId);
    } catch {/* non-fatal */}
  }

  return { client_id: clientId, delivery_id: delivery?.id as string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return j({ error: "unauthenticated" }, 401);
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return j({ error: "unauthenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const result = await recordDelivery({ ...body, user_id: user.id });
    return j({ ok: true, ...result });
  } catch (e) {
    return j({ error: String((e as Error)?.message || e) }, 400);
  }
});

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}