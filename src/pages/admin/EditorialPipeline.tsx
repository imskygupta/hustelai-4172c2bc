/**
 * Editorial Pipeline — unified content lifecycle table at /admin/blog/pipeline.
 *
 * Surfaces every stage in one place (queued → indexed) with realtime-ish refresh,
 * filters, retry/auto-fix/publish actions and a route reconciliation button.
 * Lives entirely on BLOG_DB.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle, ArrowRight, CheckCircle2, ExternalLink, Filter, Hammer,
  ListChecks, Loader2, RefreshCw, Rocket, Sparkles, TimerReset, Wand2,
  Bug, FileJson, LifeBuoy, Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { pipelineApi } from "@/integrations/blog/client";

const STAGES = [
  "queued", "researching", "drafting", "enriching", "tool_matching",
  "screenshot_generation", "seo_scoring", "awaiting_review",
  "indexed", "published", "failed", "rejected", "deduped",
] as const;
type Stage = typeof STAGES[number];

const STAGE_TONE: Record<Stage, string> = {
  queued: "bg-muted text-muted-foreground",
  researching: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
  drafting: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
  enriching: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30",
  tool_matching: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30",
  screenshot_generation: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  seo_scoring: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  awaiting_review: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/40",
  indexed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40",
  published: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  failed: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
  rejected: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40",
  deduped: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/30",
};

type Row = {
  id: string; slug: string; title: string; cluster: string | null;
  stage: Stage; status: string;
  adsense_score: number | null; generated_at: string | null;
  published_at: string | null; last_indexed_at: string | null;
  tool_matches: number; rejection_reason: string | null;
  internal_links: number; cta_injected: boolean; screenshots: number;
  auto_fix_eligible: boolean; meta_title_ok: boolean; meta_desc_ok: boolean;
  has_category: boolean;
};

function fmtDate(s: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function ScoreBar({ value }: { value: number | null }) {
  if (value == null) return <span className="text-xs text-muted-foreground">—</span>;
  const tone = value >= 80 ? "bg-emerald-500" : value >= 70 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="h-1.5 w-12 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${tone}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className="text-xs tabular-nums">{value}</span>
    </div>
  );
}

export default function EditorialPipeline() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState<Stage | "">("");
  const [search, setSearch] = useState("");
  const [hidden, setHidden] = useState(false);
  const [view, setView] = useState<"table" | "timeline">("table");
  const [busy, setBusy] = useState<string | null>(null);
  const [reconcile, setReconcile] = useState<any>(null);
  const [diag, setDiag] = useState<any>(null);
  const [raw, setRaw] = useState<any[] | null>(null);
  const [batch, setBatch] = useState<{ id: string; rows: any[] } | null>(null);
  const [failedRows, setFailedRows] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await pipelineApi.list({ stage: stage || undefined, hidden, limit: 250 });
      setRows(r.rows ?? []);
      setCounts(r.counts ?? {});
      setFailedRows(r.failedRows ?? []);
    } catch (e: any) {
      toast({ title: "Failed to load pipeline", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [stage, hidden, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("batch");
    if (id) openBatch(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      r.title.toLowerCase().includes(q) ||
      r.slug.toLowerCase().includes(q) ||
      (r.cluster ?? "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  async function autoFix(id?: string) {
    setBusy(id ?? "all");
    try {
      const r = await pipelineApi.autoFix(id ? { id } : {});
      toast({ title: id ? "Auto-fix complete" : "Bulk auto-fix complete", description: `Processed ${r.processed} article(s).` });
      await load();
    } catch (e: any) {
      toast({ title: "Auto-fix failed", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  }
  async function retry(id: string) {
    setBusy(id); try { await pipelineApi.retry(id); await load(); }
    catch (e: any) { toast({ title: "Retry failed", description: e.message, variant: "destructive" }); }
    finally { setBusy(null); }
  }
  async function publishPassing() {
    setBusy("publish");
    try {
      const r = await pipelineApi.publishPassing(70);
      toast({ title: "Publish complete", description: `${r.published?.length ?? 0} of ${r.attempted ?? 0} published.` });
      await load();
    } catch (e: any) {
      toast({ title: "Publish failed", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  }
  async function repairRoutes() {
    setBusy("reconcile");
    try { setReconcile(await pipelineApi.reconcileRoutes()); }
    catch (e: any) { toast({ title: "Reconcile failed", description: e.message, variant: "destructive" }); }
    finally { setBusy(null); }
  }
  async function loadDiagnostics() {
    setBusy("diag");
    try { setDiag(await pipelineApi.diagnostics()); }
    catch (e: any) { toast({ title: "Diagnostics failed", description: e.message, variant: "destructive" }); }
    finally { setBusy(null); }
  }
  async function loadRaw() {
    setBusy("raw");
    try { const r = await pipelineApi.raw({ limit: 100 }); setRaw(r.rows ?? []); }
    catch (e: any) { toast({ title: "Raw fetch failed", description: e.message, variant: "destructive" }); }
    finally { setBusy(null); }
  }
  async function recoverFailed() {
    setBusy("recover");
    try {
      const r = await pipelineApi.recover(100);
      toast({ title: "Recovery complete", description: `${r.fixed} row(s) patched.` });
      await load();
    } catch (e: any) { toast({ title: "Recover failed", description: e.message, variant: "destructive" }); }
    finally { setBusy(null); }
  }
  async function openBatch(id: string) {
    setBusy("batch");
    try { const r = await pipelineApi.batchArticles(id); setBatch({ id, rows: r.rows ?? [] }); }
    catch (e: any) { toast({ title: "Batch fetch failed", description: e.message, variant: "destructive" }); }
    finally { setBusy(null); }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/60 bg-gradient-to-br from-emerald-500/5 via-sky-500/5 to-violet-500/5">
        <div className="max-w-[1400px] mx-auto px-6 pt-8 pb-6">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
            <Link to="/admin" className="hover:text-foreground">Admin</Link>
            <span>/</span>
            <Link to="/admin/blog/os" className="hover:text-foreground">Editorial OS</Link>
            <span>/</span>
            <span className="text-foreground/80">Pipeline</span>
            <Badge variant="outline" className="ml-2 text-[10px] border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
              DB: BLOG_DB
            </Badge>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight">Content Pipeline</h1>
              <p className="text-muted-foreground mt-1">Every article, every stage — queued through indexed.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setView(view === "table" ? "timeline" : "table")} className="gap-2">
                {view === "table" ? "Timeline view" : "Table view"}
              </Button>
              <Button variant="outline" size="sm" onClick={load} className="gap-2">
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={repairRoutes} disabled={busy === "reconcile"} className="gap-2">
                <TimerReset className="h-3.5 w-3.5" /> Repair routes
              </Button>
              <Button variant="outline" size="sm" onClick={loadDiagnostics} disabled={busy === "diag"} className="gap-2">
                <Bug className="h-3.5 w-3.5" /> Diagnostics
              </Button>
              <Button variant="outline" size="sm" onClick={loadRaw} disabled={busy === "raw"} className="gap-2">
                <FileJson className="h-3.5 w-3.5" /> View raw rows
              </Button>
              <Button variant="outline" size="sm" onClick={recoverFailed} disabled={busy === "recover"} className="gap-2">
                <LifeBuoy className="h-3.5 w-3.5" /> Recover failed
              </Button>
              <Button size="sm" onClick={() => autoFix()} disabled={busy === "all"} className="gap-2">
                {busy === "all" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                Auto-fix all
              </Button>
              <Button size="sm" variant="default" onClick={publishPassing} disabled={busy === "publish"} className="gap-2">
                {busy === "publish" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
                Publish all passing
              </Button>
            </div>
          </div>

          {/* Stage chips */}
          <div className="mt-5 flex flex-wrap gap-1.5">
            <button
              onClick={() => setStage("")}
              className={`px-2.5 py-1 rounded-full border text-xs ${stage === "" ? "bg-foreground text-background border-foreground" : "border-border/60 hover:bg-accent"}`}
            >
              All <span className="opacity-60">· {Object.values(counts).reduce((a, b) => a + b, 0)}</span>
            </button>
            {STAGES.map((s) => (
              <button
                key={s}
                onClick={() => setStage(stage === s ? "" : s)}
                className={`px-2.5 py-1 rounded-full border text-xs capitalize ${stage === s ? "bg-foreground text-background border-foreground" : `border-border/60 hover:bg-accent ${counts[s] ? "" : "opacity-50"}`}`}
              >
                {s.replace(/_/g, " ")} <span className="opacity-60">· {counts[s] ?? 0}</span>
              </button>
            ))}
          </div>

          {/* Filter row */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-md rounded-md border border-border/60 bg-card px-2.5">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, slug, cluster…" className="border-0 shadow-none focus-visible:ring-0 px-0 h-8" />
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} />
              Show hidden / deduped
            </label>
          </div>
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-6 py-6">
        {failedRows.length > 0 && (
          <div className="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/5 p-3 text-xs">
            <strong className="text-rose-700 dark:text-rose-300">{failedRows.length} row(s) failed to serialize</strong> — they were skipped so the pipeline still renders.
            Click <button className="underline" onClick={recoverFailed}>Recover failed</button> to patch them.
            <details className="mt-1"><summary className="cursor-pointer text-muted-foreground">Show details</summary>
              <pre className="mt-2 max-h-48 overflow-auto bg-background/40 p-2 rounded">{JSON.stringify(failedRows, null, 2)}</pre>
            </details>
          </div>
        )}
        {diag && (
          <div className="mb-4 rounded-lg border border-border/60 bg-card p-4 text-sm">
            <div className="flex items-center justify-between mb-2">
              <strong className="flex items-center gap-2"><Bug className="h-4 w-4" /> Pipeline diagnostics</strong>
              <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setDiag(null)}>dismiss</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-2">
              <div><span className="text-muted-foreground">Total rows:</span> {diag.total_rows ?? "—"}</div>
              <div><span className="text-muted-foreground">Null slugs:</span> {diag.null_slugs ?? 0}</div>
              <div><span className="text-muted-foreground">Duplicate slugs:</span> {diag.duplicate_slugs?.length ?? 0}</div>
              <div><span className="text-muted-foreground">Missing title:</span> {diag.missing_title ?? 0}</div>
              <div><span className="text-muted-foreground">Missing status:</span> {diag.missing_status ?? 0}</div>
              <div><span className="text-muted-foreground">Missing body:</span> {diag.missing_body ?? 0}</div>
              <div><span className="text-muted-foreground">Bad stages:</span> {diag.bad_stages?.length ?? 0}</div>
              <div><span className="text-muted-foreground">Serialization fails:</span> {diag.serialization_failures?.length ?? 0}</div>
            </div>
            {diag.fatal && <div className="text-rose-600 text-xs mt-2">Fatal: {diag.fatal}</div>}
            <details className="mt-2 text-xs"><summary className="cursor-pointer text-muted-foreground">Stage counts & columns</summary>
              <pre className="mt-2 max-h-64 overflow-auto bg-background/40 p-2 rounded">{JSON.stringify({ stage_counts: diag.stage_counts, sample_columns: diag.sample_columns }, null, 2)}</pre>
            </details>
          </div>
        )}
        {raw && (
          <div className="mb-4 rounded-lg border border-border/60 bg-card p-4 text-sm">
            <div className="flex items-center justify-between mb-2">
              <strong className="flex items-center gap-2"><FileJson className="h-4 w-4" /> Raw rows from BLOG_DB · {raw.length}</strong>
              <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setRaw(null)}>dismiss</button>
            </div>
            <pre className="max-h-[420px] overflow-auto bg-background/40 p-2 rounded text-[11px]">{JSON.stringify(raw, null, 2)}</pre>
          </div>
        )}
        {batch && (
          <div className="mb-4 rounded-lg border border-emerald-500/40 bg-card p-4 text-sm">
            <div className="flex items-center justify-between mb-2">
              <strong className="flex items-center gap-2"><Layers className="h-4 w-4" /> Batch {batch.id.slice(0, 8)} · {batch.rows.length} articles</strong>
              <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setBatch(null)}>close</button>
            </div>
            <ul className="divide-y divide-border/60 max-h-[420px] overflow-auto">
              {batch.rows.map((r: any) => (
                <li key={r.id} className="py-2 flex items-center gap-3">
                  <span className="text-[10px] uppercase border rounded px-1.5 py-0.5 text-muted-foreground">{r.status}</span>
                  <a href={`/admin/blog?id=${r.id}`} target="_blank" rel="noopener" className="text-sm hover:underline truncate">{r.title || r.slug || r.id}</a>
                  <span className="ml-auto text-xs text-muted-foreground">score {r.adsense_score ?? "—"}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {reconcile && (
          <div className="mb-4 rounded-lg border border-border/60 bg-card p-4 text-sm">
            <div className="flex items-center justify-between mb-2">
              <strong>Route reconciliation report</strong>
              <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setReconcile(null)}>dismiss</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div><span className="text-muted-foreground">Published:</span> {reconcile.total_published}</div>
              <div><span className="text-muted-foreground">Duplicate slugs:</span> {reconcile.duplicate_slugs?.length ?? 0}</div>
              <div><span className="text-muted-foreground">Broken internal refs:</span> {reconcile.broken_internal_refs?.length ?? 0}</div>
              <div><span className="text-muted-foreground">Checked:</span> {fmtDate(reconcile.checked_at)}</div>
            </div>
            {reconcile.broken_internal_refs?.length > 0 && (
              <div className="mt-2 text-xs text-rose-600 dark:text-rose-400 break-all">
                {reconcile.broken_internal_refs.slice(0, 12).join(", ")}{reconcile.broken_internal_refs.length > 12 ? "…" : ""}
              </div>
            )}
          </div>
        )}

        {loading && rows.length === 0 ? (
          <PipelineSkeleton />
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 p-10 text-center text-muted-foreground">
            <AlertCircle className="h-5 w-5 mx-auto mb-2" />
            No articles match this filter.
          </div>
        ) : view === "timeline" ? (
          <TimelineView rows={filtered} onAutoFix={autoFix} onRetry={retry} busy={busy} />
        ) : (
          <TableView rows={filtered} onAutoFix={autoFix} onRetry={retry} busy={busy} />
        )}
      </main>
    </div>
  );
}

function ActionCell({ row, onAutoFix, onRetry, busy }: { row: Row; onAutoFix: (id?: string) => void; onRetry: (id: string) => void; busy: string | null }) {
  const editorHref = `/admin/blog?id=${row.id}`;
  const liveHref = `https://blogs.hustlaiapp.in/${row.slug}`;
  return (
    <div className="flex items-center gap-1">
      {row.auto_fix_eligible && (
        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => onAutoFix(row.id)} disabled={busy === row.id} title="Auto-fix this article">
          {busy === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
        </Button>
      )}
      {row.stage === "failed" && (
        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => onRetry(row.id)} disabled={busy === row.id} title="Retry">
          <RefreshCw className="h-3 w-3" />
        </Button>
      )}
      <a href={editorHref} target="_blank" rel="noopener" title="Open in editor (new tab)" className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-accent">
        <ExternalLink className="h-3 w-3" />
      </a>
      {row.stage === "published" || row.stage === "indexed" ? (
        <a href={liveHref} target="_blank" rel="noopener" title="View live" className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-accent">
          <ArrowRight className="h-3 w-3" />
        </a>
      ) : null}
    </div>
  );
}

