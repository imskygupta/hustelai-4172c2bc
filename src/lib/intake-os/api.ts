import { supabase } from "@/integrations/supabase/client";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const FN_BASE = `https://${PROJECT_ID}.supabase.co/functions/v1`;

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  const tok = data.session?.access_token;
  return tok ? { Authorization: `Bearer ${tok}` } : {};
}

export async function intakeApi(kind: string, body: Record<string, any> = {}) {
  const headers = { "Content-Type": "application/json", ...(await authHeader()) };
  const r = await fetch(`${FN_BASE}/intake-api`, {
    method: "POST", headers, body: JSON.stringify({ kind, ...body }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data?.error) throw new Error(data?.error || `intake-api ${r.status}`);
  return data;
}

export async function intakePublicGet(slug: string) {
  const r = await fetch(`${FN_BASE}/intake-public?slug=${encodeURIComponent(slug)}`);
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data?.error) throw new Error(data?.error || "Form not found");
  return data.form;
}

export async function intakePublicSubmit(payload: Record<string, any>) {
  const r = await fetch(`${FN_BASE}/intake-public`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data?.error) throw new Error(data?.error || "Submission failed");
  return data;
}

export type IntakeField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "email" | "number" | "url" | "select";
  required?: boolean;
  options?: string[];
  placeholder?: string;
};

export const DEFAULT_INTAKE_FIELDS: IntakeField[] = [
  { key: "project_type", label: "Project type", type: "select", required: true, options: ["Landing page", "Web app", "Branding", "Content", "Other"] },
  { key: "budget", label: "Budget", type: "select", options: ["< ₹25k", "₹25k - ₹1L", "₹1L - ₹5L", "₹5L+"] },
  { key: "timeline", label: "Timeline", type: "select", options: ["ASAP", "2 weeks", "1 month", "Flexible"] },
  { key: "requirements", label: "Project requirements", type: "textarea", required: true, placeholder: "Describe what you need..." },
  { key: "references", label: "Reference links", type: "textarea", placeholder: "Links to inspiration, competitors, etc." },
];