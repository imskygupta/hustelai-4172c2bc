import posthog from "posthog-js";

let initialized = false;

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
  try { posthog.identify(userId, traits); } catch {}
}

export function resetAnalytics() {
  if (!initialized) return;
  try { posthog.reset(); } catch {}
}