function TableView({ rows, onAutoFix, onRetry, busy }: { rows: Row[]; onAutoFix: (id?: string) => void; onRetry: (id: string) => void; busy: string | null }) {
  return (
    <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2.5 font-medium">Title</th>
              <th className="text-left px-3 py-2.5 font-medium">Cluster</th>
              <th className="text-left px-3 py-2.5 font-medium">Stage</th>
              <th className="text-left px-3 py-2.5 font-medium">Score</th>
              <th className="text-left px-3 py-2.5 font-medium">Tools</th>
              <th className="text-left px-3 py-2.5 font-medium">Links</th>
              <th className="text-left px-3 py-2.5 font-medium">CTA</th>
              <th className="text-left px-3 py-2.5 font-medium">Generated</th>
              <th className="text-left px-3 py-2.5 font-medium">Indexed</th>
              <th className="text-left px-3 py-2.5 font-medium">Issues</th>
              <th className="text-right px-3 py-2.5 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border/60 hover:bg-muted/20">
                <td className="px-3 py-2.5 max-w-[320px]">
                  <a href={`/admin/blog?id=${r.id}`} target="_blank" rel="noopener" className="font-medium leading-tight line-clamp-1 hover:underline">
                    {r.title || <span className="text-muted-foreground italic">untitled</span>}
                  </a>
                  <div className="text-[11px] text-muted-foreground truncate">/{r.slug}</div>
                </td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">{r.cluster ?? "—"}</td>
                <td className="px-3 py-2.5">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] capitalize ${STAGE_TONE[r.stage]}`}>
                    {r.stage.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-3 py-2.5"><ScoreBar value={r.adsense_score} /></td>
                <td className="px-3 py-2.5 text-xs">{r.tool_matches}</td>
                <td className="px-3 py-2.5 text-xs">{r.internal_links}</td>
                <td className="px-3 py-2.5">{r.cta_injected ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <span className="text-xs text-muted-foreground">—</span>}</td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">{fmtDate(r.generated_at)}</td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">{fmtDate(r.last_indexed_at)}</td>
                <td className="px-3 py-2.5 text-xs">
                  <div className="flex flex-col gap-0.5">
                    {!r.meta_title_ok && <span className="text-amber-600 dark:text-amber-400">meta title</span>}
                    {!r.meta_desc_ok && <span className="text-amber-600 dark:text-amber-400">meta desc</span>}
                    {!r.has_category && <span className="text-amber-600 dark:text-amber-400">category</span>}
                    {r.rejection_reason && <span className="text-rose-600 dark:text-rose-400 line-clamp-1" title={r.rejection_reason}>{r.rejection_reason}</span>}
                    {r.meta_title_ok && r.meta_desc_ok && r.has_category && !r.rejection_reason && <span className="text-muted-foreground">—</span>}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right"><ActionCell row={r} onAutoFix={onAutoFix} onRetry={onRetry} busy={busy} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TimelineView({ rows, onAutoFix, onRetry, busy }: { rows: Row[]; onAutoFix: (id?: string) => void; onRetry: (id: string) => void; busy: string | null }) {
  void 0;
  const grouped = useMemo(() => {
    const m = new Map<Stage, Row[]>();
    for (const s of STAGES) m.set(s, []);
    for (const r of rows) m.get(r.stage)?.push(r);
    return m;
  }, [rows]);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {STAGES.filter((s) => (grouped.get(s)?.length ?? 0) > 0).map((s) => (
        <div key={s} className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <div className={`px-3 py-2 border-b border-border/60 text-xs flex items-center justify-between ${STAGE_TONE[s]}`}>
            <span className="capitalize font-medium">{s.replace(/_/g, " ")}</span>
            <span>{grouped.get(s)?.length}</span>
          </div>
          <ul className="divide-y divide-border/60 max-h-[420px] overflow-auto">
            {grouped.get(s)!.map((r) => (
              <li key={r.id} className="p-3 hover:bg-muted/30">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <a href={`/admin/blog?id=${r.id}`} target="_blank" rel="noopener" className="text-sm font-medium leading-tight line-clamp-2 hover:underline">{r.title || "untitled"}</a>
                    <div className="mt-1 text-[11px] text-muted-foreground flex flex-wrap items-center gap-2">
                      {r.cluster && <span>{r.cluster}</span>}
                      {r.adsense_score != null && <span>· score {r.adsense_score}</span>}
                      <span>· {r.tool_matches} tools</span>
                      <span>· {r.internal_links} links</span>
                    </div>
                    {r.rejection_reason && <div className="mt-1 text-[11px] text-rose-600 dark:text-rose-400 line-clamp-1">{r.rejection_reason}</div>}
                  </div>
                  <ActionCell row={r} onAutoFix={onAutoFix} onRetry={onRetry} busy={busy} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function PipelineSkeleton() {
  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
      <div className="p-3 border-b border-border/60 flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-3 w-20 rounded bg-muted animate-pulse" />
        ))}
      </div>
      <ul className="divide-y divide-border/60">
        {Array.from({ length: 8 }).map((_, i) => (
          <li key={i} className="px-4 py-3 flex items-center gap-3">
            <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
            <div className="h-3 w-16 rounded bg-muted/70 animate-pulse" />
            <div className="h-3 w-12 rounded bg-muted/70 animate-pulse ml-auto" />
          </li>
        ))}
      </ul>
    </div>
  );
}