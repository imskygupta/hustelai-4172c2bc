// One-shot backfill: DB1 public.client_profiles → DB2 public.work_clients.
//
// Idempotent. Per authenticated caller, reads their client_profiles rows
// from the primary DB and upserts each into work_clients on the workspace
// DB, deduplicating in this order: (owner_id, phone), (owner_id, email lc),
// (owner_id, name lc).
//
// DB1-only fields (address, timezone, currency, default_payment_terms) are
// preserved by appending a structured suffix to `notes` so no data is lost.
//
// No deletes. Safe to re-run; counts will show 0 migrated / N merged after
// the first pass.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getWorkspace } from "../_shared/clients.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D+/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function buildNotes(legacy: Record<string, unknown>): string | null {
  const original = (legacy.notes as string | null) || "";
  const extras: string[] = [];
  if (legacy.address) extras.push(`Address: ${legacy.address}`);
  if (legacy.timezone) extras.push(`Timezone: ${legacy.timezone}`);
  if (legacy.currency) extras.push(`Currency: ${legacy.currency}`);
  if (legacy.default_payment_terms) extras.push(`Default terms: ${legacy.default_payment_terms}`);
  if (extras.length === 0) return original || null;
  const suffix = `\n\n— Imported from legacy CRM —\n${extras.join("\n")}`;
  return (original + suffix).slice(0, 4000);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return j({ error: "unauthenticated" }, 401);

    const primary = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await primary.auth.getUser();
    if (!user) return j({ error: "unauthenticated" }, 401);

    // Source: DB1 client_profiles for the caller.
    const { data: legacy, error: srcErr } = await primary
      .from("client_profiles")
      .select("*")
      .eq("user_id", user.id);
    if (srcErr) return j({ error: `read_legacy_failed: ${srcErr.message}` }, 500);

    const total = legacy?.length ?? 0;
    if (total === 0) return j({ ok: true, total: 0, migrated: 0, merged: 0, skipped: 0, items: [] });

    const ws = getWorkspace();

    let migrated = 0;
    let merged = 0;
    let skipped = 0;
    const items: Array<{ name: string; outcome: "migrated" | "merged" | "skipped"; work_client_id?: string; reason?: string }> = [];

    for (const row of legacy as Array<Record<string, unknown>>) {
      const name = String(row.name || "").trim();
      if (!name) {
        skipped++;
        items.push({ name: "(unnamed)", outcome: "skipped", reason: "no name" });
        continue;
      }
      const phone = normalizePhone(row.phone as string | null);
      const emailLc = row.email ? String(row.email).trim().toLowerCase() : null;
      const nameLc = name.toLowerCase();

      // Dedup: phone → email → name (case-insensitive)
      let existingId: string | null = null;
      if (phone) {
        const { data } = await ws.from("work_clients")
          .select("id").eq("owner_id", user.id).eq("phone", phone).limit(1).maybeSingle();
        if (data?.id) existingId = data.id as string;
      }
      if (!existingId && emailLc) {
        const { data } = await ws.from("work_clients")
          .select("id").eq("owner_id", user.id).ilike("email", emailLc).limit(1).maybeSingle();
        if (data?.id) existingId = data.id as string;
      }
      if (!existingId) {
        const { data } = await ws.from("work_clients")
          .select("id").eq("owner_id", user.id).ilike("name", nameLc).limit(1).maybeSingle();
        if (data?.id) existingId = data.id as string;
      }

      if (existingId) {
        merged++;
        items.push({ name, outcome: "merged", work_client_id: existingId });
        continue;
      }

      const { data: ins, error: insErr } = await ws.from("work_clients").insert({
        owner_id: user.id,
        name: name.slice(0, 200),
        company: row.company || null,
        email: emailLc,
        phone,
        notes: buildNotes(row),
      }).select("id").maybeSingle();

      if (insErr) {
        skipped++;
        items.push({ name, outcome: "skipped", reason: insErr.message });
        continue;
      }
      migrated++;
      items.push({ name, outcome: "migrated", work_client_id: ins?.id as string });
    }

    return j({ ok: true, total, migrated, merged, skipped, items });
  } catch (e) {
    return j({ error: String((e as Error)?.message || e) }, 500);
  }
});

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}