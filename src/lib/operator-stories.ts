/**
 * Operator Stories — workflow setups, not testimonials.
 * Editorial source of truth for /stories. Each story shows how a real
 * operator persona structured their stack — names are illustrative and
 * deliberately framed as setups (no fake metrics, no inflated claims).
 */

import type { OperatorPersona } from "@/components/blog/operational/OperatorPersonas";

export interface OperatorStory {
  slug: string;
  title: string;
  /** One-line setup summary used on cards + meta description */
  summary: string;
  persona: OperatorPersona;
  /** Operator profile shown on the card — illustrative, not a testimonial */
  operator: { role: string; context: string };
  /** Ordered steps describing how they structured their workflow */
  steps: { label: string; detail: string }[];
  /** Stacks this setup maps onto — link to /systems/:slug */
  stackSlugs: string[];
}

export const OPERATOR_STORIES: OperatorStory[] = [
  {
    slug: "solo-designer-telegram-onboarding",
    title: "How a solo designer runs onboarding entirely through Telegram",
    summary:
      "A one-person studio that captures briefs, sends proposals and invoices a deposit without leaving the chat thread.",
    persona: "telegram-first",
    operator: {
      role: "Solo brand designer",
      context: "Works with founders who DM her on Telegram and want to move fast",
    },
    steps: [
      { label: "Brief capture",
        detail: "Pinned Telegram form link replaces the back-and-forth on requirements." },
      { label: "Proposal in chat",
        detail: "Proposal Generator output sent as a single link inside the thread." },
      { label: "Deposit invoice",
        detail: "Invoice Generator drops a payable link straight into the conversation." },
      { label: "Kickoff handoff",
        detail: "Client Portal becomes the source of truth once work begins." },
    ],
    stackSlugs: ["telegram-client-delivery", "freelancer-onboarding-stack"],
  },
  {
    slug: "two-person-agency-delivery-spine",
    title: "How a two-person studio standardised delivery without an ops hire",
    summary:
      "A lean studio used proposals, intake forms and a recurring invoice cadence to remove every weekly coordination call.",
    persona: "agency-owner",
    operator: {
      role: "Founders of a 2-person studio",
      context: "Web design retainers, juggling 4–6 active clients at a time",
    },
    steps: [
      { label: "Pipeline as the source of truth",
        detail: "Every lead lands in the CRM before it gets a calendar invite." },
      { label: "Standard proposal template",
        detail: "Same scope language for every deal, swapped to cut prep time." },
      { label: "One intake form per service",
        detail: "Onboarding form gates the kickoff call — no kickoff without it." },
      { label: "Monthly invoice cadence",
        detail: "Recurring invoices auto-send on the same day every month." },
    ],
    stackSlugs: ["solo-agency-ops"],
  },
  {
    slug: "async-creator-brand-deal-pipeline",
    title: "How a creator turned brand deal chaos into a repeatable pipeline",
    summary:
      "Inbound brand deals stopped slipping through DMs once every conversation routed through a single intake link.",
    persona: "async-workflow",
    operator: {
      role: "Async-first content creator",
      context: "Mid-five-figure annual brand deal revenue, no manager",
    },
    steps: [
      { label: "Single intake link",
        detail: "Replaced four DM channels with one structured form." },
      { label: "Quote within 24h",
        detail: "Quotation Generator turns intake answers into a same-day quote." },
      { label: "Async production board",
        detail: "Workspace OS holds every deliverable, deadline and approval." },
      { label: "Public case study handoff",
        detail: "Finished work mirrored into a portal that doubles as portfolio." },
    ],
    stackSlugs: ["async-creator-ops"],
  },
];

export function getStory(slug: string): OperatorStory | undefined {
  return OPERATOR_STORIES.find((s) => s.slug === slug);
}