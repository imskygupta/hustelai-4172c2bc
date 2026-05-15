/**
 * Operational chains — what usually happens next.
 *
 * Given a recent workspace output (proposal, outreach, content strategy, …)
 * this returns 2–3 calm, contextual "next moves" the operator can take. It
 * intentionally lives outside the global next-actions registry because:
 *   - chains are project-scoped (route into the same workspace)
 *   - chains care about *what was just produced* in this workspace, not
 *     about cross-app activation events.
 *
 * Pure function, no side effects. Deduped against outputs already produced
 * in the same project so suggestions don't repeat work the operator already
 * finished.
 */
import { Receipt, Send, FileText, Map as MapIcon, ListChecks, Megaphone, Briefcase, Brain, Workflow, Calendar, Search, type LucideIcon } from "lucide-react";
import type { WorkspaceOutput } from "@/lib/workspace/outputs";

export type ChainStep = {
  id: string;
  label: string;
  sub: string;
  icon: LucideIcon;
  /** Tail path appended to /workspace/<id>/... */
  href: string;
  intent: string;
};

/**
 * Tool token → matchers. We match against the `tool` field on workspace_outputs
 * (and as a fallback against the lowercased title) so chains keep working even
 * when tools rename themselves.
 */
function matches(o: WorkspaceOutput, ...keys: string[]): boolean {
  const t = (o.tool || "").toLowerCase();
  const title = (o.title || "").toLowerCase();
  return keys.some(k => t.includes(k) || title.includes(k));
}

const CHAIN_BANK: Record<string, ChainStep> = {
  invoice:     { id: "invoice",     label: "Generate matching invoice", sub: "Lock the deal with branded billing.",  icon: Receipt,    href: "tools",     intent: "invoice" },
  followup:    { id: "followup",    label: "Draft a follow-up",         sub: "Nudge the client without sounding pushy.", icon: Send,    href: "canvas",    intent: "followup" },
  onboarding:  { id: "onboarding",  label: "Convert to onboarding",     sub: "Turn scope into a kickoff checklist.", icon: ListChecks, href: "tools",     intent: "onboarding" },
  timeline:    { id: "timeline",    label: "Schedule delivery timeline",sub: "Milestones from scope.",               icon: Calendar,   href: "canvas",    intent: "timeline" },
  sequence:    { id: "sequence",    label: "Build follow-up sequence",  sub: "3-touch nurture from this opener.",    icon: Workflow,   href: "canvas",    intent: "outreach_sequence" },
  icp:         { id: "icp",         label: "Build ICP profile",         sub: "Sharpen who you're talking to.",       icon: Search,     href: "canvas",    intent: "icp" },
  campaign:    { id: "campaign",    label: "Save as campaign asset",    sub: "Reuse this opener across clients.",    icon: Briefcase,  href: "assets",    intent: "promote_asset" },
  calendar:    { id: "calendar",    label: "Generate publishing plan",  sub: "30-day calendar from these pillars.",  icon: Calendar,   href: "canvas",    intent: "content_calendar" },
  first_post:  { id: "first_post",  label: "Draft the first post",      sub: "Hook + body + CTA.",                   icon: FileText,   href: "canvas",    intent: "post_draft" },
  client_deck: { id: "client_deck", label: "Build client deck",         sub: "Strategy in pitchable shape.",         icon: Megaphone,  href: "tools",     intent: "deck" },
  research:    { id: "research",    label: "Run research brief",        sub: "Sources + synthesis behind the plan.", icon: Search,     href: "canvas",    intent: "research" },
  scope:       { id: "scope",       label: "Tighten the scope",         sub: "Deliverables + boundaries.",           icon: MapIcon,    href: "blueprint", intent: "scope" },
  strategy:    { id: "strategy",    label: "Promote to strategy doc",   sub: "Lock this thinking as a saved asset.", icon: Brain,      href: "assets",    intent: "promote_asset" },
};

/**
 * Given the most-recent output in the current project, return up to 3 next
 * steps. Filters out steps whose intent already exists in `priorOutputs`.
 */
export function suggestChainFromOutput(
  latest: WorkspaceOutput,
  priorOutputs: WorkspaceOutput[] = [],
): ChainStep[] {
  const out: ChainStep[] = [];

  // Proposals → invoice / follow-up / onboarding / timeline
  if (matches(latest, "proposal")) {
    out.push(CHAIN_BANK.invoice, CHAIN_BANK.onboarding, CHAIN_BANK.timeline);
  }
  // Outreach / cold email
  else if (matches(latest, "outreach", "cold-email", "cold_email", "email")) {
    out.push(CHAIN_BANK.sequence, CHAIN_BANK.icp, CHAIN_BANK.campaign);
  }
  // Content strategy / pillars
  else if (matches(latest, "content-strategy", "pillars", "strategy")) {
    out.push(CHAIN_BANK.calendar, CHAIN_BANK.first_post, CHAIN_BANK.client_deck);
  }
  // Calendar
  else if (matches(latest, "content-calendar", "calendar", "publishing")) {
    out.push(CHAIN_BANK.first_post, CHAIN_BANK.client_deck);
  }
  // Roadmap / blueprint / scope
  else if (matches(latest, "roadmap", "blueprint", "scope")) {
    out.push(CHAIN_BANK.timeline, CHAIN_BANK.onboarding, CHAIN_BANK.invoice);
  }
  // ICP / research
  else if (matches(latest, "icp", "research")) {
    out.push(CHAIN_BANK.sequence, CHAIN_BANK.campaign);
  }
  // Generic AI canvas / prompt → offer to save as asset + tighten scope
  else {
    out.push(CHAIN_BANK.strategy, CHAIN_BANK.scope, CHAIN_BANK.followup);
  }

  // Dedupe against work that already exists in this project
  const done = new Set(priorOutputs.map(o => (o.tool || "").toLowerCase()));
  const filtered = out.filter(step => {
    if (step.intent === "invoice"      && [...done].some(d => d.includes("invoice"))) return false;
    if (step.intent === "onboarding"   && [...done].some(d => d.includes("onboard"))) return false;
    if (step.intent === "content_calendar" && [...done].some(d => d.includes("calendar"))) return false;
    if (step.intent === "outreach_sequence" && [...done].some(d => d.includes("sequence"))) return false;
    return true;
  });

  return filtered.slice(0, 3);
}
