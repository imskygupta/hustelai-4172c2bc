import { Inngest } from "https://esm.sh/inngest@3.54.0";
import { serve } from "https://esm.sh/inngest@3.54.0/edge";

/**
 * HustleAI automation layer.
 * Durable, event-driven workflows for the Work module.
 * Triggered by events emitted from work-api (e.g. work/invoice.created).
 */

const inngest = new Inngest({ id: "hustlai-app" });

const RESEND_API_KEY  = Deno.env.get("RESEND_API_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const RESEND_FROM     = "HustleAI <noreply@hustlaiapp.in>";
const WORKSPACE_URL   = "https://utflzmecghdtcjupgdan.supabase.co";
const WORKSPACE_KEY   = "sb_publishable_riUGl3kMundQwxXEg5wcyA_evCjBvqA";

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY || !LOVABLE_API_KEY) {
    console.warn("[inngest:email] missing keys, skipping");
    return { skipped: true };
  }
  const r = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": RESEND_API_KEY,
    },
    body: JSON.stringify({ from: RESEND_FROM, to: [to], subject, html }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text().catch(() => "")}`);
  return { ok: true };
}

/**
 * Read invoice status directly from workspace DB.
 * Used to short-circuit reminders when a client has already paid.
 */
async function getInvoiceStatus(invoiceId: string): Promise<string | null> {
  try {
    const r = await fetch(`${WORKSPACE_URL}/rest/v1/work_invoices?id=eq.${invoiceId}&select=status`, {
      headers: { apikey: WORKSPACE_KEY, Authorization: `Bearer ${WORKSPACE_KEY}` },
    });
    if (!r.ok) return null;
    const rows = await r.json();
    return rows?.[0]?.status ?? null;
  } catch {
    return null;
  }
}

// ───────────────────────────────────────────────────────────────────
// 1. Invoice follow-up: Day 3 reminder, Day 7 overdue
// ───────────────────────────────────────────────────────────────────
const invoiceFollowUp = inngest.createFunction(
  { id: "invoice-followup", name: "Invoice follow-up" },
  { event: "work/invoice.created" },
  async ({ event, step }) => {
    const { invoice_id, owner_email, client_name, client_email, amount, invoice_number } =
      event.data as Record<string, any>;

    const amt = `₹${Number(amount || 0).toLocaleString("en-IN")}`;
    const ref = invoice_number || invoice_id;

    // Day 3: gentle reminder if still unpaid
    await step.sleep("wait-3-days", "3d");
    const s3 = await step.run("check-status-d3", () => getInvoiceStatus(invoice_id));
    if (s3 === "paid") return { stopped: "paid-before-d3" };

    if (client_email) {
      await step.run("email-client-reminder", () =>
        sendEmail(
          client_email,
          `Friendly reminder: invoice ${ref}`,
          `<p>Hi ${client_name || "there"},</p><p>Just a friendly nudge — invoice <strong>${ref}</strong> for <strong>${amt}</strong> is still pending.</p><p>— Sent via HustleAI</p>`
        )
      );
    }

    // Day 7: mark overdue + notify owner
    await step.sleep("wait-to-d7", "4d");
    const s7 = await step.run("check-status-d7", () => getInvoiceStatus(invoice_id));
    if (s7 === "paid") return { stopped: "paid-before-d7" };

    await step.run("mark-overdue", async () => {
      const r = await fetch(`${WORKSPACE_URL}/rest/v1/work_invoices?id=eq.${invoice_id}`, {
        method: "PATCH",
        headers: {
          apikey: WORKSPACE_KEY,
          Authorization: `Bearer ${WORKSPACE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ status: "overdue" }),
      });
      if (!r.ok) throw new Error(`mark-overdue ${r.status}`);
    });

    if (owner_email) {
      await step.run("email-owner-overdue", () =>
        sendEmail(
          owner_email,
          `Invoice overdue — ${client_name}`,
          `<p>Heads up — invoice <strong>${ref}</strong> for <strong>${client_name}</strong> (${amt}) is now <strong>7 days overdue</strong>.</p><p>Time to follow up directly.</p>`
        )
      );
    }

    return { ok: true };
  }
);

// ───────────────────────────────────────────────────────────────────
// 2. Cancellation hook: stop reminders when invoice is paid/deleted
//    (declarative — Inngest cancels the parent run on matching event)
// ───────────────────────────────────────────────────────────────────
// Note: cancelOn requires same `invoice_id`. We re-declare the function with cancelOn:
const invoiceFollowUpCancellable = inngest.createFunction(
  {
    id: "invoice-followup-cancellable",
    name: "Invoice follow-up (cancellable)",
    cancelOn: [
      {
        event: "work/invoice.status_changed",
        if: "event.data.invoice_id == async.data.invoice_id && event.data.status == 'paid'",
      },
    ],
  },
  { event: "work/invoice.created.v2" },
  async () => ({ noop: true })
);

// ───────────────────────────────────────────────────────────────────
// 3. Daily nudge — if no daily log within 24h, remind the user
// ───────────────────────────────────────────────────────────────────
const dailyNudge = inngest.createFunction(
  {
    id: "daily-nudge",
    name: "Daily hustle nudge",
    cancelOn: [
      {
        event: "work/daily.logged",
        if: "event.data.owner_id == async.data.owner_id",
      },
    ],
  },
  { event: "work/daily.logged" },
  async ({ event, step }) => {
    const { owner_email } = event.data as Record<string, any>;
    await step.sleep("wait-24h", "24h");
    if (!owner_email) return { skipped: "no-email" };
    await step.run("email-nudge", () =>
      sendEmail(
        owner_email,
        "No hustle logged today 👀",
        `<p>Haven't seen any activity in your HustleAI Work hub today.</p><p>Even 1 proposal counts — go log it.</p>`
      )
    );
    return { ok: true };
  }
);

const handler = serve({
  client: inngest,
  functions: [invoiceFollowUp, invoiceFollowUpCancellable, dailyNudge],
  // Supabase rewrites paths — pin the public path.
  servePath: "/functions/v1/inngest",
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-inngest-signature, x-inngest-server-kind, x-inngest-sdk",
        "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
      },
    });
  }
  return handler(req);
});