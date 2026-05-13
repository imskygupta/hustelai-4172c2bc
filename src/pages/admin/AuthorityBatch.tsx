import { useEffect, useState } from "react";
import { conversionApi } from "@/integrations/blog/client";
import { Button } from "@/components/ui/button";

const CLUSTERS = [
  "freelancer-operations","async-workflows","client-delivery","proposal-systems",
  "crm-automation","solo-agency-systems","ai-operations","telegram-workflows",
  "workflow-templates","operational-sops",
];

export default function AuthorityBatch() {
  const [count, setCount] = useState(20);
  const [stagger, setStagger] = useState(6);
  const [autoPublish, setAutoPublish] = useState(true);
  const [minScore, setMinScore] = useState(70);
  const [selected, setSelected] = useState<string[]>(CLUSTERS);
  const [batches, setBatches] = useState<any[]>([]);
  const [running, setRunning] = useState(false);
  const [latest, setLatest] = useState<any>(null);

  const refresh = () => conversionApi.batchList().then((r: any) => setBatches(r.batches ?? [])).catch(() => {});
  useEffect(() => { refresh(); }, []);

  const start = async () => {
    setRunning(true);
    try {
      const r: any = await conversionApi.batchStart({
        count, stagger_hours: stagger, clusters: selected,
        auto_publish: autoPublish, min_adsense_score: minScore,
      });
      setLatest(r);
      refresh();
    } finally { setRunning(false); }
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-display font-bold">Authority Batch Generator</h1>
          <p className="text-muted-foreground mt-1">Generate balanced, deduped, tool-matched, AdSense-scored articles in one staggered run.</p>
        </header>

        <section className="rounded-xl border border-border/60 p-5 space-y-4 bg-card">
          <div className="grid sm:grid-cols-4 gap-4">
            <label className="text-sm">Count
              <input type="number" min={1} max={30} value={count} onChange={(e) => setCount(Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2" />
            </label>
            <label className="text-sm">Stagger (hours)
              <input type="number" min={1} max={48} value={stagger} onChange={(e) => setStagger(Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2" />
            </label>
            <label className="text-sm">Min AdSense score
              <input type="number" min={0} max={100} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2" />
            </label>
            <label className="text-sm flex items-end gap-2">
              <input type="checkbox" checked={autoPublish} onChange={(e) => setAutoPublish(e.target.checked)} />
              Auto-schedule passing articles
            </label>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Clusters</div>
            <div className="flex flex-wrap gap-2">
              {CLUSTERS.map((c) => {
                const active = selected.includes(c);
                return (
                  <button key={c} onClick={() => setSelected((p) => active ? p.filter((x) => x !== c) : [...p, c])}
                    className={`px-3 py-1 rounded-full text-xs border transition ${active ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={start} disabled={running || selected.length === 0}>
              {running ? "Generating…" : `Start batch of ${count}`}
            </Button>
            <span className="text-xs text-muted-foreground">Runs serially — expect ~{Math.ceil(count * 0.6)} min for {count} articles.</span>
          </div>
        </section>

        {latest && (
          <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
            <h2 className="font-medium mb-3">Latest run</h2>
            <div className="text-sm text-muted-foreground mb-3">
              Scheduled {latest.scheduled_first_at?.slice(0, 16)} → {latest.scheduled_last_at?.slice(0, 16)}
            </div>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="py-2">Topic</th><th>Cluster</th><th>Score</th><th>Status</th><th>Tools</th></tr>
                </thead>
                <tbody>
                  {(latest.results ?? []).map((r: any, i: number) => (
                    <tr key={i} className="border-t border-border/40">
                      <td className="py-2 pr-3">{r.topic}</td>
                      <td className="pr-3 text-muted-foreground">{r.cluster}</td>
                      <td className="pr-3">{r.score ?? "—"}</td>
                      <td className="pr-3">{r.ok ? r.status : <span className="text-destructive">{r.error}</span>}</td>
                      <td className="text-muted-foreground">{(r.tools ?? []).slice(0, 3).join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section>
          <h2 className="font-medium mb-3">Recent batches</h2>
          <div className="space-y-2">
            {batches.map((b) => (
              <div key={b.id} className="rounded-lg border border-border/60 p-3 text-sm flex items-center justify-between">
                <div>
                  <div>{new Date(b.created_at).toLocaleString()} · {b.count} articles · {b.status}</div>
                  <div className="text-xs text-muted-foreground">{b.clusters?.join(", ")}</div>
                </div>
                <div className="text-xs text-muted-foreground">{b.results?.length ?? 0} results</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}