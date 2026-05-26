import { useEffect, useState } from "react";
import { Activity, Bookmark, Eye, Rocket } from "lucide-react";
import { fetchOperatorPulse, fetchGlobalPulse, type OperatorPulse, type GlobalPulse } from "@/lib/behavior";

/**
 * Calm, operational live-activity ribbon.
 * Shows real recent counters from blog_events / blog_bookmarks / tool_launch_events.
 * Empty counters render nothing — never invents activity.
 */

function relTime(iso?: string | null): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const diff = (Date.now() - t) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function Pill({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600 text-[11.5px] font-medium">
      <Icon className="w-3 h-3 text-emerald-600" />
      {children}
    </span>
  );
}

export function ArticleActivityRibbon({ slug }: { slug: string }) {
  const [pulse, setPulse] = useState<OperatorPulse | null>(null);
  // Anon-runtime hygiene: blog pages are public, so this mounts for every
  // logged-out visitor (and crawlers). One-shot fetch on mount — no polling,
  // no visibilitychange listener. Counters move slowly; refresh on navigation.
  useEffect(() => {
    let alive = true;
    fetchOperatorPulse(slug).then((p) => { if (alive) setPulse(p); }).catch(() => {});
    return () => { alive = false; };
  }, [slug]);

  if (!pulse) return null;
  const items: React.ReactNode[] = [];
  if (pulse.views_today > 0) items.push(
    <Pill key="v" icon={Eye}>{pulse.views_today.toLocaleString()} operator{pulse.views_today === 1 ? "" : "s"} viewed this today</Pill>
  );
  if (pulse.launches_24h > 0) items.push(
    <Pill key="l" icon={Rocket}>{pulse.launches_24h.toLocaleString()} launched a tool from this guide</Pill>
  );
  if (pulse.bookmarks_24h > 0) items.push(
    <Pill key="b" icon={Bookmark}>
      {pulse.bookmarks_24h.toLocaleString()} saved this in the last 24h
      {relTime(pulse.last_bookmark_at) && (
        <span className="ml-1 text-slate-400">· last {relTime(pulse.last_bookmark_at)}</span>
      )}
    </Pill>
  );
  if (!items.length && pulse.total_bookmarks > 0) items.push(
    <Pill key="t" icon={Bookmark}>Saved by {pulse.total_bookmarks.toLocaleString()} operator{pulse.total_bookmarks === 1 ? "" : "s"}</Pill>
  );
  if (!items.length) return null;

  return (
    <div className="my-6 flex flex-wrap items-center gap-2 not-prose">
      <span className="inline-flex items-center gap-1 text-[10.5px] uppercase tracking-[0.18em] font-semibold text-emerald-700">
        <Activity className="w-3 h-3" /> Live activity
      </span>
      {items}
    </div>
  );
}

export function GlobalActivityRibbon({ className = "" }: { className?: string }) {
  const [pulse, setPulse] = useState<GlobalPulse | null>(null);
  // Anon-runtime hygiene: rendered on the public blog index. One-shot fetch
  // on mount, no polling. See ArticleActivityRibbon above.
  useEffect(() => {
    let alive = true;
    fetchGlobalPulse().then((p) => { if (alive) setPulse(p); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!pulse) return null;
  const parts: string[] = [];
  if (pulse.active_guides > 0) parts.push(`${pulse.active_guides} guides active today`);
  if (pulse.launches_today > 0) parts.push(`${pulse.launches_today} tools launched`);
  if (pulse.saves_today > 0) parts.push(`${pulse.saves_today} systems saved`);
  if (!parts.length) return null;

  return (
    <div className={`flex items-center justify-center gap-2 text-[11.5px] text-slate-500 ${className}`}>
      <span className="relative inline-flex w-1.5 h-1.5">
        <span className="absolute inset-0 rounded-full bg-emerald-500 opacity-75 animate-ping" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
      </span>
      <span>{parts.join(" · ")} on HustleAI</span>
    </div>
  );
}