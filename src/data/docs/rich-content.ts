/**
 * Local rich content supplement for the Docs OS.
 *
 * The base article body lives in the docs database (quaternary Supabase).
 * This file augments each page with richer, structured sections that we
 * render below the DB body — so we can ship deep "use cases / how to use /
 * tips / related" content without needing write access to that DB.
 *
 * Keyed by page slug (the article slug, NOT the category slug).
 */

export type DocsRichSection = {
  /** Short paragraph above the use-case grid. */
  pitch?: string;
  /** "What you can do with it" — concrete, outcome-led use cases. */
  useCases?: { title: string; body: string; icon?: string }[];
  /** Step-by-step "how to use it" — keep each step short and verb-led. */
  howToUse?: { step: string; detail: string }[];
  /** Quick power tips — one-liners. */
  tips?: string[];
  /** Related routes inside the app + other docs pages. */
  related?: { label: string; href: string; external?: boolean }[];
};

export const DOCS_RICH: Record<string, DocsRichSection> = {
  /* ---------------- Getting Started ---------------- */
  introduction: {
    pitch:
      "HustleAI is an end-to-end Workspace OS for solo operators, freelancers and small studios. One login, one cockpit, one billing surface — replacing 8–12 tools you'd otherwise stitch together yourself.",
    useCases: [
      { title: "Replace your tool stack", body: "CRM, invoices, proposals, intake forms, time tracking, file delivery, expenses and AI tools — all in one place.", icon: "Layers" },
      { title: "Run an AI-augmented practice", body: "Use AI Fuel for proposals, scope drafts, client replies, brand kits, blog drafts, lead summaries and more.", icon: "Sparkles" },
      { title: "Look enterprise-grade as a solo", body: "Branded client portals, polished invoices, signed proposals, structured intake — without hiring ops.", icon: "Building2" },
      { title: "Stay in flow", body: "Adaptive cockpit hides modules you don't use today and surfaces the one next action you should take.", icon: "Compass" },
    ],
    howToUse: [
      { step: "Sign up", detail: "Create a free account at hustlaiapp.in/signup. Email or Google sign-in." },
      { step: "Pick your cockpit", detail: "On first dashboard load, choose Freelancer / Agency / Creator / Explorer mode. The workspace restructures around it." },
      { step: "Add your first client", detail: "Open Work Hub → Clients → New. This unlocks invoices, proposals and portals for that client." },
      { step: "Send your first invoice or proposal", detail: "From the client page, hit Invoice or Proposal. Both auto-fill from CRM data." },
    ],
    tips: [
      "You can change your cockpit mode anytime from the dashboard header.",
      "Free tier ships with 50 AI Fuel credits/month — enough to try every AI tool.",
      "Press ⌘K (Cmd-K) anywhere in the app to jump to any tool.",
    ],
    related: [
      { label: "Quickstart", href: "/quickstart" },
      { label: "Workspace OS Overview", href: "/overview" },
      { label: "Plans & Pricing", href: "/plans" },
    ],
  },

  quickstart: {
    pitch: "Set up a fully working freelancer cockpit in under 10 minutes — first client, first invoice, first AI-drafted proposal.",
    useCases: [
      { title: "Onboard your first paying client", body: "Capture them via a public intake form, auto-create the CRM record, then issue an invoice in two clicks.", icon: "UserPlus" },
      { title: "Move an existing client list in", body: "Import via CSV under Work Hub → Clients → Import. Maps name, email, status, tags.", icon: "Upload" },
      { title: "Stand up a branded client portal", body: "Each client gets a public URL with their files, invoices and project status — no extra tool needed.", icon: "Globe" },
    ],
    howToUse: [
      { step: "Add a client", detail: "Work Hub → Clients → New client. Fill name + email at minimum." },
      { step: "Create the project", detail: "From the client page, click 'New project' and pick a checklist template." },
      { step: "Send a proposal", detail: "Use the Proposal Generator with the project name — AI drafts scope, deliverables, price." },
      { step: "Issue the invoice", detail: "Once they accept, hit 'Convert to invoice' on the proposal." },
      { step: "Share the portal", detail: "From client page → Share portal. Copy the public link." },
    ],
    tips: [
      "Invoice numbers auto-increment per workspace and follow your custom prefix.",
      "You can pin up to 5 favourite tools to the Work Hub home for one-tap access.",
    ],
    related: [
      { label: "Managing Clients", href: "/clients" },
      { label: "Create an Invoice", href: "/create-invoice" },
      { label: "Share a Client Portal", href: "/share-portal" },
    ],
  },

  /* ---------------- Workspace OS ---------------- */
  overview: {
    pitch: "Workspace OS is the daily cockpit. Every module — CRM, Invoices, Time, Files, Deadlines, Expenses, Comm Log, Portals — lives behind one persistent sidebar with a unified search.",
    useCases: [
      { title: "Daily standup view", body: "Open the dashboard, see today's deadlines, recent activity, and your one next action — no tab-hunting.", icon: "Activity" },
      { title: "Cross-module search", body: "Find a client, an invoice number, a file or a comm log entry from a single search.", icon: "Search" },
      { title: "Quick switching", body: "Jump between Freelancer / Agency / Creator cockpits to refocus the workspace for a different mode of work.", icon: "Repeat" },
    ],
    howToUse: [
      { step: "Pick a cockpit mode", detail: "On the dashboard, choose the mode that matches today's work." },
      { step: "Pin frequent modules", detail: "Click the star on any sidebar item to keep it always visible." },
      { step: "Use ⌘K to navigate", detail: "Press Cmd/Ctrl-K from anywhere — type a tool name or client to jump." },
    ],
    tips: [
      "Sidebar collapses on small screens automatically — your modules survive in the bottom nav.",
      "Calm mode (top nav) hides marketing strips and trims animations for deep focus.",
    ],
    related: [
      { label: "Managing Clients", href: "/clients" },
      { label: "What is AI Fuel?", href: "/what-is-ai-fuel" },
    ],
  },

  /* ---------------- CRM ---------------- */
  clients: {
    pitch: "A lightweight CRM purpose-built for solo operators — clients, projects, comm log, files and money flow against the same record.",
    useCases: [
      { title: "Single source of client truth", body: "Contact info, project history, invoices, time logged and files delivered all sit on one client page.", icon: "User" },
      { title: "Pipeline tracking", body: "Tag clients as Lead / Active / Paused / Won / Lost — filter the list to see exactly where each relationship sits.", icon: "Filter" },
      { title: "Recurring retainers", body: "Mark a client as Retainer to auto-generate monthly invoices on the day of your choosing.", icon: "Repeat" },
      { title: "Client comm history", body: "Log every call, email and meeting — no more 'what did we agree on last month?'", icon: "MessageSquare" },
    ],
    howToUse: [
      { step: "Add a client", detail: "Work Hub → Clients → New client." },
      { step: "Tag them", detail: "Use status + custom tags so your filters do the sorting for you." },
      { step: "Attach a project", detail: "Each piece of work is its own project under the client — keeps invoices/files clean." },
      { step: "Log every interaction", detail: "Use the Comm Log on the client page after every call/email." },
    ],
    tips: [
      "Bulk import via CSV from Work Hub → Clients → Import.",
      "Elite tier unlocks Comm Log filtering by sentiment + auto-summary.",
    ],
    related: [
      { label: "Create an Invoice", href: "/create-invoice" },
      { label: "Share a Client Portal", href: "/share-portal" },
      { label: "Public Intake Forms", href: "/public-forms" },
    ],
  },

  /* ---------------- Invoices ---------------- */
  "create-invoice": {
    pitch: "Send branded, GST-ready invoices in seconds — line items, taxes, discounts, partial payments and PDF export, all auto-numbered per workspace.",
    useCases: [
      { title: "One-off project invoice", body: "Bill for a single piece of work with itemised deliverables.", icon: "Receipt" },
      { title: "Retainer invoice", body: "Schedule monthly auto-generated invoices for ongoing clients.", icon: "Calendar" },
      { title: "Milestone billing", body: "Split a large project into 30/40/30 milestones, each its own invoice.", icon: "Milestone" },
      { title: "International billing", body: "Switch currency per invoice — INR, USD, EUR, GBP and 12 more.", icon: "Globe" },
    ],
    howToUse: [
      { step: "Open the client page", detail: "Work Hub → Clients → pick the client." },
      { step: "Click 'New invoice'", detail: "Defaults to your workspace currency + tax profile." },
      { step: "Add line items", detail: "Type description, qty, rate. Tax + discount auto-apply." },
      { step: "Send or download", detail: "Email the PDF directly, or copy a public payment link." },
      { step: "Mark paid", detail: "When payment lands, hit 'Record payment' — supports partials." },
    ],
    tips: [
      "Invoice numbers follow a structured prefix (e.g. HAI-2026-0001) — you can override per workspace.",
      "Use Profile → Billing tab to view all invoices issued by HustleAI to you.",
      "Pro+ tier unlocks branded invoice themes and a custom 'pay via UPI' QR.",
    ],
    related: [
      { label: "How the Proposal Generator works", href: "/how-it-works" },
      { label: "Plans & Pricing", href: "/plans" },
    ],
  },

  /* ---------------- AI Fuel ---------------- */
  "what-is-ai-fuel": {
    pitch: "AI Fuel is the credit system that powers every AI feature in HustleAI. One credit ≈ one short AI request. No API keys, no token math — just a single meter you can top up or refill monthly.",
    useCases: [
      { title: "Draft a proposal", body: "≈ 5 fuel — generates scope, deliverables, timeline and price for any project.", icon: "FileText" },
      { title: "Generate a brand kit", body: "≈ 8 fuel — palette, fonts, voice and 5 logo concepts from a single brief.", icon: "Palette" },
      { title: "Write a blog post", body: "≈ 6 fuel — long-form draft tuned to your niche and tone.", icon: "PenTool" },
      { title: "Summarise a lead", body: "≈ 1 fuel — one-paragraph qualifier from any URL or pitch text.", icon: "ScanText" },
      { title: "Roadmap a side hustle", body: "≈ 10 fuel — 30/60/90-day playbook with KPIs and weekly tasks.", icon: "Map" },
    ],
    howToUse: [
      { step: "Check your balance", detail: "Top-right of the dashboard — the fuel pill shows credits remaining." },
      { step: "Use any AI tool", detail: "Each tool tells you the fuel cost before you confirm." },
      { step: "Top up or upgrade", detail: "Buy fuel packs (₹100 / ₹200 / ₹500 / ₹1000) or upgrade your plan for monthly refill." },
    ],
    tips: [
      "Every plan refills fuel monthly — Pro 500, Elite 2 000, Infinity 10 000.",
      "Bring your own AI keys (BYO mode) to bypass the fuel meter entirely on Elite+ tier.",
      "Fuel rolls over for one month before expiring.",
    ],
    related: [
      { label: "Plans & Pricing", href: "/plans" },
      { label: "Set up your own AI keys", href: "/setup" },
    ],
  },

  /* ---------------- Proposal Generator ---------------- */
  "how-it-works": {
    pitch: "Turn a one-line brief into a polished, signable proposal — with scope, deliverables, timeline, price and your branding — in under 60 seconds.",
    useCases: [
      { title: "Cold pitch fast", body: "Drop a job ad URL or paste the brief — get a proposal you can send in minutes.", icon: "Zap" },
      { title: "Standardise your offers", body: "Save proposal templates per service line so every quote stays on-brand.", icon: "BookmarkCheck" },
      { title: "Win-back campaign", body: "Re-pitch dormant clients with a new scope based on their old project history.", icon: "RotateCcw" },
    ],
    howToUse: [
      { step: "Open Proposal Generator", detail: "Sidebar → AI Tools → Proposal Generator." },
      { step: "Drop your brief", detail: "Paste a URL, JD or short description. Pick a tone (formal / friendly / bold)." },
      { step: "Edit inline", detail: "Tweak scope, swap deliverables, change pricing — every block is editable." },
      { step: "Send for sign", detail: "Hit Send — client gets a public link with accept/reject buttons." },
      { step: "Convert to invoice", detail: "When accepted, one click turns the proposal into an invoice." },
    ],
    tips: [
      "Save your most common service blocks under Templates so AI re-uses them.",
      "All sent proposals live under Work Hub → Proposals with view-tracking.",
    ],
    related: [
      { label: "Create an Invoice", href: "/create-invoice" },
      { label: "What is AI Fuel?", href: "/what-is-ai-fuel" },
    ],
  },

  /* ---------------- Intake OS ---------------- */
  "public-forms": {
    pitch: "Build branded public intake forms that capture lead info + project brief, then auto-create the CRM record and (optionally) AI-summarise the lead.",
    useCases: [
      { title: "New client onboarding", body: "Embed the form on your portfolio site — every submission becomes a tagged lead in CRM.", icon: "UserPlus" },
      { title: "Service-specific brief", body: "Per-service form (logo brief, web brief, retainer brief) so you stop chasing requirements.", icon: "ClipboardList" },
      { title: "Lead qualification", body: "AI scores each submission Hot / Warm / Cold based on budget, timeline and fit.", icon: "Filter" },
    ],
    howToUse: [
      { step: "Open Intake OS", detail: "Sidebar → AI Tools → Intake Form." },
      { step: "Compose fields", detail: "Drag in name, email, budget, timeline, files, custom questions." },
      { step: "Style + brand", detail: "Add your logo, colours and a thank-you message." },
      { step: "Publish + share", detail: "Get a hustlaiapp.in/intake/<your-slug> link — embed or share as-is." },
      { step: "Review submissions", detail: "Each one shows in CRM with the AI summary attached." },
    ],
    tips: [
      "Intake OS lives entirely on its own database — submissions are isolated from your main workspace.",
      "Use conditional logic (Pro+) to show fields only when relevant.",
    ],
    related: [
      { label: "Managing Clients", href: "/clients" },
      { label: "Share a Client Portal", href: "/share-portal" },
    ],
  },

  /* ---------------- Client Portals ---------------- */
  "share-portal": {
    pitch: "Each client gets a private, branded portal with their projects, invoices, files and status updates — no login required, no extra tool to pay for.",
    useCases: [
      { title: "Single source for the client", body: "Replace the 14-email-thread mess with one URL they can bookmark.", icon: "Link2" },
      { title: "File delivery", body: "Drop final files into the portal — versioned, watermarked optional, downloadable.", icon: "FolderOpen" },
      { title: "Invoice + payment", body: "Pending invoices appear on the portal with pay-now buttons.", icon: "CreditCard" },
      { title: "Status transparency", body: "Update the project status and the client sees it instantly — fewer 'any update?' pings.", icon: "Activity" },
    ],
    howToUse: [
      { step: "Open the client", detail: "Work Hub → Clients → pick the client." },
      { step: "Click 'Share portal'", detail: "Generates a public token-protected URL." },
      { step: "Configure visibility", detail: "Toggle which projects/files/invoices appear." },
      { step: "Send the link", detail: "Email it or copy to chat — client opens, no signup." },
    ],
    tips: [
      "You can revoke a portal link at any time from the client page.",
      "Elite+ tier unlocks custom-domain portals (portal.yourbrand.com).",
    ],
    related: [
      { label: "Managing Clients", href: "/clients" },
      { label: "Create an Invoice", href: "/create-invoice" },
    ],
  },

  /* ---------------- Billing & Plans ---------------- */
  plans: {
    pitch: "Four tiers (Free → Pro → Elite → Infinity) plus a pay-as-you-go AI fuel wallet. No per-seat pricing — every plan is per-workspace.",
    useCases: [
      { title: "Free", body: "Full Workspace OS, 50 AI fuel/month, 1 client portal — perfect to try.", icon: "Gift" },
      { title: "Pro (₹499/mo)", body: "500 AI fuel, unlimited portals, branded invoices, 5 intake forms.", icon: "Rocket" },
      { title: "Elite (₹1 499/mo)", body: "2 000 AI fuel, BYO AI keys, custom-domain portals, marketplace selling.", icon: "Crown" },
      { title: "Infinity (₹4 999/mo)", body: "10 000 AI fuel, all premium tools + courses + groups + templates vault.", icon: "Infinity" },
    ],
    howToUse: [
      { step: "Pick a plan", detail: "hustlaiapp.in/plans — compare side-by-side." },
      { step: "Pay via Cashfree / Dodo", detail: "UPI, cards, wallets and net-banking supported." },
      { step: "Upgrade or downgrade anytime", detail: "Pro-rated. Plan changes apply on next billing cycle." },
    ],
    tips: [
      "Yearly billing saves ~20%.",
      "All digital plans are non-refundable — try Free first.",
      "Wallet top-ups (₹100/200/500/1000) never expire and stack on top of monthly fuel.",
    ],
    related: [
      { label: "What is AI Fuel?", href: "/what-is-ai-fuel" },
      { label: "Common Questions", href: "/common-questions" },
    ],
  },

  /* ---------------- BYO AI Keys ---------------- */
  setup: {
    pitch: "On Elite+ plans you can bring your own Gemini, OpenAI, Anthropic or Groq keys — every AI request runs on your key, bypassing the fuel meter entirely.",
    useCases: [
      { title: "Unlimited AI for power users", body: "If you're hitting the fuel cap monthly, BYO keys removes the ceiling.", icon: "Infinity" },
      { title: "Compliance / data residency", body: "Some clients require data to stay on your account — BYO keeps it that way.", icon: "Shield" },
      { title: "Pick the model", body: "Default model per tool can be overridden — use Gemini Flash for cheap, GPT-5 for hardest tasks.", icon: "Cpu" },
    ],
    howToUse: [
      { step: "Open Settings → AI Keys", detail: "Visible only on Elite+ plans." },
      { step: "Paste each provider key", detail: "Keys are encrypted at rest, never exposed client-side." },
      { step: "Pick your default model", detail: "Per-tool overrides available too." },
      { step: "Toggle 'Use my keys'", detail: "From this point forward, AI requests skip the fuel meter." },
    ],
    tips: [
      "Your keys never leave the secure secrets store. We never log full keys.",
      "You can revert to fuel mode anytime — toggle off, fuel meter resumes.",
    ],
    related: [
      { label: "What is AI Fuel?", href: "/what-is-ai-fuel" },
      { label: "Plans & Pricing", href: "/plans" },
    ],
  },

  /* ---------------- FAQ ---------------- */
  "common-questions": {
    pitch: "Quick answers to the questions we get most often. If you can't find yours here, ping support.",
    useCases: [
      { title: "Is HustleAI free?", body: "Yes — the Free tier has the full Workspace OS plus 50 AI fuel/month. No card required.", icon: "Gift" },
      { title: "Do you store my client data?", body: "Yes, encrypted. You can export or delete it anytime from Settings → Data.", icon: "Shield" },
      { title: "Can I cancel anytime?", body: "Yes. Plans cancel at end of billing period; data stays in Free mode after.", icon: "X" },
      { title: "Refunds?", body: "Digital plans are non-refundable. Try Free first to validate fit.", icon: "Ban" },
      { title: "Do you support international payments?", body: "Yes — Cashfree handles INR, Dodo handles cards globally.", icon: "Globe" },
      { title: "Is there an API?", body: "Public API is in private beta — see Docs → API for the early-access form.", icon: "Code2" },
    ],
    related: [
      { label: "Plans & Pricing", href: "/plans" },
      { label: "Introduction", href: "/introduction" },
    ],
  },
};

