import posthog from "posthog-js";
import { supabase } from "@/integrations/supabase/client";

let initialized = false;
let cachedUserId: string | null = null;

const SESSION_KEY = "ha_session_id";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = (crypto?.randomUUID?.() || `s_${Date.now()}_${Math.random().toString(36).slice(2)}`);
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

export function initAnalytics() {
  if (initialized) return;
  const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
  const host = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || "https://us.i.posthog.com";
  if (!key) return;
  posthog.init(key, {
    api_host: host,
    capture_pageview: true,
    capture_pageleave: true,
    person_profiles: "identified_only",
  });
  initialized = true;
}

export function track(event: string, props?: Record<string, any>) {
  if (!initialized) return;
  try { posthog.capture(event, props); } catch {}
}

export function identify(userId: string, traits?: Record<string, any>) {
  if (!initialized) return;
  cachedUserId = userId;
  try { posthog.identify(userId, traits); } catch {}
}

export function resetAnalytics() {
  cachedUserId = null;
  if (!initialized) return;
  try { posthog.reset(); } catch {}
}

/**
 * trackEvent — persistent funnel/event telemetry.
 * Writes to public.analytics_events (anon-friendly insert policy) so the
 * Activation Funnel in /admin/blog/traffic can read truth from the database.
 * Fire-and-forget; never blocks UX.
 */
export type FunnelEvent =
  | "route_view"
  | "signup_started"
  | "signup_completed"
  | "login_completed"
  | "persona_selected"
  | "onboarding_completed"
  | "workspace_created"
  | "first_project_created"
  | "first_proposal_created"
  | "portal_link_created"
  | "proposal_sent"
  | "deliver_clicked"
  | "payment_recorded"
  | (string & {});

export interface TrackEventOpts {
  surface?: string;
  feature?: string;
  capability?: string;
  tier?: string;
  meter?: string;
  valueNum?: number;
  metadata?: Record<string, any>;
}

export async function trackEvent(event: FunnelEvent, opts: TrackEventOpts = {}): Promise<void> {
  // Mirror to PostHog when available
  try { if (initialized) posthog.capture(event, { ...opts.metadata, ...opts }); } catch {}
  try {
    // Resolve user id without forcing a network roundtrip when possible
    let userId: string | null = cachedUserId;
    if (!userId) {
      try {
        const { data } = await supabase.auth.getSession();
        userId = data.session?.user?.id ?? null;
        if (userId) cachedUserId = userId;
      } catch { /* ignore */ }
    }
    const route = typeof window !== "undefined"
      ? window.location.pathname + window.location.search
      : null;
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : null;
    await (supabase as any).from("analytics_events").insert({
      user_id: userId,
      session_id: getSessionId(),
      event_name: event,
      surface: opts.surface ?? null,
      feature: opts.feature ?? null,
      capability: opts.capability ?? null,
      tier: opts.tier ?? null,
      meter: opts.meter ?? null,
      value_num: opts.valueNum ?? null,
      metadata: opts.metadata ?? {},
      route,
      user_agent: userAgent,
    });
  } catch {
    // never block UX on telemetry
  }
}