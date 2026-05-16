import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft, ArrowRight, Repeat, Bell, Activity, CheckCircle2,
  Sparkles, Send, Zap,
} from "lucide-react";

/**
 * Operational preview surface. Used for modules that aren't fully wired yet
 * (recurring invoices, client reminders, operational chains). Never dead-ends
 * the user — explains the workflow, shows the template preview, and offers
 * an enable-request CTA.
 */

type Preview = {
  title: string;
  tagline: string;
  icon: any;
  status: "preview" | "coming";
  workflow: { label: string; description: string }[];
  templatePreview: string[];
  unlocksOn: string;
  ctaLabel: string;
  ctaTo?: string;
};

const PREVIEWS: Record<string, Preview> = {
  recurring: {
    title: "Recurring invoices",
    tagline: "Automate monthly retainers. Invoices generated and queued for delivery, every cycle.",
    icon: Repeat,
    status: "preview",
    workflow: [
      { label: "On the 1st of each month", description: "We detect retainer clients in your workspace." },
      { label: "We draft the invoice", description: "Reusing last month's structure, with updated dates." },
      { label: "Queued for your approval", description: "Lands in your outbox — one tap to send via Telegram or email." },
    ],
    templatePreview: [
      "INVOICE #HAI-2026-0042",
      "Studio retainer · May 2026",
      "Due: 7 days · ₹45,000",
    ],
    unlocksOn: "Pro",
    ctaLabel: "Enable on next cycle",
    ctaTo: "/dashboard/automations",
  },
  reminders: {
    title: "Client reminders",
    tagline: "Quiet follow-ups — 3-day proposal nudges, 7-day check-ins, end-of-month invoice chases.",
    icon: Bell,
    status: "preview",
    workflow: [
      { label: "We watch your project timeline", description: "Proposals, deliveries and payments are tracked silently." },
      { label: "We draft a calm nudge", description: "Tone matches how overdue or quiet the touchpoint is." },
      { label: "You approve in one tap", description: "Sent via Telegram — never auto-fired without you." },
    ],
    templatePreview: [
      "Hi Priya — just circling back on the proposal from last week.",
      "Happy to revise anything if it helps move it forward 🙂",
    ],
    unlocksOn: "Pro",
    ctaLabel: "Browse reminder templates",
    ctaTo: "/dashboard/automations",
  },
  chains: {
    title: "Operational chains",
    tagline: "Save → Export → Deliver → Follow-up — one calm flow per client, no manual hops.",
    icon: Activity,
    status: "preview",
    workflow: [
      { label: "Generate any deliverable", description: "Proposal, invoice, brief or report — pick any workspace tool." },
      { label: "Chain auto-runs in sequence", description: "Save to workspace · Export PDF · Deliver to Telegram · Schedule follow-up." },
      { label: "Result lands in your outbox", description: "One tidy receipt of everything that just happened." },
    ],
    templatePreview: [
      "Proposal saved · Export ready · Sent to @priya · Follow-up: Wed",
    ],
    unlocksOn: "Elite",
    ctaLabel: "Open automations hub",
    ctaTo: "/dashboard/automations",
  },
};

export default function OperationsPreview() {
  const { module = "recurring" } = useParams();
  const p = PREVIEWS[module] || PREVIEWS.recurring;
  const Icon = p.icon;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{p.title} · Coming online · HustleAI</title>
      </Helmet>

      <div className="mx-auto max-w-4xl px-4 md:px-8 py-8 md:py-12">
        <Link to="/dashboard/workspace-os" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to operations
        </Link>

        {/* Header */}
        <header className="flex items-start gap-4 mb-8">
          <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center shrink-0">
            <Icon className="h-6 w-6 text-foreground/70" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" /> Coming online
              </Badge>
              <Badge variant="secondary" className="text-[10px]">Available on {p.unlocksOn}</Badge>
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">{p.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-2xl leading-relaxed">{p.tagline}</p>
          </div>
        </header>

        {/* Workflow */}
        <Card className="p-6 border-border/60 mb-4">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-4">How it runs</div>
          <ol className="space-y-4">
            {p.workflow.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-muted text-[11px] font-semibold flex items-center justify-center text-foreground/70 shrink-0">
                  {i + 1}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">{step.label}</div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>

        {/* Template preview */}
        <Card className="p-6 border-border/60 mb-4 bg-muted/20">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-3 inline-flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" /> Template preview
          </div>
          <div className="rounded-lg bg-background border border-border/60 p-4 font-mono text-[12px] text-foreground/80 space-y-1.5">
            {p.templatePreview.map((line, i) => <div key={i}>{line}</div>)}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Real output adapts to your client, project and brand voice.
          </p>
        </Card>

        {/* CTAs */}
        <Card className="p-6 border-border/60 bg-gradient-to-br from-muted/40 to-background">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
            <div>
              <div className="text-sm font-semibold text-foreground inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Be first to enable
              </div>
              <p className="mt-1 text-xs text-muted-foreground max-w-md">
                We're staging this module across workspaces. Request early access and we'll switch it on for you the moment it ships.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  toast({
                    title: "You're on the list",
                    description: `${p.title} will switch on for your workspace as soon as it ships.`,
                  })
                }
              >
                <Zap className="h-3.5 w-3.5 mr-1.5" /> Request early access
              </Button>
              {p.ctaTo && (
                <Button asChild size="sm">
                  <Link to={p.ctaTo} className="inline-flex items-center gap-1.5">
                    {p.ctaLabel} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </Card>

        <div className="mt-8 text-center text-[11px] text-muted-foreground inline-flex items-center justify-center gap-1.5 w-full">
          <Send className="h-3 w-3" /> Every operational module rolls out behind feature flags — calm and tested.
        </div>
      </div>
    </div>
  );
}