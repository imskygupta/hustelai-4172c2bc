/**
 * /admin/incident-mode — outage-time control surface.
 * Freezes noncritical polling, reduces telemetry, surfaces calm event feed.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldAlert, Power, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import AdminStatusBar from "@/components/admin/AdminStatusBar";
import SystemEventsPanel from "@/components/admin/SystemEventsPanel";
import { setFeatureFlag, getAllFeatureFlags, type FeatureFlag } from "@/lib/runtime/featureFlags";
import { pushEvent } from "@/lib/runtime/eventStream";

const NONCRITICAL: FeatureFlag[] = [
  "drift_monitor_enabled",
  "detox_monitor_enabled",
  "provider_health_enabled",
  "realtime_monitor_enabled",
  "ai_realtime_enabled",
];

export default function IncidentMode() {
  const [armed, setArmed] = useState(false);
  const [snapshot, setSnapshot] = useState(getAllFeatureFlags());

  useEffect(() => { setSnapshot(getAllFeatureFlags()); }, [armed]);

  function arm() {
    NONCRITICAL.forEach((f) => setFeatureFlag(f, false));
    setArmed(true);
    pushEvent({
      category: "module",
      severity: "warning",
      title: "Incident mode engaged",
      detail: "Noncritical polling frozen; telemetry reduced.",
    });
  }
  function disarm() {
    setArmed(false);
    pushEvent({
      category: "recovery",
      severity: "info",
      title: "Incident mode released",
      detail: "Flags restored to operator-defined values.",
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminStatusBar />
      <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/operations"><ArrowLeft className="h-4 w-4 mr-1" /> Operations</Link>
          </Button>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-rose-500" />
            Incident Mode
          </h1>
          {armed && <Badge variant="destructive">engaged</Badge>}
        </div>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="font-medium">Freeze noncritical polling</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Disables drift, detox, provider, realtime, and AI realtime monitors.
              Auth + billing keep working. Toggle off to restore.
            </div>
          </div>
          <Button variant={armed ? "outline" : "destructive"} onClick={armed ? disarm : arm}>
            <Power className="h-4 w-4 mr-1.5" />
            {armed ? "Release" : "Engage"}
          </Button>
        </Card>

        <div className="grid gap-3 md:grid-cols-2">
          <Card className="p-4">
            <div className="text-sm font-medium mb-2 flex items-center gap-2">
              <Activity className="h-4 w-4" /> Flag state
            </div>
            <div className="space-y-1.5 text-xs">
              {Object.entries(snapshot).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <span className="font-mono">{k}</span>
                  <Switch checked={v} disabled className="scale-75" />
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-sm font-medium mb-2">Recovery playbook</div>
            <ol className="text-xs space-y-1.5 text-muted-foreground list-decimal pl-4">
              <li>Engage incident mode (freezes noise).</li>
              <li>Identify subject from System Events feed.</li>
              <li>Inspect DB status pills in the global bar.</li>
              <li>Wait for circuit breakers to half-open automatically.</li>
              <li>Release incident mode once events quiet for 5 minutes.</li>
            </ol>
          </Card>
        </div>

        <SystemEventsPanel limit={40} />
      </div>
    </div>
  );
}