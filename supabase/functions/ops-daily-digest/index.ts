// Daily ops digest — calm operator pulse posted to Telegram admin chat.
// Aggregates last 24h: signups, paid conversions, exports, AI generations,
// automation runs, provider mix, failures, feedback count. Idempotent per day.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function count(sb: any, table: string, build: (q: any) => any): Promise<number> {
  try {
    let q = sb.from(table).select("*", { count: "exact", head: true });
    q = build(q);
    const { count: c } = await q;
    return c ?? 0;
  } catch { return 0; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
    const since = new Date(Date.now() - 86_400_000).toISOString();

    const [
      signups, paidConv, exports_, aiJobsOk, aiJobsFail,
      automationsOk, automationsFail, payFail, feedback, crashes,
    ] = await Promise.all([
      count(sb, "profiles", (q) => q.gte("created_at", since)),
      count(sb, "payments", (q) => q.eq("status", "paid").gte("created_at", since)),
      count(sb, "generated_exports", (q) => q.gte("created_at", since)),
      count(sb, "ai_jobs", (q) => q.eq("status", "completed").gte("created_at", since)),
      count(sb, "ai_jobs", (q) => q.eq("status", "failed").gte("created_at", since)),
      count(sb, "automation_runs", (q) => q.eq("status", "success").gte("created_at", since)),
      count(sb, "automation_runs", (q) => q.eq("status", "failed").gte("created_at", since)),
      count(sb, "payments", (q) => q.in("status", ["failed", "cancelled"]).gte("created_at", since)),
      count(sb, "user_feedback", (q) => q.gte("created_at", since)),
      count(sb, "admin_alerts", (q) => q.eq("kind", "client.crash").gte("created_at", since)),
    ]);

    // Provider mix from health table
    const { data: providers } = await sb
      .from("api_provider_health")
      .select("provider, status, success_rate, consecutive_failures")
      .order("success_rate", { ascending: false });
    const providerLine = (providers || [])
      .slice(0, 4)
      .map((p: any) => `${p.provider}:${Math.round(Number(p.success_rate))}%`)
      .join(" · ") || "n/a";

    const conversionPct = signups > 0 ? Math.round((paidConv / signups) * 100) : 0;
    const aiTotal = aiJobsOk + aiJobsFail;
    const aiSuccess = aiTotal > 0 ? Math.round((aiJobsOk / aiTotal) * 100) : 100;

    const message =
      `🌅 Ops digest · 24h\n` +
      `\n` +
      `Users\n` +
      `• ${signups} signups · ${paidConv} paid (${conversionPct}%)\n` +
      `• ${feedback} feedback notes\n` +
      `\n` +
      `Delivery\n` +
      `• ${exports_} exports · ${automationsOk} automations ok · ${automationsFail} failed\n` +
      `\n` +
      `AI\n` +
      `• ${aiTotal} jobs (${aiSuccess}% success) · ${aiJobsFail} failed\n` +
      `• Providers: ${providerLine}\n` +
      `\n` +
      `Health\n` +
      `• ${payFail} payment failures · ${crashes} client crashes`;

    // Route through admin-alert so dedupe/Telegram fan-out is consistent.
    await sb.functions.invoke("admin-alert", {
      body: {
        kind: "ops.daily_digest",
        severity: "info",
        source: "ops-daily-digest",
        message,
        meta: {
          signups, paid: paidConv, exports: exports_,
          ai_ok: aiJobsOk, ai_fail: aiJobsFail,
          automations_ok: automationsOk, automations_fail: automationsFail,
          payment_failures: payFail, feedback, crashes,
        },
      },
    });

    // Force-send digest to Telegram even though severity=info
    const TG_BOT = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
    const TG_CHATS = (Deno.env.get("TELEGRAM_ADMIN_CHAT_IDS") || Deno.env.get("TELEGRAM_ADMIN_CHAT_ID") || "")
      .split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
    if (TG_BOT && TG_CHATS.length) {
      for (const chat of TG_CHATS) {
        await fetch(`https://api.telegram.org/bot${TG_BOT}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chat, text: message, disable_web_page_preview: true }),
        }).catch(() => {});
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});