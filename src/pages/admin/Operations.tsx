/**
 * /admin/operations — canonical Operations OS.
 *
 * Phase 9.3: single coherent control plane that consolidates every
 * Phase 7–9 surface (detox, boundaries, hardening, drift, breakers, flags,
 * topology, docs ops, backups) into one navigable dashboard.
 */
import { lazy, Suspense, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity, Database, Network, Shield, Flag, Radio, HardDrive, DollarSign,
  AlertTriangle, Gauge, Workflow, FileText, ArrowLeft, ShieldAlert, ListTree,
  BookOpenCheck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AdminStatusBar from "@/components/admin/AdminStatusBar";
import { PanelSkeleton } from "@/components/runtime/Loaders";
import { useHasReachedPhase } from "@/lib/runtime/hydrationPhases";
import { useFeatureFlag } from "@/lib/runtime/featureFlags";
import { INFRA_SAFE_MODE } from "@/lib/async/timeout";
import { getBreakerSnapshot } from "@/lib/runtime/circuitBreaker";
import { getAllFeatureFlags } from "@/lib/runtime/featureFlags";
import { getAllDbStatus } from "@/lib/runtime/dbHealth";

// Phase C panels — lazy, so they never block first paint.
const PrimaryDetoxStatusPanel = lazy(() =>
  import("./PrimaryDetoxStatus").then((m) => ({ default: m.PrimaryDetoxStatusPanel })),
);
const BoundaryMapPanel = lazy(() =>
  import("./BoundaryMapPanel").then((m) => ({ default: m.BoundaryMapPanel })),
);
const PlatformHardeningPanel = lazy(() =>
  import("./PlatformHardeningPanel").then((m) => ({ default: m.PlatformHardeningPanel })),
);
const DocsOpsPanel = lazy(() => import("@/components/admin/DocsOpsPanel"));
const DocsIntegrityPanel = lazy(() => import("@/components/admin/DocsIntegrityPanel"));
const SystemEventsPanel = lazy(() => import("@/components/admin/SystemEventsPanel"));

type SectionKey =
  | "overview" | "databases" | "stability" | "security"
  | "ai_runtime" | "realtime" | "backups" | "cost" | "flags"
  | "docs_ops" | "docs_integrity" | "topology" | "events";

const NAV: { key: SectionKey; label: string; icon: any }[] = [
  { key: "overview",   label: "Overview",        icon: Activity },
  { key: "events",     label: "System Events",   icon: ListTree },
  { key: "databases",  label: "DB Health",       icon: Database },
  { key: "stability",  label: "Platform Stability", icon: Gauge },
  { key: "security",   label: "Runtime Integrity", icon: Shield },
  { key: "ai_runtime", label: "AI Runtime",      icon: Workflow },
  { key: "realtime",   label: "Traffic Isolation", icon: Radio },
  { key: "backups",    label: "Backups",         icon: HardDrive },
  { key: "cost",       label: "Utilization",     icon: DollarSign },
  { key: "flags",      label: "Feature Flags",   icon: Flag },
  { key: "docs_ops",   label: "Operator Docs",   icon: FileText },
  { key: "docs_integrity", label: "Docs Integrity", icon: BookOpenCheck },
  { key: "topology",   label: "Service Boundaries", icon: Network },
];

function OverviewSection() {
  const dbs = getAllDbStatus();
  const flags = getAllFeatureFlags();
  const breakers = getBreakerSnapshot();
  const tripped = breakers.filter((b) => b.open);

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      <Card className="p-4">
        <div className="text-xs text-muted-foreground">Hydration</div>
        <div className="text-2xl font-semibold mt-1">Phase C</div>
        <div className="text-xs text-muted-foreground mt-1">
          Infra safe-mode: <b>{INFRA_SAFE_MODE ? "on" : "off"}</b>
        </div>
      </Card>
      <Card className="p-4">
        <div className="text-xs text-muted-foreground">Databases</div>
        <div className="text-2xl font-semibold mt-1">
          {Object.values(dbs).filter((s) => s === "healthy").length}/{Object.keys(dbs).length}{" "}
          <span className="text-sm font-normal text-muted-foreground">healthy</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {Object.values(dbs).filter((s) => s === "degraded").length} degraded
        </div>
      </Card>
      <Card className="p-4">
        <div className="text-xs text-muted-foreground">Circuit Breakers</div>
        <div className="text-2xl font-semibold mt-1">
          {tripped.length} <span className="text-sm font-normal text-muted-foreground">open</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">{breakers.length} tracked</div>
      </Card>
      <Card className="p-4 md:col-span-2 lg:col-span-3">
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium">Feature flags</div>
          <Badge variant="outline">{Object.values(flags).filter(Boolean).length}/{Object.keys(flags).length} on</Badge>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
          {Object.entries(flags).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between border rounded px-2 py-1.5">
              <span className="font-mono">{k}</span>
              <Badge variant={v ? "default" : "secondary"}>{v ? "on" : "off"}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function FlagsSection() {
  const flags = getAllFeatureFlags();
  return (
    <Card className="p-4">
      <div className="text-sm text-muted-foreground mb-3">
        Flags resolve from the Admin DB <code>runtime_feature_flags</code> table.
        Local defaults are conservative; toggling requires an Admin DB write.
      </div>
      <div className="space-y-2">
        {Object.entries(flags).map(([k, v]) => (
          <div key={k} className="flex items-center justify-between border rounded px-3 py-2 text-sm">
            <div>
              <div className="font-mono">{k}</div>
              <div className="text-xs text-muted-foreground">
                {v ? "Enabled — module mounts & polls." : "Disabled — module renders degraded card."}
              </div>
            </div>
            <Badge variant={v ? "default" : "secondary"}>{v ? "ENABLED" : "DISABLED"}</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

function BreakersSection() {
  const breakers = getBreakerSnapshot();
  if (breakers.length === 0) {
    return <Card className="p-6 text-sm text-muted-foreground">No circuit breakers tracked yet.</Card>;
  }
  return (
    <Card className="p-4 space-y-2">
      {breakers.map((b) => (
        <div key={b.key} className="flex items-center justify-between border rounded px-3 py-2 text-sm">
          <div className="font-mono">{b.key}</div>
          <div className="flex items-center gap-2 text-xs">
            <Badge variant={b.open ? "destructive" : "secondary"}>{b.open ? "OPEN" : "closed"}</Badge>
            <span className="text-muted-foreground">fail {b.failures} · trips {b.trips}</span>
          </div>
        </div>
      ))}
    </Card>
  );
}

function ComingSoon({ label }: { label: string }) {
  return (
    <Card className="p-6 text-sm text-muted-foreground">
      {label} consolidates here once its sibling DB exits soak. Track flag rollout
      in <Link to="/admin/operations?section=flags" className="underline">Feature Flags</Link>.
    </Card>
  );
}

function FlagGatedPanel({
  flag, label, children,
}: { flag: ReturnType<typeof useFeatureFlag> extends infer _ ? any : never; label: string; children: React.ReactNode }) {
  return children as any; // placeholder
}

export default function Operations() {
  const [section, setSection] = useState<SectionKey>(() => {
    const p = new URLSearchParams(window.location.search).get("section");
    return (p as SectionKey) ?? "overview";
  });
  const phaseCReached = useHasReachedPhase("C");
  const infraEnabled = useFeatureFlag("infra_panels_enabled");
  const detoxEnabled = useFeatureFlag("detox_monitor_enabled");
  const driftEnabled = useFeatureFlag("drift_monitor_enabled");

  function go(next: SectionKey) {
    setSection(next);
    const url = new URL(window.location.href);
    url.searchParams.set("section", next);
    window.history.replaceState(null, "", url.toString());
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminStatusBar />
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin-dashboard"><ArrowLeft className="h-4 w-4 mr-1" /> Admin</Link>
          </Button>
          <h1 className="text-xl font-semibold">Operations</h1>
          {INFRA_SAFE_MODE && <Badge variant="secondary" className="ml-2">safe-mode</Badge>}
          <div className="ml-auto">
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/incident-mode">
                <ShieldAlert className="h-4 w-4 mr-1.5 text-rose-500" />
                Incident Mode
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[200px_1fr]">
          <nav className="md:sticky md:top-14 self-start">
            <Card className="p-1">
              {NAV.map((n) => {
                const Icon = n.icon;
                const active = section === n.key;
                return (
                  <button
                    key={n.key}
                    onClick={() => go(n.key)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-left transition ${
                      active ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {n.label}
                  </button>
                );
              })}
            </Card>
            <div className="mt-3 text-[11px] text-muted-foreground px-2">
              Add <code>?debug_runtime=1</code> to any route for the live runtime overlay.
            </div>
          </nav>

          <main className="space-y-4 min-w-0">
            {section === "overview" && <OverviewSection />}

            {section === "events" && (
              <Suspense fallback={<PanelSkeleton rows={6} />}>
                <SystemEventsPanel />
              </Suspense>
            )}

            {section === "flags" && <FlagsSection />}

            {section === "stability" && (
              <div className="space-y-3">
                <BreakersSection />
                {phaseCReached && infraEnabled ? (
                  <Suspense fallback={<PanelSkeleton rows={6} />}>
                    <PlatformHardeningPanel />
                  </Suspense>
                ) : (
                  <ComingSoon label="Platform hardening telemetry" />
                )}
              </div>
            )}

            {section === "databases" && (
              <div className="space-y-3">
                {phaseCReached && infraEnabled && detoxEnabled ? (
                  <Suspense fallback={<PanelSkeleton rows={6} />}>
                    <PrimaryDetoxStatusPanel />
                  </Suspense>
                ) : (
                  <ComingSoon label="Primary detox monitor" />
                )}
              </div>
            )}

            {section === "topology" && (
              <div className="space-y-3">
                {phaseCReached && infraEnabled ? (
                  <Suspense fallback={<PanelSkeleton rows={6} />}>
                    <BoundaryMapPanel />
                  </Suspense>
                ) : (
                  <ComingSoon label="Boundary map & topology" />
                )}
              </div>
            )}

            {section === "security" && (
              <Card className="p-6 text-sm">
                <div className="flex items-center gap-2 mb-2 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Security &amp; Violations</span>
                </div>
                <div className="text-muted-foreground">
                  Surfaces <code>runtime_direct_write_violations</code> + RLS audit results from
                  the Admin DB. Gated behind <code>drift_monitor_enabled</code> ({driftEnabled ? "on" : "off"}).
                </div>
              </Card>
            )}

            {section === "ai_runtime" && <ComingSoon label="AI runtime panel" />}
            {section === "realtime" && <ComingSoon label="Realtime fabric monitor" />}
            {section === "backups" && <ComingSoon label="Backup / DR status" />}
            {section === "cost" && <ComingSoon label="Cost &amp; utilization" />}

            {section === "docs_ops" && (
              <Suspense fallback={<PanelSkeleton rows={6} />}>
                <DocsOpsPanel />
              </Suspense>
            )}

            {section === "docs_integrity" && (
              <Suspense fallback={<PanelSkeleton rows={6} />}>
                <DocsIntegrityPanel />
              </Suspense>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}