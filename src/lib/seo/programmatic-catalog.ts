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

  // ============================================================
  // 20 long-tail SEO landings — freelancer workflows, async ops,
  // AI documents, Telegram delivery. Unique copy, low-comp keywords.
  // ============================================================

  // ---------- WORKFLOWS (8) ----------
  mk("workflows", "retainer-renewal-automation", {
    title: "Retainer Renewal Automation for Freelancers | HustleAI",
    description: "Auto-detect ending retainers, draft renewal proposals and trigger follow-ups before churn. Built for solo operators who can't afford lost MRR.",
    h1: "Stop losing retainers to silence",
    subhead: "HustleAI watches every retainer's end date, drafts the renewal proposal in your voice, and pings the client through your channel of choice — before the contract lapses.",
    bullets: ["Renewal radar", "AI-drafted proposals", "Telegram + email pings", "Churn alerts"],
    sections: [
      { title: "Most retainer churn is invisible", body: "Retainers don't usually end with an angry email — they end with a quiet expiration nobody noticed. Renewal automation surfaces that 30, 14 and 7 days out so you can act." },
      { title: "From radar to renewal in three steps", body: "Detect — draft — deliver. The workflow generates a renewal proposal seeded with the current retainer terms, then routes it to whichever channel that client actually answers in." },
    ],
    faqs: [
      { q: "Does this work for hourly retainers?", a: "Yes — both fixed-fee and hourly retainers are supported, with usage summaries pulled into the renewal draft." },
      { q: "Can I edit the renewal before sending?", a: "Always. Drafts land in your workspace inbox; nothing is sent without your approval." },
    ],
  }),
  mk("workflows", "weekly-client-update-automation", {
    title: "Weekly Client Update Automation | HustleAI",
    description: "Auto-draft a weekly client update from your tasks, time logs and recent docs. Skip the Sunday-night writing ritual.",
    h1: "Weekly client updates that write themselves",
    subhead: "HustleAI assembles a weekly update from your tasks, hours and shipped docs — branded, sectioned and ready to send by Friday afternoon.",
    bullets: ["Auto-summary", "Per-client branding", "Schedule + send", "Telegram preview"],
    sections: [
      { title: "The update clients actually read", body: "Three sections: shipped this week, in progress, blockers. Tight, scannable, no padding. Built from your actual workspace data — not a blank page." },
      { title: "Shipped on a schedule, not a whim", body: "Drafts generate every Friday at 2pm in your timezone. Approve once and the update lands in your client's inbox or Telegram." },
    ],
    faqs: [
      { q: "What if I have no activity this week?", a: "The draft notes that explicitly so the silence isn't mysterious. You stay credible without faking progress." },
    ],
  }),
  mk("workflows", "ai-scope-creep-detector", {
    title: "AI Scope Creep Detector for Freelancers | HustleAI",
    description: "Detect scope creep across emails, briefs and tasks. Get an AI flag the moment a client asks for work outside the SOW.",
    h1: "Catch scope creep before it eats your margin",
    subhead: "HustleAI cross-checks every new request against the active SOW. When a client asks for something outside scope, you get a flag — and a draft change-order ready to send.",
    bullets: ["Live SOW comparison", "Change-order drafts", "Margin protection", "Async-friendly"],
    sections: [
      { title: "Scope creep is a silent revenue leak", body: "Most freelancers absorb 10–25% of every project as unbilled scope creep. The detector turns that into either a billable change order or a polite, documented decline." },
      { title: "How the AI compares requests to scope", body: "Each project's SOW is parsed into deliverable units. Incoming requests are matched semantically — anything outside the boundary gets flagged with the suggested rate." },
    ],
    faqs: [
      { q: "Does it work without a formal SOW?", a: "It works best with one, but a bullet list of in-scope items is enough to start detecting drift." },
    ],
  }),
  mk("workflows", "follow-up-cadence-engine", {
    title: "Follow-Up Cadence Engine for Freelance Sales | HustleAI",
    description: "Auto-sequence follow-ups for cold leads, sent proposals and unpaid invoices. AI-drafted, channel-aware and approval-first.",
    h1: "Follow up like a closer, work like a builder",
    subhead: "Every cold lead, sent proposal and overdue invoice gets its own follow-up cadence — drafted by AI, sent on your approval, tracked in the workspace.",
    bullets: ["Three cadences out of the box", "AI-drafted touches", "Channel-aware", "Auto-pause on reply"],
    sections: [
      { title: "Pipelines die from missed follow-ups", body: "Most freelance pipelines lose more revenue to forgotten follow-ups than to bad fits. The cadence engine makes the next touch obvious and writes the first draft for you." },
      { title: "Three default cadences", body: "Cold lead — 5 touches over 14 days. Sent proposal — 3 touches over 10 days. Overdue invoice — 4 touches with escalating tone over 21 days. Each step pauses automatically when the client replies." },
    ],
    faqs: [
      { q: "Will it spam my clients?", a: "No — every step requires your approval before sending, and replies pause the cadence automatically." },
    ],
  }),
  mk("workflows", "async-deliverable-pipeline", {
    title: "Async Deliverable Pipeline for Operators | HustleAI",
    description: "Move every deliverable through draft, review, branded export and client delivery — all async, all tracked.",
    h1: "Ship deliverables async, not in a panic",
    subhead: "Every deliverable flows through the same pipeline — draft, internal review, branded export, client delivery — with status visible from the workspace and Telegram.",
    bullets: ["Pipeline visibility", "Branded exports", "Approval gates", "Telegram status pings"],
    sections: [
      { title: "Why a pipeline beats a folder", body: "Folders hide state. A pipeline shows where every deliverable is — drafting, in review, awaiting approval, delivered. Nothing slips because nothing is invisible." },
      { title: "Approval gates without bureaucracy", body: "Each stage has an optional approver. Skip them solo, enable them in studios. Either way, the audit trail stays clean." },
    ],
    faqs: [
      { q: "Can clients see the pipeline?", a: "Optionally — share a public portal link that shows the deliverable's current stage without exposing internal notes." },
    ],
  }),
  mk("workflows", "lead-qualification-workflow", {
    title: "AI Lead Qualification Workflow for Freelancers | HustleAI",
    description: "Score every intake submission with AI — fit, urgency, budget and red flags. Skip bad-fit calls and double down on the real ones.",
    h1: "Qualify leads before the call",
    subhead: "Every intake submission runs through an AI scoring pass — fit, urgency, budget signal and red flags — before it reaches your inbox.",
    bullets: ["AI scoring", "Red-flag detection", "Auto-routing", "Reply templates"],
    sections: [
      { title: "Stop spending hours on bad-fit calls", body: "Most discovery calls die in the first ten minutes. Pre-call AI scoring filters out budget mismatches, vague briefs and obvious red flags so your calendar fills with real opportunities." },
      { title: "Auto-routing the qualified ones", body: "High-fit leads get a fast reply template and a calendar link. Mid-fit leads get a clarifying questions email. Low-fit leads get a polite decline. All drafted, all approval-first." },
    ],
    faqs: [
      { q: "What signals does the AI score on?", a: "Budget language, timeline urgency, scope clarity, decision-maker presence and known red-flag patterns." },
    ],
  }),
  mk("workflows", "recurring-invoice-automation", {
    title: "Recurring Invoice Automation for Retainers | HustleAI",
    description: "Auto-issue retainer invoices on the right cycle, in the right currency, with the right tax — and chase unpaid ones automatically.",
    h1: "Recurring invoices that send themselves",
    subhead: "Set the cycle once. HustleAI issues each retainer invoice on schedule, sends it to the client and chases the unpaid ones — without you opening the workspace.",
    bullets: ["Monthly + quarterly", "Multi-currency", "Auto-chase overdue", "Stripe + UPI ready"],
    sections: [
      { title: "Set the cadence, not the calendar", body: "Pick a cycle per retainer — monthly, quarterly or custom. Invoices generate, brand themselves and send on the schedule. You only step in for changes." },
      { title: "Overdue chasing without awkwardness", body: "If an invoice ages past 7 days, the chase cadence kicks in — neutral first, firmer at 14 and 21 days. Approval-first by default, fully automated for trusted clients." },
    ],
    faqs: [
      { q: "Can I pause a retainer invoice cycle?", a: "Yes — pause from the retainer record. Cycles resume the following month." },
    ],
  }),
  mk("workflows", "project-handoff-automation", {
    title: "Project Handoff Automation for Freelancers | HustleAI",
    description: "Generate the entire end-of-project handoff pack — files, credentials, summary doc and goodwill note — in one async workflow.",
    h1: "End every project on a high note",
    subhead: "When a project closes, HustleAI assembles the handoff pack — files, credentials, summary doc and a personalized goodwill note — and delivers it to the client through your chosen channel.",
    bullets: ["Handoff doc generator", "Credentials checklist", "Goodwill note", "Public portal delivery"],
    sections: [
      { title: "Handoffs are where retainers are born", body: "A clean handoff is the strongest sales pitch you'll ever make for the next project. Automating it means it actually happens — even when you're already on the next gig." },
      { title: "What's in the pack", body: "A summary doc with what was shipped, files organized by deliverable, a credentials handover checklist, and a short, warm note that opens the door for the next engagement." },
    ],
    faqs: [
      { q: "Do clients need an account?", a: "No — handoff packs are delivered through public portal links that work without signup." },
    ],
  }),

  // ---------- INTEGRATIONS (4 — Telegram-heavy) ----------
  mk("integrations", "telegram-invoice-bot", {
    title: "Telegram Invoice Bot for Freelancers | HustleAI",
    description: "Send and receive freelance invoices through Telegram. Branded PDFs, payment status pings and overdue alerts — straight in your chat.",
    h1: "A Telegram bot for every invoice you send",
    subhead: "Connect HustleAI to Telegram and turn your chat into an invoicing surface — issue, deliver, get paid notifications and chase overdue invoices without opening your laptop.",
    bullets: ["Issue from chat", "Branded PDF delivery", "Paid pings", "Overdue alerts"],
    sections: [
      { title: "Invoicing where you already live", body: "Most operators check Telegram more than email. The bot keeps invoicing in the surface you actually use — no more 'I'll send it tonight'." },
      { title: "Two-way: not just notifications", body: "Issue an invoice with a single command. Get a paid ping the moment it clears. Trigger a chase with a tap. Telegram is the interface; HustleAI is the engine." },
    ],
    faqs: [
      { q: "Is the Telegram bot included?", a: "Yes — Telegram delivery is free on every tier, including the free workspace." },
    ],
  }),
  mk("integrations", "telegram-proposal-delivery", {
    title: "Telegram Proposal Delivery for Freelancers | HustleAI",
    description: "Deliver branded proposals through Telegram. Track opens, get reply pings, and never lose a hot lead in an inbox again.",
    h1: "Deliver proposals where clients actually read them",
    subhead: "Most proposals die in inboxes. Telegram delivery puts the branded PDF — and the next-step CTA — in front of the client within seconds.",
    bullets: ["Instant delivery", "Open + read tracking", "Reply pings", "Branded PDF"],
    sections: [
      { title: "Proposal-to-yes time, compressed", body: "Inbox proposals average 36 hours to first read. Telegram delivery averages under 90 minutes. The faster the read, the higher the close rate." },
      { title: "Tracking without creep", body: "You see opens and replies — clients see a clean, branded document. No tracking pixels, no dark patterns." },
    ],
    faqs: [
      { q: "Does the client need a Telegram account?", a: "Only if you choose direct delivery. Otherwise, share a public Telegram link that works in any browser." },
    ],
  }),
  mk("integrations", "telegram-client-notifications", {
    title: "Telegram Client Notifications for Freelancers | HustleAI",
    description: "Send branded client notifications — milestone updates, file deliveries, approval requests — straight to Telegram.",
    h1: "Branded client notifications via Telegram",
    subhead: "Every milestone, file delivery and approval request can route through Telegram — branded, on-message and unmissable.",
    bullets: ["Per-client channels", "Branded message cards", "Approval buttons", "Mute respect"],
    sections: [
      { title: "The notification surface clients actually open", body: "Email open rates for project updates sit around 22%. Telegram lands closer to 90%. The same update, ten times the visibility." },
      { title: "Approval buttons inside chat", body: "When a milestone needs sign-off, the client taps Approve or Request Changes inside Telegram. The decision syncs back to your workspace instantly." },
    ],
    faqs: [
      { q: "Can clients opt out of Telegram notifications?", a: "Yes — they choose preferred channels at intake; HustleAI honors the choice across every workflow." },
    ],
  }),
  mk("integrations", "gmail-async-inbox-triage", {
    title: "Gmail Async Inbox Triage for Freelancers | HustleAI",
    description: "AI triages your client emails into pipelines, deliverables and follow-ups — async, before you even open Gmail.",
    h1: "Stop opening Gmail with dread",
    subhead: "HustleAI reads your inbox in the background, sorts new threads into clients, deliverables, leads and noise, and drafts replies for the high-priority ones.",
    bullets: ["Auto-categorization", "Draft replies", "Lead detection", "Async-friendly"],
    sections: [
      { title: "Inbox as workflow input, not punishment", body: "Email is unavoidable but it shouldn't be your operating system. Async triage turns Gmail into a structured input source for your workspace." },
      { title: "Drafts you actually want to send", body: "Replies are drafted in your tone, with full context from the related client record — not generic AI fluff." },
    ],
    faqs: [
      { q: "Does HustleAI read all my email?", a: "Only threads matched to known clients or lead patterns. Personal mail is never processed." },
    ],
  }),

  // ---------- FEATURES (4) ----------
  mk("features", "ai-meeting-notes-for-freelancers", {
    title: "AI Meeting Notes for Freelance Calls | HustleAI",
    description: "Auto-summarize client calls into action items, decisions and follow-ups — saved against the right client record.",
    h1: "Meeting notes that show up before you do",
    subhead: "Drop a call recording or paste a transcript. Get summarized notes, decisions, action items and follow-up drafts — saved against the right client.",
    bullets: ["Action-item extraction", "Decision log", "Follow-up drafts", "Per-client storage"],
    sections: [
      { title: "Notes are the cheapest credibility upgrade", body: "Sending a structured recap within an hour of a client call signals professionalism more than any pitch. AI notes make the recap inevitable." },
      { title: "Tied to the client, not a folder", body: "Every note is stamped with the client and project so the next conversation starts with full context — no scrolling through random docs." },
    ],
    faqs: [
      { q: "Do you record calls?", a: "No. Bring your own transcript or recording — HustleAI processes it but never joins your calls." },
    ],
  }),
  mk("features", "branded-pdf-export-engine", {
    title: "Branded PDF Export Engine for Freelancers | HustleAI",
    description: "Export every document — proposal, invoice, contract, report — as a branded PDF with your logo, fonts and palette.",
    h1: "Branded PDF exports, end to end",
    subhead: "One brand kit per workspace. Every export — proposal, invoice, contract, report, handoff — inherits your logo, fonts and palette automatically.",
    bullets: ["Workspace brand kits", "A4 + Letter ready", "Watermark options", "Public share links"],
    sections: [
      { title: "Why generic PDFs cost you", body: "Word-doc-looking deliverables make even great work feel cheap. A branded export raises perceived quality without you touching design." },
      { title: "One kit, every document", body: "Set logo, primary color, accent and font once. Every future document — across every tool — inherits it." },
    ],
    faqs: [
      { q: "Can I have multiple brand kits?", a: "Yes — Studio tier supports per-client brand kits for white-label work." },
    ],
  }),
  mk("features", "multi-currency-invoicing", {
    title: "Multi-Currency Invoicing for Freelancers | HustleAI",
    description: "Invoice in INR, USD, EUR, GBP and more. Auto-converted totals, tax-aware lines and clean exports for international clients.",
    h1: "Invoice every client in their currency",
    subhead: "Issue invoices in INR, USD, EUR, GBP and more — with auto-converted totals, region-aware tax lines and a clean PDF that works across borders.",
    bullets: ["12+ currencies", "Live FX", "GST + VAT lines", "Indian + international ready"],
    sections: [
      { title: "Built for cross-border freelance reality", body: "Most operators bill domestic and international clients on the same week. Multi-currency invoicing keeps both clean — without manual conversions." },
      { title: "Tax-aware by region", body: "Indian clients see GST lines; EU clients see VAT; US clients see clean tax-exclusive totals. The right format, every time." },
    ],
    faqs: [
      { q: "How are FX rates calculated?", a: "Live mid-market rates at the moment of issue; the rate is locked into the PDF for clarity." },
    ],
  }),
  mk("features", "freelancer-time-tracking-with-ai", {
    title: "AI Time Tracking for Freelancers | HustleAI",
    description: "Track time per client, per project — with AI that auto-categorizes entries from your activity and prepares billable summaries.",
    h1: "Time tracking that doesn't punish you",
    subhead: "Start a timer or backfill at the end of the day — HustleAI auto-categorizes entries by client and project and rolls them into billable summaries you can drop into invoices.",
    bullets: ["AI auto-categorization", "Per-client rollups", "Billable summaries", "Retainer-aware"],
    sections: [
      { title: "Tracking that survives a busy week", body: "The best time tracker is the one you actually use. AI categorization removes the friction so even messy weeks end with clean billable data." },
      { title: "From time entry to invoice line", body: "Roll a week's tracked time into a billable summary with one click — and drop the lines straight into the next invoice." },
    ],
    faqs: [
      { q: "Does it track me passively?", a: "No — entries are user-initiated. AI helps categorize what you log, never silently records you." },
    ],
  }),

  // ---------- USE CASES (2) ----------
  mk("use-cases", "web-developer-workspace", {
    title: "Workspace OS for Freelance Web Developers | HustleAI",
    description: "Manage clients, scopes, deployments and invoices from one workspace tuned for freelance and contract web developers.",
    h1: "The workspace freelance developers stop fighting",
    subhead: "Clients, scopes, deployment notes, change orders and invoices — in one workspace built for the way contract developers actually work.",
    bullets: ["Per-project scope tracking", "Change-order workflow", "Deployment notes", "Multi-currency invoices"],
    sections: [
      { title: "Built around scope, not screens", body: "Developer work lives or dies by scope discipline. The workspace centers SOWs, change orders and deployment notes — not generic kanban cards." },
      { title: "Invoices that respect your stack", body: "Bill in INR, USD or EUR. Drop tracked hours straight into invoice lines. Retainer cycles run on autopilot." },
    ],
    faqs: [
      { q: "Can I link to GitHub or Linear?", a: "Lightweight links are supported today; deeper sync is on the roadmap." },
    ],
  }),
  mk("use-cases", "marketing-consultant-os", {
    title: "Workspace OS for Marketing Consultants | HustleAI",
    description: "Run retainers, monthly reports, content calendars and deliverables for every client — from one AI-powered workspace.",
    h1: "An OS for the modern marketing consultant",
    subhead: "Retainers, monthly reports, content calendars and async deliverables — all wired into a single workspace that scales from solo consultant to small studio.",
    bullets: ["Monthly report generator", "Content calendar", "Retainer cycles", "Branded deliverables"],
    sections: [
      { title: "Monthly reports without the Sunday dread", body: "AI assembles each client's monthly report from your tracked work, content calendar and notes. You spend ten minutes editing — not three hours writing." },
      { title: "Retainer-friendly billing", body: "Recurring invoices, scope-creep detection and renewal automation keep retainer revenue predictable." },
    ],
    faqs: [
      { q: "Does this replace a reporting tool like Looker?", a: "No — it complements it. HustleAI handles the narrative; your data tools handle the dashboards." },
    ],
  }),

  // ---------- FREE TOOLS (2) ----------
  mk("free-tools", "freelance-rate-calculator", {
    title: "Free Freelance Rate Calculator — Find Your Real Hourly Rate | HustleAI",
    description: "Calculate your true freelance hourly rate based on target income, expenses, taxes and billable hours. No signup.",
    h1: "Free freelance rate calculator",
    subhead: "Plug in target income, expenses, taxes and realistic billable hours — get the hourly rate you actually need to charge.",
    bullets: ["Tax-aware math", "Billable-hour reality", "INR + USD", "No signup"],
    ctaHref: "/tools/pricing-calculator",
    ctaLabel: "Open rate calculator",
    sections: [
      { title: "Most freelancers under-price by 30–50%", body: "Hourly rates calculated against forty-hour weeks ignore the unbillable third of every week. The calculator builds that in." },
    ],
    faqs: [
      { q: "Is the calculator free?", a: "Yes — no signup, no email gate. Sign in only if you want to save scenarios." },
    ],
  }),
  mk("free-tools", "ai-cold-email-writer", {
    title: "Free AI Cold Email Writer for Freelancers — HustleAI",
    description: "Write personalized freelance cold emails with AI — short, specific, conversion-oriented. No signup required.",
    h1: "Free AI cold email writer",
    subhead: "Paste a prospect's site or LinkedIn — get a short, specific cold email in your voice, ready to send.",
    bullets: ["Personalization-first", "Short by default", "Edit before sending", "No signup"],
    ctaHref: "/tools/proposal-generator",
    ctaLabel: "Open the writer",
    sections: [
      { title: "Long cold emails don't convert", body: "The writer caps drafts under 100 words, leads with a specific observation, and ends with one low-friction ask." },
    ],
    faqs: [
      { q: "Will the same template be sent to everyone?", a: "No — each draft is generated against the specific prospect input you give it." },
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