import { supabase } from "@/integrations/supabase/client";
import { intakeApi } from "./api";
import { applyBrandToDoc, getBrandKit } from "@/lib/workspace-docs/infra";

/** Convert an intake submission into a workspace + draft proposal + draft quotation. */
export async function convertSubmissionToWorkspace(submission: any, userId: string) {
  const ai = submission.ai_analysis || {};
  const payload = submission.payload || {};
  const clientName = submission.client_name || "New client";

  // 1) Create workspace on DB1
  const { data: ws, error: wsErr } = await (supabase as any).from("workspaces").insert({
    owner_id: userId,
    client_name: clientName,
    project_scope: ai.summary || ai.detected_type || payload.requirements || payload.goals || "",
    deliverables: Array.isArray(ai.next_actions) ? ai.next_actions : [],
    ai_summary: ai.summary || null,
    pricing: payload.budget ? { budget_label: payload.budget } : {},
    payment_terms: { structure: "50% upfront · 50% on delivery" },
    source_inputs: [{ kind: "intake_submission", submission_id: submission.id, at: new Date().toISOString() }],
    status: "active",
  }).select("id").single();
  if (wsErr) throw wsErr;

  // 2) Save client profile (idempotent on email)
  if (submission.client_email) {
    await (supabase as any).from("client_profiles").upsert({
      user_id: userId,
      name: clientName,
      email: submission.client_email,
      company: submission.client_company || null,
    }, { onConflict: "user_id,email" }).select().maybeSingle().then(() => {}, () => {});
  }

  // 3) Create draft proposal + quotation seeded from submission
  const brand = await getBrandKit(userId);
  const today = new Date().toISOString().slice(0, 10);
  const plus = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  const baseClient = {
    name: clientName,
    company: submission.client_company || "",
    email: submission.client_email || "",
  };
  const summary = ai.summary || payload.requirements || payload.goals || "Project from intake submission";
  const deliverables = Array.isArray(ai.next_actions) && ai.next_actions.length
    ? ai.next_actions
    : ["Discovery & planning", "Design & build", "Review & launch"];

  const proposalData: any = applyBrandToDoc({
    client: baseClient,
    number: `P-${today.replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`,
    date: today,
    title: ai.detected_type ? `${ai.detected_type} Proposal` : "Project Proposal",
    summary,
    problem: payload.current_pain || payload.requirements || "",
    approach: ai.summary || "",
    deliverables,
    timeline: payload.timeline || "",
    investment: ai.suggested_price_range || payload.budget || "",
    whyUs: "",
    cta: "Let's kick off",
    currency: "INR",
  }, brand);

  const quoteData: any = applyBrandToDoc({
    client: baseClient,
    number: `Q-${today.replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`,
    date: today,
    validUntil: plus(14),
    service: ai.detected_type || "Project service",
    scope: summary,
    items: deliverables.map((d: string) => ({ title: d, qty: 1, rate: 0 })),
    currency: "INR",
    revisions: 2,
    timeline: payload.timeline || "3 weeks",
    paymentStructure: "50% upfront · 50% on delivery",
  }, brand);

  const docs = [
    { doc_type: "proposal", title: `Proposal for ${clientName}`, data: proposalData, doc_number: proposalData.number },
    { doc_type: "quotation", title: `Quotation for ${clientName}`, data: quoteData, doc_number: quoteData.number },
  ].map(d => ({
    workspace_id: ws.id,
    owner_id: userId,
    status: "draft",
    theme: brand?.default_theme || "minimal-dark",
    ...d,
  }));
  await (supabase as any).from("workspace_documents").insert(docs);

  // 4) Mark submission converted on DB2
  await intakeApi("submission.mark_converted", { id: submission.id, workspace_id: ws.id, stage: "won" });

  return { workspaceId: ws.id };
}