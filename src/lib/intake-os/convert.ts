import { supabase } from "@/integrations/supabase/client";
import { intakeApi } from "./api";
import { applyBrandToDoc, getBrandKit } from "@/lib/workspace-docs/infra";
import { workspaceDb } from "@/integrations/workspace/client";
import { logActivity } from "@/lib/workspace-os/activity";

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

  // 2) Upsert into canonical CRM (work_clients on DB2). Dedupes on email so
  //    repeat intakes from the same lead don't create duplicate client rows.
  //    See mem://tech/canonical-crm — this is the single source of truth.
  let workClientId: string | null = null;
  try {
    const email = submission.client_email ? String(submission.client_email).toLowerCase().trim() : null;
    if (email) {
      const { data: existing } = await workspaceDb
        .from("work_clients")
        .select("id")
        .eq("owner_id", userId)
        .eq("email", email)
        .maybeSingle();
      if (existing?.id) {
        workClientId = existing.id;
      } else {
        const { data: inserted } = await workspaceDb
          .from("work_clients")
          .insert({
            owner_id: userId,
            name: clientName,
            email,
            company: submission.client_company || null,
            status: "active",
          })
          .select("id")
          .maybeSingle();
        workClientId = inserted?.id || null;
      }
    } else {
      const { data: inserted } = await workspaceDb
        .from("work_clients")
        .insert({ owner_id: userId, name: clientName, company: submission.client_company || null, status: "active" })
        .select("id")
        .maybeSingle();
      workClientId = inserted?.id || null;
    }
  } catch { /* non-fatal — workspace still usable without CRM row */ }

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
  const { data: insertedDocs } = await (supabase as any)
    .from("workspace_documents")
    .insert(docs)
    .select("id, doc_type");
  const proposalDocId =
    (insertedDocs as Array<{ id: string; doc_type: string }> | null)
      ?.find((d) => d.doc_type === "proposal")?.id || null;
  const quotationDocId =
    (insertedDocs as Array<{ id: string; doc_type: string }> | null)
      ?.find((d) => d.doc_type === "quotation")?.id || null;

  // 4) Mark submission converted on DB2
  await intakeApi("submission.mark_converted", { id: submission.id, workspace_id: ws.id, stage: "won" });

  // 5) Write an activity row so the Workspace Activity timeline reflects
  //    the conversion the moment the user lands in the project.
  logActivity({
    workspaceId: ws.id,
    ownerId: userId,
    event_type: "intake_converted",
    message: `Lead converted from intake — ${clientName}`,
    metadata: { submission_id: submission.id, client_id: workClientId },
  });

  return { workspaceId: ws.id, clientId: workClientId, proposalDocId, quotationDocId };
}