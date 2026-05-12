import { useEffect, useState } from "react";
import { blogApi } from "@/integrations/blog/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Image, Loader2, RefreshCw, Camera, Layers } from "lucide-react";
import { toast } from "sonner";

const KINDS = ["dashboard", "card", "hero", "feature", "mobile"] as const;
type Kind = (typeof KINDS)[number];

export default function ToolMediaLibrary() {
  const [coverage, setCoverage] = useState<any>(null);
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [c, m] = await Promise.all([blogApi.mediaCoverage(), blogApi.mediaList()]);
      setCoverage(c); setMedia(m.media ?? []);
    } catch (e: any) { toast.error(e.message ?? "load failed"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function capture(slug: string, kind: Kind) {
    setBusy(`${slug}:${kind}`);
    try {
      await blogApi.mediaCapture(slug, kind);
      toast.success(`Captured ${kind} for ${slug}`);
      load();
    } catch (e: any) { toast.error(e.message ?? "capture failed"); }
    finally { setBusy(null); }
  }

  async function runQueue() {
    setLoading(true);
    try {
      const r = await blogApi.mediaQueue(50);
      toast.success(`Queued ${r.queued} · captured ${r.captured}`);
      load();
    } catch (e: any) { toast.error(e.message ?? "queue failed"); }
    finally { setLoading(false); }
  }

  const byTool = new Map<string, any[]>();
  for (const m of media) {
    if (!byTool.has(m.tool_slug)) byTool.set(m.tool_slug, []);
    byTool.get(m.tool_slug)!.push(m);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border/50 bg-gradient-to-b from-emerald-950/20 to-transparent">
        <div className="container mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider"><Image className="h-3 w-3" /> Media Pipeline</div>
            <h1 className="text-2xl font-semibold mt-1">Tool Media Library</h1>
            <p className="text-sm text-muted-foreground mt-1">Auto-screenshot ingestion · BLOG/MEDIA DB only · lazy CDN-cached.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" onClick={runQueue} disabled={loading}>
              <Layers className="h-3 w-3 mr-1" /> Run capture queue (50)
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6 space-y-4">
        {coverage && (
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Coverage</div>
                <div className="text-3xl font-semibold text-emerald-400 mt-1">{coverage.pct}%</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {coverage.captured}/{coverage.total_required} variants captured across {coverage.tools?.length ?? 0} tools
                </div>
              </div>
              <div className="h-2 w-64 bg-muted rounded overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${coverage.pct}%` }} />
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(coverage?.tools ?? []).map((t: any) => {
            const items = byTool.get(t.slug) ?? [];
            return (
              <Card key={t.slug} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-medium text-sm">{t.name}</div>
                    <div className="text-[11px] text-muted-foreground">{t.internal_url || `/${t.slug}`}</div>
                  </div>
                  <Badge variant={t.missing.length === 0 ? "default" : "secondary"} className="text-[10px]">
                    {t.have.length}/{t.have.length + t.missing.length}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {KINDS.map((k) => {
                    const m = items.find((i) => i.kind === k);
                    const busyHere = busy === `${t.slug}:${k}`;
                    return (
                      <div key={k} className="rounded border border-border/50 overflow-hidden bg-muted/20">
                        <div className="aspect-video bg-muted/30 relative">
                          {m?.url ? (
                            <img src={m.url} alt={m.alt} loading="lazy" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">no capture</div>
                          )}
                        </div>
                        <div className="px-2 py-1 flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</span>
                          <button
                            onClick={() => capture(t.slug, k)}
                            disabled={busyHere}
                            className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                          >
                            {busyHere ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                            {m ? "Re-cap" : "Cap"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}