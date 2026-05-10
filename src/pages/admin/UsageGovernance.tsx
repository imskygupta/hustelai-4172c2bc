import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listCapabilities } from "@/lib/usage/capabilities";
import { Loader2, ShieldCheck } from "lucide-react";

const TIERS = ["free", "pro", "elite", "infinity"] as const;

export default function UsageGovernance() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [limits, setLimits] = useState<any[]>([]);
  const [features, setFeatures] = useState<any[]>([]);
  const [overrideUser, setOverrideUser] = useState("");
  const [overrideMeter, setOverrideMeter] = useState("ai");
  const [overrideMax, setOverrideMax] = useState("");
  const [topConsumers, setTopConsumers] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user?.id) { setLoading(false); return; }
      const { data: roles } = await (supabase as any).rpc("has_role", { _user_id: u.user.id, _role: "admin" });
      setIsAdmin(!!roles);
      if (!roles) { setLoading(false); return; }
      await refresh();
      setLoading(false);
    })();
  }, []);

  async function refresh() {
    const [{ data: tl }, { data: fa }] = await Promise.all([
      (supabase as any).from("tier_limits").select("*").order("tier").order("meter"),
      (supabase as any).from("feature_access").select("*").order("tier").order("feature_key"),
    ]);
    setLimits(tl || []); setFeatures(fa || []);
  }

  async function saveLimit(row: any, max: number) {
    const { error } = await (supabase as any)
      .from("tier_limits")
      .update({ max_value: max })
      .eq("tier", row.tier).eq("meter", row.meter).eq("feature", row.feature);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Updated" }); refresh(); }
  }

  async function toggleFeature(row: any, enabled: boolean) {
    const { error } = await (supabase as any)
      .from("feature_access").update({ enabled })
      .eq("tier", row.tier).eq("feature_key", row.feature_key);
    if (error) toast({ title: "Toggle failed", description: error.message, variant: "destructive" });
    else refresh();
  }

  async function grantOverride() {
    if (!overrideUser || !overrideMax) return;
    const { error } = await (supabase as any).rpc("grant_capability_override", {
      _user: overrideUser, _meter: overrideMeter, _feature: "*",
      _max_override: parseInt(overrideMax, 10), _expires_at: null, _reason: "admin grant",
    });
    if (error) toast({ title: "Override failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Override granted" }); setOverrideUser(""); setOverrideMax(""); }
  }

  async function loadTopConsumers(meter: string) {
    const { data } = await (supabase as any).rpc("usage_top_consumers", { _meter: meter });
    setTopConsumers(data || []);
  }

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin" /></div>;
  if (!isAdmin) return <div className="p-12 text-center text-muted-foreground">Admin access required</div>;

  const grouped: Record<string, any[]> = {};
  limits.forEach((r) => { (grouped[r.meter] ||= []).push(r); });
  const featureGrouped: Record<string, any[]> = {};
  features.forEach((r) => { (featureGrouped[r.feature_key] ||= []).push(r); });

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Usage Governance</h1>
          <p className="text-sm text-muted-foreground">Tier limits, feature access, and per-user overrides — no redeploy needed.</p>
        </div>
      </div>

      <Tabs defaultValue="limits">
        <TabsList>
          <TabsTrigger value="limits">Tier Limits</TabsTrigger>
          <TabsTrigger value="features">Feature Access</TabsTrigger>
          <TabsTrigger value="overrides">Overrides</TabsTrigger>
          <TabsTrigger value="capabilities">Registry</TabsTrigger>
          <TabsTrigger value="abuse">Abuse</TabsTrigger>
        </TabsList>

        <TabsContent value="limits" className="space-y-4">
          {Object.entries(grouped).map(([meter, rows]) => (
            <Card key={meter}>
              <CardHeader><CardTitle className="text-base capitalize">{meter}</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Tier</TableHead><TableHead>Feature</TableHead>
                    <TableHead>Period</TableHead><TableHead>Max (-1 = unlimited)</TableHead><TableHead></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {rows.map((r) => <LimitRow key={`${r.tier}-${r.feature}`} row={r} onSave={saveLimit} />)}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="features">
          <Card><CardContent className="pt-6">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Feature</TableHead>{TIERS.map((t) => <TableHead key={t} className="capitalize">{t}</TableHead>)}
              </TableRow></TableHeader>
              <TableBody>
                {Object.entries(featureGrouped).map(([key, rows]) => (
                  <TableRow key={key}>
                    <TableCell className="font-medium">{key}</TableCell>
                    {TIERS.map((t) => {
                      const r = rows.find((x: any) => x.tier === t);
                      return (
                        <TableCell key={t}>
                          {r && <Switch checked={r.enabled} onCheckedChange={(v) => toggleFeature(r, v)} />}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="overrides">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Grant capability override</CardTitle>
              <CardDescription>Replaces the user's max for a meter. Append-only audit trail.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-w-xl">
              <Input placeholder="User ID (uuid)" value={overrideUser} onChange={(e) => setOverrideUser(e.target.value)} />
              <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={overrideMeter} onChange={(e) => setOverrideMeter(e.target.value)}>
                {Array.from(new Set(limits.map((l) => l.meter))).map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <Input type="number" placeholder="New max value (-1 for unlimited)" value={overrideMax} onChange={(e) => setOverrideMax(e.target.value)} />
              <Button onClick={grantOverride} disabled={!overrideUser || !overrideMax}>Grant override</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="capabilities">
          <Card><CardContent className="pt-6">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Capability</TableHead><TableHead>Meter</TableHead>
                <TableHead>Cost</TableHead><TableHead>Min tier</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {listCapabilities().map((c) => (
                  <TableRow key={c.key}>
                    <TableCell><div className="font-medium">{c.label}</div><div className="text-xs text-muted-foreground">{c.description}</div></TableCell>
                    <TableCell><code className="text-xs">{c.meter}</code></TableCell>
                    <TableCell><Badge variant={c.costClass === "expensive" ? "destructive" : c.costClass === "standard" ? "secondary" : "outline"}>{c.costClass}</Badge></TableCell>
                    <TableCell className="capitalize">{c.minTier}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="abuse">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top consumers (last 24h)</CardTitle>
              <CardDescription>Identify users approaching or hitting caps.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {Array.from(new Set(limits.map((l) => l.meter))).map((m) => (
                  <Button key={m} variant="outline" size="sm" onClick={() => loadTopConsumers(m)}>{m}</Button>
                ))}
              </div>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>User ID</TableHead><TableHead>Total</TableHead><TableHead>Last activity</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {topConsumers.map((r) => (
                    <TableRow key={r.user_id}>
                      <TableCell><code className="text-xs">{r.user_id}</code></TableCell>
                      <TableCell>{r.total}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(r.last_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {!topConsumers.length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Pick a meter above</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LimitRow({ row, onSave }: { row: any; onSave: (r: any, n: number) => void }) {
  const [val, setVal] = useState<string>(String(row.max_value));
  const dirty = val !== String(row.max_value);
  return (
    <TableRow>
      <TableCell className="capitalize font-medium">{row.tier}</TableCell>
      <TableCell><code className="text-xs">{row.feature}</code></TableCell>
      <TableCell><Badge variant="outline">{row.period}</Badge></TableCell>
      <TableCell><Input type="number" value={val} onChange={(e) => setVal(e.target.value)} className="w-32 h-8" /></TableCell>
      <TableCell>{dirty && <Button size="sm" onClick={() => onSave(row, parseInt(val, 10))}>Save</Button>}</TableCell>
    </TableRow>
  );
}
