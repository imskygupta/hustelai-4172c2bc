/**
 * Programmatic SEO catalog.
 *
 * Each entry powers a single landing page rendered by ProgrammaticLanding.
 * Hub indexes (e.g. /features, /workflows) iterate the same catalog so adding
 * a new entry here is the only step needed to ship a new SEO page.
 */

export type SeoKind = "features" | "integrations" | "workflows" | "use-cases" | "free-tools";

export interface SeoEntry {
  kind: SeoKind;
  slug: string;
  /** /features/<slug> etc. — derived. Stored for sitemap convenience. */
  path: string;
  title: string;            // <title>
  description: string;      // meta description
  h1: string;
  subhead: string;
  bullets: string[];
  badge?: string;
  ctaHref?: string;
  ctaLabel?: string;
  sections: { title: string; body: string }[];
  faqs: { q: string; a: string }[];
  related?: { label: string; to: string }[];
}

const mk = (kind: SeoKind, slug: string, e: Omit<SeoEntry, "kind" | "slug" | "path">): SeoEntry => ({
  kind,
  slug,
  path: `/${kind}/${slug}`,
  ...e,
});

export const SEO_CATALOG: SeoEntry[] = [
  // ---------- FEATURES ----------
  mk("features", "ai-client-management-workspace", {
    title: "AI Client Management Workspace for Freelancers | HustleAI",
    description: "Run every client relationship from one AI workspace — pipelines, follow-ups, retainers, deliverables and async updates in a single operating layer.",
    h1: "AI client management, built like an operating system",
    subhead: "Track clients, deals, retainers and deliverables in one workspace. Let the AI assistant draft follow-ups, summarize threads and keep every relationship moving.",
    bullets: ["Unified client records", "AI follow-up drafts", "Retainer + pipeline tracking", "Async-friendly by default"],
    sections: [
      { title: "One record per client, every signal in one place", body: "Every email, proposal, invoice, document and async job lives next to the client. The workspace replaces the spreadsheet + inbox + drive sprawl most freelancers run their work on." },
      { title: "Pipelines that match how solo operators sell", body: "Drag-and-drop kanban with stages tuned for freelancers and small studios — Discovery, Proposal, Negotiation, Won, Retainer. Forecast revenue without a CRM consultant." },
      { title: "AI assists, not AI takeover", body: "HustleAI drafts follow-ups, summarizes long client threads, and prepares scope notes. You stay in control of voice and approval — nothing is sent without you." },
    ],
    faqs: [
      { q: "Is this a CRM?", a: "It includes CRM capability but is broader — clients live next to documents, deliverables, exports and async AI jobs." },
      { q: "Can I import existing clients?", a: "Yes, CSV import is supported. Google Contacts and HubSpot import are rolling out." },
    ],
  }),
  mk("features", "freelancer-workspace-os", {
    title: "Freelancer Workspace OS — One Operating Layer for Your Work | HustleAI",
    description: "An operating system for freelancers — clients, documents, AI workflows, exports and integrations in a single workspace built for async, modern work.",
    h1: "The Workspace OS for modern freelancers",
    subhead: "Stop bolting together five SaaS tools. HustleAI Workspace OS gives you clients, deliverables, async AI jobs and branded exports in one calm operating layer.",
    bullets: ["Async by default", "Branded exports", "AI built-in", "Free to start"],
    sections: [
      { title: "Why operators are moving to a workspace OS", body: "Tool sprawl kills focus. A workspace OS collapses CRM, documents, AI assistants, file storage and client portals into one surface where the data — not the tabs — drives the work." },
      { title: "Built for the way real work happens", body: "Most work is async. HustleAI ships jobs in the background, notifies you when they're ready, and stores every output as a branded, shareable deliverable." },
    ],
    faqs: [
      { q: "Is this for solo freelancers or agencies?", a: "Both. Free tier suits solo operators; Pro and Studio tiers suit 2–10 person studios." },
      { q: "Do I need to migrate everything?", a: "No. You can start with one client and one document and grow into the workspace at your own pace." },
    ],
  }),
  mk("features", "ai-document-generator", {
    title: "AI Document Generator for Proposals, Contracts & Invoices | HustleAI",
    description: "Generate proposals, contracts, invoices and SOWs with AI — branded, exportable and stored next to the client they belong to.",
    h1: "Generate every client document with AI",
    subhead: "Proposals, contracts, invoices, SOWs and onboarding docs — drafted by AI, branded by you, stored next to the client.",
    bullets: ["10+ document types", "PDF + branded exports", "Editable templates", "Client portal delivery"],
    sections: [
      { title: "Templates designed for freelancer reality", body: "Templates cover proposals, fixed-fee SOWs, retainer contracts, invoices, refunds, NDAs and onboarding forms — written for solo operators and modern studios." },
      { title: "Exports your clients respect", body: "Every export is PDF-ready, branded with your logo and theme, and shareable through public portal links your clients can sign or pay against." },
    ],
    faqs: [
      { q: "Are documents legally valid?", a: "Templates are starting points. We recommend a lawyer review for jurisdiction-specific use." },
    ],
  }),
  // ---------- INTEGRATIONS ----------
  mk("integrations", "telegram-export-delivery", {
    title: "Telegram Export Delivery — Get Documents in Telegram | HustleAI",
    description: "Receive every export, invoice and AI document directly in Telegram. The async-native delivery channel for modern operators.",
    h1: "Get every export delivered straight to Telegram",
    subhead: "Wire HustleAI to your Telegram and receive invoices, proposals, contracts and AI outputs the moment they're ready — no email lag, no missed updates.",
    bullets: ["Instant delivery", "Branded PDFs", "Mobile-first", "Free to connect"],
    sections: [
      { title: "Async-native delivery", body: "Most operators work from their phone. Telegram delivery makes every export reachable in seconds — without inbox clutter or app switching." },
      { title: "Secure and per-user", body: "Each Telegram link is tied to your authenticated workspace user. Disconnect any time from settings." },
    ],
    faqs: [
      { q: "Is Telegram delivery free?", a: "Yes — connecting and receiving exports is included on every tier." },
      { q: "Can clients receive deliverables on Telegram too?", a: "Client-facing Telegram delivery is on the roadmap. Today, public portal links handle external sharing." },
    ],
  }),
  mk("integrations", "stripe-payments", {
    title: "Stripe Payments for Freelance Invoices | HustleAI",
    description: "Send branded invoices that clients can pay with one click via Stripe. Reconciled inside HustleAI Workspace OS.",
    h1: "Stripe-powered invoices, reconciled inside your workspace",
    subhead: "Issue an invoice and your client pays with one click. Payment status syncs back into the workspace so revenue is always accurate.",
    bullets: ["One-click pay links", "Auto reconciliation", "Branded invoices", "Tax-ready"],
    sections: [
      { title: "Less chasing, more shipping", body: "Stripe-paid invoices reduce collection time from weeks to days. The workspace marks invoices paid the moment Stripe confirms." },
    ],
    faqs: [
      { q: "Do I need a Stripe account?", a: "Yes — connect your existing Stripe account in settings. There is no extra HustleAI fee on Stripe payments." },
    ],
  }),
  // ---------- WORKFLOWS ----------
  mk("workflows", "async-ai-workflow-platform", {
    title: "Async AI Workflow Platform for Operators | HustleAI",
    description: "Run AI jobs in the background — proposals, contracts, summaries, exports — and pick them up in the workspace, on Telegram or via webhook.",
    h1: "Async AI workflows, built for operators who ship",
    subhead: "Queue an AI job, keep working. HustleAI runs it in the background and notifies you the moment it's ready — across web, Telegram and webhooks.",
    bullets: ["Background queues", "Live job status", "Multi-channel notifications", "Webhook + API hooks"],
    sections: [
      { title: "Why async wins", body: "Modern AI work is too slow for the synchronous request-response loop most SaaS apps use. Async treats AI like any operational job — queue it, route it, deliver the output." },
      { title: "Workflow primitives", body: "Compose workflows from primitive jobs: draft, summarize, classify, score, export, deliver. Mix human approval steps where you need them." },
    ],
    faqs: [
      { q: "Can I trigger workflows from my own systems?", a: "Yes — webhook and API triggers are available on Pro and above." },
    ],
  }),
  mk("workflows", "client-onboarding-automation", {
    title: "Client Onboarding Automation for Freelancers | HustleAI",
    description: "Automate intake, contract, payment and welcome documents the moment a new client signs.",
    h1: "Automate client onboarding end-to-end",
    subhead: "From intake form to signed contract to first invoice — onboard every client with the same calm, repeatable workflow.",
    bullets: ["Public intake forms", "Auto-generated contracts", "Welcome packs", "AI scoring"],
    sections: [
      { title: "Intake-first workflows", body: "Every workflow starts with an intake form your prospects fill out. The AI scores and routes leads, drafts a contract, and prepares the first invoice automatically." },
    ],
    faqs: [
      { q: "Do intake forms work without sign-in?", a: "Yes — forms are public links anyone can submit. Submissions land in your inbox with AI analysis." },
    ],
  }),
  // ---------- USE CASES ----------
  mk("use-cases", "solo-consultant", {
    title: "Workspace OS for Solo Consultants | HustleAI",
    description: "A complete operating layer for solo consultants — clients, retainers, branded deliverables and AI-drafted updates.",
    h1: "The workspace solo consultants actually keep using",
    subhead: "Run your consulting practice — clients, retainers, scope notes, invoices and AI drafts — from one calm workspace.",
    bullets: ["Retainer tracking", "Scope-aware AI", "Branded reports", "Client portal links"],
    sections: [
      { title: "Built for retainer-driven work", body: "Track hours, deliverables and scope creep per retainer. Get warnings before a client runs over budget." },
    ],
    faqs: [
      { q: "Is there a free tier for solo consultants?", a: "Yes — the free tier covers the core workspace. Upgrade only when you need more AI volume or seats." },
    ],
  }),
  mk("use-cases", "design-agency", {
    title: "Workspace OS for Design Agencies & Studios | HustleAI",
    description: "Manage clients, projects, brand kits and deliverables across your studio — with AI workflows that scale with your team.",
    h1: "An operating layer for modern design studios",
    subhead: "Run client work, brand kits, deliverables and async AI workflows across a 2–10 person studio.",
    bullets: ["Per-client brand kits", "Shared workspaces", "Async deliverables", "Studio-tier seats"],
    sections: [
      { title: "Brand kits stay with the client", body: "Every workspace has a brand kit. Generated documents inherit colors, logos and fonts automatically." },
    ],
    faqs: [
      { q: "How many seats can a studio have?", a: "Studio tier supports up to 10 seats with shared workspaces and roles." },
    ],
  }),
  mk("use-cases", "creator-business", {
    title: "Workspace OS for Creators & Operators | HustleAI",
    description: "Manage sponsors, scripts, deliverables and async AI workflows from one workspace built for the creator economy.",
    h1: "Run the business side of being a creator",
    subhead: "Sponsors, scripts, deliverables, invoices and async AI workflows — in one workspace tuned for creator-operator work.",
    bullets: ["Sponsor pipeline", "Script + brief docs", "Branded invoices", "Telegram delivery"],
    sections: [
      { title: "Built around the creator workflow", body: "Track sponsor deals as a pipeline. Generate briefs and invoices from the same workspace your scripts live in." },
    ],
    faqs: [
      { q: "Do I need a separate finance tool?", a: "Most creators don't. HustleAI handles invoicing, payment status and basic revenue reporting in one place." },
    ],
  }),
  // ---------- FREE TOOLS (programmatic SEO mirror of /tools/*) ----------
  mk("free-tools", "ai-invoice-generator", {
    title: "Free AI Invoice Generator — Branded PDF Invoices in Seconds",
    description: "Generate branded invoices with AI — no signup required. Export to PDF, share via link, or sync into your HustleAI workspace.",
    h1: "Free AI invoice generator",
    subhead: "Create a branded invoice in under a minute. Export as PDF or save it inside your HustleAI workspace.",
    bullets: ["No signup required", "Branded PDF export", "INR + USD ready", "GST line items"],
    ctaHref: "/tools/invoice-generator",
    ctaLabel: "Open invoice generator",
    sections: [
      { title: "Built for freelancer-reality invoicing", body: "GST-ready line items, dual-currency support and a clean default template that doesn't look like a Word doc." },
    ],
    faqs: [
      { q: "Is the free invoice generator really free?", a: "Yes — the free generator works without signup. Sign in to save invoices to a client and reuse templates." },
    ],
  }),
  mk("free-tools", "ai-proposal-generator", {
    title: "Free AI Proposal Generator for Freelancers — HustleAI",
    description: "Draft branded client proposals with AI in seconds. No signup. Export as PDF or sync into HustleAI Workspace OS.",
    h1: "Free AI proposal generator",
    subhead: "Describe the project — get a branded, structured proposal in seconds.",
    bullets: ["AI-drafted scope", "Branded PDF", "Editable sections", "Free to try"],
    ctaHref: "/tools/proposal-generator",
    ctaLabel: "Open proposal generator",
    sections: [
      { title: "Proposals that close, not bore", body: "Structured around problem, scope, timeline, pricing and next-step — the format clients actually read." },
    ],
    faqs: [
      { q: "Can I edit the AI output?", a: "Yes — every section is editable before you export." },
    ],
  }),
  mk("free-tools", "ai-contract-generator", {
    title: "Free AI Contract Generator for Freelancers — HustleAI",
    description: "Generate freelance contracts with AI — fixed-fee, retainer, NDA and SOW templates ready to brand and send.",
    h1: "Free AI contract generator",
    subhead: "Pick a template, answer a few questions, get a branded contract you can send today.",
    bullets: ["Fixed-fee + retainer", "NDA + SOW templates", "Branded PDF export", "No signup"],
    ctaHref: "/tools/contract-generator",
    ctaLabel: "Open contract generator",
    sections: [
      { title: "Templates written for solo operators", body: "Plain-English contracts you can actually send to a client without a legal degree." },
    ],
    faqs: [
      { q: "Are these contracts lawyer-reviewed?", a: "They're solid starting points; for jurisdiction-specific use, have a lawyer review your final version." },
    ],
  }),
];

