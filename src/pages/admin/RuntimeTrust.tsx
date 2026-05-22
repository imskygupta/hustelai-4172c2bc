import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, ShieldAlert, ShieldCheck, Activity } from "lucide-react";

type Event = {
  id: string;
  user_id: string | null;
  email: string | null;
  event_type: string;
  severity: "info" | "warn" | "critical";
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const TRACKED_TYPES = [
  "verification_blocked_ai",
  "verification_blocked_runtime",
  "verification_blocked_export",
  "invalid_service_signature",
  "replay_attempt",
  "blocked_internal_call",
];

const LABELS: Record<string, string> = {
  verification_blocked_ai: "Blocked AI runtime calls",
  verification_blocked_runtime: "Blocked runtime mutations",
  verification_blocked_export: "Blocked exports",
  invalid_service_signature: "Invalid service signatures",
  replay_attempt: "Replay attempts",
  blocked_internal_call: "Blocked internal calls",
};

export default function RuntimeTrust() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("security_auth_events")
      .select("*")
      .in("event_type", TRACKED_TYPES)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500);
    if (!error && data) setEvents(data as Event[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const t of TRACKED_TYPES) c[t] = 0;
    for (const e of events) c[e.event_type] = (c[e.event_type] ?? 0) + 1;
    return c;
  }, [events]);

  const topRoutes = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of events) {
      const fn = (e.metadata as { fn?: string } | null)?.fn;
      if (!fn) continue;
      map.set(fn, (map.get(fn) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [events]);

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6" /> Runtime Trust
          </h1>
          <p className="text-sm text-muted-foreground">
            Last 24h. Verification & internal-service signature enforcement.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {TRACKED_TYPES.map((t) => (
          <Card key={t}>
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">
                {LABELS[t]}
              </div>
              <div className="text-3xl font-semibold mt-1">{counts[t] ?? 0}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" /> Top denied surfaces
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topRoutes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No denials recorded.</p>
          ) : (
            <ul className="space-y-1">
              {topRoutes.map(([fn, n]) => (
                <li key={fn} className="flex items-center justify-between text-sm">
                  <code className="text-xs">{fn}</code>
                  <Badge variant="secondary">{n}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" /> Recent events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[480px] overflow-auto">
            {events.slice(0, 100).map((e) => (
              <div
                key={e.id}
                className="border rounded-md p-2 text-xs flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-medium">{e.event_type}</div>
                  <div className="text-muted-foreground truncate">
                    {e.email ?? e.user_id ?? "anonymous"} ·{" "}
                    {(e.metadata as { fn?: string } | null)?.fn ?? "—"} ·{" "}
                    {(e.metadata as { reason?: string } | null)?.reason ?? ""}
                  </div>
                </div>
                <div className="text-muted-foreground whitespace-nowrap">
                  {new Date(e.created_at).toLocaleTimeString()}
                </div>
              </div>
            ))}
            {events.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground">Clean. No denials in the last 24h.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
