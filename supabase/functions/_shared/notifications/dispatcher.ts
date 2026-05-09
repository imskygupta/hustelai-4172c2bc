// Provider-agnostic notification dispatcher. Routes events through enabled
// channels per user preferences. Fire-and-forget — never blocks callers.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { NotificationMessage, ProviderId, NotificationProvider } from "./types.ts";
import { telegramProvider } from "./telegram.ts";
import { emailProvider, sendEmailFallback } from "./email.ts";

const PROVIDERS: Record<string, NotificationProvider> = {
  telegram: telegramProvider,
  email: emailProvider,
};

// Preset → channel order. Drives both routing AND eligibility.
// silent     = nothing except critical
// critical   = security/billing failures only
// growth     = wins (payments, AI done, affiliate, achievements)
// ops        = everything (admin/power users)
const CRITICAL_KEYS = new Set([
  "payment_failed","payment_succeeded","upi_submitted","upi_approved","upi_rejected",
  "security_alert","login_new_device","webhook_failed","subscription_cancelled",
]);
const GROWTH_KEYS = new Set([
  "payment_succeeded","subscription_upgraded","wallet_topup","ai_task_complete",
  "affiliate_commission","achievement_unlocked","broadcast",
]);
function presetAllows(preset: string, eventKey: string): boolean {
  switch (preset) {
    case "silent":   return CRITICAL_KEYS.has(eventKey);
    case "critical": return CRITICAL_KEYS.has(eventKey);
    case "growth":   return GROWTH_KEYS.has(eventKey) || CRITICAL_KEYS.has(eventKey);
    case "ops":      return true;
    default:         return true;
  }
}

function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

export interface DispatchInput {
  user_id?: string | null;
  event_key: string;          // e.g. "payment_success", "wallet_low_balance"
  category?: string;          // billing | ai | security | system | ops | ...
  message: NotificationMessage;
  channels?: ProviderId[];    // override prefs (e.g. for test)
  source?: string;
  link?: string;
  email_fallback?: string;    // raw email to fall back to if all providers fail
}

/**
 * Dispatch a notification. Fire-and-forget by default.
 * Returns immediately; actual delivery happens in background.
 */
export function dispatchNotification(input: DispatchInput): void {
  void (async () => {
    try {
      const sb = adminClient();
      // 1) record event
      const { data: ev } = await sb.from("notification_events").insert({
        user_id: input.user_id || null,
        event_key: input.event_key,
        category: input.category || "general",
        title: input.message.title || null,
        body: input.message.body || null,
        payload: input.message.payload || {},
        source: input.source || null,
        link: input.link || input.message.url || null,
      }).select().single();

      if (!input.user_id) return; // ops-only events have no user routing

      // 2) resolve channels + preset gating
      let channels: ProviderId[] = input.channels || [];
      let preset = "default";
      if (channels.length === 0) {
        const { data: prefs } = await sb.from("notification_preferences")
          .select("channel_prefs, preset").eq("user_id", input.user_id).maybeSingle();
        preset = (prefs as any)?.preset || "default";
        const map = (prefs?.channel_prefs || {}) as Record<string, ProviderId[]>;
        channels = map[input.event_key] || map["*"] || ["telegram"];
      }
      if (!presetAllows(preset, input.event_key)) return;

      // 3) load active integrations
      const { data: integrations } = await sb.from("notification_integrations")
        .select("*").eq("user_id", input.user_id).eq("status", "connected")
        .in("provider", channels);

      let anyOk = false;
      for (const integ of integrations || []) {
        const provider = PROVIDERS[integ.provider];
        if (!provider) continue;
        const { data: del } = await sb.from("notification_deliveries").insert({
          event_id: ev?.id,
          user_id: input.user_id,
          provider: integ.provider,
          status: "queued",
          attempt_count: 1,
        }).select().single();

        const result = await provider.send(integ as any, input.message);
        if (result.ok) anyOk = true;
        await sb.from("notification_deliveries").update({
          status: result.ok ? "sent" : (result.skipped ? "skipped" : "failed"),
          last_error: result.error || null,
          external_message_id: result.external_message_id || null,
          delivered_at: result.ok ? new Date().toISOString() : null,
        }).eq("id", del!.id);

        if (result.ok) {
          await sb.from("notification_integrations").update({
            last_active_at: new Date().toISOString(),
          }).eq("id", integ.id);
        }
      }

      // 4) Email failover for critical events when nothing succeeded.
      if (!anyOk && CRITICAL_KEYS.has(input.event_key)) {
        const fallbackEmail = input.email_fallback
          || (await sb.from("profiles").select("email").eq("user_id", input.user_id).maybeSingle()).data?.email;
        if (fallbackEmail) {
          const r = await sendEmailFallback(fallbackEmail, input.message);
          await sb.from("notification_deliveries").insert({
            event_id: ev?.id,
            user_id: input.user_id,
            provider: "email",
            status: r.ok ? "sent" : "failed",
            attempt_count: 1,
            last_error: r.error || null,
            delivered_at: r.ok ? new Date().toISOString() : null,
          });
        }
      }
    } catch (e) {
      console.error("dispatchNotification failed", e);
    }
  })();
}