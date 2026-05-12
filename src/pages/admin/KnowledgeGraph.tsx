import { useEffect, useState } from "react";
import { blogApi } from "@/integrations/blog/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Network } from "lucide-react";

export default function KnowledgeGraph() {
  const [graph, setGraph] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
  const [selected, setSelected] = useState<string | null>(null);
  const [neighbors, setNeighbors] = useState<any>(null);

  useEffect(() => { blogApi.graphAll().then((g: any) => setGraph(g)).catch(() => {}); }, []);
  useEffect(() => {
    if (!selected) { setNeighbors(null); return; }
    blogApi.graphNeighbors(selected).then(setNeighbors).catch(() => {});
  }, [selected]);

  const byCat = new Map<string, any[]>();
  for (const n of graph.nodes) {
    const c = n.category ?? "other";
    if (!byCat.has(c)) byCat.set(c, []);
    byCat.get(c)!.push(n);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border/50 bg-gradient-to-b from-emerald-950/20 to-transparent">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider"><Network className="h-3 w-3" /> Product Knowledge Graph</div>
          <h1 className="text-2xl font-semibold mt-1">Knowledge Graph</h1>
          <p className="text-sm text-muted-foreground mt-1">{graph.nodes.length} tools · {graph.edges.length} edges. Click a tool to inspect neighbors.</p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6 grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 space-y-4">
          {[...byCat.entries()].map(([cat, nodes]) => (
            <Card key={cat} className="p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">{cat}</div>
              <div className="flex flex-wrap gap-2">
                {nodes.map((n: any) => (
                  <button key={n.slug} onClick={() => setSelected(n.slug)}
                    className={`px-3 py-1.5 rounded border text-sm transition ${selected === n.slug ? "border-emerald-500 bg-emerald-500/10" : "border-border/60 hover:border-emerald-500/40"}`}>
                    {n.name} <span className="text-[10px] text-muted-foreground ml-1">{n.tier}</span>
                  </button>
                ))}
              </div>
            </Card>
          ))}
        </div>
        <div className="col-span-12 lg:col-span-4">
          <Card className="p-4 sticky top-4">
            <div className="text-sm font-medium mb-2">Neighbors</div>
            {!selected && <div className="text-xs text-muted-foreground">Select a tool to inspect its relationships.</div>}
            {neighbors && (
              <div className="space-y-3">
                {Object.entries(neighbors.by_kind ?? {}).map(([kind, slugs]: any) => (
                  <div key={kind}>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{kind}</div>
                    <div className="flex flex-wrap gap-1">
                      {slugs.map((s: string) => <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>)}
                    </div>
                  </div>
                ))}
                <div className="pt-3 border-t border-border/50 space-y-2">
                  {(neighbors.neighbors ?? []).map((t: any) => (
                    <div key={t.slug} className="text-xs">
                      <div className="font-medium">{t.name}</div>
                      <div className="text-muted-foreground">{t.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}