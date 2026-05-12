import { useEffect, useMemo, useRef, useState } from "react";
import { blogApi } from "@/integrations/blog/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Network, ZoomIn, ZoomOut, RotateCcw, List, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function KnowledgeGraph() {
  const [graph, setGraph] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
  const [selected, setSelected] = useState<string | null>(null);
  const [neighbors, setNeighbors] = useState<any>(null);
  const [view, setView] = useState<"graph" | "list">("graph");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => { blogApi.graphAll().then((g: any) => setGraph(g)).catch(() => {}); }, []);
  useEffect(() => {
    if (!selected) { setNeighbors(null); return; }
    blogApi.graphNeighbors(selected).then(setNeighbors).catch(() => {});
  }, [selected]);

  const byCat = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const n of graph.nodes) {
      const c = n.category ?? "other";
      if (!m.has(c)) m.set(c, []);
      m.get(c)!.push(n);
    }
    return m;
  }, [graph.nodes]);

  // Cluster-circle layout: each category gets its own ring; tools positioned around it.
  const layout = useMemo(() => {
    const W = 1200, H = 800;
    const cats = [...byCat.keys()];
    const cx = W / 2, cy = H / 2;
    const clusterRadius = Math.min(W, H) * 0.32;
    const positions = new Map<string, { x: number; y: number; cat: string }>();
    cats.forEach((cat, i) => {
      const a = (i / Math.max(1, cats.length)) * Math.PI * 2 - Math.PI / 2;
      const ccx = cx + Math.cos(a) * clusterRadius;
      const ccy = cy + Math.sin(a) * clusterRadius;
      const nodes = byCat.get(cat) ?? [];
      const r = Math.max(60, 18 + nodes.length * 8);
      nodes.forEach((n: any, j: number) => {
        const t = (j / Math.max(1, nodes.length)) * Math.PI * 2;
        positions.set(n.slug, { x: ccx + Math.cos(t) * r, y: ccy + Math.sin(t) * r, cat });
      });
    });
    return { positions, W, H };
  }, [byCat]);

  // Edges with positions
  const drawEdges = useMemo(() => {
    const { positions } = layout;
    return (graph.edges ?? []).map((e: any, i: number) => {
      const a = positions.get(e.source_slug ?? e.source);
      const b = positions.get(e.target_slug ?? e.target);
      if (!a || !b) return null;
      const isActive = selected && (e.source_slug === selected || e.target_slug === selected || e.source === selected || e.target === selected);
      return { i, a, b, kind: e.kind, weight: e.weight ?? 1, active: !!isActive };
    }).filter(Boolean) as any[];
  }, [graph.edges, layout, selected]);

  // Pan/zoom handlers
  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    setZoom((z) => Math.max(0.4, Math.min(3, z * (e.deltaY < 0 ? 1.1 : 0.9))));
  }
  function onMouseDown(e: React.MouseEvent) { dragRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }; }
  function onMouseMove(e: React.MouseEvent) { if (dragRef.current) setPan({ x: e.clientX - dragRef.current.x, y: e.clientY - dragRef.current.y }); }
  function onMouseUp() { dragRef.current = null; }

  const orphans = useMemo(() => {
    const cited = new Set<string>();
    for (const e of graph.edges ?? []) { cited.add(e.source_slug ?? e.source); cited.add(e.target_slug ?? e.target); }
    return graph.nodes.filter((n: any) => !cited.has(n.slug));
  }, [graph]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border/50 bg-gradient-to-b from-emerald-950/20 to-transparent">
        <div className="container mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider"><Network className="h-3 w-3" /> Product Knowledge Graph</div>
            <h1 className="text-2xl font-semibold mt-1">Knowledge Graph</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {graph.nodes.length} tools · {graph.edges.length} edges · {orphans.length} orphans · click a node to inspect.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant={view === "graph" ? "default" : "outline"} onClick={() => setView("graph")}><Eye className="h-3 w-3 mr-1" /> Graph</Button>
            <Button size="sm" variant={view === "list" ? "default" : "outline"} onClick={() => setView("list")}><List className="h-3 w-3 mr-1" /> List</Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6 grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 space-y-4">
          {view === "graph" && (
            <Card className="p-0 overflow-hidden bg-black/40 border-emerald-900/30 relative">
              <div className="absolute top-3 right-3 z-10 flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setZoom((z) => Math.min(3, z * 1.2))}><ZoomIn className="h-3 w-3" /></Button>
                <Button size="sm" variant="outline" onClick={() => setZoom((z) => Math.max(0.4, z / 1.2))}><ZoomOut className="h-3 w-3" /></Button>
                <Button size="sm" variant="outline" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}><RotateCcw className="h-3 w-3" /></Button>
              </div>
              <div
                onWheel={onWheel}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
                className="cursor-grab active:cursor-grabbing select-none"
                style={{ height: 640 }}
              >
                <svg viewBox={`0 0 ${layout.W} ${layout.H}`} className="w-full h-full">
                  <defs>
                    <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="rgba(16,185,129,0.6)" />
                      <stop offset="100%" stopColor="rgba(16,185,129,0)" />
                    </radialGradient>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width={layout.W} height={layout.H} fill="url(#grid)" />
                  <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
                    {/* edges */}
                    {drawEdges.map((e) => (
                      <line
                        key={e.i}
                        x1={e.a.x} y1={e.a.y} x2={e.b.x} y2={e.b.y}
                        stroke={e.active ? "rgba(16,185,129,0.7)" : "rgba(255,255,255,0.07)"}
                        strokeWidth={e.active ? 1.5 : 0.6}
                      />
                    ))}
                    {/* nodes */}
                    {graph.nodes.map((n: any) => {
                      const p = layout.positions.get(n.slug);
                      if (!p) return null;
                      const isSel = selected === n.slug;
                      const isPrem = n.tier && n.tier !== "free";
                      const isOrphan = orphans.some((o: any) => o.slug === n.slug);
                      const r = isSel ? 12 : 7;
                      return (
                        <g key={n.slug} transform={`translate(${p.x} ${p.y})`} className="cursor-pointer" onClick={() => setSelected(n.slug)}>
                          {isSel && <circle r={r * 2.5} fill="url(#nodeGlow)" />}
                          <circle r={r} fill={isSel ? "#10b981" : isPrem ? "#f59e0b" : isOrphan ? "#ef4444" : "#1f2937"} stroke={isSel ? "#34d399" : "rgba(255,255,255,0.3)"} strokeWidth={isSel ? 2 : 1}>
                            {isSel && <animate attributeName="r" values={`${r};${r * 1.4};${r}`} dur="2s" repeatCount="indefinite" />}
                          </circle>
                          <text x={r + 4} y={3} fontSize={10} fill={isSel ? "#a7f3d0" : "rgba(255,255,255,0.6)"} className="pointer-events-none">
                            {n.name}
                          </text>
                        </g>
                      );
                    })}
                    {/* category labels */}
                    {[...byCat.keys()].map((cat) => {
                      const nodes = byCat.get(cat) ?? [];
                      const ps = nodes.map((n: any) => layout.positions.get(n.slug)).filter(Boolean) as any[];
                      if (!ps.length) return null;
                      const cx = ps.reduce((a, b) => a + b.x, 0) / ps.length;
                      const cy = ps.reduce((a, b) => a + b.y, 0) / ps.length;
                      return (
                        <text key={cat} x={cx} y={cy} fontSize={11} fill="rgba(16,185,129,0.5)" textAnchor="middle" className="pointer-events-none uppercase tracking-widest">
                          {cat}
                        </text>
                      );
                    })}
                  </g>
                </svg>
              </div>
              <div className="px-4 py-2 border-t border-border/50 flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> selected</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> premium</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> orphan</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-700" /> free</span>
                <span className="ml-auto">drag to pan · scroll to zoom</span>
              </div>
            </Card>
          )}

          {view === "list" && [...byCat.entries()].map(([cat, nodes]) => (
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