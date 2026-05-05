import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Flag, RefreshCw } from "lucide-react";
import type { FeatureFlag, Tier } from "@/lib/feature-flags";

const TIERS: (Tier | "any")[] = ["any", "free", "pro", "elite", "infinity"];

export function FeatureFlagsManager() {
  const [rows, setRows] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("feature_flags" as any).select("*").order("category").order("label");
    if (error) toast.error(error.message);
    setRows(((data || []) as unknown) as FeatureFlag[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function update(id: string, patch: Partial<FeatureFlag>) {
    setSavingId(id);
    const { error } = await supabase.from("feature_flags" as any).update(patch as any).eq("id", id);
    setSavingId(null);
    if (error) return toast.error(error.message);
    setRows(rs => rs.map(r => (r.id === id ? { ...r, ...patch } as FeatureFlag : r)));
  }

  const grouped = rows.reduce<Record<string, FeatureFlag[]>>((acc, r) => {
    (acc[r.category] = acc[r.category] || []).push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display font-bold text-lg flex items-center gap-2">
            <Flag className="w-5 h-5 text-amber-600" /> Feature Flags
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Toggle modules on/off without redeploying. Set a minimum tier to gate a feature behind a paid plan.
            Disabled or tier-locked features show as <Badge variant="secondary" className="text-[10px] mx-1">Coming soon</Badge> in the app.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh</Button>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {Object.entries(grouped).map(([cat, list]) => (
        <Card key={cat} className="p-4 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{cat}</div>
          <div className="divide-y">
            {list.map(f => (
              <div key={f.id} className="py-3 flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-[220px]">
                  <div className="font-semibold text-sm flex items-center gap-2">
                    {f.label}
                    <code className="text-[10px] text-muted-foreground font-mono">{f.feature_key}</code>
                  </div>
                  {f.description && <div className="text-xs text-muted-foreground mt-0.5">{f.description}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Min tier</span>
                  <Select
                    value={f.min_tier ?? "any"}
                    onValueChange={v => update(f.id, { min_tier: v === "any" ? null : (v as Tier) })}
                  >
                    <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIERS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{f.enabled ? "On" : "Off"}</span>
                  <Switch
                    checked={f.enabled}
                    disabled={savingId === f.id}
                    onCheckedChange={v => update(f.id, { enabled: v })}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}