import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, RefreshCw, Sparkles, TrendingUp, Zap, Search } from "lucide-react";
import { UpgradeDrawer } from "@/components/usage/UpgradeDrawer";
import { LimitHitModal } from "@/components/usage/LimitHitModal";

// U3a — Hidden user usage surface. Reads only from /functions/v1/me-usages.
// No direct DB reads, no enforcement, no mutations.
// Route: /dashboard/usages  (not yet linked in sidebar)

type ResetRow = { period: "day" | "week" | "month"; window_start: string; window_end: string; seconds_remaining: number };
type LimitInfo = { max: number; period: string; source: string };
type UsagesPayload = {
  plan: string;
  limits: Record<string, LimitInfo>;
  features: Record<string, boolean>;
  usage: Record<string, number>;
  remaining: Record<string, number | null>;
  resets: ResetRow[];
  boosters: any[];
  overrides: any[];
};
type ToolPayload = {
  tool: string;
  used: number;
  limit: number | null;
  remaining: number | null;
  last_used: string | null;
  execution_history: Array<{
    decision: string; units_used: number; created_at: string;
    blocked_stage: string | null; execution_id: string | null;
    meter: string; feature: string;
  }>;
};

const METER_LABELS: Record<string, { label: string; group: string; icon?: string }> = {
  ai: { label: "AI Assists", group: "AI" },
  lightweight: { label: "Lightweight AI", group: "AI" },
  export: { label: "Exports", group: "Output" },
  telegram_export: { label: "Telegram Exports", group: "Output" },
  workspace: { label: "Workspaces", group: "Workspaces" },
  portal: { label: "Client Portals", group: "Workspaces" },
  upload: { label: "Uploads", group: "Storage" },
  storage: { label: "Storage", group: "Storage" },
  async_job: { label: "Async Jobs", group: "Background" },
  roadmap: { label: "Roadmaps", group: "AI" },
  intake_form: { label: "Intake Forms", group: "Workspaces" },
  automation: { label: "Automations", group: "Background" },
};

