import * as Sentry from "@sentry/react";

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

let initialized = false;

export function initSentry() {
  if (initialized) return;
  if (!DSN) {
    // No DSN configured — Sentry no-ops. Set VITE_SENTRY_DSN to enable.
    return;
  }
  Sentry.init({
    dsn: DSN,
    sendDefaultPii: true,
    environment: import.meta.env.MODE,
    release: (import.meta.env.VITE_APP_VERSION as string | undefined) || undefined,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
  });
  initialized = true;
}

export function setSentryUser(user: { id: string; email?: string | null; tier?: string | null }) {
  if (!initialized) return;
  Sentry.setUser({ id: user.id, email: user.email ?? undefined });
  Sentry.setTag("tier", user.tier ?? "free");
}

export function clearSentryUser() {
  if (!initialized) return;
  Sentry.setUser(null);
}

export function captureException(err: unknown, context?: Record<string, any>) {
  if (!initialized) {
    console.error(err, context);
    return;
  }
  Sentry.captureException(err, context ? { extra: context } : undefined);
}

export { Sentry };