import { useEffect, useState } from "react";
import { fetchPostPerformance, type PostPerformance } from "@/lib/behavior";
import { Activity, Bookmark, Eye, MousePointerClick, Rocket, Target, Users } from "lucide-react";

/**
 * Editorial conversion intelligence — admin-only sidebar block.
 * Shows real per-post performance: views, reads, bookmarks, CTA CTR,
 * tool launches, conversion %, top persona, engagement score.
 */
export default function ConversionPanel({ slug }: { slug: string }) {
  const [perf, setPerf] = useState<PostPerformance | null | "loading">("loading");

  useEffect(() => {
    let alive = true;
    setPerf("loading");
    fetchPostPerformance(slug).then((p) => alive && setPerf(p));
    return () => { alive = false; };
  }, [slug]);

  if (perf === "loading") {
    return <div className="rounded-xl border border-border p-4 text-xs text-muted-foreground">Loading performance…</div>;
  }
  if (!perf) {
    return <div className="rounded-xl border border-border p-4 text-xs text-muted-foreground">No performance data yet.</div>;
  }

  const fmt = (n: number) => n.toLocaleString();
  const stat = (icon: React.ComponentType<{ className?: string }>, label: string, value: string | number, sub?: string) => {
    const Icon = icon;
    return (
      <div className="rounded-lg border border-border bg-background p-3">
        <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1">
          <Icon className="w-3 h-3" /> {label}
        </div>
        <div className="text-lg font-semibold text-foreground leading-none">{typeof value === "number" ? fmt(value) : value}</div>
        {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-semibold text-emerald-700">
        <Activity className="w-3.5 h-3.5" /> Conversion intelligence
      </div>
      <div className="grid grid-cols-2 gap-2">
        {stat(Eye, "Views", perf.views, `${perf.reads} reads`)}
        {stat(Bookmark, "Bookmarks", perf.bookmarks)}
        {stat(MousePointerClick, "CTA CTR", `${perf.cta_ctr}%`, `${perf.cta_clicks}/${perf.cta_impressions}`)}
        {stat(Rocket, "Tool launches", perf.tool_launches)}
        {stat(Target, "Conversion", `${perf.conversion_pct}%`, "launches / views")}
        {stat(Users, "Returning", `${perf.returning_pct}%`, `${perf.distinct_visitors} unique`)}
      </div>
      <div className="rounded-lg border border-border bg-muted/40 p-3 flex items-center justify-between">
        <div>
          <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Engagement score</div>
          <div className="text-2xl font-semibold text-foreground leading-none mt-1">{perf.engagement_score}</div>
        </div>
        <div className="text-right">
          <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Top persona</div>
          <div className="text-sm font-semibold text-foreground mt-1 capitalize">{perf.top_persona ?? "—"}</div>
        </div>
      </div>
    </div>
  );
}