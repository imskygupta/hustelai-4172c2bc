/**
 * Persona-aware palette ranking + empty-state copy.
 *
 * Same backend, same surfaces — just re-ranked and re-framed by operator
 * mode. The product feels personalised without spinning up parallel UIs.
 *
 * Adding a new surface? Extend `SurfaceKey` and add a default in
 * `DEFAULT_EMPTY` + an override in `PERSONA_EMPTY` for every mode that
 * needs different framing.
 */
import type { OperatorMode } from "@/lib/operator-mode";
import { wp } from "@/lib/workspace/paths";
import { MARKETING_SURFACES } from "@/lib/workspace/surfaces";

export type SurfaceKey =
  | "clients"
  | "projects"
  | "deliveries"
  | "proposals"
  | "content"
  | "pipeline"
  | "revenue";

export interface PersonaEmpty {
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
}

export interface PaletteAction {
  id: string;
  label: string;
  hint: string;
  href: string;
  /** Mark cross-host destinations so the palette uses goCrossHost(). */
  crossHost?: boolean;
}

/* ---------------- Persona-ranked palette actions ---------------- */
/**
 * Top 4 actions for each persona. The palette renders these *first* under
 * "For you" before the generic Action / Tool groups. Keep IDs unique so
 * react keys stay stable.
 */
export const PALETTE_TOP_ACTIONS: Record<OperatorMode, PaletteAction[]> = {
  agency: [
    { id: "p-agency-client",    label: "New Client",       hint: "Add to CRM",            href: wp("clients") },
    { id: "p-agency-project",   label: "New Project",      hint: "Spin up workspace",     href: wp("projects/new") },
    { id: "p-agency-pipeline",  label: "Open Pipeline",    hint: "Deal stages kanban",    href: wp("pipeline") },
    { id: "p-agency-invoice",   label: "Invoice Client",   hint: "Branded PDF invoice",   href: MARKETING_SURFACES.invoiceTool, crossHost: true },
  ],
  freelancer: [
    { id: "p-fl-proposal",      label: "Generate Proposal", hint: "AI-drafted pitch",     href: MARKETING_SURFACES.proposalTool, crossHost: true },
    { id: "p-fl-contract",      label: "Create Contract",   hint: "Service agreement",    href: MARKETING_SURFACES.contractTool, crossHost: true },
    { id: "p-fl-invoice",       label: "Send Invoice",      hint: "GST-ready PDF",        href: MARKETING_SURFACES.invoiceTool,  crossHost: true },
    { id: "p-fl-redflag",       label: "Red Flag Scanner",  hint: "Vet a client",         href: "/red-flag-scanner",             crossHost: true },
  ],
  creator: [
    { id: "p-cr-research",      label: "Research Topic",     hint: "Explore + save",      href: "/explore",                       crossHost: true },
    { id: "p-cr-content",       label: "Generate Content Plan", hint: "4-week calendar",  href: MARKETING_SURFACES.calendarTool,  crossHost: true },
    { id: "p-cr-sponsor",       label: "Sponsor Outreach",   hint: "Pitch + follow-up",   href: "/canvas?intent=outreach",        crossHost: true },
    { id: "p-cr-publish",       label: "Distribution Log",   hint: "Track what shipped",  href: "/dashboard/deliveries",          crossHost: true },
  ],
  consultant: [
    { id: "p-co-discovery",     label: "Discovery Brief",    hint: "Turn calls into scope", href: MARKETING_SURFACES.proposalTool, crossHost: true },
    { id: "p-co-strategy",      label: "Strategy Doc",       hint: "Frameworks + plan",   href: wp("canvas") + "?intent=strategy" },
    { id: "p-co-proposal",      label: "Engagement Proposal", hint: "Discovery → retainer", href: MARKETING_SURFACES.proposalTool, crossHost: true },
    { id: "p-co-retainer",      label: "Retainer Contract",  hint: "Lock the engagement", href: MARKETING_SURFACES.contractTool,  crossHost: true },
  ],
  coach: [
    { id: "p-ch-proposal",      label: "Coaching Proposal",  hint: "Package your offer",  href: MARKETING_SURFACES.proposalTool, crossHost: true },
    { id: "p-ch-intake",        label: "Coachee Intake",     hint: "Branded onboarding",  href: wp("intake") },
    { id: "p-ch-contract",      label: "Program Agreement",  hint: "Lock the program",    href: MARKETING_SURFACES.contractTool, crossHost: true },
    { id: "p-ch-invoice",       label: "Bill Program",       hint: "Invoice the cohort",  href: MARKETING_SURFACES.invoiceTool,  crossHost: true },
  ],
  operator: [
    { id: "p-op-pipeline",      label: "Open Pipeline",      hint: "Deal stages kanban",  href: wp("pipeline") },
    { id: "p-op-delivery",      label: "Deliveries",         hint: "Today's outputs",     href: "/dashboard/deliveries", crossHost: true },
    { id: "p-op-revenue",       label: "Revenue Snapshot",   hint: "Earnings + invoices", href: wp("revenue") },
    { id: "p-op-automations",   label: "Automations",        hint: "Prompts + workflows", href: wp("automations") },
  ],
  explorer: [
    { id: "p-ex-tools",         label: "Browse Tools",       hint: "All generators",      href: "/dashboard/tools",      crossHost: true },
    { id: "p-ex-explore",       label: "Discover Hustles",   hint: "AI hustle search",    href: "/explore",              crossHost: true },
    { id: "p-ex-blueprint",     label: "Hustle Blueprint",   hint: "7-day action plan",   href: wp("blueprint") },
    { id: "p-ex-canvas",        label: "Open Canvas",        hint: "AI workspace",        href: wp("canvas") },
  ],
};

