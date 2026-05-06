// Deterministic Roadmap Engine — the "operational brain" of Workspace OS.
// Pure TS. No AI calls here. Inputs come from a lightweight AI classifier,
// outputs are fully rule-driven so behaviour is predictable and free.

export type ProjectType =
  | "website" | "ecommerce" | "branding" | "design"
  | "content" | "video" | "social_media" | "seo"
  | "app_mobile" | "app_web" | "automation" | "consulting"
  | "marketing" | "ads" | "writing" | "other";

export type WorkflowType = "one_off" | "milestone" | "retainer" | "hourly";
export type ClientCategory = "individual" | "smb" | "startup" | "agency" | "enterprise";
export type Urgency = "low" | "normal" | "high" | "rush";
export type BudgetTier = "micro" | "small" | "mid" | "large" | "enterprise";

export type Classification = {
  project_type: ProjectType;
  workflow_type: WorkflowType;
  client_category: ClientCategory;
  urgency: Urgency;
  budget_tier: BudgetTier;
  deliverables: string[];
  estimated_weeks: number;
  signals: string[];
};

export type Phase = {
  id: string;
  title: string;
  week: string;
  goal: string;
  milestones: string[];
  doc_suggestions: string[];
  tool_suggestions: string[];
};

export type ToolRec = { id: string; label: string; href: string; reason: string };
export type DocRec = { id: string; label: string; reason: string };
export type ReminderRec = { title: string; days_from_now: number; kind: string };
export type ActionRec = { title: string; href?: string; kind: "doc" | "tool" | "comm" | "task" };

export type Roadmap = {
  classification: Classification;
  phases: Phase[];
  recommended_tools: ToolRec[];
  recommended_docs: DocRec[];
  suggested_reminders: ReminderRec[];
  next_actions: ActionRec[];
};

