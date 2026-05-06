export const PIPELINE_STAGES = [
  { id: "inquiry", label: "Inquiry", color: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  { id: "planning", label: "Planning", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { id: "design", label: "Design", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  { id: "development", label: "Development", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  { id: "review", label: "Review", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
  { id: "delivery", label: "Delivery", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  { id: "completed", label: "Completed", color: "bg-green-500/10 text-green-400 border-green-500/20" },
] as const;

export const CRM_STATUSES = [
  "lead", "discovery", "proposal_sent", "negotiation", "active", "waiting", "completed", "retainer", "lost",
] as const;

export type Workspace = {
  id: string;
  owner_id: string;
  client_name: string;
  company_name?: string | null;
  logo_url?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  timezone?: string | null;
  social_links?: Record<string, string> | null;
  source?: string | null;
  tags?: string[] | null;
  notes?: string | null;
  lifetime_value?: number | null;
  total_paid?: number | null;
  status: string;
  pipeline_stage?: string | null;
  project_scope: string | null;
  ai_summary: string | null;
  pricing: any;
  deliverables: any;
  deadlines: any;
  last_contact_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkspacePayment = {
  id: string;
  workspace_id: string;
  label: string;
  amount: number;
  currency: string;
  status: "pending" | "partial" | "paid" | "overdue";
  payment_type: "upfront" | "milestone" | "recurring" | "final";
  due_date: string | null;
  paid_at: string | null;
  paid_amount: number;
  notes: string | null;
  created_at: string;
};

export type WorkspaceTask = {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  stage: string;
  progress: number;
  due_date: string | null;
  blockers: string | null;
  position: number;
};

export type WorkspaceActivity = {
  id: string;
  workspace_id: string;
  event_type: string;
  message: string;
  metadata: any;
  created_at: string;
};

export type WorkspaceReminder = {
  id: string;
  workspace_id: string;
  title: string;
  due_at: string;
  done: boolean;
  kind: string;
};