/**
 * Persona flow registry.
 *
 * SINGLE source of truth for the 5-stage workflow strip used in two places:
 *   1. Homepage V3 — marketing illustration of "this is how you'll work".
 *   2. Dashboard PersonaFlowCard — same 5 stages, rendered with live counts
 *      pulled from the user's data.
 *
 * The mental model the visitor sees BEFORE signup must match the mental
 * model they land in AFTER signup. Both surfaces read from this file so the
 * narrative stays continuous and we can't accidentally drift labels.
 */
import type { OperatorMode } from "@/lib/operator-mode";
import { wp } from "@/lib/workspace/paths";
import { MARKETING_SURFACES } from "@/lib/workspace/surfaces";

/**
 * Identifiers for the count we fetch per stage. `null` = the stage has no
 * live metric (still renders as a clickable label).
 */
export type FlowCountKey =
  | "leads"
  | "clients"
  | "projects"
  | "deliveries"
  | "invoicesUnpaid"
  | "invoicesPaid"
  | "proposals"
  | "content";

export interface FlowStage {
  label: string;
  href: string;
  /** Mark cross-host targets so the card uses goCrossHost on workspace.*. */
  crossHost?: boolean;
  count?: FlowCountKey;
}

export interface PersonaFlow {
  /** Headline above the flow on the dashboard. */
  title: string;
  stages: FlowStage[];
}

export const PERSONA_FLOWS: Partial<Record<OperatorMode, PersonaFlow>> = {
  agency: {
    title: "Today's Agency Flow",
    stages: [
      { label: "Client",     href: wp("clients"),                                     count: "clients" },
      { label: "Workspace",  href: wp(""),                                            count: "projects" },
      { label: "Team",       href: wp("pipeline") },
      { label: "Delivery",   href: "/dashboard/deliveries",        crossHost: true,   count: "deliveries" },
      { label: "Retention",  href: wp("revenue"),                                     count: "invoicesPaid" },
    ],
  },
  freelancer: {
    title: "Your Business Today",
    stages: [
      { label: "Lead",       href: "/problem-leads",               crossHost: true,  count: "leads" },
      { label: "Proposal",   href: MARKETING_SURFACES.proposalTool, crossHost: true,  count: "proposals" },
      { label: "Approval",   href: wp("pipeline") },
      { label: "Invoice",    href: MARKETING_SURFACES.invoiceTool,  crossHost: true,  count: "invoicesUnpaid" },
      { label: "Payment",    href: wp("revenue"),                                     count: "invoicesPaid" },
    ],
  },
  creator: {
    title: "Creator Workflow",
    stages: [
      { label: "Idea",         href: "/saved",                      crossHost: true },
      { label: "Research",     href: "/explore",                    crossHost: true },
      { label: "Content",      href: MARKETING_SURFACES.calendarTool, crossHost: true, count: "content" },
      { label: "Distribution", href: "/dashboard/deliveries",       crossHost: true,  count: "deliveries" },
      { label: "Sponsor",      href: wp("clients"),                                   count: "clients" },
    ],
  },
  consultant: {
    title: "Practice Today",
    stages: [
      { label: "Discovery",  href: wp("clients"),                                     count: "clients" },
      { label: "Proposal",   href: MARKETING_SURFACES.proposalTool, crossHost: true,  count: "proposals" },
      { label: "Approval",   href: wp("pipeline") },
      { label: "Engagement", href: wp(""),                                            count: "projects" },
      { label: "Renewal",    href: wp("revenue"),                                     count: "invoicesPaid" },
    ],
  },
  coach: {
    title: "Coaching Flow",
    stages: [
      { label: "Discovery",  href: wp("clients"),                                     count: "clients" },
      { label: "Program",    href: MARKETING_SURFACES.proposalTool, crossHost: true,  count: "proposals" },
      { label: "Onboarding", href: wp("intake") },
      { label: "Outcomes",   href: "/dashboard/deliveries",        crossHost: true,   count: "deliveries" },
      { label: "Renewal",    href: wp("revenue"),                                     count: "invoicesPaid" },
    ],
  },
  operator: {
    title: "Operator Stack",
    stages: [
      { label: "Pipeline",    href: wp("pipeline") },
      { label: "Projects",    href: wp(""),                                           count: "projects" },
      { label: "Delivery",    href: "/dashboard/deliveries",       crossHost: true,   count: "deliveries" },
      { label: "Revenue",     href: wp("revenue"),                                    count: "invoicesPaid" },
      { label: "Automations", href: wp("automations") },
    ],
  },
};

/** Public lookup used by Homepage V3 + dashboard. */
export function getPersonaFlow(mode: OperatorMode | null): PersonaFlow | null {
  if (!mode) return null;
  return PERSONA_FLOWS[mode] ?? null;
}

/**
 * Legacy shape consumed by HomepageV3.WorkflowsByAudience. Order MUST be
 * preserved (the marketing UI uses a positional tab index). Both surfaces
 * read from `PERSONA_FLOWS` so adding/renaming a stage updates both at once.
 */
export const HOMEPAGE_FLOWS: { audience: string; mode: OperatorMode; steps: string[] }[] = [
  { audience: "Freelancer", mode: "freelancer", steps: PERSONA_FLOWS.freelancer!.stages.map(s => s.label) },
  { audience: "Creator",    mode: "creator",    steps: PERSONA_FLOWS.creator!.stages.map(s => s.label) },
  { audience: "Agency",     mode: "agency",     steps: PERSONA_FLOWS.agency!.stages.map(s => s.label) },
  { audience: "Consultant", mode: "consultant", steps: PERSONA_FLOWS.consultant!.stages.map(s => s.label) },
];