/** Per-category visual styling for the Docs home tiles. */
export const CATEGORY_STYLE: Record<
  string,
  { gradient: string; ring: string; chip: string; tagline: string }
> = {
  "getting-started":   { gradient: "from-emerald-500/15 via-teal-500/10 to-cyan-500/5",  ring: "ring-emerald-400/30",  chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",   tagline: "Land in 10 minutes" },
  "workspace-os":      { gradient: "from-violet-500/15 via-fuchsia-500/10 to-purple-500/5", ring: "ring-violet-400/30", chip: "bg-violet-500/10 text-violet-700 dark:text-violet-300",     tagline: "Your daily cockpit" },
  "crm":               { gradient: "from-sky-500/15 via-blue-500/10 to-indigo-500/5",    ring: "ring-sky-400/30",      chip: "bg-sky-500/10 text-sky-700 dark:text-sky-300",               tagline: "Clients, the right way" },
  "invoices":          { gradient: "from-amber-500/15 via-orange-500/10 to-yellow-500/5", ring: "ring-amber-400/30",   chip: "bg-amber-500/10 text-amber-700 dark:text-amber-300",         tagline: "Get paid, branded" },
  "ai-fuel":           { gradient: "from-rose-500/15 via-pink-500/10 to-red-500/5",       ring: "ring-rose-400/30",    chip: "bg-rose-500/10 text-rose-700 dark:text-rose-300",            tagline: "One credit. Every AI." },
  "proposal-generator":{ gradient: "from-indigo-500/15 via-violet-500/10 to-blue-500/5",  ring: "ring-indigo-400/30",  chip: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",      tagline: "Brief → signable doc" },
  "intake-os":         { gradient: "from-teal-500/15 via-emerald-500/10 to-green-500/5",  ring: "ring-teal-400/30",    chip: "bg-teal-500/10 text-teal-700 dark:text-teal-300",            tagline: "Capture every lead" },
  "client-portals":    { gradient: "from-cyan-500/15 via-sky-500/10 to-blue-500/5",       ring: "ring-cyan-400/30",    chip: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",            tagline: "Branded client surface" },
  "billing-plans":     { gradient: "from-yellow-500/15 via-amber-500/10 to-orange-500/5", ring: "ring-yellow-400/30",  chip: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",      tagline: "Pricing, plans, wallet" },
  "byo-ai-keys":       { gradient: "from-purple-500/15 via-violet-500/10 to-fuchsia-500/5", ring: "ring-purple-400/30",chip: "bg-purple-500/10 text-purple-700 dark:text-purple-300",     tagline: "Bring your own model" },
  "faq":               { gradient: "from-slate-500/15 via-zinc-500/10 to-stone-500/5",    ring: "ring-slate-400/30",   chip: "bg-slate-500/10 text-slate-700 dark:text-slate-300",         tagline: "Quick answers" },
};

/**
 * The recommended journey through the docs — used to render connector arrows
 * in DocsHome. List of category slugs in walkthrough order.
 */
export const DOCS_JOURNEY: string[] = [
  "getting-started",
  "workspace-os",
  "crm",
  "intake-os",
  "proposal-generator",
  "invoices",
  "client-portals",
  "ai-fuel",
  "byo-ai-keys",
  "billing-plans",
  "faq",
];