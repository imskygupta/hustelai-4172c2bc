import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initAnalytics } from "./lib/analytics";
import { initSentry } from "./lib/sentry";
import { initYandex } from "./lib/yandex";
import { loadServerRuntimeConfig } from "./config/runtime";
import { initCalmMode } from "./components/CalmModeToggle";
import { installCrashReporter } from "./lib/observability/reportCrash";

// Calm mode is a global preference (reduces motion + gradients across surfaces).
// Dark mode, by contrast, is scoped to the authenticated AppShell — see AppShell.tsx.
initCalmMode();
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
