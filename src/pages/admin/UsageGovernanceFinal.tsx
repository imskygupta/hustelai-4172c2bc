import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, AlertTriangle, ShieldCheck, Activity, TrendingUp, Search } from "lucide-react";

// U-Final — read-only reconciliation, coverage, abuse & revenue-at-risk panels.
// Sourced ONLY from new v_governance_* / v_tool_registry_coverage / v_revenue_at_risk
// views shipped in the same migration. Never mutates anything.

export default function UsageGovernanceFinal() {
  const [loading, setLoading] = useState(true);
  const [recon, setRecon] = useState<any[]>([]);
  const [coverage, setCoverage] = useState<any[]>([]);
  const [abuse, setAbuse] = useState<any[]>([]);
  const [risk, setRisk] = useState<any[]>([]);
  const [userId, setUserId] = useState("");
  const [userSnap, setUserSnap] = useState<any>(null);

  useEffect(() => { (async () => {
    const [r, c, a, v] = await Promise.all([
      (supabase as any).from("v_governance_reconciliation").select("*").limit(30),
      (supabase as any).from("v_tool_registry_coverage").select("*").limit(200),
      (supabase as any).from("v_governance_abuse_signals").select("*").limit(50),
      (supabase as any).from("v_revenue_at_risk").select("*").limit(20),
    ]);
    setRecon(r.data ?? []); setCoverage(c.data ?? []);
    setAbuse(a.data ?? []); setRisk(v.data ?? []);
    setLoading(false);
  })(); }, []);

  async function lookupUser() {
    if (!userId) return;
    const { data } = await (supabase as any).from("v_admin_user_usage_snapshot")
      .select("*").eq("user_id", userId).maybeSingle();
    setUserSnap(data ?? { _missing: true });
  }

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin" /></div>;

  const mismatch = recon.filter((r) => Number(r.mismatch ?? 0) !== 0);
  const uncovered = coverage.filter((c) => !c.has_tier_limit);

  return (
    <div className="space-y-4">
      {/* Hero stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={ShieldCheck} label="Reconciliation mismatches (7d)" value={mismatch.length} tone={mismatch.length ? "bad" : "good"} />
        <Stat icon={Activity} label="Tools without tier_limit" value={uncovered.length} tone={uncovered.length ? "warn" : "good"} />
        <Stat icon={AlertTriangle} label="Abuse-flagged users (24h)" value={abuse.length} tone={abuse.length ? "warn" : "good"} />
        <Stat icon={TrendingUp} label="Users ≥80% (today)" value={risk.reduce((s, r) => s + Number(r.at_80 ?? 0), 0)} tone="info" />
      </div>

      {/* User deep-link */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Search className="h-4 w-4" /> User → Usage lookup</CardTitle>
          <CardDescription>Tier · today · month · active boosters · overrides — no SQL needed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 max-w-xl">
            <Input placeholder="User ID (uuid)" value={userId} onChange={(e) => setUserId(e.target.value)} />
            <Button onClick={lookupUser} disabled={!userId}>Lookup</Button>
          </div>
          {userSnap?._missing && <p className="text-sm text-muted-foreground">No usage on record for this user.</p>}
          {userSnap && !userSnap._missing && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <Field label="Tier" value={<Badge variant="secondary" className="capitalize">{userSnap.tier ?? "free"}</Badge>} />
              <Field label="Today (units)" value={String(userSnap.units_today ?? 0)} />
              <Field label="This month" value={String(userSnap.units_month ?? 0)} />
              <Field label="Active boosters" value={String(userSnap.active_overrides ?? 0)} />
              <Field label="Last decision" value={userSnap.last_decision ?? "—"} />
              <Field label="Blocked (24h)" value={String(userSnap.blocked_24h ?? 0)} />
              <Field label="Avg pct (today)" value={`${Number(userSnap.avg_pct_today ?? 0).toFixed(0)}%`} />
              <Field label="Last seen" value={userSnap.last_event_at ? new Date(userSnap.last_event_at).toLocaleString() : "—"} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reconciliation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reconciliation — usage_events vs RPC decisions</CardTitle>
          <CardDescription>Goal: mismatch = 0. Non-zero = ledger row missing OR execution missing.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Day</TableHead><TableHead>Meter</TableHead>
              <TableHead className="text-right">Events</TableHead>
              <TableHead className="text-right">Allowed</TableHead>
              <TableHead className="text-right">Blocked</TableHead>
              <TableHead className="text-right">Mismatch</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {recon.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs">{r.day ? new Date(r.day).toLocaleDateString() : "—"}</TableCell>
                  <TableCell><code className="text-xs">{r.meter}</code></TableCell>
                  <TableCell className="text-right tabular-nums">{r.events}</TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-600">{r.allowed}</TableCell>
                  <TableCell className="text-right tabular-nums text-amber-600">{r.blocked}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {Number(r.mismatch) === 0
                      ? <Badge variant="outline">0</Badge>
                      : <Badge variant="destructive">{r.mismatch}</Badge>}
                  </TableCell>
                </TableRow>
              ))}
              {!recon.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No data yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Coverage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tool registry coverage</CardTitle>
          <CardDescription>Every capability key seen in usage_events should map to a tier_limits row.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Capability</TableHead><TableHead>Meter</TableHead>
              <TableHead className="text-right">Executions (7d)</TableHead>
              <TableHead>tier_limit?</TableHead>
              <TableHead>Writes ledger?</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {coverage.map((c, i) => (
                <TableRow key={i}>
                  <TableCell><code className="text-xs">{c.capability_key ?? "—"}</code></TableCell>
                  <TableCell><code className="text-xs">{c.meter}</code></TableCell>
                  <TableCell className="text-right tabular-nums">{c.executions}</TableCell>
                  <TableCell>{c.has_tier_limit ? <Badge variant="outline">yes</Badge> : <Badge variant="destructive">missing</Badge>}</TableCell>
                  <TableCell>{c.writes_ledger ? <Badge variant="outline">yes</Badge> : <Badge variant="secondary">no</Badge>}</TableCell>
                </TableRow>
              ))}
              {!coverage.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No executions yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Abuse */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Abuse signals (24h)</CardTitle>
            <CardDescription>100+ blocked executions, repeated limit hits, upload spam. Read-only.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>User</TableHead><TableHead>Signal</TableHead><TableHead className="text-right">Count</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {abuse.map((a, i) => (
                  <TableRow key={i}>
                    <TableCell><code className="text-xs">{(a.user_id ?? "").slice(0, 8)}…</code></TableCell>
                    <TableCell><Badge variant="secondary">{a.signal}</Badge></TableCell>
                    <TableCell className="text-right tabular-nums">{a.count}</TableCell>
                  </TableRow>
                ))}
                {!abuse.length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">All clear</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Revenue at risk */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue at risk (today)</CardTitle>
            <CardDescription>Conversion funnel — users near or past their cap, grouped by tier.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">≥80%</TableHead>
                <TableHead className="text-right">≥90%</TableHead>
                <TableHead className="text-right">100%</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {risk.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="capitalize">{r.tier}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.at_80}</TableCell>
                    <TableCell className="text-right tabular-nums text-amber-600">{r.at_90}</TableCell>
                    <TableCell className="text-right tabular-nums text-destructive">{r.at_100}</TableCell>
                  </TableRow>
                ))}
                {!risk.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No users near limits</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number | string; tone: "good" | "warn" | "bad" | "info" }) {
  const cls = tone === "bad" ? "text-destructive" : tone === "warn" ? "text-amber-600" : tone === "good" ? "text-emerald-600" : "text-foreground";
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {label}</div>
        <div className={`text-2xl font-semibold tabular-nums mt-1 ${cls}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-muted/30 p-2.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium mt-0.5">{value}</div>
    </div>
  );
}