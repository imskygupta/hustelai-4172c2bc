import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, ExternalLink, Eye, MousePointerClick, Clock, MapPin, Layers, TrendingUp, GitBranch } from "lucide-react";
import { YM_ID } from "@/lib/yandex";
import { ActivationFunnelPanel } from "@/components/admin/ActivationFunnelPanel";

/**
 * Admin → Content & Growth → Traffic Intelligence
 * Yandex Metrica command center. Live counter is embedded via the official
 * informer iframe (read-only, no auth required for public counters); deeper
 * dashboards link out to the Yandex web UI.
 */
export default function TrafficIntelligence() {
  const [tab, setTab] = useState<"funnel" | "overview" | "pages" | "blogs" | "ctas" | "tools" | "geo">("funnel");

  const links = useMemo(() => ({
    dashboard: `https://metrika.yandex.com/dashboard?id=${YM_ID}`,
    visitors: `https://metrika.yandex.com/realtime?id=${YM_ID}`,
    pages: `https://metrika.yandex.com/stat/traffic/popular?id=${YM_ID}`,
    sources: `https://metrika.yandex.com/stat/sources/summary?id=${YM_ID}`,
    geo: `https://metrika.yandex.com/stat/geo/country?id=${YM_ID}`,
    goals: `https://metrika.yandex.com/stat/conversions/goals?id=${YM_ID}`,
    webvisor: `https://metrika.yandex.com/list/?id=${YM_ID}`,
  }), []);

  const informer = `https://informer.yandex.ru/informer/${YM_ID}/3_1_FFFFFFFF_EFEFEFFF_0_pageviews`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border/50 bg-card/30 backdrop-blur">
        <div className="container mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              <Activity className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
              Traffic Intelligence · Yandex Metrica · #{YM_ID}
            </div>
            <h1 className="text-2xl font-semibold mt-1">Audience & Conversion Telemetry</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
              <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
              Live
            </Badge>
            <Button asChild size="sm" variant="outline">
              <a href={links.dashboard} target="_blank" rel="noreferrer">
                Open Metrica <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {([
            ["funnel", "Activation Funnel", GitBranch],
            ["overview", "Overview", Eye],
            ["pages", "Top Pages", Layers],
            ["blogs", "Top Blogs", TrendingUp],
            ["ctas", "CTA Conversions", MousePointerClick],
            ["tools", "Tool Engagement", Clock],
            ["geo", "Regional", MapPin],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-3 py-1.5 rounded-md text-sm border transition-colors flex items-center gap-1.5 ${
                tab === id
                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                  : "border-border/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {tab === "funnel" && <ActivationFunnelPanel />}

        {tab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="p-4 col-span-1 bg-card/40 border-border/50">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Live Counter</div>
              <iframe
                title="Yandex Live Counter"
                src={informer}
                width="88"
                height="31"
                frameBorder={0}
                className="rounded bg-white"
              />
              <p className="text-xs text-muted-foreground mt-3">
                Real-time visitor count served by Yandex's public informer for counter #{YM_ID}.
              </p>
            </Card>

            {[
              { label: "Active Visitors", href: links.visitors, hint: "Realtime feed" },
              { label: "Bounce Rate", href: `${links.dashboard}#tab=metric:bounceRate`, hint: "Accurate bounce on" },
              { label: "Avg Session", href: `${links.dashboard}#tab=metric:avgVisitDurationSeconds`, hint: "Time on session" },
              { label: "Goal Conversions", href: links.goals, hint: "CTA + signup goals" },
              { label: "Webvisor Sessions", href: links.webvisor, hint: "Session replays" },
            ].map((m) => (
              <Card key={m.label} className="p-4 bg-card/40 border-border/50 hover:border-emerald-500/30 transition-colors">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">{m.label}</div>
                <div className="text-2xl font-semibold mt-1 tabular-nums">—</div>
                <p className="text-xs text-muted-foreground mt-1">{m.hint}</p>
                <Button asChild size="sm" variant="ghost" className="mt-2 -ml-2 text-emerald-400">
                  <a href={m.href} target="_blank" rel="noreferrer">
                    View in Metrica <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </Button>
              </Card>
            ))}
          </div>
        )}

        {tab !== "overview" && (
          <Card className="p-6 bg-card/40 border-border/50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Yandex Metrica</div>
                <h2 className="text-lg font-semibold">
                  {tab === "pages" && "Top Pages"}
                  {tab === "blogs" && "Top Blog Posts"}
                  {tab === "ctas" && "CTA / Goal Conversions"}
                  {tab === "tools" && "Tool Engagement Goals"}
                  {tab === "geo" && "Regional Traffic"}
                </h2>
              </div>
              <Button asChild size="sm">
                <a
                  href={
                    tab === "geo" ? links.geo :
                    tab === "ctas" || tab === "tools" ? links.goals :
                    links.pages
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in Metrica <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
            <div className="rounded-md border border-border/40 bg-background/40 p-8 text-center text-sm text-muted-foreground">
              <p className="mb-2">
                Detailed reporting lives inside Yandex Metrica's authenticated dashboard.
              </p>
              <p className="text-xs">
                The HustleAI integration emits goals for{" "}
                <code className="text-emerald-400">cta_click</code>,{" "}
                <code className="text-emerald-400">signup_complete</code>,{" "}
                <code className="text-emerald-400">pricing_click</code>,{" "}
                <code className="text-emerald-400">tool_open</code>,{" "}
                <code className="text-emerald-400">tool_generate</code>,{" "}
                <code className="text-emerald-400">workflow_*</code>,{" "}
                <code className="text-emerald-400">blog_scroll_*</code>.
              </p>
            </div>
          </Card>
        )}

        <Card className="p-4 bg-card/30 border-border/50">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Integration Status</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {[
              ["Webvisor", "Enabled"],
              ["Clickmap", "Enabled"],
              ["Link tracking", "Enabled"],
              ["Accurate bounce", "Enabled"],
              ["SPA route hits", "Active"],
              ["Lazy load", "After hydration"],
              ["Subdomains", "hustlaiapp.in + blogs"],
              ["Counter ID", String(YM_ID)],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between rounded-md border border-border/40 px-3 py-2 bg-background/40">
                <span className="text-muted-foreground">{k}</span>
                <span className="text-emerald-400 font-medium">{v}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}