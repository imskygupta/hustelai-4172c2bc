import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, ShieldCheck, ShieldAlert, Database, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type TableHealth = {
  table_name: string;
  success_count: number;
  failure_count: number;
  skipped_count: number;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_error: string | null;
  p95_latency_ms: number | null;
  avg_latency_ms: number | null;
};

type Health = {
  flags: Record<string, string | boolean | null>;
  owned: { reachable: boolean; latency_ms: number | null; error: string | null };
  tables: TableHealth[];
  generated_at: string;
};

export default function MigrationHealth() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [data, setData] = useState<Health | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/imskygupta-admin"); return; }
    (async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const admin = (data || []).some((r) => r.role === "admin");
      setIsAdmin(admin);
      if (!admin) navigate("/imskygupta-admin");
    })();
  }, [user, loading, navigate]);

  const load = useCallback(async () => {
    setBusy(true); setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("migration-health");
      if (error) throw error;
      setData(data as Health);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  if (loading || isAdmin === null) {
    return <div className="p-8 text-muted-foreground">Checking access…</div>;
  }

  const flag = (k: string) => String(data?.flags?.[k] ?? "—");
  const dualOn = data?.flags?.MIGRATE_OPS_DUAL_WRITE === "1";
  const ownedOn = data?.flags?.OWNED_SUPABASE_ENABLED === "1";

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/runtime")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Runtime
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Migration Health</h1>
            <p className="text-sm text-muted-foreground">
              Tier‑1 dual‑write status (Lovable → owned Supabase)
            </p>
          </div>
        </div>
        <Button onClick={load} disabled={busy} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${busy ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {error && (
        <Card className="p-4 border-destructive">
          <p className="text-sm text-destructive">{error}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Owned project</p>
          <div className="flex items-center gap-2">
            {data?.owned.reachable ? (
              <><ShieldCheck className="h-5 w-5 text-emerald-500" /><span className="font-medium">Reachable</span></>
            ) : (
              <><ShieldAlert className="h-5 w-5 text-destructive" /><span className="font-medium">Unreachable</span></>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Ping {data?.owned.latency_ms ?? "—"} ms
          </p>
          {data?.owned.error && (
            <p className="text-xs text-amber-500 break-all">{data.owned.error}</p>
          )}
        </Card>

        <Card className="p-4 space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Master gate</p>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <span className="font-medium">OWNED_SUPABASE_ENABLED</span>
          </div>
          <Badge variant={ownedOn ? "default" : "secondary"}>{flag("OWNED_SUPABASE_ENABLED") || "unset"}</Badge>
          <p className="text-xs text-muted-foreground">Set to <code>0</code> or unset to instantly disable owned writes.</p>
        </Card>

        <Card className="p-4 space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Dual‑write</p>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <span className="font-medium">MIGRATE_OPS_DUAL_WRITE</span>
          </div>
          <Badge variant={dualOn ? "default" : "secondary"}>{flag("MIGRATE_OPS_DUAL_WRITE") || "unset"}</Badge>
          <p className="text-xs text-muted-foreground">
            Authoritative writer: <strong>{flag("MIGRATE_OPS_WRITES")}</strong>
          </p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-medium">Table‑by‑table sync (last 24h)</h2>
          <span className="text-xs text-muted-foreground">
            Updated {data?.generated_at ? new Date(data.generated_at).toLocaleTimeString() : "—"}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="px-4 py-2">Table</th>
                <th className="px-4 py-2 text-right">Success</th>
                <th className="px-4 py-2 text-right">Failed</th>
                <th className="px-4 py-2 text-right">Skipped</th>
                <th className="px-4 py-2 text-right">p95 ms</th>
                <th className="px-4 py-2 text-right">avg ms</th>
                <th className="px-4 py-2">Last error</th>
              </tr>
            </thead>
            <tbody>
              {(data?.tables ?? []).length === 0 && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  No mirror activity yet. Enable <code>OWNED_SUPABASE_ENABLED=1</code> and <code>MIGRATE_OPS_DUAL_WRITE=1</code>.
                </td></tr>
              )}
              {(data?.tables ?? []).map((t) => (
                <tr key={t.table_name} className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">{t.table_name}</td>
                  <td className="px-4 py-2 text-right text-emerald-600">{t.success_count}</td>
                  <td className={`px-4 py-2 text-right ${t.failure_count > 0 ? "text-destructive font-medium" : ""}`}>{t.failure_count}</td>
                  <td className="px-4 py-2 text-right text-muted-foreground">{t.skipped_count}</td>
                  <td className="px-4 py-2 text-right">{t.p95_latency_ms ?? "—"}</td>
                  <td className="px-4 py-2 text-right">{t.avg_latency_ms ?? "—"}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground max-w-[280px] truncate" title={t.last_error || ""}>
                    {t.last_error || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-4 space-y-2">
        <h3 className="font-medium">Emergency rollback</h3>
        <p className="text-sm text-muted-foreground">
          Set the edge‑function secret <code>OWNED_SUPABASE_ENABLED</code> to <code>0</code> (or delete it).
          Within seconds, <code>ownedReady()</code> returns false and all mirror writes become no‑ops.
          Legacy writes were never paused — no data is lost.
        </p>
      </Card>
    </div>
  );
}