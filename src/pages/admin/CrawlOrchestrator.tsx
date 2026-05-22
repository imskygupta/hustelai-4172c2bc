import { useEffect, useState } from "react";
import { blogApi } from "@/integrations/blog/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Radio, Activity, AlertTriangle, Link2, Send } from "lucide-react";
import { toast } from "sonner";

export default function CrawlOrchestrator() {
  const [diag, setDiag] = useState<any>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [bootSql, setBootSql] = useState<string | null>(null);
  const [idx, setIdx] = useState<any>(null);
  const [idxBootSql, setIdxBootSql] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    try {
      const [d, q, s] = await Promise.all([
        blogApi.crawlDiagnostics(),
        blogApi.crawlQueue(),
        blogApi.indexingStats().catch(() => null),
      ]);
      setDiag(d); setQueue(q.queue ?? []); setIdx(s);
    } catch (e: any) {
      toast.error(e.message ?? "Load failed");
    } finally { setBusy(false); }
  }
  useEffect(() => { load(); }, []);

  async function run(label: string, fn: () => Promise<any>) {
    setBusy(true);
    try { const r = await fn(); toast.success(`${label}: ${JSON.stringify(r).slice(0, 120)}`); await load(); }
    catch (e: any) { toast.error(e.message ?? `${label} failed`); }
    finally { setBusy(false); }
  }

  async function showBoot() {
    const r = await blogApi.crawlBootstrapSql();
    setBootSql(r.sql);
  }

  const cronSql = `-- Hourly crawl orchestration loop. Run once in BLOG SQL editor.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule('crawl-orchestrator-submit', '15 * * * *', $$
  select net.http_post(
    url := '${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crawl-orchestrator?action=submit',
    headers := '{"Content-Type":"application/json","apikey":"${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}"}'::jsonb,
    body := '{"limit": 50}'::jsonb
  );
$$);

select cron.schedule('crawl-orchestrator-freshness', '30 3 * * *', $$
  select net.http_post(
    url := '${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crawl-orchestrator?action=freshness',
    headers := '{"Content-Type":"application/json","apikey":"${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}"}'::jsonb,
    body := '{}'::jsonb
  );
$$);

select cron.schedule('crawl-orchestrator-sync-blog', '0 4 * * *', $$
  select net.http_post(
    url := '${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crawl-orchestrator?action=sync_blog',
    headers := '{"Content-Type":"application/json","apikey":"${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}"}'::jsonb,
    body := '{}'::jsonb
  );
$$);

select cron.schedule('crawl-orchestrator-ping', '45 5 * * *', $$
  select net.http_post(
    url := '${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crawl-orchestrator?action=ping',
    headers := '{"Content-Type":"application/json","apikey":"${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}"}'::jsonb,
    body := '{}'::jsonb
  );
$$);`;

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Crawl Orchestrator</p>
          <h1 className="text-2xl font-semibold mt-1">Indexing velocity & authority routing</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          ["Total URLs", diag?.total ?? 0],
          ["Avg freshness", diag?.avg_freshness ?? 0],
          ["Stale", diag?.stale?.length ?? 0],
          ["Orphan", diag?.orphan?.length ?? 0],
          ["Low-link", diag?.low_link?.length ?? 0],
        ].map(([l, v]) => (
          <Card key={l as string} className="p-4">
            <div className="text-[11px] uppercase text-muted-foreground tracking-wider">{l}</div>
            <div className="text-2xl font-semibold mt-1">{String(v)}</div>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => run("Sync blog", () => blogApi.crawlSyncBlog())} disabled={busy}>
            <RefreshCw className="w-4 h-4 mr-1" /> Sync blog → registry
          </Button>
          <Button size="sm" onClick={() => run("Sync main routes", () => blogApi.crawlSyncMain())} disabled={busy}>
            <RefreshCw className="w-4 h-4 mr-1" /> Sync main routes
          </Button>
          <Button size="sm" onClick={() => run("Submit top 50", () => blogApi.crawlSubmit(50))} disabled={busy}>
            <Send className="w-4 h-4 mr-1" /> Submit priority queue
          </Button>
          <Button size="sm" variant="outline" onClick={() => run("Ping sitemaps", () => blogApi.crawlPing())} disabled={busy}>
            <Radio className="w-4 h-4 mr-1" /> Ping sitemaps
          </Button>
          <Button size="sm" variant="outline" onClick={() => run("Freshness scan", () => blogApi.crawlFreshness())} disabled={busy}>
            <Activity className="w-4 h-4 mr-1" /> Run freshness scan
          </Button>
          <Button size="sm" variant="outline" onClick={showBoot}>Bootstrap SQL</Button>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2"><Link2 className="w-4 h-4" /> By kind</h2>
          </div>
          <div className="space-y-1 text-sm">
            {Object.entries(diag?.by_kind ?? {}).map(([k, v]: any) => (
              <div key={k} className="flex justify-between border-b border-border/40 py-1">
                <span className="font-mono text-xs">{k}</span><Badge variant="secondary">{v}</Badge>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <h3 className="text-xs uppercase text-muted-foreground tracking-wider mb-2">By status</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(diag?.by_status ?? {}).map(([k, v]: any) => (
                <Badge key={k} variant="outline">{k}: {v}</Badge>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold flex items-center gap-2 mb-3"><Send className="w-4 h-4" /> Priority queue (top 50)</h2>
          <div className="space-y-1 text-xs max-h-[360px] overflow-auto">
            {queue.map((q) => (
              <div key={q.id} className="flex items-center justify-between border-b border-border/40 py-1">
                <span className="truncate font-mono text-[11px]">{q.url}</span>
                <span className="flex gap-1 ml-2">
                  <Badge variant="secondary" className="text-[10px]">{q.kind}</Badge>
                  <Badge variant="outline" className="text-[10px]">P{q.priority}</Badge>
                </span>
              </div>
            ))}
            {!queue.length && <p className="text-muted-foreground">Empty.</p>}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="font-semibold flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-amber-500" /> Stale & orphan URLs
        </h2>
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <h3 className="uppercase text-[11px] tracking-wider text-muted-foreground mb-1">Stale</h3>
            {(diag?.stale ?? []).slice(0, 20).map((s: any) => (
              <div key={s.url} className="flex justify-between border-b border-border/40 py-1">
                <span className="truncate font-mono text-[11px]">{s.url}</span>
                <Badge variant="outline">{Number(s.score ?? 0).toFixed(2)}</Badge>
              </div>
            ))}
          </div>
          <div>
            <h3 className="uppercase text-[11px] tracking-wider text-muted-foreground mb-1">Orphans (no inbound)</h3>
            {(diag?.orphan ?? []).slice(0, 20).map((o: any) => (
              <div key={o.url} className="truncate font-mono text-[11px] py-1 border-b border-border/40">
                {o.url}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-2">Hourly cron (run in BLOG SQL editor)</h2>
        <pre className="text-[11px] bg-muted/30 p-3 rounded overflow-x-auto whitespace-pre-wrap">{cronSql}</pre>
      </Card>

      {bootSql && (
        <Card className="p-4">
          <h2 className="font-semibold mb-2">Bootstrap SQL — run once in BLOG DB</h2>
          <pre className="text-[11px] bg-muted/30 p-3 rounded overflow-x-auto whitespace-pre-wrap">{bootSql}</pre>
        </Card>
      )}

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Indexing pipeline</p>
            <h2 className="font-semibold mt-1">Post-publish dispatcher (sitemap → IndexNow → GSC → crawl → validate)</h2>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={async () => {
              const r = await blogApi.indexingBootstrapSql(); setIdxBootSql(r.sql);
            }}>Bootstrap SQL</Button>
            <Button size="sm" onClick={() => run("Retry indexing", () => blogApi.indexingRetry(25))} disabled={busy}>
              <Send className="w-4 h-4 mr-1" /> Retry failed/pending
            </Button>
          </div>
        </div>
        {idx ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {[
                ["Queued", idx.counts?.queued],
                ["In flight", idx.counts?.in_flight],
                ["Pending auth", idx.counts?.pending_auth],
                ["Failed", idx.counts?.failed],
                ["Done 24h", idx.counts?.done_24h],
                ["Dispatched 7d", idx.counts?.dispatched_7d],
              ].map(([l, v]) => (
                <div key={l as string} className="rounded border border-border/40 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</div>
                  <div className="text-xl font-semibold mt-1">{Number(v ?? 0)}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Badge variant={idx.gsc_connector?.configured ? "secondary" : "outline"}>
                GSC connector: {idx.gsc_connector?.configured ? "connected" : "not connected (pending_auth)"}
              </Badge>
              {idx.last_done_at && <span className="text-muted-foreground">Last done: {new Date(idx.last_done_at).toLocaleString()}</span>}
            </div>
            <div>
              <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Recent jobs</h3>
              <div className="space-y-1 text-[11px] max-h-[260px] overflow-auto">
                {(idx.recent ?? []).map((j: any) => (
                  <div key={j.id} className="flex items-center justify-between border-b border-border/40 py-1">
                    <span className="truncate font-mono">{j.slug}</span>
                    <span className="flex gap-1 ml-2">
                      <Badge variant="outline">{j.state}</Badge>
                      <Badge variant="secondary">a{j.attempts}</Badge>
                      <Button size="sm" variant="ghost" className="h-5 px-2 text-[10px]"
                        onClick={() => run("Manual retry", () => blogApi.indexingManualRetry(j.id))} disabled={busy}>retry</Button>
                    </span>
                  </div>
                ))}
                {!(idx.recent ?? []).length && <p className="text-muted-foreground">No jobs yet.</p>}
              </div>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Run Bootstrap SQL once in the BLOG DB to enable indexing telemetry.</p>
        )}
        {idxBootSql && (
          <pre className="text-[11px] bg-muted/30 p-3 rounded overflow-x-auto whitespace-pre-wrap">{idxBootSql}</pre>
        )}
      </Card>
    </div>
  );
}
