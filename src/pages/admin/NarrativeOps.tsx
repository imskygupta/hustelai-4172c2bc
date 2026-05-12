import { useEffect, useState } from "react";
import { blogApi } from "@/integrations/blog/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Activity, Play, RefreshCw, Database, Network } from "lucide-react";
import { Link } from "react-router-dom";

const STAGES = [
  "keyword","graph_query","tool_resolution","outline","draft",
  "links","cta","hero","screenshots","seo","indexnow","publish"
];

const STAGE_LABELS: Record<string, string> = {
  keyword: "Resolving keyword",
  graph_query: "Mapping tool graph",
  tool_resolution: "Selecting workflows",
  outline: "Drafting outline",
  draft: "Generating narrative",
  links: "Injecting internal links",
  cta: "Building CTA strategy",
  hero: "Producing hero image",
  screenshots: "Capturing screenshots",
  seo: "SEO + schema",
  indexnow: "Queuing IndexNow",
  publish: "Publishing",
};

export default function NarrativeOps() {
  const [runs, setRuns] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [topic, setTopic] = useState("");
  const [keyword, setKeyword] = useState("");
  const [generating, setGenerating] = useState(false);
  const [coverage, setCoverage] = useState<any>(null);

  async function loadRuns() {
    const r = await blogApi.narrativeRuns(30).catch(() => ({ runs: [] }));
    setRuns(r.runs ?? []);
    if (!selected && r.runs?.[0]) setSelected(r.runs[0].id);
  }
  async function loadEvents(id: string) {
    const r = await blogApi.narrativeEvents(id).catch(() => ({ events: [] }));
    setEvents(r.events ?? []);
  }
  async function loadCoverage() {
    const r = await blogApi.graphCoverage().catch(() => null);
    setCoverage(r);
  }

  useEffect(() => { loadRuns(); loadCoverage(); }, []);
  useEffect(() => {
    if (!selected) return;
    loadEvents(selected);
    const t = setInterval(() => loadEvents(selected), 2000);
    return () => clearInterval(t);
  }, [selected]);
  useEffect(() => {
    const t = setInterval(loadRuns, 4000);
    return () => clearInterval(t);
  }, []);

  async function generate() {
    setGenerating(true);
    try {
      const r = await blogApi.narrativeGenerate({ topic, keyword, auto_publish: false });
      if (r?.run_id) setSelected(r.run_id);
      setTopic(""); setKeyword("");
      loadRuns();
    } finally { setGenerating(false); }
  }

  const current = runs.find(r => r.id === selected);
  const stageStatus = (st: string) => events.find(e => e.stage === st);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border/50 bg-gradient-to-b from-emerald-950/20 to-transparent">
        <div className="container mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider"><Activity className="h-3 w-3" /> Product Narrative Engine</div>
            <h1 className="text-2xl font-semibold mt-1">Narrative Ops</h1>
            <p className="text-sm text-muted-foreground mt-1">Live operational feed for product-aware blog generation.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/admin/blog/registry"><Button variant="outline" size="sm"><Database className="h-3 w-3 mr-1" /> Registry</Button></Link>
            <Link to="/admin/blog/graph"><Button variant="outline" size="sm"><Network className="h-3 w-3 mr-1" /> Graph</Button></Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6 grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <Card className="p-4">
            <div className="text-sm font-medium mb-2">New narrative run</div>
            <Input placeholder="Topic (or leave blank for topic bank)" value={topic} onChange={e => setTopic(e.target.value)} className="mb-2" />
            <Input placeholder="Focus keyword (optional)" value={keyword} onChange={e => setKeyword(e.target.value)} className="mb-3" />
            <Button onClick={generate} disabled={generating} className="w-full">
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              Generate
            </Button>
          </Card>

          {coverage && (
            <Card className="p-4">
              <div className="text-sm font-medium mb-2">Narrative coverage</div>
              <div className="text-3xl font-semibold text-emerald-400">{coverage.coverage_pct ?? 0}%</div>
              <div className="text-xs text-muted-foreground mt-1">{coverage.coverage?.length ?? 0} tools cited · {coverage.uncovered?.length ?? 0} uncovered</div>
              {coverage.uncovered?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {coverage.uncovered.slice(0, 8).map((s: string) => (
                    <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                  ))}
                </div>
              )}
            </Card>
          )}

          <Card className="p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
              <div className="text-sm font-medium">Recent runs</div>
              <Button size="sm" variant="ghost" onClick={loadRuns}><RefreshCw className="h-3 w-3" /></Button>
            </div>
            <div className="max-h-[480px] overflow-y-auto divide-y divide-border/50">
              {runs.map(r => (
                <button key={r.id} onClick={() => setSelected(r.id)} className={`w-full text-left px-4 py-3 hover:bg-muted/40 transition ${selected===r.id?"bg-muted/40":""}`}>
                  <div className="flex items-center justify-between">
                    <div className="text-sm truncate flex-1">{r.topic ?? "(untitled)"}</div>
                    <Badge variant={r.status === "succeeded" ? "default" : r.status === "failed" ? "destructive" : "secondary"} className="text-[10px]">{r.status}</Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">{r.current_stage} · {new Date(r.started_at).toLocaleTimeString()}</div>
                </button>
              ))}
              {!runs.length && <div className="p-6 text-center text-xs text-muted-foreground">No runs yet</div>}
            </div>
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-8 space-y-4">
          {current && (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-xs text-muted-foreground">Current run</div>
                  <div className="text-base font-medium">{current.topic}</div>
                </div>
                <Badge>{current.status}</Badge>
              </div>
              <div className="grid grid-cols-11 gap-1">
                {STAGES.map(s => {
                  const ev = stageStatus(s);
                  const cls = !ev ? "bg-muted/30 text-muted-foreground" :
                    ev.status === "ok" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" :
                    ev.status === "error" ? "bg-red-500/20 text-red-300 border-red-500/40" :
                    "bg-amber-500/20 text-amber-300 border-amber-500/40";
                  return <div key={s} className={`text-[10px] uppercase tracking-wider text-center py-2 rounded border border-border/50 ${cls}`}>{s.replace("_"," ")}</div>;
                })}
              </div>
            </Card>
          )}

          <Card className="p-0 overflow-hidden bg-black/40 border-emerald-900/30">
            <div className="px-4 py-2 border-b border-emerald-900/40 text-xs flex items-center gap-2 bg-gradient-to-r from-emerald-950/40 to-transparent">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              <span className="text-emerald-300 font-mono">narrative-engine</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">live operational feed</span>
              <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">{events.length} events</span>
            </div>
            <div className="font-mono text-xs p-4 max-h-[600px] overflow-y-auto space-y-1">
              {events.map(e => (
                <div key={e.id} className="flex gap-3 group">
                  <span className="text-muted-foreground/60 shrink-0">{new Date(e.created_at).toLocaleTimeString()}</span>
                  <span className={`shrink-0 w-32 ${e.status === "error" ? "text-red-400" : e.status === "ok" ? "text-emerald-400" : "text-amber-300"}`}>
                    [{(STAGE_LABELS[e.stage] ?? e.stage).toLowerCase()}]
                  </span>
                  <span className="text-foreground/80 group-hover:text-foreground transition">{e.message}</span>
                </div>
              ))}
              {!events.length && (
                <div className="text-muted-foreground flex items-center gap-2">
                  <span className="inline-block w-1.5 h-3 bg-emerald-400/60 animate-pulse" />
                  <span>awaiting narrative run…</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}