export const byKind = (kind: SeoKind) => SEO_CATALOG.filter((e) => e.kind === kind);
export const findEntry = (kind: SeoKind, slug: string) => SEO_CATALOG.find((e) => e.kind === kind && e.slug === slug);

export const KIND_META: Record<SeoKind, { label: string; intro: string; h1: string; description: string }> = {
  features: {
    label: "Features",
    h1: "HustleAI Workspace OS — Features",
    intro: "Every capability in the AI Workspace Operating System for freelancers, creators and modern studios.",
    description: "Explore every feature of HustleAI Workspace OS — clients, AI documents, async workflows, exports and integrations.",
  },
  integrations: {
    label: "Integrations",
    h1: "Integrations & delivery channels",
    intro: "Wire HustleAI into the rest of your stack — payments, delivery channels, communication and storage.",
    description: "Integrations for HustleAI Workspace OS — Telegram, Stripe, payments, communication and delivery channels.",
  },
  workflows: {
    label: "Workflows",
    h1: "Async AI workflows for operators",
    intro: "Background AI jobs, multi-step automations and operator-grade workflow primitives.",
    description: "Async AI workflows for freelancers and operators — background jobs, automations and workflow primitives.",
  },
  "use-cases": {
    label: "Use cases",
    h1: "Built for how operators actually work",
    intro: "Solo consultants, design studios and creator-operators all run HustleAI as their workspace OS.",
    description: "HustleAI Workspace OS use cases — solo consultants, design agencies, studios and creator businesses.",
  },
  "free-tools": {
    label: "Free tools",
    h1: "Free AI tools for freelancers",
    intro: "Free, no-signup AI tools you can use today — invoices, proposals, contracts and more.",
    description: "Free AI tools for freelancers — invoice generator, proposal generator, contract generator and more.",
  },
};