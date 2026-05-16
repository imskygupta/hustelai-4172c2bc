import {
  Send, Repeat, Bell, FileDown, FolderOpen, Users, Mail, BarChart3,
  Calendar, Sparkles, Zap, ShieldCheck, MessageSquare, FileText, Briefcase,
} from "lucide-react";

/**
 * Outcome-first automation templates.
 * Each template answers: "What operational work does this remove?"
 * Never expose webhooks, nodes, condition trees — the runtime is hidden.
 */
export type AutomationCategory =
  | "client-delivery"
  | "follow-ups"
  | "recurring"
  | "ai-delivery"
  | "notifications"
  | "project-health"
  | "digests"
  | "agency";

export type Template = {
  id: string;
  title: string;
  outcome: string;        // headline benefit, one calm sentence
  trigger: string;        // when this happens…
  action: string;         // …we do this
  delivery: "telegram" | "workspace" | "email" | "doc-library";
  ai: string | null;      // null = no AI involvement
  result: string;         // expected human-readable result
  icon: any;
  category: AutomationCategory;
  recommended?: boolean;
  comingSoon?: boolean;
  /** Minimum tier required to enable. Defaults to "free". */
  minTier?: "free" | "pro" | "elite" | "infinity";
  /** Operational cost class — drives the tier policy + boost suggestions. */
  cost?: "low" | "medium" | "high";
};

export const CATEGORY_LABEL: Record<AutomationCategory, string> = {
  "client-delivery":  "Client delivery",
  "follow-ups":       "Follow-ups",
  "recurring":        "Recurring operations",
  "ai-delivery":      "AI export delivery",
  "notifications":    "Notifications",
  "project-health":   "Project health",
  "digests":          "Daily digests",
  "agency":           "Agency operations",
};

export const CATEGORY_ORDER: AutomationCategory[] = [
  "client-delivery", "ai-delivery", "follow-ups", "recurring",
  "notifications", "project-health", "digests", "agency",
];

export const DELIVERY_LABEL: Record<Template["delivery"], string> = {
  telegram:      "Telegram",
  workspace:     "Workspace",
  email:         "Email",
  "doc-library": "Doc library",
};

