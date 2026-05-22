import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initAnalytics } from "./lib/analytics";
import { initSentry } from "./lib/sentry";
import { initYandex } from "./lib/yandex";
import { loadServerRuntimeConfig } from "./config/runtime";
import { initCalmMode } from "./components/CalmModeToggle";
import { installCrashReporter } from "./lib/observability/reportCrash";
import { installPrimaryGuard } from "./integrations/supabase/primary-guard";
import { getActiveBootTasks, INFRA_SAFE_MODE, installDeadlockWatchdog } from "./lib/async/timeout";
import { installLeakDetector } from "./lib/runtime/leakDetector";

// Calm mode is a global preference (reduces motion + gradients across surfaces).
// Dark mode, by contrast, is scoped to the authenticated AppShell — see AppShell.tsx.
initCalmMode();
// Phase 7F: hard-fail any access to extracted tables on the primary client.
installPrimaryGuard();
installDeadlockWatchdog();
// Dev-only / opt-in (?hai_runtime_trace=1 in localStorage). No-op in prod.
installLeakDetector();
setTimeout(() => {
  const active = getActiveBootTasks();
  if (active.length > 0) {
    console.warn("[boot-watchdog] app boot exceeded 4s; rendering remains fail-open", active);
  }
}, 4_000);
console.info(`[infra-safe-mode] ${INFRA_SAFE_MODE ? "enabled" : "disabled"}`);
initSentry();
initAnalytics();
// Lightweight client-side crash signal → admin-alert (cooldown-throttled).
installCrashReporter();
// Lazy-init Yandex Metrica after hydration (uses requestIdleCallback inside).
initYandex();
// Fire-and-forget. Failures NEVER block boot — runtime falls back to defaults.
loadServerRuntimeConfig();

// SPA redirect handler: if 404.html redirected here with ?redirect= param
const params = new URLSearchParams(window.location.search);
const redirectPath = params.get("redirect");
if (redirectPath && redirectPath !== "/") {
  window.history.replaceState(null, "", redirectPath);
}

createRoot(document.getElementById("root")!).render(<App />);
