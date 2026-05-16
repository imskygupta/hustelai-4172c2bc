import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import {
  Send, Repeat, Bell, FileDown, FolderOpen, Users, Mail, BarChart3,
  ArrowRight, Sparkles, Wand2, Zap, ShieldCheck,
} from "lucide-react";

/**
 * Automations Hub — outcome-first, NOT graph-first.
 * Curated operational automations powered by n8n templates under the hood,
 * but never expose raw n8n complexity. Phase 1 = template toggles only.
 * Storage is local-only for now; backend wiring happens in a later phase.
 */

type Template = {
  id: string;
  title: string;
  blurb: string;
  icon: any;
  category: "delivery" | "billing" | "client" | "reporting";
  recommended?: boolean;
  comingSoon?: boolean;
};

const TEMPLATES: Template[] = [
  { id: "proposal-followup",   title: "Proposal follow-up",     blurb: "Quiet nudge to the client 3 days after a proposal is sent.",         icon: Mail,      category: "client",    recommended: true },
  { id: "monthly-invoice",     title: "Monthly retainer invoice", blurb: "Generate and send the same invoice on the 1st of every month.",     icon: Repeat,    category: "billing",   recommended: true },
  { id: "telegram-relay",      title: "Telegram export relay",  blurb: "When a doc is exported, deliver it to your Telegram instantly.",    icon: Send,      category: "delivery",  recommended: true },
  { id: "delivery-confirm",    title: "Delivery confirmation",  blurb: "Tell the client when their deliverable is ready — automatically.", icon: Bell,      category: "delivery" },
  { id: "ai-archival",         title: "AI output archival",     blurb: "Auto-save every AI output to the right client folder.",            icon: FolderOpen, category: "delivery" },
  { id: "client-reminder",     title: "Client check-in chain",  blurb: "Weekly tiny check-in until project status flips to delivered.",     icon: Users,     category: "client" },
  { id: "weekly-report",       title: "Weekly operations report", blurb: "Quiet Friday summary: deliveries, exports, revenue.",             icon: BarChart3, category: "reporting" },
  { id: "doc-library-export",  title: "Doc library sync",       blurb: "Push every export to your docs library for reuse.",                icon: FileDown,  category: "delivery", comingSoon: true },
];

const STORE_KEY = "hustlai:automations:enabled:v1";

function useEnabledSet() {
  const [set, setSet] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) setSet(new Set(JSON.parse(raw)));
    } catch {}
  }, []);
  const toggle = (id: string, on: boolean) => {
    setSet(prev => {
      const next = new Set(prev);
      if (on) next.add(id); else next.delete(id);
      try { localStorage.setItem(STORE_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
  };
  return { enabled: set, toggle };
}

const CATEGORY_LABEL: Record<Template["category"], string> = {
  delivery: "Delivery & exports",
  billing: "Billing & retainers",
  client: "Client communication",
  reporting: "Reporting",
};

export default function AutomationsHub() {
  const { enabled, toggle } = useEnabledSet();
  const grouped = useMemo(() => {
    const g: Record<string, Template[]> = {};
    for (const t of TEMPLATES) (g[t.category] ||= []).push(t);
    return g;
  }, []);

  const activeCount = enabled.size;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Operational Automations · HustleAI</title>
        <meta name="description" content="Curated, outcome-first operational automations — proposal follow-ups, monthly invoices, Telegram delivery and more." />
      </Helmet>

      <div className="mx-auto max-w-6xl px-4 md:px-8 py-8 md:py-12">
        {/* Header */}
        <header className="mb-8">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase mb-3">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Operational automations
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
            Operations that run themselves
          </h1>
          <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-2xl">
            Outcome-first automations — proposals, invoices, deliveries and follow-ups handled quietly in the background. One-click setup, no node graphs.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1.5"><Zap className="h-3 w-3" /> {activeCount} active</Badge>
            <Badge variant="outline" className="gap-1.5"><Sparkles className="h-3 w-3" /> {TEMPLATES.length} templates</Badge>
            <Badge variant="outline" className="gap-1.5"><ShieldCheck className="h-3 w-3" /> Safe defaults</Badge>
          </div>
        </header>

        {/* Empty-state helper */}
        {activeCount === 0 && (
          <Card className="p-5 mb-8 border-dashed border-border bg-muted/30">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-background flex items-center justify-center">
                <Wand2 className="h-4 w-4 text-foreground/70" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">Start with one calm automation</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  We recommend turning on <span className="font-medium text-foreground">Telegram export relay</span> first — instant deliveries without lifting a finger.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Template categories */}
        <div className="space-y-8">
          {Object.entries(grouped).map(([cat, items]) => (
            <section key={cat}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                  {CATEGORY_LABEL[cat as Template["category"]]}
                </h2>
                <span className="text-[11px] text-muted-foreground">{items.length} templates</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map((t) => {
                  const Icon = t.icon;
                  const on = enabled.has(t.id);
                  return (
                    <Card key={t.id} className={`p-4 border-border/60 transition-colors ${on ? "bg-accent/30" : "bg-card"}`}>
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                          <Icon className="h-5 w-5 text-foreground/70" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="text-sm font-semibold text-foreground">{t.title}</div>
                            {t.recommended && <Badge variant="secondary" className="text-[10px]">Recommended</Badge>}
                            {t.comingSoon && <Badge variant="outline" className="text-[10px]">Coming soon</Badge>}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{t.blurb}</p>
                        </div>
                        <Switch
                          checked={on}
                          disabled={t.comingSoon}
                          onCheckedChange={(v) => {
                            toggle(t.id, v);
                            toast({
                              title: v ? `${t.title} enabled` : `${t.title} paused`,
                              description: v ? "We'll run this quietly in the background." : "You can re-enable any time.",
                            });
                          }}
                        />
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Calm upgrade surface */}
        <Card className="mt-10 p-6 border-border/60 bg-gradient-to-br from-muted/40 to-background">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Need more operational bandwidth?</div>
              <div className="mt-1 text-base font-semibold text-foreground">Unlock packs & higher delivery limits</div>
              <p className="mt-1 text-xs text-muted-foreground max-w-md">
                Free plan includes 3 Telegram exports / week. Unused exports roll over. Upgrade for unlimited delivery and automation slots.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/dashboard/workspace-os">View operations</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/pricing" className="inline-flex items-center gap-1.5">
                  See plans <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
