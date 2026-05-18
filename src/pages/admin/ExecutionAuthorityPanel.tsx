import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Domain = {
  domain: string;
  description: string;
  authoritative_runtime: string;
  current_executors: string[];
  duplicate_executors: string[];
  safe_to_disable: string[];
  lock_strategy: string;
  cron_window: string | null;
  notes: string | null;
  is_critical: boolean;
};

type Active = {
  domain: string;
  authoritative_runtime: string;
  lease_runtime: string | null;
  lease_identity: string | null;
  lease_hostname: string | null;
  fence_token: number | null;
  acquired_at: string | null;
  expires_at: string | null;
  last_heartbeat_at: string | null;
  heartbeat_age_seconds: number | null;
  status: string;
  authority_mismatch: boolean;
};

type Contention = {
  id: number;
  domain: string;
  event_kind: string;
  challenger_runtime: string | null;
  challenger_identity: string | null;
  holder_runtime: string | null;
  holder_identity: string | null;
  detail: any;
  observed_at: string;
};

export function ExecutionAuthorityPanel() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [active, setActive] = useState<Active[]>([]);
  const [contention, setContention] = useState<Contention[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true); setErr(null);
    try {
      const [d, a, c] = await Promise.all([
        supabase.schema("ops" as any).from("execution_domains" as any).select("*").order("is_critical", { ascending: false }).order("domain"),
        supabase.schema("ops" as any).from("v_active_executors" as any).select("*"),
        supabase.schema("ops" as any).from("lock_contention_events" as any).select("*").order("observed_at", { ascending: false }).limit(50),
      ]);
      if (d.error) throw d.error;
      setDomains((d.data as any) || []);
      setActive((a.data as any) || []);
      setContention((c.data as any) || []);
    } catch (e: any) {
      setErr(e.message);
    } finally { setBusy(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const dupCount = domains.filter((d) => d.duplicate_executors.length > 0).length;
  const mismatchCount = active.filter((a) => a.authority_mismatch).length;
  const staleCount = active.filter((a) => a.status === "stale_heartbeat" || a.status === "expired").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-sm">
          <Badge variant={dupCount > 0 ? "destructive" : "secondary"}>Duplicates: {dupCount}</Badge>
          <Badge variant={mismatchCount > 0 ? "destructive" : "secondary"}>Authority mismatch: {mismatchCount}</Badge>
          <Badge variant={staleCount > 0 ? "outline" : "secondary"}>Stale leases: {staleCount}</Badge>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={busy}>
          <RefreshCw className={`h-4 w-4 mr-1 ${busy ? "animate-spin" : ""}`} />Reload
        </Button>
      </div>
      {err && <Card className="p-3 border-destructive text-destructive text-sm">{err}</Card>}

      <Card className="overflow-auto">
        <div className="p-3 font-medium text-sm border-b border-border">Operational domains & authoritative runtime</div>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Domain</TableHead><TableHead>Authoritative</TableHead><TableHead>Current</TableHead>
            <TableHead>Duplicates</TableHead><TableHead>Strategy</TableHead><TableHead>Window</TableHead><TableHead>Critical</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {domains.map((d) => (
              <TableRow key={d.domain}>
                <TableCell className="font-mono text-xs">{d.domain}</TableCell>
                <TableCell className="text-xs">{d.authoritative_runtime}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{d.current_executors.join(", ") || "—"}</TableCell>
                <TableCell className="text-xs">
                  {d.duplicate_executors.length > 0
                    ? <Badge variant="destructive">{d.duplicate_executors.join(", ")}</Badge>
                    : <Badge variant="secondary">none</Badge>}
                </TableCell>
                <TableCell className="text-xs">{d.lock_strategy}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{d.cron_window || "—"}</TableCell>
                <TableCell>{d.is_critical ? <Badge>crit</Badge> : <Badge variant="outline">—</Badge>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="overflow-auto">
        <div className="p-3 font-medium text-sm border-b border-border">Active executors (live leases)</div>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Domain</TableHead><TableHead>Holder identity</TableHead><TableHead>Host</TableHead>
            <TableHead>Fence</TableHead><TableHead>Heartbeat age</TableHead><TableHead>Expires</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {active.map((a) => (
              <TableRow key={a.domain}>
                <TableCell className="font-mono text-xs">{a.domain}</TableCell>
                <TableCell className="text-xs">{a.lease_identity || <span className="text-muted-foreground">no lease</span>}</TableCell>
                <TableCell className="text-xs">{a.lease_hostname || "—"}</TableCell>
                <TableCell className="text-xs">{a.fence_token ?? "—"}</TableCell>
                <TableCell className="text-xs">{a.heartbeat_age_seconds != null ? `${a.heartbeat_age_seconds}s` : "—"}</TableCell>
                <TableCell className="text-xs">{a.expires_at ? new Date(a.expires_at).toLocaleTimeString() : "—"}</TableCell>
                <TableCell>
                  <Badge variant={a.status === "active" ? "default" : a.status === "no_lease" ? "outline" : "destructive"}>{a.status}</Badge>
                  {a.authority_mismatch && <Badge variant="destructive" className="ml-1">mismatch</Badge>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="overflow-auto">
        <div className="p-3 font-medium text-sm border-b border-border">Recent lock contention</div>
        {contention.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No contention recorded.</div>
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>When</TableHead><TableHead>Domain</TableHead><TableHead>Kind</TableHead>
              <TableHead>Challenger</TableHead><TableHead>Holder</TableHead><TableHead>Detail</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {contention.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-xs">{new Date(c.observed_at).toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-xs">{c.domain}</TableCell>
                  <TableCell><Badge variant={c.event_kind === "denied" ? "destructive" : "outline"}>{c.event_kind}</Badge></TableCell>
                  <TableCell className="text-xs">{c.challenger_identity || "—"}</TableCell>
                  <TableCell className="text-xs">{c.holder_identity || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{c.detail ? JSON.stringify(c.detail) : ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}