// ---------- Phase templates per project type ----------
const TEMPLATES: Record<ProjectType, Omit<Phase, "id">[]> = {
  website: [
    { title: "Discovery & brief lock-in", week: "Week 1", goal: "Lock requirements & scope.",
      milestones: ["Kickoff call", "Confirm pages/sections", "Approve sitemap"],
      doc_suggestions: ["quotation", "agreement"], tool_suggestions: ["clients", "checklists"] },
    { title: "Design", week: "Week 2", goal: "Approved visual direction.",
      milestones: ["Moodboard", "Hi-fi mockups", "Client signoff"],
      doc_suggestions: [], tool_suggestions: ["files", "comm"] },
    { title: "Development", week: "Week 3-4", goal: "Build the site.",
      milestones: ["Page builds", "Responsive QA", "Content load"],
      doc_suggestions: [], tool_suggestions: ["time", "deadlines"] },
    { title: "Launch & handover", week: "Week 5", goal: "Go live + invoice.",
      milestones: ["DNS go-live", "Final invoice sent", "Handover doc"],
      doc_suggestions: ["invoice"], tool_suggestions: ["invoices", "portals"] },
  ],
  ecommerce: [
    { title: "Store strategy", week: "Week 1", goal: "Lock catalog, payments, shipping.",
      milestones: ["Product list", "Payment gateway choice", "Shipping zones"],
      doc_suggestions: ["proposal", "quotation"], tool_suggestions: ["clients"] },
    { title: "Theme & catalog setup", week: "Week 2-3", goal: "Storefront ready.",
      milestones: ["Theme install", "Product upload", "Checkout test"],
      doc_suggestions: [], tool_suggestions: ["files", "checklists"] },
    { title: "Apps & automations", week: "Week 4", goal: "Email, abandoned cart, reviews.",
      milestones: ["Klaviyo flows", "Reviews app", "Analytics"],
      doc_suggestions: [], tool_suggestions: ["comm"] },
    { title: "Launch + 2-week support", week: "Week 5-7", goal: "Go live & stabilize.",
      milestones: ["Soft launch", "Bug sweep", "Final invoice"],
      doc_suggestions: ["invoice"], tool_suggestions: ["invoices", "portals"] },
  ],
  branding: [
    { title: "Brand discovery", week: "Week 1", goal: "Understand audience & positioning.",
      milestones: ["Brand questionnaire", "Competitor scan", "Direction approved"],
      doc_suggestions: ["quotation", "agreement"], tool_suggestions: ["clients"] },
    { title: "Logo & system", week: "Week 2-3", goal: "Approved identity system.",
      milestones: ["3 logo concepts", "Refinement", "Final logo + variants"],
      doc_suggestions: [], tool_suggestions: ["files"] },
    { title: "Brand guidelines + assets", week: "Week 4", goal: "Deliverable handover.",
      milestones: ["Style guide", "Social kit", "Final invoice"],
      doc_suggestions: ["invoice"], tool_suggestions: ["invoices"] },
  ],
  design: [
    { title: "Brief & references", week: "Week 1", goal: "Aligned on style.",
      milestones: ["Brief approved", "References agreed"],
      doc_suggestions: ["quotation"], tool_suggestions: ["clients"] },
    { title: "Design rounds", week: "Week 2", goal: "Final design approved.",
      milestones: ["Concept v1", "Revisions", "Final approval"],
      doc_suggestions: [], tool_suggestions: ["files"] },
    { title: "Handover", week: "Week 3", goal: "Files delivered, paid.",
      milestones: ["Final files", "Invoice sent", "Testimonial ask"],
      doc_suggestions: ["invoice"], tool_suggestions: ["invoices"] },
  ],
  content: [
    { title: "Content strategy", week: "Week 1", goal: "Topics + tone locked.",
      milestones: ["Audience profile", "Topic list", "Editorial calendar"],
      doc_suggestions: ["proposal"], tool_suggestions: ["clients", "checklists"] },
    { title: "Production batch 1", week: "Week 2-3", goal: "First batch published.",
      milestones: ["Drafts", "Approvals", "Publish"],
      doc_suggestions: [], tool_suggestions: ["time", "deadlines"] },
    { title: "Reporting + retainer pitch", week: "Week 4", goal: "Show ROI & extend.",
      milestones: ["Performance report", "Retainer pitch"],
      doc_suggestions: ["invoice", "proposal"], tool_suggestions: ["invoices"] },
  ],
  video: [
    { title: "Pre-production", week: "Week 1", goal: "Script + storyboard locked.",
      milestones: ["Script approved", "Shot list"],
      doc_suggestions: ["quotation", "agreement"], tool_suggestions: ["clients"] },
    { title: "Production", week: "Week 2", goal: "All footage captured.",
      milestones: ["Shoot day", "Asset upload"],
      doc_suggestions: [], tool_suggestions: ["files"] },
    { title: "Edit & delivery", week: "Week 3-4", goal: "Final cut delivered.",
      milestones: ["V1 edit", "Revisions", "Final delivery"],
      doc_suggestions: ["invoice"], tool_suggestions: ["invoices"] },
  ],
  social_media: [
    { title: "Audit & plan", week: "Week 1", goal: "30-day calendar approved.",
      milestones: ["Audit", "Calendar v1"], doc_suggestions: ["proposal"], tool_suggestions: ["clients"] },
    { title: "Content sprint", week: "Week 2", goal: "Batch produced.",
      milestones: ["Posts", "Reels"], doc_suggestions: [], tool_suggestions: ["files", "time"] },
    { title: "Publish + report", week: "Week 3-4", goal: "Live + insights.",
      milestones: ["Schedule", "Mid-month report", "Invoice"],
      doc_suggestions: ["invoice"], tool_suggestions: ["invoices", "comm"] },
  ],
  seo: [
    { title: "Audit", week: "Week 1", goal: "Tech + content audit done.",
      milestones: ["Technical audit", "Keyword map"],
      doc_suggestions: ["proposal"], tool_suggestions: ["clients"] },
    { title: "Implementation", week: "Week 2-4", goal: "Fixes shipped.",
      milestones: ["Tech fixes", "On-page", "Internal links"],
      doc_suggestions: [], tool_suggestions: ["checklists", "deadlines"] },
    { title: "Reporting", week: "Week 5+", goal: "Track + retain.",
      milestones: ["Monthly report", "Retainer pitch"],
      doc_suggestions: ["invoice"], tool_suggestions: ["invoices"] },
  ],
  app_mobile: [
    { title: "Spec & wireframes", week: "Week 1-2", goal: "Spec locked.",
      milestones: ["User stories", "Wireframes", "Tech stack"],
      doc_suggestions: ["proposal", "agreement"], tool_suggestions: ["clients"] },
    { title: "MVP build", week: "Week 3-6", goal: "MVP demo-able.",
      milestones: ["Auth", "Core flow", "Backend"], doc_suggestions: [], tool_suggestions: ["time", "checklists"] },
    { title: "QA & store submission", week: "Week 7-8", goal: "Live in store.",
      milestones: ["Beta", "Bug sweep", "Submit"],
      doc_suggestions: ["invoice"], tool_suggestions: ["invoices"] },
  ],
  app_web: [
    { title: "Discovery & spec", week: "Week 1-2", goal: "Spec & scope locked.",
      milestones: ["User stories", "Wireframes"], doc_suggestions: ["proposal", "agreement"], tool_suggestions: ["clients"] },
    { title: "MVP build", week: "Week 3-6", goal: "Working MVP.",
      milestones: ["Schema", "Core flows", "Auth"], doc_suggestions: [], tool_suggestions: ["time", "checklists"] },
    { title: "Launch", week: "Week 7-8", goal: "Live + handover.",
      milestones: ["UAT", "Deploy", "Handover docs"], doc_suggestions: ["invoice"], tool_suggestions: ["invoices", "portals"] },
  ],
  automation: [
    { title: "Process map", week: "Week 1", goal: "Current vs future state.",
      milestones: ["Process audit", "Tool stack"], doc_suggestions: ["proposal"], tool_suggestions: ["clients"] },
    { title: "Build & test", week: "Week 2-3", goal: "Working automation.",
      milestones: ["Build flows", "End-to-end test"], doc_suggestions: [], tool_suggestions: ["files"] },
    { title: "Handover", week: "Week 4", goal: "Docs + invoice.",
      milestones: ["SOP doc", "Invoice"], doc_suggestions: ["invoice"], tool_suggestions: ["invoices"] },
  ],
  consulting: [
    { title: "Discovery", week: "Week 1", goal: "Aligned objectives.",
      milestones: ["Stakeholder interviews", "Scope memo"],
      doc_suggestions: ["proposal", "agreement"], tool_suggestions: ["clients"] },
    { title: "Analysis & recommendations", week: "Week 2-3", goal: "Recommendations doc.",
      milestones: ["Findings", "Recommendations"], doc_suggestions: [], tool_suggestions: ["notes"] },
    { title: "Presentation & next steps", week: "Week 4", goal: "Decision made.",
      milestones: ["Final readout", "Invoice"], doc_suggestions: ["invoice"], tool_suggestions: ["invoices"] },
  ],
  marketing: [
    { title: "Strategy", week: "Week 1", goal: "Plan approved.",
      milestones: ["GTM plan", "KPIs"], doc_suggestions: ["proposal"], tool_suggestions: ["clients"] },
    { title: "Execution", week: "Week 2-4", goal: "Campaigns live.",
      milestones: ["Assets", "Launch", "Optimize"], doc_suggestions: [], tool_suggestions: ["files", "time"] },
    { title: "Report & extend", week: "Week 5", goal: "Show results.",
      milestones: ["Report", "Renewal pitch"], doc_suggestions: ["invoice"], tool_suggestions: ["invoices"] },
  ],
  ads: [
    { title: "Account setup & creative", week: "Week 1", goal: "Live in 7 days.",
      milestones: ["Pixel", "Audiences", "Creatives"], doc_suggestions: ["agreement"], tool_suggestions: ["clients"] },
    { title: "Optimize", week: "Week 2-4", goal: "Hit CPA target.",
      milestones: ["A/B tests", "Scale winners"], doc_suggestions: [], tool_suggestions: ["time"] },
    { title: "Monthly report", week: "Week 5", goal: "Renew.",
      milestones: ["Report", "Invoice"], doc_suggestions: ["invoice"], tool_suggestions: ["invoices"] },
  ],
  writing: [
    { title: "Brief", week: "Week 1", goal: "Outline approved.",
      milestones: ["Brief", "Outline"], doc_suggestions: ["quotation"], tool_suggestions: ["clients"] },
    { title: "Drafts & revisions", week: "Week 2", goal: "Approved final.",
      milestones: ["Draft v1", "Revisions"], doc_suggestions: [], tool_suggestions: ["files"] },
    { title: "Delivery", week: "Week 3", goal: "Paid.",
      milestones: ["Final delivery", "Invoice"], doc_suggestions: ["invoice"], tool_suggestions: ["invoices"] },
  ],
  other: [
    { title: "Discovery", week: "Week 1", goal: "Scope locked.",
      milestones: ["Brief", "Scope memo"], doc_suggestions: ["quotation", "agreement"], tool_suggestions: ["clients"] },
    { title: "Execution", week: "Week 2-3", goal: "Deliverable produced.",
      milestones: ["Build", "Review"], doc_suggestions: [], tool_suggestions: ["time", "files"] },
    { title: "Delivery & invoice", week: "Week 4", goal: "Paid + handover.",
      milestones: ["Final delivery", "Invoice"], doc_suggestions: ["invoice"], tool_suggestions: ["invoices"] },
  ],
};

