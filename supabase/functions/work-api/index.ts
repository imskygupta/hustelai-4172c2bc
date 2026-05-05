import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import * as Sentry from "https://deno.land/x/sentry@8.45.0/index.mjs";

const SENTRY_DSN = Deno.env.get("SENTRY_DSN");
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: Deno.env.get("SUPABASE_URL") || "edge",
  });
}

function reportError(err: unknown, ctx?: Record<string, any>) {
  console.error("[work-api]", err, ctx);
  if (SENTRY_DSN) {
    try {
      Sentry.captureException(err, {
        tags: { module: "work", action: ctx?.kind },
        extra: ctx,
      });
    } catch { /* ignore */ }
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Single backend entrypoint for Work module writes.
 * - Verifies caller via primary Supabase JWT (auth.uid)
 * - All owner_id values are derived from the verified JWT (never trusted from body)
 * - Writes go to the secondary workspace Supabase project
 */

const PRIMARY_URL  = Deno.env.get("SUPABASE_URL")!;
const PRIMARY_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const WORKSPACE_URL = "https://utflzmecghdtcjupgdan.supabase.co";
const WORKSPACE_KEY = "sb_publishable_riUGl3kMundQwxXEg5wcyA_evCjBvqA";

const RESEND_API_KEY  = Deno.env.get("RESEND_API_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const INNGEST_API_KEY = Deno.env.get("INNGEST_API_KEY");
const RESEND_FROM     = "HustleAI <noreply@hustlaiapp.in>";

/**
 * Centralized email sender (Resend via Lovable connector gateway).
 * Fire-and-forget — never throws, never blocks the main action.
 * All external integrations (email, payments, notifications) live here.
 */
async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY || !LOVABLE_API_KEY) {
    console.warn("[work-api:email] missing RESEND_API_KEY / LOVABLE_API_KEY — skipping send");
    return;
  }
  try {
    const r = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({ from: RESEND_FROM, to: [to], subject, html }),
    });
    if (!r.ok) console.error("[work-api:email]", r.status, await r.text().catch(() => ""));
  } catch (e: any) {
    console.error("[work-api:email] error", e?.message || e);
  }
}

/**
 * Fire-and-forget Inngest event emitter via Lovable connector gateway.
 * Used to trigger durable background workflows (reminders, follow-ups).
 */