export const TEMPLATES: Template[] = [
  {
    id: "proposal-followup",
    title: "Proposal follow-up",
    outcome: "Never let a sent proposal go cold.",
    trigger: "When a proposal is generated for a client",
    action: "Prepare a calm 3-day follow-up reminder",
    delivery: "telegram",
    ai: "Drafts a soft, on-brand nudge based on the proposal context",
    result: "You get a one-tap reminder with a ready-to-send message",
    icon: Mail,
    category: "follow-ups",
    recommended: true,
    minTier: "pro",
    cost: "medium",
  },
  {
    id: "telegram-relay",
    title: "Telegram export relay",
    outcome: "Deliveries arrive in your pocket, instantly.",
    trigger: "When a document is exported from the workspace",
    action: "Send the file to your linked Telegram chat",
    delivery: "telegram",
    ai: null,
    result: "Export lands as a clean message with title and project",
    icon: Send,
    category: "ai-delivery",
    recommended: true,
    minTier: "free",
    cost: "low",
  },
  {
    id: "delivery-confirm",
    title: "Delivery confirmation",
    outcome: "Clients always know when their work is ready.",
    trigger: "When a deliverable is marked complete",
    action: "Send the client a confirmation with the file link",
    delivery: "telegram",
    ai: "Generates a short, professional handoff note",
    result: "Client receives a polished delivery notice — no manual typing",
    icon: Bell,
    category: "client-delivery",
    minTier: "free",
    cost: "low",
  },
  {
    id: "monthly-invoice",
    title: "Monthly retainer invoice",
    outcome: "Retainer billing happens on its own.",
    trigger: "On the 1st of every month, for retainer clients",
    action: "Generate the invoice and queue it for delivery",
    delivery: "workspace",
    ai: "Reuses last month's structure and updates dates automatically",
    result: "Invoice waits in your outbox, ready to confirm and send",
    icon: Repeat,
    category: "recurring",
    recommended: true,
    minTier: "pro",
    cost: "medium",
  },
  {
    id: "ai-archival",
    title: "AI output archival",
    outcome: "Every AI output stays organised by client.",
    trigger: "When any AI tool produces an output",
    action: "Save it to the matching client's workspace folder",
    delivery: "doc-library",
    ai: "Detects the client and tool type automatically",
    result: "Nothing is ever lost — outputs auto-file themselves",
    icon: FolderOpen,
    category: "ai-delivery",
    minTier: "free",
    cost: "low",
  },
  {
    id: "client-reminder",
    title: "Client check-in chain",
    outcome: "Quiet, recurring care for active engagements.",
    trigger: "Weekly, for each in-flight project",
    action: "Draft a soft check-in note to the client",
    delivery: "telegram",
    ai: "Writes the check-in using recent project activity",
    result: "A ready-to-send message lands in Telegram each week",
    icon: Users,
    category: "follow-ups",
    minTier: "elite",
    cost: "high",
  },
  {
    id: "project-stalled",
    title: "Stalled project radar",
    outcome: "Spot work that's gone quiet before clients do.",
    trigger: "When a project has no activity for 14 days",
    action: "Surface a calm nudge with a suggested next move",
    delivery: "workspace",
    ai: "Summarises why the project may have stalled",
    result: "A gentle prompt appears in your operations cockpit",
    icon: ShieldCheck,
    category: "project-health",
    minTier: "elite",
    cost: "high",
  },
  {
    id: "overdue-invoice",
    title: "Overdue invoice nudge",
    outcome: "Politely chase payments without lifting a finger.",
    trigger: "When an invoice is past its due date",
    action: "Draft a respectful payment reminder",
    delivery: "telegram",
    ai: "Tunes the tone based on how overdue the invoice is",
    result: "A ready-to-send message waits in your Telegram",
    icon: Calendar,
    category: "recurring",
    minTier: "pro",
    cost: "medium",
  },
  {
    id: "daily-digest",
    title: "Daily workspace digest",
    outcome: "Start each morning knowing exactly what's moving.",
    trigger: "Every morning at 8:30",
    action: "Summarise yesterday's outputs, deliveries and follow-ups",
    delivery: "telegram",
    ai: "Writes a calm, scannable summary of operational momentum",
    result: "One tidy Telegram message — no app-hopping needed",
    icon: BarChart3,
    category: "digests",
    recommended: true,
    minTier: "elite",
    cost: "high",
  },
  {
    id: "weekly-report",
    title: "Weekly operations report",
    outcome: "Close every Friday with quiet clarity.",
    trigger: "Each Friday afternoon",
    action: "Compile deliveries, exports and revenue for the week",
    delivery: "workspace",
    ai: "Highlights wins and items needing attention next week",
    result: "A short report appears in your operations hub",
    icon: FileText,
    category: "digests",
    minTier: "pro",
    cost: "high",
  },
  {
    id: "new-intake",
    title: "New intake alert",
    outcome: "Never miss a fresh lead landing in your inbox.",
    trigger: "When a public intake form is submitted",
    action: "Notify you with the lead summary and recommended response",
    delivery: "telegram",
    ai: "Extracts key fit signals and suggests next steps",
    result: "Lead arrives in Telegram, pre-qualified for you",
    icon: MessageSquare,
    category: "notifications",
    recommended: true,
    minTier: "free",
    cost: "low",
  },
  {
    id: "agency-handoff",
    title: "Team handoff brief",
    outcome: "Move work between teammates without losing context.",
    trigger: "When a project changes owner",
    action: "Generate a one-page handoff brief from project memory",
    delivery: "doc-library",
    ai: "Distils history, decisions and open threads",
    result: "Receiving teammate gets context in seconds",
    icon: Briefcase,
    category: "agency",
    comingSoon: true,
    minTier: "infinity",
    cost: "high",
  },
];

export function groupTemplatesByCategory(): Record<AutomationCategory, Template[]> {
  const g = {} as Record<AutomationCategory, Template[]>;
  for (const c of CATEGORY_ORDER) g[c] = [];
  for (const t of TEMPLATES) g[t.category].push(t);
  return g;
}

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find(t => t.id === id);
}