// ---------- Tool & doc registries ----------
const TOOL_REGISTRY: Record<string, { label: string; href: string; reason: string }> = {
  clients:    { label: "Clients (CRM)",   href: "/work/clients",    reason: "Track this client's contact + status." },
  invoices:   { label: "Invoices",        href: "/work/invoices",   reason: "Send invoices for milestones." },
  time:       { label: "Time Tracker",    href: "/work/time",       reason: "Log billable hours." },
  checklists: { label: "Checklists",      href: "/work/checklists", reason: "Run repeatable workflows." },
  files:      { label: "Files",           href: "/work/files",      reason: "Centralize project files." },
  deadlines:  { label: "Deadlines",       href: "/work/deadlines",  reason: "Never miss a milestone." },
  comm:       { label: "Comm Log",        href: "/work/comm",       reason: "Log every client touchpoint." },
  portals:    { label: "Client Portals",  href: "/work/portals",    reason: "Give the client a clean view." },
  notes:      { label: "Notes",           href: "/work/notes",      reason: "Keep meeting notes & decisions." },
  expenses:   { label: "Expenses",        href: "/work/expenses",   reason: "Track project costs." },
  analytics:  { label: "Analytics",       href: "/work/analytics",  reason: "Measure profit per project." },
};

const DOC_LABELS: Record<string, string> = {
  quotation: "Quotation",
  agreement: "Service agreement",
  invoice:   "Invoice",
  proposal:  "Proposal",
};

