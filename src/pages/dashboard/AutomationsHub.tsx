import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import {
  ArrowRight, Sparkles, Wand2, Zap, ShieldCheck, History, CheckCircle2,
  CircleDot, Send, FolderOpen, Mail, Briefcase, Brain, Lock, Crown,
} from "lucide-react";
import { useAutomations, useAutomationRuns } from "@/lib/workspace/automations";
import {
  TEMPLATES, CATEGORY_LABEL, CATEGORY_ORDER, DELIVERY_LABEL,
  groupTemplatesByCategory, getTemplate, isTemplateUnlocked, lockMessage, tierLabel,
  type Template,
} from "@/lib/workspace/automationTemplates";
import { useAuth } from "@/hooks/useAuth";

/**
 * Outcome-first automations hub.
 * Each card answers: "What operational work does this remove?"
 * No nodes, no graphs, no JSON. Template-driven only.
 */

function DeliveryIcon({ d }: { d: Template["delivery"] }) {
  if (d === "telegram")    return <Send className="h-3 w-3" />;
  if (d === "doc-library") return <FolderOpen className="h-3 w-3" />;
  if (d === "email")       return <Mail className="h-3 w-3" />;
  return <Briefcase className="h-3 w-3" />;
}

function TemplateCard({
  t, on, onToggle, unlocked,
}: { t: Template; on: boolean; unlocked: boolean; onToggle: (v: boolean) => void | Promise<void> }) {
  const Icon = t.icon;
  const locked = !unlocked && !t.comingSoon;
  return (
    <Card
      className={`relative overflow-hidden p-5 border-border/60 transition-all ${
        locked
          ? "bg-gradient-to-br from-muted/30 via-card to-card ring-1 ring-primary/15"
          : on
          ? "bg-accent/20"
          : "bg-card hover:bg-accent/10"
      }`}
    >
      {locked && (
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 -right-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl"
        />
      )}
      {/* Header */}
      <div className={`flex items-start gap-3 ${locked ? "opacity-90" : ""}`}>
        <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-foreground/70" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-sm font-semibold text-foreground">{t.title}</div>
            {t.recommended && <Badge variant="secondary" className="text-[10px]">Recommended</Badge>}
            {t.comingSoon && <Badge variant="outline" className="text-[10px]">Coming soon</Badge>}
            {t.ai && <Badge variant="outline" className="text-[10px] gap-1 border-primary/30 text-primary"><Brain className="h-2.5 w-2.5" /> AI</Badge>}
            {locked && (
              <Badge variant="outline" className="text-[10px] gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400">
                <Crown className="h-2.5 w-2.5" /> {tierLabel(t)}
              </Badge>
            )}
          </div>
          <p className="mt-1.5 text-sm text-foreground/90 leading-relaxed">{t.outcome}</p>
        </div>
        {locked ? (
          <Lock className="h-4 w-4 text-muted-foreground mt-1" />
        ) : (
          <Switch
            checked={on}
            disabled={t.comingSoon}
            onCheckedChange={onToggle}
          />
        )}
      </div>

      {/* Quiet operational anatomy */}
      <div className={`mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 pl-[52px] ${locked ? "opacity-60" : ""}`}>
        <Row label="Trigger" value={t.trigger} />
        <Row label="Action"  value={t.action} />
        {t.ai && <Row label="AI" value={t.ai} />}
        <Row
          label="Delivery"
          value={
            <span className="inline-flex items-center gap-1.5">
              <DeliveryIcon d={t.delivery} />
              {DELIVERY_LABEL[t.delivery]}
            </span>
          }
        />
        <Row label="Result" value={t.result} className="sm:col-span-2" />
      </div>

      {locked && (
        <div className="mt-4 pl-[52px] flex items-center justify-between gap-3">
          <span className="text-[11px] text-muted-foreground">{lockMessage(t)}</span>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline shrink-0"
          >
            Unlock <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </Card>
  );
}

function Row({ label, value, className = "" }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={`text-[11px] leading-relaxed ${className}`}>
      <span className="inline-block w-[60px] uppercase tracking-wider font-semibold text-muted-foreground/80">{label}</span>
      <span className="text-foreground/80">{value}</span>
    </div>
  );
}

export default function AutomationsHub() {
  const { profile } = useAuth();
  const tier = profile?.subscription_tier || "free";
  const { enabledSet, toggle } = useAutomations();
  const { runs } = useAutomationRuns(8);
  const grouped = useMemo(groupTemplatesByCategory, []);
  const activeCount = enabledSet.size;
  const aiCount = TEMPLATES.filter(t => t.ai && enabledSet.has(t.id)).length;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Operational Automations · HustleAI</title>
        <meta name="description" content="Outcome-first operational automations — proposal follow-ups, monthly invoices, Telegram delivery and AI-powered digests." />
      </Helmet>

      <div className="mx-auto max-w-5xl px-4 md:px-8 py-8 md:py-12">
        {/* Header */}
        <header className="mb-10">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase mb-3">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Operational assistants
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
            Quietly keep operations moving
          </h1>
          <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-2xl leading-relaxed">
            Each assistant removes a specific piece of operational work — follow-ups, deliveries, recurring billing, daily digests. One-click on, calm in the background.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1.5"><Zap className="h-3 w-3" /> {activeCount} active</Badge>
            <Badge variant="outline" className="gap-1.5"><Brain className="h-3 w-3" /> {aiCount} AI-aware</Badge>
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
                <div className="text-sm font-semibold text-foreground">Start with one calm assistant</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  We recommend turning on <span className="font-medium text-foreground">Telegram export relay</span> first — instant deliveries without lifting a finger.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Categories — outcome-led */}
        <div className="space-y-10">
          {CATEGORY_ORDER.map((cat) => {
            const items = grouped[cat];
            if (!items.length) return null;
            return (
              <section key={cat}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                    {CATEGORY_LABEL[cat]}
                  </h2>
                  <span className="text-[11px] text-muted-foreground">{items.length}</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {items.map((t) => {
                    const on = enabledSet.has(t.id);
                    const unlocked = isTemplateUnlocked(t, tier);
                    return (
                      <TemplateCard
                        key={t.id}
                        t={t}
                        on={on}
                        unlocked={unlocked}
                        onToggle={async (v) => {
                          await toggle(t.id, v);
                          toast({
                            title: v ? `${t.title} enabled` : `${t.title} paused`,
                            description: v ? "Running quietly in the background." : "You can re-enable any time.",
                          });
                        }}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {/* Recent runs */}
        <section className="mt-12">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold tracking-tight text-foreground inline-flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" /> Recent runs
            </h2>
            <span className="text-[11px] text-muted-foreground">Last {runs.length || 0}</span>
          </div>
          <Card className="border-border/60 divide-y divide-border/60">
            {runs.length === 0 && (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No runs yet. Enable an assistant above — runs will appear here.
              </div>
            )}
            {runs.map((r) => {
              const t = getTemplate(r.template_id);
              const ok = r.status === "success";
              return (
                <div key={r.id} className="px-4 py-3 flex items-center justify-between text-sm">
                  <div className="min-w-0 flex items-center gap-3">
                    {ok
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      : <CircleDot   className="h-4 w-4 text-amber-500 shrink-0" />}
                    <div className="min-w-0">
                      <div className="font-medium text-foreground truncate">{t?.title || r.template_id}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{r.summary || r.status}</div>
                    </div>
                  </div>
                  <div className="text-[11px] text-muted-foreground shrink-0">
                    {new Date(r.created_at).toLocaleString()}
                  </div>
                </div>
              );
            })}
          </Card>
        </section>

        {/* Calm upgrade surface */}
        <Card className="mt-12 p-6 border-border/60 bg-gradient-to-br from-muted/40 to-background">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Need more delivery bandwidth?</div>
              <div className="mt-1 text-base font-semibold text-foreground">Operational boost packs</div>
              <p className="mt-1 text-xs text-muted-foreground max-w-md">
                Free plan includes 3 Telegram deliveries per week. Unused deliveries roll over. Add a boost pack or upgrade for unlimited operational throughput.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/dashboard/workspace-os">View operations</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/settings/wallet" className="inline-flex items-center gap-1.5">
                  Add boost <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}