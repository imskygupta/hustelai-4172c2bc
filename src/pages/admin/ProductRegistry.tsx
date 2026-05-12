import { useEffect, useState } from "react";
import { blogApi } from "@/integrations/blog/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Database, AlertTriangle, CheckCircle2, FileWarning, Clock } from "lucide-react";
import { toast } from "sonner";

export default function ProductRegistry() {
  const [tools, setTools] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [bootSql, setBootSql] = useState<string | null>(null);
  const [showCron, setShowCron] = useState(false);

  const cronSql = `-- Weekly low-IO diff sync of the Tool Registry.
-- Run once in the BLOG project's SQL editor. Requires pg_cron + pg_net.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'tool-registry-weekly-sync',
  '0 4 * * 1',  -- every Monday 04:00 UTC
  $$
  select net.http_post(
    url := '${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tool-registry-sync?action=sync&mode=incremental',
    headers := '{"Content-Type":"application/json","apikey":"${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Also queue media captures for any newly-added tools every Monday 04:15
select cron.schedule(
  'tool-media-weekly-queue',
  '15 4 * * 1',
  $$
  select net.http_post(
    url := '${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tool-media-pipeline?action=queue&limit=100',
    headers := '{"Content-Type":"application/json","apikey":"${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);`;

  async function load() {
    setLoading(true);
    try {
      const [list, h] = await Promise.all([blogApi.registryList(), blogApi.registryHealth()]);
      setTools(list.tools ?? []);
      setHealth(h);
    } catch (e: any) { toast.error(e.message ?? "Load failed"); }
    finally { setLoading(false); }
  }

  async function sync(mode: "incremental" | "full") {
    setLoading(true);
    try {
      const r = await blogApi.registrySync(mode);
      toast.success(`Synced ${r.upserted}/${r.examined} · ${r.edges} edges · ${r.embeddings_generated} embeddings`);
      load();
    } catch (e: any) { toast.error(e.message ?? "Sync failed"); }
    finally { setLoading(false); }
  }

  async function showBootstrap() {
    const r = await blogApi.registryBootstrapSql();
    setBootSql(r.sql ?? null);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border/50 bg-gradient-to-b from-emerald-950/20 to-transparent">
        <div className="container mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider"><Database className="h-3 w-3" /> Product Knowledge</div>
            <h1 className="text-2xl font-semibold mt-1">Tool Registry</h1>
            <p className="text-sm text-muted-foreground mt-1">Source of truth for product-aware blog generation. BLOG DB only — primary untouched.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={showBootstrap}>Show schema SQL</Button>
            <Button variant="outline" size="sm" onClick={() => setShowCron((v) => !v)}>
              <Clock className="h-3 w-3 mr-1" /> Weekly cron
            </Button>
            <Button variant="outline" size="sm" onClick={() => sync("incremental")} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Diff sync
            </Button>
            <Button size="sm" onClick={() => sync("full")} disabled={loading}>Full sync</Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6 space-y-4">
        {showCron && (
          <Card className="p-4 border-emerald-500/40 bg-emerald-950/10">
            <div className="text-sm font-medium mb-2 flex items-center gap-2"><Clock className="h-4 w-4 text-emerald-400" /> Weekly low-IO sync (BLOG DB only)</div>
            <p className="text-xs text-muted-foreground mb-2">Run once in the BLOG project's SQL editor. Idempotent — re-running re-installs the schedule.</p>
            <pre className="text-[11px] bg-black/40 p-3 rounded max-h-64 overflow-auto whitespace-pre-wrap">{cronSql}</pre>
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => { navigator.clipboard.writeText(cronSql); toast.success("Copied"); }}>Copy</Button>
          </Card>
        )}

        {bootSql && (
          <Card className="p-4 border-amber-500/40 bg-amber-950/10">
            <div className="text-sm font-medium mb-2 flex items-center gap-2"><FileWarning className="h-4 w-4 text-amber-400" /> One-time bootstrap SQL</div>
            <p className="text-xs text-muted-foreground mb-2">Run once in the BLOG project's SQL editor. Idempotent.</p>
            <pre className="text-[11px] bg-black/40 p-3 rounded max-h-64 overflow-auto whitespace-pre-wrap">{bootSql}</pre>
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => { navigator.clipboard.writeText(bootSql); toast.success("Copied"); }}>Copy</Button>
          </Card>
        )}

        {health && (
          <div className="grid grid-cols-4 gap-3">
            <Card className="p-4"><div className="text-xs text-muted-foreground">Manifest tools</div><div className="text-2xl font-semibold">{health.manifest}</div></Card>
            <Card className="p-4"><div className="text-xs text-muted-foreground">In registry</div><div className="text-2xl font-semibold">{health.db}</div></Card>
            <Card className="p-4"><div className="text-xs text-muted-foreground">Stale</div><div className="text-2xl font-semibold text-amber-400">{health.stale?.length ?? 0}</div></Card>
            <Card className="p-4"><div className="text-xs text-muted-foreground">Missing</div><div className="text-2xl font-semibold text-red-400">{health.missing?.length ?? 0}</div></Card>
          </div>
        )}

        <Card className="p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50 text-sm font-medium">Registry ({tools.length})</div>
          <div className="divide-y divide-border/50">
            {tools.map(t => {
              const stale = health?.stale?.includes(t.slug);
              return (
                <div key={t.slug} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate flex items-center gap-2">
                      {t.name}
                      {stale ? <AlertTriangle className="h-3 w-3 text-amber-400" /> : <CheckCircle2 className="h-3 w-3 text-emerald-500/60" />}
                    </div>
                    <div className="text-xs text-muted-foreground">/{t.slug} · {t.category}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{t.tier}</Badge>
                    {t.premium_only && <Badge variant="secondary" className="text-[10px]">premium</Badge>}
                    <span className="text-[10px] text-muted-foreground">{t.last_synced_at ? new Date(t.last_synced_at).toLocaleDateString() : "—"}</span>
                  </div>
                </div>
              );
            })}
            {!tools.length && <div className="p-8 text-center text-sm text-muted-foreground">No tools synced yet — run the bootstrap SQL, then "Full sync".</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}