const DOC_REASONS: Record<string, string> = {
  quotation: "Lock the price before kickoff.",
  agreement: "Protect scope, payments & IP.",
  invoice:   "Get paid on milestones.",
  proposal:  "Win the project with a structured pitch.",
};

// ---------- Lightweight keyword classifier (fallback when AI not used) ----------
const TYPE_KEYWORDS: { type: ProjectType; words: string[] }[] = [
  { type: "ecommerce",     words: ["shopify", "woocommerce", "ecommerce", "store", "checkout", "d2c"] },
  { type: "website",       words: ["website", "landing page", "wordpress", "webflow", "5-page", "site"] },
  { type: "branding",      words: ["brand", "logo", "identity", "rebrand"] },
  { type: "design",        words: ["design", "ui", "figma", "mockup", "graphic"] },
  { type: "video",         words: ["video", "edit", "reel", "youtube edit", "shoot", "footage"] },
  { type: "content",       words: ["blog", "article", "content", "newsletter", "copywriting"] },
  { type: "social_media",  words: ["instagram", "social media", "smm", "tiktok"] },
  { type: "seo",           words: ["seo", "ranking", "backlink", "search optimization"] },
  { type: "app_mobile",    words: ["mobile app", "ios", "android", "flutter", "react native"] },
  { type: "app_web",       words: ["web app", "saas", "dashboard", "platform", "internal tool"] },
  { type: "automation",    words: ["automation", "zapier", "make.com", "n8n", "workflow automation"] },
  { type: "consulting",    words: ["consulting", "advisory", "strategy session", "audit"] },
  { type: "ads",           words: ["meta ads", "google ads", "ppc", "paid social", "facebook ads"] },
  { type: "marketing",     words: ["marketing", "growth", "campaign", "go-to-market"] },
  { type: "writing",       words: ["copy", "writing", "ghostwrit", "script writing"] },
];

