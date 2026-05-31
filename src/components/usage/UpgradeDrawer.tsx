import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Zap, ArrowRight, Check } from "lucide-react";
import {
  BOOSTER_CATALOG, PLAN_DELTAS, PLAN_ORDER, nextPlan, recommend,
  type Booster, type MeterCard, type Plan, type Recommendation,
} from "@/lib/usage/recommendations";

function track(event: string, props: Record<string, unknown> = {}) {
  try {
    (window as any).analytics?.track?.(event, props) ??
      (window as any).plausible?.(event, { props }) ??
      console.debug("[usage-metric]", event, props);
  } catch { /* noop */ }
}

export type UpgradeDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: string;
  cards: MeterCard[];
  source: "hero" | "limit_card" | "limit_modal" | "tool_row";
  // active boosters (already-purchased) — optional, defaults to empty
  activeBoosters?: Array<{ booster_id: string; expires_at?: string | null }>;
};

const METER_NAME: Record<string, string> = {
  ai: "AI Assists", export: "Exports", storage: "Storage",
  workspace: "Workspaces", portal: "Client Portals", upload: "Uploads",
  async_job: "Async Jobs", roadmap: "Roadmaps", intake_form: "Intake Forms",
  automation: "Automations", lightweight: "Lightweight AI", telegram_export: "Telegram Exports",
};

export function UpgradeDrawer({ open, onOpenChange, plan, cards, source, activeBoosters = [] }: UpgradeDrawerProps) {
  const recs = useMemo(() => recommend(plan, cards), [plan, cards]);
  const np = nextPlan(plan);

  useEffect(() => {
    if (open) track("upgrade_view", { plan, source, recs: recs.length });
  }, [open, plan, source, recs.length]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Unlock more</SheetTitle>
          <SheetDescription>
            Based on how you've used the platform today.
          </SheetDescription>
        </SheetHeader>

        {/* Current plan strip */}
        <div className="mt-4 p-3 rounded-lg border bg-muted/40 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Current plan</div>
            <div className="font-semibold capitalize">{plan}</div>
          </div>
          {np && (
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Next</div>
              <div className="font-semibold capitalize">{np}</div>
            </div>
          )}
        </div>

        {/* Recommendations */}
        <div className="mt-5 space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Recommended for you
          </h3>
          {recs.length === 0 && (
            <Card>
              <CardContent className="p-4 text-sm text-muted-foreground">
                You're well within your limits. Nothing to upgrade right now.
              </CardContent>
            </Card>
          )}
          {recs.map((r, i) => (
            <RecommendationCard key={i} rec={r} source={source} />
          ))}
        </div>

        {/* Booster grid */}
        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            All boosters
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {BOOSTER_CATALOG.map((b) => {
              const active = activeBoosters.find((a) => a.booster_id === b.id);
              return <BoosterRow key={b.id} booster={b} active={active} source={source} />;
            })}
          </div>
        </div>

        {/* Mini plan comparison */}
        {np && (
          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {plan} vs {np}
            </h3>
            <Card>
              <CardContent className="p-3 text-sm">
                <PlanCompareRow label="AI assists"    a={PLAN_DELTAS[plan as Plan]?.ai}          b={PLAN_DELTAS[np].ai} />
                <PlanCompareRow label="Exports"       a={PLAN_DELTAS[plan as Plan]?.exports}     b={PLAN_DELTAS[np].exports} />
                <PlanCompareRow label="Automations"   a={PLAN_DELTAS[plan as Plan]?.automations} b={PLAN_DELTAS[np].automations} />
                <PlanCompareRow label="Extras"        a={PLAN_DELTAS[plan as Plan]?.extras}      b={PLAN_DELTAS[np].extras} />
              </CardContent>
            </Card>
            <Button
              asChild
              className="w-full"
              onClick={() => track("purchase_start", { kind: "plan", to: np, source })}
            >
              <Link to="/plans">
                <Sparkles className="h-4 w-4 mr-2" />
                Upgrade to {np}
              </Link>
            </Button>
          </div>
        )}

        <p className="mt-6 text-[11px] text-muted-foreground text-center">
          Plans & boosters are managed on the <Link to="/plans" className="underline">Billing page</Link>.
        </p>
      </SheetContent>
    </Sheet>
  );
}

function PlanCompareRow({ label, a, b }: { label: string; a?: string; b?: string }) {
  return (
    <div className="grid grid-cols-5 gap-2 py-1.5 border-b last:border-0">
      <div className="col-span-2 text-xs text-muted-foreground">{label}</div>
      <div className="text-xs">{a ?? "—"}</div>
      <div className="text-xs col-span-2 font-medium flex items-center gap-1">
        <ArrowRight className="h-3 w-3 text-primary" />
        {b ?? "—"}
      </div>
    </div>
  );
}

function RecommendationCard({ rec, source }: { rec: Recommendation; source: string }) {
  if (rec.kind === "plan") {
    return (
      <Card className="border-primary/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Badge className="capitalize">{rec.to} plan</Badge>
            <span className="text-[11px] text-muted-foreground">Best value</span>
          </div>
          <p className="text-sm font-medium mb-1">Upgrade to {rec.to}</p>
          <p className="text-xs text-muted-foreground mb-3">{rec.reason}</p>
          <Button
            size="sm"
            className="w-full"
            asChild
            onClick={() => track("purchase_start", { kind: "plan", to: rec.to, source })}
          >
            <Link to="/plans">See {rec.to} →</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }
  // booster
  const b = rec.booster;
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="capitalize">{METER_NAME[b.meter] ?? b.meter}</Badge>
          <span className="text-sm font-semibold tabular-nums">₹{b.price_inr}</span>
        </div>
        <p className="text-sm font-medium">{b.title}</p>
        <p className="text-xs text-muted-foreground">{b.benefit} · {b.duration}</p>
        <p className="text-[11px] text-muted-foreground mt-1">{rec.reason}</p>
        <Button
          size="sm"
          variant="secondary"
          className="w-full mt-3"
          onClick={() => track("purchase_start", { kind: "booster", id: b.id, source })}
          asChild
        >
          <Link to={`/plans#booster-${b.id}`}>
            <Zap className="h-3.5 w-3.5 mr-1.5" />
            Activate
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function BoosterRow({
  booster, active, source,
}: { booster: Booster; active?: { booster_id: string; expires_at?: string | null }; source: string }) {
  return (
    <div className="flex items-center justify-between border rounded-md p-2.5 text-sm">
      <div className="min-w-0">
        <div className="font-medium truncate">{booster.title}</div>
        <div className="text-[11px] text-muted-foreground truncate">
          {booster.benefit} · {booster.duration}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs tabular-nums">₹{booster.price_inr}</span>
        {active ? (
          <Badge variant="secondary" className="text-[10px]">
            <Check className="h-3 w-3 mr-1" />Active
          </Badge>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => track("booster_view", { id: booster.id, source })}
            asChild
          >
            <Link to={`/plans#booster-${booster.id}`}>Get</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

export { recommend, BOOSTER_CATALOG, PLAN_ORDER };