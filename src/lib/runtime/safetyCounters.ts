type CounterEvent = { at: number; label: string; detail?: unknown };

const WINDOW_MS = 10_000;
const AUTH_STORM_LIMIT = 20;
const REDIRECT_LOOP_LIMIT = 5;

let fullRuntimeBootStarted = false;
let activeRuntimeMounts = 0;
const authEvents: CounterEvent[] = [];
const redirects: CounterEvent[] = [];

function devEnabled() {
  try {
    return Boolean((import.meta as any).env?.DEV) || localStorage.getItem("hai_runtime_trace") === "1";
  } catch {
    return false;
  }
}

function prune(list: CounterEvent[]) {
  const cutoff = Date.now() - WINDOW_MS;
  while (list.length && list[0].at < cutoff) list.shift();
}

export function markFullRuntimeBootStarted() {
  fullRuntimeBootStarted = true;
}

export function hasFullRuntimeBootStarted() {
  return fullRuntimeBootStarted;
}

export function assertRestrictedRuntimeBoundary(restricted: boolean, label: string) {
  if (!restricted || !fullRuntimeBootStarted || !devEnabled()) return;
  console.error("[runtime-safety] Restricted user entered app runtime", {
    label,
    path: window.location.pathname,
    activeRuntimeMounts,
  });
}

export function recordAuthListenerEvent(label: string, detail?: unknown) {
  if (!devEnabled()) return;
  authEvents.push({ at: Date.now(), label, detail });
  prune(authEvents);
  if (authEvents.length > AUTH_STORM_LIMIT) {
    console.error("[runtime-safety] Auth listener storm detected", {
      count: authEvents.length,
      recent: authEvents.slice(-8),
    });
  }
}

export function recordRedirectAttempt(from: string, to: string, reason: string) {
  if (!devEnabled()) return;
  const label = `${from}->${to}`;
  redirects.push({ at: Date.now(), label, detail: reason });
  prune(redirects);
  const same = redirects.filter((r) => r.label === label).length;
  if (same >= REDIRECT_LOOP_LIMIT) {
    console.error("[runtime-safety] Redirect loop detected", { from, to, reason, count: same });
  }
}

export function registerRuntimeMount(label: string) {
  activeRuntimeMounts += 1;
  if (devEnabled()) {
    console.info("[runtime-safety] runtime_mount", { label, activeRuntimeMounts });
  }
  return () => {
    activeRuntimeMounts = Math.max(0, activeRuntimeMounts - 1);
  };
}

export function getRuntimeSafetySnapshot() {
  prune(authEvents);
  prune(redirects);
  return {
    fullRuntimeBootStarted,
    activeRuntimeMounts,
    recentAuthEvents: authEvents.length,
    recentRedirects: redirects.length,
  };
}