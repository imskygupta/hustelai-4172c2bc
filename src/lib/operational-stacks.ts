/**
 * Operational stacks = curated operator dependency journeys.
 * Each stack maps stages to existing tools/guides so we can render
 * /systems/:slug as the human-readable layer above the tool graph.
 *
 * Keep this typed + deterministic. Behavioral signals refine the
 * recommendation engine; this file is the editorial source of truth.
 */

import type { OperatorPersona } from "@/components/blog/operational/OperatorPersonas";

export interface StackStage {
  /** Short stage label (1–3 words) */
  label: string;
  /** Outcome the operator gets at this stage */
  outcome: string;
  /** Optional tool route (must exist in app) */
  tool?: { label: string; to: string };
  /** Optional guide slug for /insights/:slug */
  guideSlug?: string;
}

export interface OperationalStack {
  slug: string;
  title: string;
  blurb: string;
  /** One-line positioning for SEO meta */
  seoTagline: string;
  persona: OperatorPersona;
  /** Stack progression — order matters */
  stages: StackStage[];
  /** Related stacks for cross-linking */
  related?: string[];
}

export const OPERATIONAL_STACKS: OperationalStack[] = [
  {
    slug: "freelancer-onboarding-stack",
    title: "Freelancer Onboarding Stack",
    blurb:
      "From first reply to signed proposal to kickoff — the operating spine every solo freelancer needs before scaling delivery.",
    seoTagline:
      "The operational stack solo freelancers use to onboard new clients without dropping the ball.",
    persona: "beginner-freelancer",
    stages: [
      { label: "Capture lead", outcome: "Qualify the inquiry, kill bad-fit fast",
        tool: { label: "Lead Discovery", to: "/lead-discovery" } },
      { label: "Send proposal", outcome: "Branded scope + pricing in under 10 minutes",
        tool: { label: "Proposal Generator", to: "/proposal-generator" } },
      { label: "Kickoff intake", outcome: "Collect everything you need before work starts",
        tool: { label: "Onboarding Forms", to: "/client-onboarding-software" } },
      { label: "Invoice the deposit", outcome: "Cash in the door before delivery",
        tool: { label: "Invoice Generator", to: "/ai-invoice-generator" } },
      { label: "Open client portal", outcome: "One link the client opens for everything",
        tool: { label: "Client Portal", to: "/client-portal-software" } },
    ],
    related: ["solo-agency-ops", "telegram-client-delivery"],
  },
  {
    slug: "telegram-client-delivery",
    title: "Telegram Client Delivery Stack",
    blurb:
      "Run async client work from Telegram — intake, updates, invoices and approvals — without bouncing across five tabs.",
    seoTagline:
      "The Telegram-first operational stack for solo operators delivering client work in chat.",
    persona: "telegram-first",
    stages: [
      { label: "Inbound capture", outcome: "Turn DMs into structured leads",
        tool: { label: "Telegram Business", to: "/for-telegram-business" } },
      { label: "Async proposal", outcome: "Send a proposal link inside the chat",
        tool: { label: "Proposal Generator", to: "/proposal-generator" } },
      { label: "Status updates", outcome: "Daily standups posted to the client thread",
        tool: { label: "Workspace OS", to: "/workspace-os" } },
      { label: "Invoice & receipt", outcome: "Drop a paid-link straight into chat",
        tool: { label: "Invoice Generator", to: "/ai-invoice-generator" } },
      { label: "Delivery handoff", outcome: "Final files in a portal the client can revisit",
        tool: { label: "Client Portal", to: "/client-portal-software" } },
    ],
    related: ["freelancer-onboarding-stack", "solo-agency-ops"],
  },
  {
    slug: "solo-agency-ops",
    title: "Solo Agency Operations Stack",
    blurb:
      "The lean ops layer for 1–3 person studios: pipeline, delivery, invoicing and retention without hiring an ops manager.",
    seoTagline: "The operations stack lean agencies use to run delivery without an ops hire.",
    persona: "agency-owner",
    stages: [
      { label: "Pipeline", outcome: "See every active deal in one board",
        tool: { label: "Freelancer CRM", to: "/freelancer-crm" } },
      { label: "Proposals", outcome: "Branded proposals out the door same day",
        tool: { label: "Proposal Generator", to: "/proposal-generator" } },
      { label: "Onboarding", outcome: "Standardised intake for every new project",
        tool: { label: "Onboarding Forms", to: "/client-onboarding-software" } },
      { label: "Delivery", outcome: "Async updates and approvals tracked",
        tool: { label: "Agency Workflow", to: "/agency-workflow-tools" } },
      { label: "Billing", outcome: "Recurring invoicing and receipts",
        tool: { label: "Invoice Generator", to: "/ai-invoice-generator" } },
      { label: "Retention", outcome: "Quarterly check-ins to keep retainers alive",
        tool: { label: "Client Portal", to: "/client-portal-software" } },
    ],
    related: ["freelancer-onboarding-stack", "telegram-client-delivery"],
  },
  {
    slug: "async-creator-ops",
    title: "Async Creator Ops Stack",
    blurb:
      "For creators monetising work — brand deals, digital products, content systems — without burning out on coordination.",
    seoTagline: "The async ops stack creators use to monetise without endless meetings.",
    persona: "async-workflow",
    stages: [
      { label: "Inbound briefs", outcome: "Structured deal capture in a single form",
        tool: { label: "Onboarding Forms", to: "/client-onboarding-software" } },
      { label: "Quotes & rates", outcome: "Send a quote link in minutes",
        tool: { label: "Quotation Generator", to: "/quotation-generator" } },
      { label: "Production cadence", outcome: "Track every deliverable async",
        tool: { label: "Workspace OS", to: "/workspace-os" } },
      { label: "Invoicing", outcome: "Branded invoices that get paid",
        tool: { label: "Invoice Generator", to: "/ai-invoice-generator" } },
      { label: "Portfolio asset", outcome: "Turn delivery into a public case study",
        tool: { label: "Client Portal", to: "/client-portal-software" } },
    ],
    related: ["solo-agency-ops"],
  },
];

export function getStack(slug: string): OperationalStack | undefined {
  return OPERATIONAL_STACKS.find((s) => s.slug === slug);
}

/** Find stacks that mention a given tool route — used for cross-linking. */
export function stacksForToolPath(toolPath: string): OperationalStack[] {
  return OPERATIONAL_STACKS.filter((s) =>
    s.stages.some((st) => st.tool?.to === toolPath),
  );
}

/** Find stacks whose stages reference any of the given tags/keywords. */
export function stacksForKeywords(keywords: string[]): OperationalStack[] {
  const ks = keywords.map((k) => k.toLowerCase());
  return OPERATIONAL_STACKS.filter((s) => {
    const hay = [
      s.title, s.blurb, s.persona,
      ...s.stages.flatMap((st) => [st.label, st.outcome, st.tool?.label ?? ""]),
    ].join(" ").toLowerCase();
    return ks.some((k) => k && hay.includes(k));
  });
}