import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Zap, Send, Infinity as InfinityIcon, Rocket, Briefcase, ArrowRight,
  ShieldCheck, Clock, Sparkles,
} from "lucide-react";

/**
 * Operations Boosts — operational bandwidth marketplace.
 * Calm, agency-grade pricing surface for users who want more delivery
 * throughput without committing to a tier upgrade. No game-y monetization.
 */

type Boost = {
  id: string;
  title: string;
  tagline: string;
  price: number;        // INR
  unit: string;
  duration: string;
  icon: any;
  highlight?: boolean;
  includes: string[];
};

const BOOSTS: Boost[] = [
  {
    id: "telegram-10",
    title: "Telegram Boost",
    tagline: "Extra deliveries when a launch week needs more bandwidth.",
    price: 10,
    unit: "+10 deliveries",
    duration: "Never expires",
    icon: Send,
    includes: [
      "10 additional Telegram exports",
      "Stacks on top of your plan allowance",
      "Rolls over month to month",
    ],
  },
  {
    id: "daily-unlimited",
    title: "Daily Unlimited Ops",
    tagline: "Unlimited Telegram exports for one operational day.",
    price: 50,
    unit: "Unlimited / 24h",
    duration: "24 hours",
    icon: InfinityIcon,
    highlight: true,
    includes: [
      "Unlimited Telegram deliveries for 24h",
      "Priority queue for exports",
      "Reminder + invoice runs included",
    ],
  },
  {
    id: "operational-burst",
    title: "Operational Burst",
    tagline: "High-priority queue plus exports for a focused 72h push.",
    price: 99,
    unit: "Priority lane",
    duration: "72 hours",
    icon: Rocket,
    includes: [
      "Priority generation queue",
      "Unlimited exports for 72h",
      "Faster AI lane for active projects",
    ],
  },
  {
    id: "agency-relay",
    title: "Agency Relay Pack",
    tagline: "A week of operational throughput for agency-shaped weeks.",
    price: 299,
    unit: "7-day throughput",
    duration: "7 days",
    icon: Briefcase,
    includes: [
      "Unlimited Telegram + email deliveries",
      "Priority lane across all projects",
      "Recurring + reminder automations boosted",
    ],
  },
];

function fmt(p: number) { return `₹${p}`; }

export default function OperationsBoosts() {
  const handlePurchase = (b: Boost) => {
    // Real purchase wires into Cashfree flow later. For now, calm confirmation.
    toast({
      title: `${b.title} reserved`,
      description: "We'll surface this pack at checkout in your next payment cycle.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Operations Boosts · HustleAI Workspace</title>
        <meta name="description" content="Operational bandwidth marketplace — Telegram boosts, daily unlimited ops, priority lanes and agency relay packs." />
      </Helmet>

      <div className="mx-auto max-w-5xl px-4 md:px-8 py-8 md:py-12">
        {/* Header */}
        <header className="mb-10">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase mb-3">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Operational bandwidth
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
            Boost packs for busy operational weeks
          </h1>
          <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-2xl leading-relaxed">
            One-time top-ups for the weeks when your workspace runs hot — launch days, agency sprints, retainer cycles. Plan upgrades are not required.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1.5"><ShieldCheck className="h-3 w-3" /> One-time, no recurring</Badge>
            <Badge variant="outline" className="gap-1.5"><Clock className="h-3 w-3" /> Stacks with your plan</Badge>
            <Badge variant="outline" className="gap-1.5"><Sparkles className="h-3 w-3" /> Activates instantly</Badge>
          </div>
        </header>

        {/* Boost grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {BOOSTS.map((b) => {
            const Icon = b.icon;
            return (
              <Card
                key={b.id}
                className={`relative p-6 border-border/60 transition-all ${
                  b.highlight
                    ? "bg-gradient-to-br from-primary/[0.04] via-card to-card ring-1 ring-primary/20"
                    : "bg-card hover:bg-accent/20"
                }`}
              >
                {b.highlight && (
                  <div className="absolute top-4 right-4">
                    <Badge className="text-[10px] uppercase tracking-wider">Most chosen</Badge>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                    b.highlight ? "bg-primary/10 text-primary" : "bg-muted text-foreground/70"
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-foreground">{b.title}</div>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{b.tagline}</p>
                  </div>
                </div>

                <div className="mt-5 flex items-baseline gap-2">
                  <span className="text-3xl font-semibold tracking-tight text-foreground">{fmt(b.price)}</span>
                  <span className="text-xs text-muted-foreground">· {b.unit}</span>
                </div>
                <div className="mt-0.5 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                  {b.duration}
                </div>

                <ul className="mt-4 space-y-1.5">
                  {b.includes.map((line) => (
                    <li key={line} className="flex items-start gap-2 text-xs text-foreground/80">
                      <span className="mt-1.5 h-1 w-1 rounded-full bg-foreground/40 shrink-0" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  size="sm"
                  variant={b.highlight ? "default" : "outline"}
                  className="mt-5 w-full"
                  onClick={() => handlePurchase(b)}
                >
                  Add {b.title}
                </Button>
              </Card>
            );
          })}
        </section>

        {/* Quiet upgrade path */}
        <Card className="mt-10 p-6 border-border/60 bg-muted/30">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Running operations every week?</div>
              <div className="mt-1 text-base font-semibold text-foreground">Upgrade for unlimited operational throughput</div>
              <p className="mt-1 text-xs text-muted-foreground max-w-md">
                Pro gives generous daily allowances. Elite removes the limits. Infinity opens the agency lane.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/dashboard/workspace-os">Back to operations</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/pricing" className="inline-flex items-center gap-1.5">
                  Compare plans <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </Card>

        <div className="mt-6 flex items-center justify-center text-[11px] text-muted-foreground gap-1.5">
          <Zap className="h-3 w-3" /> Operational packs are non-refundable digital boosts.
        </div>
      </div>
    </div>
  );
}