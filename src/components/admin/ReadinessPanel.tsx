import { useEffect, useState } from "react";
import { Loader2, Sparkles, Wand2, CheckCircle2, AlertTriangle, Gauge, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { autofixApi } from "@/integrations/blog/client";
import { toast } from "sonner";
import FixPreviewModal from "./FixPreviewModal";

type Analysis = {
  readiness: number;
  breakdown: Record<string, number>;
  blockers: string[];
  warnings: string[];
  suggestions: { kind: string; label: string; impact: string }[];
  sub_stage: string | null;
  words: number;
};

const KIND_LABELS: Record<string, string> = {
  meta: "Optimize SEO",
  keyword: "Fix keyword",
  category: "Assign cluster",
  tools: "Inject tools",
  links: "Add internal links",
  cta: "Improve CTA",
  score: "Rescore AdSense",
};

export default function ReadinessPanel({ postId, onApplied }: { postId?: string; onApplied?: () => void }) {
  const [data, setData] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  const load = async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const r: any = await autofixApi.analyze(postId);
      setData(r);
    } catch (e: any) {
      toast.error(e?.message ?? String(e));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [postId]);

  const fixOne = async (kind: string) => {
    if (!postId) return;
    setBusy(kind);
    try {
      const r: any = await autofixApi.fix(postId, [kind]);
      toast.success(`Fixed: ${(r.events ?? []).join(", ") || kind}`);
      await load();
      onApplied?.();
    } catch (e: any) {
      toast.error(e?.message ?? String(e));
    } finally { setBusy(null); }
  };

  if (!postId) return null;
  if (loading && !data) return (
    <div className="rounded-lg border border-border/50 bg-card/40 p-3 flex items-center gap-2 text-xs text-muted-foreground">
      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing readiness…
    </div>
  );
  if (!data) return null;

  const tone = data.readiness >= 80 ? "text-emerald-400" : data.readiness >= 60 ? "text-amber-400" : "text-destructive";

  return (
    <>
    <div className="rounded-lg border border-border/50 bg-card/40 p-3 space-y-3">
      {/* Header — readiness ring */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gauge className={`w-4 h-4 ${tone}`} />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Operational readiness</div>
            <div className={`text-2xl font-mono font-semibold ${tone}`}>{data.readiness}%</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {data.sub_stage && <Badge variant="outline" className="text-[10px]">{data.sub_stage}</Badge>}
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={load} disabled={loading}>
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Sub-score breakdown */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {Object.entries(data.breakdown).map(([k, v]) => (
          <div key={k}>
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span>{k.replace(/_/g, " ")}</span>
              <span>{v}</span>
            </div>
            <Progress value={v} className="h-1" />
          </div>
        ))}
      </div>

      {/* Big Fix with AI button */}
      <Button
        size="sm"
        onClick={() => setPreview(true)}
        disabled={busy !== null}
        className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:from-violet-400 hover:to-fuchsia-400"
      >
        <Sparkles className="w-3.5 h-3.5 mr-2" /> Fix with AI
      </Button>

      {/* Issues + granular actions */}
      {(data.blockers.length > 0 || data.warnings.length > 0) && (
        <div className="space-y-2">
          {data.blockers.map((b, i) => (
            <div key={`b${i}`} className="flex items-start gap-2 text-xs">
              <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
              <span className="flex-1 text-muted-foreground">{b}</span>
            </div>
          ))}
          {data.warnings.map((w, i) => (
            <div key={`w${i}`} className="flex items-start gap-2 text-xs">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span className="flex-1 text-muted-foreground">{w}</span>
            </div>
          ))}
          {data.blockers.length === 0 && data.warnings.length === 0 && (
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> No issues detected
            </div>
          )}
        </div>
      )}

      {/* Granular quick actions */}
      {data.suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/40">
          {data.suggestions.map((s, i) => (
            <Button
              key={i}
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[11px]"
              onClick={() => fixOne(s.kind)}
              disabled={busy !== null}
              title={`${KIND_LABELS[s.kind] ?? s.kind} — ${s.impact}`}
            >
              {busy === s.kind ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Wand2 className="w-3 h-3 mr-1" />}
              {s.label}
            </Button>
          ))}
        </div>
      )}
    </div>

    <FixPreviewModal
      open={preview}
      onClose={() => setPreview(false)}
      suggestions={data.suggestions}
      readiness={data.readiness}
      onApply={async () => {
        setPreview(false);
        setBusy("all");
        try {
          const r: any = await autofixApi.fix(postId, ["all"]);
          toast.success(`AI fix applied · ${(r.events ?? []).length} actions${r.promoted ? " · promoted to review" : ""}`);
          await load();
          onApplied?.();
        } catch (e: any) {
          toast.error(e?.message ?? String(e));
        } finally { setBusy(null); }
      }}
    />
    </>
  );
}