export function classifyHeuristic(input: string, brief?: any): Classification {
  const t = (input || "").toLowerCase();
  let project_type: ProjectType = "other";
  for (const k of TYPE_KEYWORDS) {
    if (k.words.some(w => t.includes(w))) { project_type = k.type; break; }
  }
  const urgency: Urgency =
    /\b(urgent|asap|rush|tomorrow|this week)\b/.test(t) ? "rush" :
    /\b(soon|next week|2 weeks)\b/.test(t) ? "high" : "normal";

  const workflow_type: WorkflowType =
    /\b(retainer|monthly|ongoing|month)\b/.test(t) ? "retainer" :
    /\b(hour|hourly|per hour)\b/.test(t) ? "hourly" :
    /\b(milestone|phase|sprint)\b/.test(t) ? "milestone" : "one_off";

  const client_category: ClientCategory =
    /\b(agency|studio)\b/.test(t) ? "agency" :
    /\b(startup|founder|seed)\b/.test(t) ? "startup" :
    /\b(enterprise|corporate)\b/.test(t) ? "enterprise" :
    /\b(brand|company|business|d2c|smb|sme)\b/.test(t) ? "smb" : "individual";

  const amount = Number(brief?.pricing?.amount) || 0;
  const budget_tier: BudgetTier =
    amount >= 500000 ? "enterprise" :
    amount >= 200000 ? "large" :
    amount >= 75000 ? "mid" :
    amount >= 20000 ? "small" : "micro";

  return {
    project_type, workflow_type, client_category, urgency, budget_tier,
    deliverables: brief?.deliverables || [],
    estimated_weeks: defaultWeeks(project_type),
    signals: [],
  };
}

function defaultWeeks(t: ProjectType) {
  switch (t) {
    case "app_mobile": case "app_web": return 8;
    case "ecommerce": return 6;
    case "branding": case "marketing": case "seo": return 5;
    case "video": case "content": case "social_media": case "automation": return 4;
    default: return 4;
  }
}

// ---------- Roadmap builder ----------
export function buildRoadmap(c: Classification): Roadmap {
  const tpl = TEMPLATES[c.project_type] || TEMPLATES.other;

  const phases: Phase[] = tpl.map((p, i) => ({
    id: `phase_${i + 1}`,
    ...p,
  }));

  // Aggregate tool & doc recommendations from all phases
  const toolIds = new Set<string>();
  const docIds = new Set<string>();
  phases.forEach(p => {
    p.tool_suggestions.forEach(t => toolIds.add(t));
    p.doc_suggestions.forEach(d => docIds.add(d));
  });

  // Workflow-driven additions
  if (c.workflow_type === "retainer") { toolIds.add("analytics"); docIds.add("agreement"); }
  if (c.workflow_type === "hourly") toolIds.add("time");
  if (c.budget_tier === "large" || c.budget_tier === "enterprise") {
    docIds.add("agreement"); docIds.add("proposal");
  }
  if (c.client_category === "agency" || c.client_category === "enterprise") docIds.add("agreement");

  const recommended_tools: ToolRec[] = [...toolIds].map(id => ({
    id, ...TOOL_REGISTRY[id], reason: TOOL_REGISTRY[id]?.reason || "Useful for this workflow.",
  })).filter(t => t.label);

  const recommended_docs: DocRec[] = [...docIds].map(id => ({
    id, label: DOC_LABELS[id] || id, reason: DOC_REASONS[id] || "",
  }));

  // Reminders driven by urgency + workflow
  const suggested_reminders: ReminderRec[] = [
    { title: "Send kickoff email & confirm scope", days_from_now: 1, kind: "comm" },
    { title: "Mid-project check-in with client",   days_from_now: Math.max(3, Math.floor(c.estimated_weeks * 7 / 2)), kind: "comm" },
    { title: "Send final invoice",                  days_from_now: c.estimated_weeks * 7, kind: "billing" },
  ];
  if (c.workflow_type === "retainer") {
    suggested_reminders.push({ title: "Monthly performance report", days_from_now: 30, kind: "report" });
  }
  if (c.urgency === "rush") {
    suggested_reminders.unshift({ title: "Daily standup ping", days_from_now: 1, kind: "comm" });
  }

  // Concrete next actions
  const next_actions: ActionRec[] = [];
  if (docIds.has("quotation")) next_actions.push({ title: "Generate quotation", href: "#docs", kind: "doc" });
  if (docIds.has("agreement")) next_actions.push({ title: "Generate service agreement", href: "#docs", kind: "doc" });
  if (docIds.has("proposal"))  next_actions.push({ title: "Generate proposal",  href: "#docs", kind: "doc" });
  next_actions.push({ title: "Add tasks for Phase 1 milestones", kind: "task" });
  next_actions.push({ title: "Log first client touchpoint", href: "/work/comm", kind: "comm" });

  return { classification: c, phases, recommended_tools, recommended_docs, suggested_reminders, next_actions };
}

export function buildFromInput(input: string, brief?: any): Roadmap {
  return buildRoadmap(classifyHeuristic(input, brief));
}