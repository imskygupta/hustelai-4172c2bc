import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Send, Repeat, FileDown, Bell, Briefcase, FolderOpen,
  Sparkles, ShieldCheck, Clock, Activity, Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Workspace Operations Hub
 * One operational backbone for exports, deliveries, recurring invoices,
 * Telegram relays and operational chains. No 404s — preview surfaces stay
 * live with calm "coming online" states until each module is wired.
 */

type ExportRow = {
  id: string;
  tool: string;
  title: string | null;
  created_at: string;
  metadata: Record<string, any> | null;
};

const MODULES: Array<{
  key: string;
  title: string;
  blurb: string;
  icon: any;
  status: "live" | "preview" | "coming";
  to?: string;
}> = [
  { key: "exports", title: "Exports & deliveries", blurb: "Every generated asset, traced by client and date.", icon: FileDown, status: "live" },
  { key: "telegram", title: "Telegram delivery", blurb: "Send proposals, invoices and exports straight to chats.", icon: Send, status: "live", to: "/settings/telegram" },
  { key: "recurring", title: "Recurring invoices", blurb: "Monthly retainer cycles, generated on autopilot.", icon: Repeat, status: "preview", to: "/dashboard/workspace-os/preview/recurring" },
  { key: "reminders", title: "Client reminders", blurb: "Quiet follow-ups: 3-day, 7-day, end of month.", icon: Bell, status: "preview", to: "/dashboard/workspace-os/preview/reminders" },
  { key: "chains", title: "Operational chains", blurb: "Save → Export → Deliver → Follow-up, in one flow.", icon: Activity, status: "preview", to: "/dashboard/workspace-os/preview/chains" },
  { key: "library", title: "Workspace library", blurb: "Brand kit, blocks, docs and reusable assets.", icon: FolderOpen, status: "live", to: "/n" },
];

function StatusDot({ s }: { s: "live" | "preview" | "coming" }) {
  const map = {
    live: "bg-emerald-500",
    preview: "bg-amber-500",
    coming: "bg-slate-400",
  } as const;
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${map[s]}`} />;
}

export default function OperationsHub() {
  const [exports, setExports] = useState<ExportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        const { data } = await (supabase as any)
          .from("workspace_outputs")
          .select("id, tool, title, created_at, metadata")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(8);
        if (!cancelled) setExports(data || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Workspace Operations Hub · HustleAI</title>
        <meta name="description" content="Recurring invoices, exports, Telegram delivery and operational chains — one calm cockpit." />
      </Helmet>

      <div className="mx-auto max-w-6xl px-4 md:px-8 py-8 md:py-12">
        {/* Header */}
        <header className="mb-8">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase mb-3">
            <StatusDot s="live" /> Operations · Workspace cockpit
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
            Your operational backbone
          </h1>
          <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-2xl">
            Exports, deliveries, recurring invoices and Telegram relays — managed quietly in the background while you focus on client work.
          </p>
        </header>

        {/* Modules grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-10">
          {MODULES.map((m) => {
            const Icon = m.icon;
            const inner = (
              <Card className="group h-full p-5 border-border/60 bg-card hover:bg-accent/30 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                    <Icon className="h-5 w-5 text-foreground/70" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                    <StatusDot s={m.status} />
                    {m.status === "live" ? "Live" : m.status === "preview" ? "Preview" : "Coming online"}
                  </span>
                </div>
                <div className="mt-4">
                  <div className="text-sm font-semibold text-foreground">{m.title}</div>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{m.blurb}</p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-medium text-foreground/70 group-hover:text-foreground">
                  Open <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Card>
            );
            return m.to
              ? <Link key={m.key} to={m.to}>{inner}</Link>
              : <div key={m.key}>{inner}</div>;
          })}
        </section>

        {/* Recent exports */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold tracking-tight text-foreground inline-flex items-center gap-2">
              <FileDown className="h-4 w-4 text-muted-foreground" /> Recent exports
            </h2>
            <Link to="/n" className="text-xs text-muted-foreground hover:text-foreground">All workspaces →</Link>
          </div>
          <Card className="border-border/60 divide-y divide-border/60">
            {loading && (
              <div className="p-4 space-y-2">
                {[0,1,2].map(i => <div key={i} className="h-10 rounded bg-muted/40 animate-pulse" />)}
              </div>
            )}
            {!loading && exports.length === 0 && (
              <div className="p-8 text-center">
                <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Sparkles className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-sm font-medium text-foreground">No exports yet</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Generate a proposal, invoice or doc — it shows up here, traced per client.
                </p>
                <Button asChild size="sm" variant="secondary" className="mt-4">
                  <Link to="/dashboard/tools">Open tools</Link>
                </Button>
              </div>
            )}
            {!loading && exports.map((e) => (
              <div key={e.id} className="px-4 py-3 flex items-center justify-between text-sm">
                <div className="min-w-0">
                  <div className="font-medium text-foreground truncate">{e.title || e.tool}</div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">
                    {e.tool} · {new Date(e.created_at).toLocaleDateString()}
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px]">Saved</Badge>
              </div>
            ))}
          </Card>
        </section>

        {/* Quiet operational signals */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="p-4 border-border/60">
            <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" /> Sync</div>
            <div className="mt-1.5 text-sm font-semibold text-foreground">Healthy</div>
            <p className="mt-0.5 text-xs text-muted-foreground">All recent outputs saved to your workspace.</p>
          </Card>
          <Card className="p-4 border-border/60">
            <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground"><Send className="h-3.5 w-3.5" /> Telegram</div>
            <div className="mt-1.5 text-sm font-semibold text-foreground">3 free exports / week</div>
            <p className="mt-0.5 text-xs text-muted-foreground">Link your bot in <Link to="/settings/telegram" className="underline">settings</Link> to start delivering.</p>
          </Card>
          <Card className="p-4 border-border/60">
            <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground"><Clock className="h-3.5 w-3.5" /> Upcoming</div>
            <div className="mt-1.5 text-sm font-semibold text-foreground">No reminders due</div>
            <p className="mt-0.5 text-xs text-muted-foreground">Recurring invoices and follow-ups will appear here.</p>
          </Card>
        </section>

        <div className="mt-10 flex items-center justify-center">
          <Button asChild variant="outline" size="sm">
            <Link to="/dashboard/automations" className="inline-flex items-center gap-2">
              <Briefcase className="h-4 w-4" /> Browse operational automations
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
