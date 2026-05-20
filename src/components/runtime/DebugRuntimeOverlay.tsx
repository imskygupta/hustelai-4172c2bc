/**
 * Temporary runtime observability overlay.
 * Visible only when the URL contains `?debug_runtime=1`.
 */
import { useEffect, useState } from "react";
import { getActiveBootTasks, INFRA_SAFE_MODE } from "@/lib/async/timeout";
import { getHydrationPhase, getHydrationMetrics } from "@/lib/runtime/hydrationPhases";
import { getAllFeatureFlags } from "@/lib/runtime/featureFlags";
import { getAllDbStatus } from "@/lib/runtime/dbHealth";
import { getBreakerSnapshot, subscribeBreakers } from "@/lib/runtime/circuitBreaker";

function isEnabled() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("debug_runtime") === "1";
}

export default function DebugRuntimeOverlay() {
  const [, tick] = useState(0);
  const [enabled] = useState(isEnabled);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => tick((x) => x + 1), 1_000);
    const unsub = subscribeBreakers(() => tick((x) => x + 1));
    return () => { clearInterval(id); unsub(); };
  }, [enabled]);

  if (!enabled) return null;

  const tasks = getActiveBootTasks();
  const slowest = [...tasks].sort((a, b) => b.ageMs - a.ageMs)[0];
  const breakers = getBreakerSnapshot();
  const flags = getAllFeatureFlags();
  const dbs = getAllDbStatus();
  const metrics = getHydrationMetrics();

  return (
    <div
      style={{
        position: "fixed", bottom: 8, right: 8, zIndex: 99999,
        maxWidth: 380, maxHeight: "70vh", overflow: "auto",
        background: "rgba(8,10,16,0.92)", color: "#d7e3ff",
        fontFamily: "ui-monospace, SFMono-Regular, monospace",
        fontSize: 11, lineHeight: 1.45, padding: 12, borderRadius: 8,
        border: "1px solid rgba(120,160,255,0.3)",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>runtime · phase {getHydrationPhase()}</div>
      <div>safe-mode: <b>{INFRA_SAFE_MODE ? "on" : "off"}</b></div>
      <div>phase timings: A={metrics.A?.toFixed(0)} B={metrics.B?.toFixed(0) ?? "—"} C={metrics.C?.toFixed(0) ?? "—"}</div>

      <div style={{ marginTop: 8, fontWeight: 700 }}>active boot tasks ({tasks.length})</div>
      {slowest && <div>slowest: {slowest.label} ({slowest.ageMs}ms)</div>}
      {tasks.slice(0, 6).map((t) => <div key={t.label}>· {t.label} — {t.ageMs}ms</div>)}

      <div style={{ marginTop: 8, fontWeight: 700 }}>databases</div>
      {Object.entries(dbs).map(([k, v]) => (
        <div key={k}>· {k}: <span style={{ color: v === "degraded" ? "#ff9090" : v === "healthy" ? "#9cffb6" : "#bbb" }}>{v}</span></div>
      ))}

      <div style={{ marginTop: 8, fontWeight: 700 }}>feature flags</div>
      {Object.entries(flags).map(([k, v]) => (
        <div key={k}>· {k}: <b>{v ? "on" : "off"}</b></div>
      ))}

      <div style={{ marginTop: 8, fontWeight: 700 }}>circuit breakers ({breakers.length})</div>
      {breakers.length === 0 && <div style={{ opacity: 0.6 }}>none tripped</div>}
      {breakers.map((b) => (
        <div key={b.key}>
          · {b.key}: {b.open ? <span style={{ color: "#ff9090" }}>OPEN</span> : "closed"} ·
          fail {b.failures} · trips {b.trips}
        </div>
      ))}
    </div>
  );
}