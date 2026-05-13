// Curated authority pages on the MAIN domain.
// These are operational/system explainers — NOT blog content.
// They are entity-authority anchors that the blog and tools link into.

export type AuthoritySection = { heading: string; body: string; bullets?: string[] };
export type AuthorityPage = {
  slug: string;
  eyebrow: string;
  title: string;
  summary: string;
  metaTitle: string;
  metaDescription: string;
  sections: AuthoritySection[];
  related: { label: string; href: string }[];
};

export const AUTHORITY_PAGES: AuthorityPage[] = [
  {
    slug: "async-client-delivery",
    eyebrow: "Operational system",
    title: "Async client delivery, end to end",
    summary:
      "How HustleAI runs client delivery without standups, status meetings, or live chat — from intake to handoff.",
    metaTitle: "Async Client Delivery System for Freelancers · HustleAI",
    metaDescription:
      "An operational system for delivering client work asynchronously: intake forms, scoped pipelines, AI-drafted updates, and Telegram-based handoff.",
    sections: [
      {
        heading: "Why async delivery",
        body: "Live communication is a tax. Async delivery removes the meeting cost from the engagement and keeps the client informed through structured artefacts instead of ad-hoc messages.",
      },
      {
        heading: "The system",
        body: "Every engagement runs through four async surfaces:",
        bullets: [
          "Intake — a public form that captures scope before a single message is sent",
          "Pipeline — a kanban with scoped milestones and per-stage AI prompts",
          "Update engine — weekly client-facing notes drafted by the workspace AI",
          "Handoff — a Telegram-delivered package with invoice, files, and next steps",
        ],
      },
      {
        heading: "Where it lives in HustleAI",
        body: "All four surfaces are part of Workspace OS. The Intake form, Pipeline, and Update engine sit on the workspace database; Telegram delivery uses the export pipeline.",
      },
    ],
    related: [
      { label: "Intake forms", href: "/workflows/client-onboarding-automation" },
      { label: "Telegram delivery", href: "/integrations/telegram-export-delivery" },
      { label: "Workspace OS", href: "/features/freelancer-workspace-os" },
    ],
  },
  {
    slug: "ai-proposal-workflows",
    eyebrow: "Operational system",
    title: "AI proposal workflows for solo operators",
    summary:
      "A repeatable proposal system: structured brief → drafted proposal → branded PDF → tracked send. No blank pages, no over-writing.",
    metaTitle: "AI Proposal Workflows for Freelancers · HustleAI",
    metaDescription:
      "How to run a proposal pipeline with AI: structured briefs, drafted proposals, branded PDFs, and tracked send. Built for solo operators.",
    sections: [
      {
        heading: "What a proposal workflow is",
        body: "A proposal is not a document — it is a stage in a pipeline. The workflow encodes the brief, the draft, the review, the export, and the send as discrete async steps.",
      },
      {
        heading: "Steps",
        body: "",
        bullets: [
          "Brief — fields enforce scope, deliverables, and timeline",
          "Draft — model produces structured sections, not paragraphs",
          "Review — humanize pass + fact check against brief fields",
          "Export — branded PDF with tone-matched theme",
          "Send — tracked link or Telegram file delivery",
        ],
      },
      {
        heading: "Why this beats a template",
        body: "A template is static; a workflow encodes decisions. The system gets better as you ship — every accepted proposal feeds back into the brief schema.",
      },
    ],
    related: [
      { label: "AI Proposal Generator", href: "/free-tools/ai-proposal-generator" },
      { label: "Workspace OS", href: "/features/freelancer-workspace-os" },
      { label: "Branded PDF export engine", href: "/features/branded-pdf-export-engine" },
    ],
  },
  {
    slug: "operational-crm-for-freelancers",
    eyebrow: "Operational system",
    title: "Operational CRM for freelancers",
    summary:
      "A CRM tuned for one-person operations — pipelines, retainers, lead intake, and follow-up cadences without the enterprise overhead.",
    metaTitle: "Operational CRM for Freelancers · HustleAI",
    metaDescription:
      "A lightweight CRM built around freelance operations: pipelines, retainers, lead intake, follow-up cadences, and AI-drafted client updates.",
    sections: [
      {
        heading: "Why most CRMs fail freelancers",
        body: "Enterprise CRMs assume a sales team. Freelancers need an operations layer — not a forecasting layer.",
      },
      {
        heading: "What an operational CRM tracks",
        body: "",
        bullets: [
          "Pipelines per engagement, not per stage",
          "Retainer renewals as scheduled events",
          "Lead intake as a structured form, not a Calendly link",
          "Follow-up cadences as recurring async jobs",
        ],
      },
      {
        heading: "Inside HustleAI",
        body: "Pipelines, intake, retainers, and follow-ups are all surfaces of Workspace OS — they share the same client record, the same documents, and the same export pipeline.",
      },
    ],
    related: [
      { label: "Lead pipelines", href: "/workflows/lead-qualification-workflow" },
      { label: "Retainer renewal automation", href: "/workflows/retainer-renewal-automation" },
      { label: "Client onboarding", href: "/workflows/client-onboarding-automation" },
    ],
  },
  {
    slug: "telegram-delivery-systems",
    eyebrow: "Operational system",
    title: "Telegram delivery systems",
    summary:
      "How HustleAI uses Telegram as a delivery channel — invoices, proposals, exports, client notifications, and async handoff.",
    metaTitle: "Telegram Delivery Systems for Freelancers · HustleAI",
    metaDescription:
      "Use Telegram as a delivery channel for invoices, proposals, exports, and client notifications — async-first, no app required for the client.",
    sections: [
      {
        heading: "Why Telegram",
        body: "Email gets buried. Telegram is the only channel where async delivery still feels real-time without demanding presence.",
      },
      {
        heading: "What gets delivered",
        body: "",
        bullets: [
          "Invoices as PDF + deeplink",
          "Proposals as branded PDF",
          "Generated exports (resumes, roadmaps, kits)",
          "Client status updates from Workspace AI",
          "Onboarding deeplinks for the client portal",
        ],
      },
      {
        heading: "How it works",
        body: "The bot pipeline is built on a queued export model — every artefact is generated, cached, signed, and delivered as a Telegram message with a token-bound deeplink.",
      },
    ],
    related: [
      { label: "Telegram export delivery", href: "/integrations/telegram-export-delivery" },
      { label: "Telegram invoice bot", href: "/integrations/telegram-invoice-bot" },
      { label: "Client notifications", href: "/integrations/telegram-client-notifications" },
    ],
  },
  {
    slug: "workspace-automation",
    eyebrow: "Operational system",
    title: "Workspace automation",
    summary:
      "The automation layer underneath Workspace OS — event producers, workflow runners, and AI job queue.",
    metaTitle: "Workspace Automation Architecture · HustleAI",
    metaDescription:
      "Inside the workspace automation layer: event producers, the workflow runner, and the AI job queue that powers async client operations.",
    sections: [
      {
        heading: "Three layers",
        body: "Automation in HustleAI is not a single product — it is three layers stacked together.",
        bullets: [
          "Event producers — every UI action emits a typed event",
          "Workflow runner — durable, retry-safe, observable",
          "AI job queue — long-running model jobs decoupled from the UI",
        ],
      },
      {
        heading: "Why decouple",
        body: "Decoupling makes the workspace responsive — the UI never blocks on a model call, and every job survives a refresh.",
      },
    ],
    related: [
      { label: "Workspace OS", href: "/features/freelancer-workspace-os" },
      { label: "Async deliverable pipeline", href: "/workflows/async-deliverable-pipeline" },
      { label: "AI document generator", href: "/features/ai-document-generator" },
    ],
  },
];

export const AUTHORITY_BY_SLUG = Object.fromEntries(
  AUTHORITY_PAGES.map((p) => [p.slug, p]),
) as Record<string, AuthorityPage>;