async function emitEvent(name: string, data: Record<string, unknown>): Promise<void> {
  if (!LOVABLE_API_KEY || !INNGEST_API_KEY) {
    console.warn("[work-api:inngest] missing LOVABLE_API_KEY / INNGEST_API_KEY — skipping event", name);
    return;
  }
  try {
    const r = await fetch("https://connector-gateway.lovable.dev/inngest/e/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": INNGEST_API_KEY,
      },
      body: JSON.stringify({ name, data }),
    });
    if (!r.ok) console.error("[work-api:inngest]", name, r.status, await r.text().catch(() => ""));
  } catch (e: any) {
    console.error("[work-api:inngest] error", name, e?.message || e);
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type Action =
  | { kind: "invoice.create"; client_name: string; service: string; amount: number; due_date?: string | null; notes?: string | null; client_email?: string | null }
  | { kind: "invoice.update_status"; id: string; status: "pending" | "paid" | "overdue" }
  | { kind: "invoice.delete"; id: string }
  | { kind: "checklist.create"; title: string; template: string; tasks: { label: string; done: boolean }[] }
  | { kind: "checklist.update_tasks"; id: string; tasks: { label: string; done: boolean }[] }
  | { kind: "checklist.delete"; id: string }
  | { kind: "daily.upsert"; log_date: string; proposals_sent: number; leads_found: number; clients_contacted: number; notes?: string | null };

function bad(msg: string) { return json({ error: msg }, 400); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST")    return json({ error: "Method not allowed" }, 405);

  // 1. Verify caller (primary JWT)
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  const primary = createClient(PRIMARY_URL, PRIMARY_ANON, { global: { headers: { Authorization: auth } } });
  const { data: claimsRes, error: claimsErr } = await primary.auth.getClaims(auth.replace("Bearer ", ""));
  if (claimsErr || !claimsRes?.claims?.sub) return json({ error: "Unauthorized" }, 401);
  const userId = claimsRes.claims.sub as string;
  const userEmail = (claimsRes.claims as any)?.email as string | undefined;

  // 2. Parse + validate
  let action: Action;
  try { action = (await req.json()) as Action; } catch { return bad("Invalid JSON"); }
  if (!action || typeof (action as any).kind !== "string") return bad("Missing 'kind'");

  const ws = createClient(WORKSPACE_URL, WORKSPACE_KEY, { auth: { persistSession: false } });

  try {
    switch (action.kind) {
      case "invoice.create": {
        const { client_name, service, amount } = action;
        if (!client_name?.trim() || !service?.trim()) return bad("client_name and service are required");
        if (!Number.isFinite(amount) || amount <= 0)  return bad("amount must be > 0");
        const { data, error } = await ws.from("work_invoices").insert({
          owner_id: userId,
          client_name: client_name.trim().slice(0, 200),
          service: service.trim().slice(0, 500),
          amount,
          currency: "INR",
          status: "pending",
          due_date: action.due_date || null,
          notes: action.notes?.slice(0, 2000) || null,
        }).select().single();
        if (error) throw error;

        // 🔌 Centralized integration: notify owner + optional client
        const amt = `₹${Number(amount).toLocaleString("en-IN")}`;
        const due = action.due_date ? ` (due ${action.due_date})` : "";
        if (userEmail) {
          sendEmail(
            userEmail,
            `Invoice created for ${client_name}`,
            `<p>Your invoice <strong>${data.invoice_number || data.id}</strong> for <strong>${client_name}</strong> — ${service} — <strong>${amt}</strong>${due} is saved.</p><p>Track it in your HustleAI Work hub.</p>`
          );
        }
        const clientEmail = action.client_email?.trim();
        if (clientEmail && /\S+@\S+\.\S+/.test(clientEmail)) {
          sendEmail(
            clientEmail,
            `Invoice ${data.invoice_number || ""} from HustleAI`,
            `<p>Hi ${client_name},</p><p>Please find your invoice for <strong>${service}</strong> — total <strong>${amt}</strong>${due}.</p><p>Sent via HustleAI Work.</p>`
          );
        }

        // 🔁 Trigger durable follow-up workflow (Day 3 reminder, Day 7 overdue).
        emitEvent("work/invoice.created", {
          invoice_id: data.id,
          owner_id: userId,
          owner_email: userEmail || null,
          client_name,
          client_email: clientEmail || null,
          amount,
          currency: "INR",
          due_date: action.due_date || null,
          invoice_number: data.invoice_number || null,
        });

        return json({ ok: true, row: data });
      }
      case "invoice.update_status": {
        if (!action.id) return bad("id required");
        if (!["pending", "paid", "overdue"].includes(action.status)) return bad("invalid status");
        const { data: row, error } = await ws.from("work_invoices")
          .update({ status: action.status })
          .eq("id", action.id).eq("owner_id", userId)
          .select().maybeSingle();
        if (error) throw error;

        // 🔌 Notify owner when an invoice is marked paid
        if (action.status === "paid" && userEmail && row) {
          const amt = `₹${Number(row.amount).toLocaleString("en-IN")}`;
          sendEmail(
            userEmail,
            `Invoice paid — ${row.client_name}`,
            `<p>🎉 <strong>${row.client_name}</strong> marked invoice <strong>${row.invoice_number || row.id}</strong> as paid (${amt}).</p>`
          );
        }
        // 🔁 Cancel/branch downstream reminders.
        emitEvent("work/invoice.status_changed", {
          invoice_id: action.id,
          owner_id: userId,
          status: action.status,
        });
        return json({ ok: true });
      }
      case "invoice.delete": {
        if (!action.id) return bad("id required");
        const { error } = await ws.from("work_invoices").delete().eq("id", action.id).eq("owner_id", userId);
        if (error) throw error;
        return json({ ok: true });
      }
      case "checklist.create": {
        if (!action.title?.trim()) return bad("title required");
        if (!Array.isArray(action.tasks)) return bad("tasks must be array");
        const { data, error } = await ws.from("work_checklists").insert({
          owner_id: userId,
          title: action.title.trim().slice(0, 200),
          template: action.template?.slice(0, 100) || "Custom",
          tasks: action.tasks.slice(0, 100).map(t => ({ label: String(t.label).slice(0, 200), done: !!t.done })),
        }).select().single();
        if (error) throw error;
        return json({ ok: true, row: data });
      }
      case "checklist.update_tasks": {
        if (!action.id || !Array.isArray(action.tasks)) return bad("id and tasks required");
        const { error } = await ws.from("work_checklists")
          .update({ tasks: action.tasks.slice(0, 100).map(t => ({ label: String(t.label).slice(0, 200), done: !!t.done })) })
          .eq("id", action.id).eq("owner_id", userId);
        if (error) throw error;
        return json({ ok: true });
      }
      case "checklist.delete": {
        if (!action.id) return bad("id required");
        const { error } = await ws.from("work_checklists").delete().eq("id", action.id).eq("owner_id", userId);
        if (error) throw error;
        return json({ ok: true });
      }
      case "daily.upsert": {
        if (!action.log_date) return bad("log_date required");
        const clamp = (n: unknown) => Math.max(0, Math.min(9999, Number(n) || 0));
        const { error } = await ws.from("work_daily_logs").upsert({
          owner_id: userId,
          log_date: action.log_date,
          proposals_sent: clamp(action.proposals_sent),
          leads_found: clamp(action.leads_found),
          clients_contacted: clamp(action.clients_contacted),
          notes: action.notes?.slice(0, 2000) || null,
        }, { onConflict: "owner_id,log_date" });
        if (error) throw error;
        emitEvent("work/daily.logged", {
          owner_id: userId,
          owner_email: userEmail || null,
          log_date: action.log_date,
        });
        return json({ ok: true });
      }
      default:
        return bad("Unknown action");
    }
  } catch (e: any) {
    reportError(e, { kind: action.kind, userId });
    return json({ error: e?.message || "Internal error" }, 500);
  }
});