// Action registry for the workflow engine.
// Each action is a pure async function receiving { params, context, run }.
// Returning an object merges into run.context for subsequent steps.
import { sendTelegram } from "../notifications/telegram.ts";

export interface ActionContext {
  params: Record<string, any>;
  context: Record<string, any>;
  run: {
    id: string;
    workflow_id: string;
    user_id: string | null;
    payload: Record<string, any>;
  };
  sb: any; // service-role client
}

export type ActionHandler = (ctx: ActionContext) => Promise<Record<string, any> | void>;

/**
 * Resolve `{{path.to.value}}` placeholders inside string params using the run
 * context + payload. Keeps the engine declarative without a templating dep.
 */
export function resolveParams(params: Record<string, any>, ctx: ActionContext): Record<string, any> {
  const scope = { ...ctx.run.payload, ...ctx.context, payload: ctx.run.payload };
  const replace = (s: string) =>
    s.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
      const v = path.split(".").reduce<any>((a, k) => (a == null ? a : a[k]), scope);
      return v == null ? "" : String(v);
    });
  const walk = (v: any): any => {
    if (typeof v === "string") return replace(v);
    if (Array.isArray(v))      return v.map(walk);
    if (v && typeof v === "object") {
      const out: Record<string, any> = {};
      for (const k of Object.keys(v)) out[k] = walk(v[k]);
      return out;
    }
    return v;
  };
  return walk(params);
}

// ── Action implementations ──────────────────────────────────────────────────

const sleep: ActionHandler = async ({ params }) => {
  // No-op at execution time — handled at scheduler level via `delay_ms`.
  return { slept: Number(params.ms ?? 0) };
};

const telegramSend: ActionHandler = async ({ params, run, sb }) => {
  const userId = params.user_id || run.user_id;
  let chatId: string | null = params.chat_id || null;
  if (!chatId && userId) {
    const { data } = await sb.from("notification_integrations")
      .select("provider_chat_id")
      .eq("user_id", userId).eq("provider", "telegram").eq("status", "connected")
      .maybeSingle();
    chatId = data?.provider_chat_id ?? null;
  }
  if (!chatId) return { skipped: true, reason: "no_chat_id" };
  const res = await sendTelegram(chatId, {
    title: params.title, body: params.body, url: params.url,
  });
  if (!res.ok) throw new Error(`telegram: ${res.error}`);
  return { telegram_message_id: res.external_message_id };
};

const emailSend: ActionHandler = async ({ params, run, sb }) => {
  // Delegate to existing send-email function (best-effort)
  const userId = params.user_id || run.user_id;
  let to = params.to;
  if (!to && userId) {
    const { data } = await sb.from("profiles").select("email").eq("user_id", userId).maybeSingle();
    to = data?.email;
  }
  if (!to) return { skipped: true, reason: "no_recipient" };
  const { error } = await sb.functions.invoke("send-email", {
    body: { to, subject: params.subject, template: params.template, html: params.html, vars: params.vars },
  });
  if (error) throw new Error(`email: ${error.message}`);
  return { email_to: to };
};

const webhookCall: ActionHandler = async ({ params }) => {
  const r = await fetch(params.url, {
    method: params.method || "POST",
    headers: { "Content-Type": "application/json", ...(params.headers || {}) },
    body: params.body ? JSON.stringify(params.body) : undefined,
  });
  if (!r.ok) throw new Error(`webhook ${r.status}`);
  return { webhook_status: r.status };
};

const grantCredits: ActionHandler = async ({ params, run, sb }) => {
  const userId = params.user_id || run.user_id;
  if (!userId) return { skipped: true, reason: "no_user" };
  const { error } = await sb.rpc("grant_bonus_credits", {
    _user: userId,
    _meter: params.meter || "ai",
    _amount: Number(params.amount || 0),
    _expires_at: params.expires_at || null,
    _reason: params.reason || `workflow:${run.workflow_id}`,
  });
  if (error) throw new Error(`grant_credits: ${error.message}`);
  return { credited: Number(params.amount || 0) };
};

const setTier: ActionHandler = async ({ params, run, sb }) => {
  const userId = params.user_id || run.user_id;
  if (!userId || !params.tier) return { skipped: true, reason: "missing" };
  const { error } = await sb.from("profiles").update({ subscription_tier: params.tier }).eq("user_id", userId);
  if (error) throw new Error(`set_tier: ${error.message}`);
  return { tier: params.tier };
};

const logEvent: ActionHandler = async ({ params, run, sb }) => {
  await sb.functions.invoke("log-event", {
    body: {
      category: params.category || "automation",
      action: params.action || "workflow_step",
      severity: params.severity || "info",
      source: "workflow",
      payload: { ...params.payload, workflow_id: run.workflow_id, run_id: run.id },
    },
  }).catch(() => {});
  return { logged: true };
};

const enqueueChild: ActionHandler = async ({ params, run, sb }) => {
  const { data, error } = await sb.rpc("enqueue_workflow_runs", {
    _event_name: params.event,
    _payload: { ...(params.payload || {}), parent_run: run.id },
    _user_id: params.user_id || run.user_id,
    _dedupe_key: params.dedupe_key || `${run.id}:${params.event}`,
    _source: "workflow",
  });
  if (error) throw new Error(`enqueue_child: ${error.message}`);
  return { child_event: data };
};

export const ACTIONS: Record<string, ActionHandler> = {
  "sleep":              sleep,
  "telegram.send":      telegramSend,
  "email.send":         emailSend,
  "webhook.call":       webhookCall,
  "credits.grant":      grantCredits,
  "tier.set":           setTier,
  "event.log":          logEvent,
  "workflow.enqueue":   enqueueChild,
};