function functionsBase() {
  const projectId = (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID;
  return `https://${projectId}.supabase.co/functions/v1`;
}

async function fetchUsages(): Promise<UsagesPayload | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(`${functionsBase()}/me-usages`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const json = await res.json();
    return normalizePayload(json);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Normalize -1 (unlimited) → null so the UI can render "∞" without division.
function normalizePayload(p: any): UsagesPayload {
  const limits: Record<string, LimitInfo> = {};
  for (const [k, v] of Object.entries(p?.limits ?? {})) {
    const info = v as LimitInfo;
    limits[k] = { ...info, max: info?.max === -1 ? (null as any) : info?.max };
  }
  const remaining: Record<string, number | null> = {};
  for (const [k, v] of Object.entries(p?.remaining ?? {})) {
    remaining[k] = (v as number) === -1 ? null : (v as number | null);
  }
  // If limit is unlimited, force remaining to null (server may have computed 0).
  for (const k of Object.keys(limits)) {
    if (limits[k]?.max == null) remaining[k] = null;
  }
  return {
    plan: p?.plan ?? "free",
    limits,
    features: p?.features ?? {},
    usage: p?.usage ?? {},
    remaining,
    resets: Array.isArray(p?.resets) ? p.resets : [],
    boosters: Array.isArray(p?.boosters) ? p.boosters : [],
    overrides: Array.isArray(p?.overrides) ? p.overrides : [],
  };
}

async function fetchTool(tool: string): Promise<ToolPayload | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(`${functionsBase()}/me-usages/${encodeURIComponent(tool)}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const j = await res.json();
    return {
      tool: j?.tool ?? tool,
      used: j?.used ?? 0,
      limit: j?.limit === -1 ? null : (j?.limit ?? null),
      remaining: j?.remaining === -1 ? null : (j?.remaining ?? null),
      last_used: j?.last_used ?? null,
      execution_history: Array.isArray(j?.execution_history) ? j.execution_history : [],
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function track(event: string, props: Record<string, unknown> = {}) {
  // Lightweight metrics hook — falls back to a console log if no telemetry installed.
  try {
    (window as any).analytics?.track?.(event, props) ??
      (window as any).plausible?.(event, { props }) ??
      console.debug("[usage-metric]", event, props);
  } catch { /* noop */ }
}

export default function Usages() {
  const [data, setData] = useState<UsagesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSource, setDrawerSource] = useState<"hero"|"limit_card"|"limit_modal"|"tool_row">("hero");
  const [limitModal, setLimitModal] = useState<null | {
    meter: string; meterLabel?: string; used: number; limit: number; resetAt?: string | null;
  }>(null);
  const mountedAt = useRef(Date.now());

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    const d = await fetchUsages();
    setData(d);
    setErrored(!d);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    track("usage_page_open");
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    const id = window.setInterval(() => load(), 15_000);
    return () => { window.removeEventListener("focus", onFocus); window.clearInterval(id); };
  }, [load]);

  const cards = useMemo(() => {
    if (!data) return [];
    // One card per `meter:*` (overall meter), prefer wildcard feature.
    const seenMeters = new Set<string>();
    const out: Array<{ meter: string; used: number; limit: number | null; remaining: number | null; pct: number }> = [];
    for (const key of Object.keys(data.limits)) {
      const [meter, feature] = key.split(":");
      if (feature !== "*" || seenMeters.has(meter)) continue;
      seenMeters.add(meter);
      const limit = data.limits[key]?.max ?? null;
      const used = data.usage[key] ?? 0;
      const remaining = data.remaining[key] ?? (limit == null ? null : Math.max(limit - used, 0));
      const pct = limit && limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
      out.push({ meter, used, limit, remaining, pct });
    }
    return out.sort((a, b) => b.pct - a.pct);
  }, [data]);

  const dayReset = data?.resets?.find((r) => r.period === "day");
  const planUsedPct = useMemo(() => {
    if (!cards.length) return 0;
    const withLimit = cards.filter((c) => c.limit && c.limit > 0);
    if (!withLimit.length) return 0;
    return withLimit.reduce((s, c) => s + c.pct, 0) / withLimit.length;
  }, [cards]);

  const upgradeOpportunities = cards.filter(
    (c) => c.limit && c.limit > 0 && c.remaining != null && c.remaining / c.limit <= 0.2
  );

  function openDrawer(source: "hero"|"limit_card"|"limit_modal"|"tool_row") {
    setDrawerSource(source);
    setDrawerOpen(true);
  }

  // Auto-open the limit-hit modal once when any meter reaches 100%
  useEffect(() => {
    if (!data) return;
    const hit = cards.find((c) => c.limit && c.limit > 0 && c.used >= c.limit);
    if (!hit) return;
    const key = `usage_limit_modal_${hit.meter}_${dayReset?.window_end ?? "x"}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    setLimitModal({
      meter: hit.meter,
      meterLabel: METER_LABELS[hit.meter]?.label,
      used: hit.used,
      limit: hit.limit!,
      resetAt: dayReset?.window_end ?? null,
    });
  }, [data, cards, dayReset?.window_end]);

  // Tool explorer state
  const toolsByGroup = useMemo(() => {
    if (!data) return {} as Record<string, string[]>;
    const groups: Record<string, string[]> = {};
    for (const key of Object.keys(data.limits)) {
      const [meter, feature] = key.split(":");
      const info = METER_LABELS[meter];
      const group = info?.group ?? "Other";
      (groups[group] ||= []).push(key);
    }
    return groups;
  }, [data]);

  if (loading) return <UsagesSkeleton />;

  if (!data || errored) {
    return (
      <div className="container mx-auto max-w-5xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Unable to load usage data</CardTitle>
            <CardDescription>
              We couldn't reach the usage service. This is usually temporary.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button size="sm" onClick={() => { setLoading(true); load(true); }}>
              <RefreshCw className="h-4 w-4 mr-2" />Retry
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/dashboard">Back to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isEmpty = cards.every((c) => c.used === 0);

  return (
    <div className="container mx-auto max-w-6xl p-4 md:p-6 space-y-6">
      {/* Plan hero */}
      <Card className="overflow-hidden border-primary/20">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="capitalize">{data.plan} plan</Badge>
                {dayReset && (
                  <span className="text-xs text-muted-foreground">
                    Daily reset in <Countdown seconds={dayReset.seconds_remaining} />
                  </span>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold">Your usage</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Live view of what you've used today across every meter.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button size="sm" onClick={() => { track("upgrade_cta_click", { source: "hero" }); openDrawer("hero"); }}>
                <Sparkles className="h-4 w-4 mr-2" />Manage plan
              </Button>
            </div>
          </div>
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Average usage today</span>
              <span className="tabular-nums font-medium">{planUsedPct.toFixed(0)}%</span>
            </div>
            <Progress value={planUsedPct} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Upgrade opportunities */}
      {upgradeOpportunities.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              You're close to your limit
            </CardTitle>
            <CardDescription>
              {upgradeOpportunities.length} meter{upgradeOpportunities.length > 1 ? "s" : ""} below 20% remaining.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {upgradeOpportunities.map((c) => (
                <Badge key={c.meter} variant="outline" className="text-xs">
                  {METER_LABELS[c.meter]?.label ?? c.meter}: {c.remaining}/{c.limit} left
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => { track("upgrade_cta_click", { source: "upgrade_panel" }); openDrawer("limit_card"); }}>
                Upgrade plan
              </Button>
              <Button size="sm" variant="outline" onClick={() => { track("upgrade_cta_click", { source: "boosters" }); openDrawer("limit_card"); }}>
                <Zap className="h-4 w-4 mr-1" />Add booster
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reset panel */}
      {data.resets?.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {data.resets.map((r) => (
            <Card key={r.period}>
              <CardHeader className="pb-2">
                <CardDescription className="capitalize">{r.period} reset</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tabular-nums">
                  <Countdown seconds={r.seconds_remaining} />
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(r.window_end).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Usage cards */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Today's usage</h2>
        {isEmpty ? (
          <Card>
            <CardContent className="py-10 text-center space-y-3">
              <p className="text-muted-foreground">No usage yet today. Start exploring.</p>
              <div className="flex gap-2 justify-center">
                <Button asChild size="sm"><Link to="/dashboard">Open Dashboard</Link></Button>
                <Button asChild size="sm" variant="outline"><Link to="/dashboard/tools">Explore tools</Link></Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cards.map((c) => (
              <Card key={c.meter}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">
                      {METER_LABELS[c.meter]?.label ?? c.meter}
                    </CardTitle>
                    <Badge variant={c.pct >= 80 ? "destructive" : c.pct >= 50 ? "secondary" : "outline"} className="text-[10px]">
                      {c.limit == null ? "∞" : `${c.pct.toFixed(0)}%`}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-2xl font-semibold tabular-nums">{c.used}</span>
                    <span className="text-sm text-muted-foreground">/ {c.limit ?? "∞"}</span>
                  </div>
                  {c.limit != null && c.limit > 0 && (
                    <Progress value={c.pct} className="h-1.5 transition-all duration-500" />
                  )}
                  <div className="text-xs text-muted-foreground mt-2">
                    {c.remaining == null ? "Unlimited" : `${c.remaining} remaining`}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Tool explorer */}
      <div>
        <div className="flex items-center justify-between mb-3 gap-3">
          <h2 className="text-lg font-semibold">Tool explorer</h2>
          <div className="relative w-64">
            <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tools…"
              className="pl-8 h-9"
            />
          </div>
        </div>
        <div className="space-y-3">
          {Object.entries(toolsByGroup).map(([group, keys]) => {
            const filtered = keys.filter((k) => k.toLowerCase().includes(search.toLowerCase()));
            if (!filtered.length) return null;
            return (
              <Card key={group}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{group}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {filtered.map((key) => (
                    <ToolRow key={key} meterFeature={key} data={data} />
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="text-xs text-muted-foreground text-center pt-2">
        Last refreshed {new Date().toLocaleTimeString()} • Auto-refreshes every 15s
      </div>

      <UpgradeDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        plan={data.plan}
        cards={cards}
        source={drawerSource}
      />

      <LimitHitModal
        open={!!limitModal}
        onOpenChange={(v) => !v && setLimitModal(null)}
        meter={limitModal?.meter ?? ""}
        meterLabel={limitModal?.meterLabel}
        used={limitModal?.used ?? 0}
        limit={limitModal?.limit ?? 0}
        resetAt={limitModal?.resetAt ?? null}
        graceOffered={false}
        onUpgrade={() => { setLimitModal(null); openDrawer("limit_modal"); }}
        onBooster={() => { setLimitModal(null); openDrawer("limit_modal"); }}
      />
    </div>
  );
}

function ToolRow({ meterFeature, data }: { meterFeature: string; data: UsagesPayload }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<ToolPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [meter, feature] = meterFeature.split(":");
  const limit = data.limits[meterFeature]?.max ?? null;
  const used = data.usage[meterFeature] ?? 0;
  const remaining = data.remaining[meterFeature];

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      track("tool_expand", { tool: meterFeature });
      setLoading(true);
      const d = await fetchTool(meterFeature);
      setDetail(d);
      setLoading(false);
    }
  }

  return (
    <Collapsible open={open} onOpenChange={() => toggle()}>
      <CollapsibleTrigger className="w-full flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2">
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
          <code className="text-xs">{meter}{feature !== "*" ? `:${feature}` : ""}</code>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="tabular-nums">{used} / {limit ?? "∞"}</span>
          {remaining != null && (
            <Badge variant="outline" className="text-[10px]">{remaining} left</Badge>
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-2 pt-2 pb-1 text-xs">
        {loading && <Skeleton className="h-20 w-full" />}
        {detail && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-3 text-muted-foreground">
              <span>Last used: {detail.last_used ? new Date(detail.last_used).toLocaleString() : "Never"}</span>
            </div>
            {detail.execution_history.length > 0 ? (
              <div className="border rounded-md overflow-hidden">
                <div className="grid grid-cols-12 text-[10px] uppercase tracking-wide bg-muted/50 px-2 py-1 text-muted-foreground">
                  <span className="col-span-3">When</span>
                  <span className="col-span-2">Decision</span>
                  <span className="col-span-1">Units</span>
                  <span className="col-span-2">Stage</span>
                  <span className="col-span-4">Execution ID</span>
                </div>
                {detail.execution_history.slice(0, 20).map((h, i) => (
                  <div key={i} className="grid grid-cols-12 px-2 py-1 border-t text-[11px]">
                    <span className="col-span-3 text-muted-foreground">{new Date(h.created_at).toLocaleTimeString()}</span>
                    <span className="col-span-2">
                      <Badge variant={h.decision === "allowed" ? "outline" : h.decision === "blocked" ? "destructive" : "secondary"} className="text-[10px]">
                        {h.decision}
                      </Badge>
                    </span>
                    <span className="col-span-1 tabular-nums">{h.units_used}</span>
                    <span className="col-span-2 text-muted-foreground">{h.blocked_stage ?? "—"}</span>
                    <span className="col-span-4 truncate font-mono text-[10px] text-muted-foreground">{h.execution_id ?? "—"}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground py-2">No recent executions.</div>
            )}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function Countdown({ seconds }: { seconds: number }) {
  const [s, setS] = useState(seconds);
  useEffect(() => { setS(seconds); }, [seconds]);
  useEffect(() => {
    const id = window.setInterval(() => setS((x) => Math.max(0, x - 1)), 1000);
    return () => window.clearInterval(id);
  }, []);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return <span>{d}d {h % 24}h</span>;
  }
  return <span>{String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(sec).padStart(2, "0")}</span>;
}

function UsagesSkeleton() {
  return (
    <div className="container mx-auto max-w-6xl p-4 md:p-6 space-y-6">
      <Skeleton className="h-40 w-full" />
      <div className="grid grid-cols-3 gap-3">
        {[0,1,2].map((i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[0,1,2,3,4,5].map((i) => <Skeleton key={i} className="h-32" />)}
      </div>
    </div>
  );
}