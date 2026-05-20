// Operations Health — calm operator surface. Six health categories,
// minimal color signaling, readable at a glance. Polls every 60s.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield, Cpu, Workflow, Layers, Webhook, CreditCard,
  RefreshCw, CheckCircle2, AlertTriangle, AlertOctagon, Circle,
} from "lucide-react";

type Level = "healthy" | "degraded" | "warning" | "critical" | "unknown";

type Category = {
  key: string;
  label: string;
  icon: any;
  level: Level;
  primary: string;   // headline number / line
  hint?: string;     // one-line context
};

const LEVEL_TONE: Record<Level, { dot: string; badge: string; label: string; icon: any }> = {
  healthy:  { dot: "bg-emerald-500", badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20", label: "Healthy",  icon: CheckCircle2 },
  degraded: { dot: "bg-amber-400",   badge: "bg-amber-400/10 text-amber-700 dark:text-amber-300 border-amber-400/20",  label: "Degraded", icon: AlertTriangle },
  warning:  { dot: "bg-amber-500",   badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",  label: "Warning",  icon: AlertTriangle },
  critical: { dot: "bg-rose-500",    badge: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",      label: "Critical", icon: AlertOctagon },
  unknown:  { dot: "bg-zinc-400",    badge: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",      label: "—",        icon: Circle },
};

async function countSafe(table: string, build: (q: any) => any): Promise<number> {
  try {
    let q = (supabase as any).from(table).select("*", { count: "exact", head: true });
    q = build(q);
    const { count } = await q;
    return count ?? 0;
  } catch { return 0; }
}

async function loadHealth(): Promise<Category[]> {
  const since1h = new Date(Date.now() - 3600_000).toISOString();
  const since30m = new Date(Date.now() - 1_800_000).toISOString();
  const since10m = new Date(Date.now() - 600_000).toISOString();

  const [
    authStorms, webhookFails, autoFail, autoOk, autoStuck,
    payOk, payFail, queueDepth, providers,
  ] = await Promise.all([
    countSafe("admin_alerts", (q) => q.ilike("kind", "auth.%").gte("created_at", since10m)),
    countSafe("admin_alerts", (q) => q.ilike("kind", "%webhook%").in("severity", ["error", "critical"]).gte("created_at", since1h)),
    countSafe("automation_runs", (q) => q.eq("status", "failed").gte("created_at", since1h)),
    countSafe("automation_runs", (q) => q.eq("status", "success").gte("created_at", since1h)),
    countSafe("automation_runs", (q) => q.eq("status", "processing").lt("created_at", since30m)),
    countSafe("payments", (q) => q.eq("status", "paid").gte("created_at", since1h)),
    countSafe("payments", (q) => q.in("status", ["failed", "cancelled"]).gte("created_at", since1h)),
    countSafe("ai_jobs", (q) => q.in("status", ["queued", "processing"])),
    // Phase 7A: provider health on Admin DB, read via cached edge function.
    supabase.functions.invoke("provider-health-public")
      .then((r: any) => ((r?.data?.data ?? []) as any[])
        .slice()
        .sort((a, b) => (Number(a.success_rate ?? 0)) - (Number(b.success_rate ?? 0)))
        .slice(0, 20))
      .catch(() => []),
  ]);

  // Auth
  const authLevel: Level = authStorms >= 10 ? "critical" : authStorms >= 4 ? "warning" : "healthy";

  // Providers
  const provs = providers as any[];
  const degraded = provs.filter((p) => Number(p.consecutive_failures) >= 3);
  const dead = provs.filter((p) => Number(p.consecutive_failures) >= 6);
  const providerLevel: Level = dead.length ? "critical" : degraded.length ? "warning" : provs.length ? "healthy" : "unknown";

  // Automations
  const autoTotal = autoFail + autoOk;
  const failRate = autoTotal > 0 ? autoFail / autoTotal : 0;
  const autoLevel: Level = autoStuck >= 3 || failRate > 0.4 ? "critical"
    : autoFail >= 8 || failRate > 0.15 ? "warning"
    : "healthy";

  // Queue
  const queueLevel: Level = queueDepth > 200 ? "critical" : queueDepth > 50 ? "warning" : "healthy";

  // Webhooks
  const webhookLevel: Level = webhookFails >= 5 ? "critical" : webhookFails >= 2 ? "warning" : "healthy";

  // Payments
  const payTotal = payOk + payFail;
  const payRate = payTotal > 0 ? payFail / payTotal : 0;
  const payLevel: Level = payRate > 0.4 && payFail >= 3 ? "critical"
    : payFail >= 5 ? "warning"
    : "healthy";

  return [
    {
      key: "auth", label: "Auth & Sessions", icon: Shield, level: authLevel,
      primary: `${authStorms} telemetry alerts · last 10m`,
      hint: authLevel === "healthy" ? "No refresh storms or invalid handoffs." : "Inspect Auth logs.",
    },
    {
      key: "provider", label: "AI Providers", icon: Cpu, level: providerLevel,
      primary: `${provs.length} tracked · ${degraded.length} degraded`,
      hint: dead.length ? `${dead.map((p) => p.provider).join(", ")} unstable` : "Fallback chain healthy.",
    },
    {
      key: "automations", label: "Automations", icon: Workflow, level: autoLevel,
      primary: `${autoOk} ok · ${autoFail} failed · 1h`,
      hint: autoStuck > 0 ? `${autoStuck} stuck >30m` : "Throughput nominal.",
    },
    {
      key: "queue", label: "Job Queue", icon: Layers, level: queueLevel,
      primary: `${queueDepth} pending jobs`,
      hint: queueLevel === "healthy" ? "Worker keeping up." : "Investigate runner concurrency.",
    },
    {
      key: "webhooks", label: "Webhooks", icon: Webhook, level: webhookLevel,
      primary: `${webhookFails} failures · 1h`,
      hint: webhookLevel === "healthy" ? "Inbound webhooks accepting." : "Cashfree / Telegram / Dodo handlers.",
    },
    {
      key: "payments", label: "Payments", icon: CreditCard, level: payLevel,
      primary: `${payOk} paid · ${payFail} failed · 1h`,
      hint: payRate > 0 ? `${Math.round(payRate * 100)}% failure rate` : "Checkout converting cleanly.",
    },
  ];
}

export default function OpsHealth() {
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      setCats(await loadHealth());
      setUpdatedAt(new Date());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const i = setInterval(refresh, 60_000);
    return () => clearInterval(i);
  }, []);

  const worst: Level = cats.reduce<Level>((acc, c) => {
    const order: Level[] = ["healthy", "degraded", "warning", "critical"];
    return order.indexOf(c.level) > order.indexOf(acc) ? c.level : acc;
  }, "healthy");

  const overall = LEVEL_TONE[worst];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-6">
        <header className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-bold">Operator</p>
            <h1 className="text-3xl font-semibold tracking-tight mt-1">Operations Health</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Calm pulse across the critical paths. Auto-refreshes every minute.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={`gap-1.5 ${overall.badge}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${overall.dot}`} />
              {overall.label}
            </Badge>
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading} className="gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </header>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(cats.length ? cats : Array.from({ length: 6 })).map((c: any, i: number) => {
            const tone = c ? LEVEL_TONE[c.level as Level] : LEVEL_TONE.unknown;
            const Icon = c?.icon || Circle;
            return (
              <Card key={c?.key || i} className="border-border/60">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold inline-flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {c?.label || "—"}
                    </CardTitle>
                    <Badge variant="outline" className={`gap-1.5 text-[10px] ${tone.badge}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                      {tone.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p className="text-base font-medium tabular-nums">{c?.primary || "—"}</p>
                  <p className="text-[11.5px] text-muted-foreground">{c?.hint || ""}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <footer className="text-[11px] text-muted-foreground">
          {updatedAt ? `Updated ${updatedAt.toLocaleTimeString()}` : "Loading…"} ·
          {" "}Detailed alerts live at <a href="/admin/mission-control" className="underline">Mission Control</a>.
        </footer>
      </div>
    </div>
  );
}