/* ---------------- Persona-aware empty states ---------------- */
/**
 * Generic fallbacks. Used when no persona is set, and as the base copy that
 * `PERSONA_EMPTY` overrides per persona.
 */
const DEFAULT_EMPTY: Record<SurfaceKey, PersonaEmpty> = {
  clients: {
    title: "No clients yet",
    body: "Add your first client. Everything else in the workspace grows from there.",
    ctaLabel: "Add Client",
    ctaHref: wp("clients"),
  },
  projects: {
    title: "No projects yet",
    body: "Spin up a project to organise scope, docs and deliverables in one place.",
    ctaLabel: "New Project",
    ctaHref: wp("projects/new"),
  },
  deliveries: {
    title: "No deliveries yet",
    body: "Generate something with a tool (proposal, report, contract) and use the Deliver button. It'll show up here.",
    ctaLabel: "Open Tools",
    ctaHref: "/dashboard/tools",
  },
  proposals: {
    title: "No proposals sent",
    body: "Draft a proposal and deliver it to your first prospect.",
    ctaLabel: "New Proposal",
    ctaHref: MARKETING_SURFACES.proposalTool,
  },
  content: {
    title: "No content workflows yet",
    body: "Plan your first content system — research, calendar, distribution.",
    ctaLabel: "Generate Content Plan",
    ctaHref: MARKETING_SURFACES.calendarTool,
  },
  pipeline: {
    title: "Pipeline is empty",
    body: "Add a deal to start tracking discovery → proposal → delivery → billed.",
    ctaLabel: "Open Pipeline",
    ctaHref: wp("pipeline"),
  },
  revenue: {
    title: "No revenue tracked yet",
    body: "Once you log invoices and payments, your earnings show up here.",
    ctaLabel: "Create Invoice",
    ctaHref: MARKETING_SURFACES.invoiceTool,
  },
};

const PERSONA_EMPTY: Partial<Record<OperatorMode, Partial<Record<SurfaceKey, PersonaEmpty>>>> = {
  agency: {
    clients: {
      title: "No clients yet",
      body: "Start with your first client. Everything else in the workspace grows from there.",
      ctaLabel: "Add Client",
      ctaHref: wp("clients"),
    },
    projects: {
      title: "No projects in delivery",
      body: "Spin up a project workspace to track scope, team, and deliverables for a client.",
      ctaLabel: "New Project",
      ctaHref: wp("projects/new"),
    },
    deliveries: {
      title: "Delivery queue is empty",
      body: "Every output you ship to a client lands here. Generate a deliverable to populate the queue.",
      ctaLabel: "Open Pipeline",
      ctaHref: wp("pipeline"),
    },
  },
  freelancer: {
    clients: {
      title: "No clients yet",
      body: "Add a client once you've signed a proposal — they'll show up in your CRM.",
      ctaLabel: "Add Client",
      ctaHref: wp("clients"),
    },
    proposals: {
      title: "No proposals sent",
      body: "Create a proposal and deliver it to a client to win your first project.",
      ctaLabel: "New Proposal",
      ctaHref: MARKETING_SURFACES.proposalTool,
    },
    deliveries: {
      title: "Nothing delivered yet",
      body: "Every proposal, invoice or contract you send a client lands here as a paper trail.",
      ctaLabel: "New Proposal",
      ctaHref: MARKETING_SURFACES.proposalTool,
    },
  },
  creator: {
    content: {
      title: "No content workflows yet",
      body: "Create your first content system — research, calendar, distribution.",
      ctaLabel: "Generate Content Plan",
      ctaHref: MARKETING_SURFACES.calendarTool,
    },
    clients: {
      title: "No sponsors yet",
      body: "Track brand deals and sponsors as clients — outreach, proposals, invoices.",
      ctaLabel: "Add Sponsor",
      ctaHref: wp("clients"),
    },
    deliveries: {
      title: "No content shipped yet",
      body: "Every post, script, or deliverable you ship lands here. Plan your next drop.",
      ctaLabel: "Open Content Calendar",
      ctaHref: MARKETING_SURFACES.calendarTool,
    },
  },
  consultant: {
    clients: {
      title: "No engagements yet",
      body: "Add your first client to track discovery → strategy → retainer.",
      ctaLabel: "Add Client",
      ctaHref: wp("clients"),
    },
    proposals: {
      title: "No engagement proposals",
      body: "Turn a discovery call into a structured engagement proposal.",
      ctaLabel: "Draft Proposal",
      ctaHref: MARKETING_SURFACES.proposalTool,
    },
  },
  coach: {
    clients: {
      title: "No coachees yet",
      body: "Onboard your first coachee — intake, contract, sessions, outcomes.",
      ctaLabel: "Open Intake",
      ctaHref: wp("intake"),
    },
  },
  operator: {},
  explorer: {
    clients: {
      title: "Pick a mode to make this yours",
      body: "Choose a persona on your dashboard so we tailor clients, deliveries and tools to how you work.",
      ctaLabel: "Pick a mode",
      ctaHref: "/dashboard",
    },
  },
};

export function getSurfaceEmpty(mode: OperatorMode | null, surface: SurfaceKey): PersonaEmpty {
  const fallback = DEFAULT_EMPTY[surface];
  if (!mode) return fallback;
  return PERSONA_EMPTY[mode]?.[surface] ?? fallback;
}

export function getPaletteTopActions(mode: OperatorMode | null): PaletteAction[] {
  if (!mode) return [];
  return PALETTE_TOP_ACTIONS[mode] ?? [];
}
