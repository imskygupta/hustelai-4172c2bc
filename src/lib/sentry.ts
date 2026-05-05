import * as Sentry from "@sentry/react";

const DSN =
  import.meta.env.VITE_SENTRY_DSN ||
  "https://6e0833292c05effff24def2b803c03b7@o4511339052400640.ingest.us.sentry.io/4511339054891008";

let initialized = false;

export function initSentry() {
  if (initialized || !DSN) return;
  Sentry.init({
    dsn: DSN,
    sendDefaultPii: true,
    environment: import.meta.env.MODE,
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