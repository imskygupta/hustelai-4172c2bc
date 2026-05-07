export const PIPELINE_STAGES = [
  { id: "lead", label: "Lead", tone: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
  { id: "qualified", label: "Qualified", tone: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  { id: "proposal_sent", label: "Proposal Sent", tone: "bg-violet-500/15 text-violet-400 border-violet-500/30" },
  { id: "negotiation", label: "Negotiation", tone: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  { id: "won", label: "Won", tone: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  { id: "active", label: "Active", tone: "bg-primary/15 text-primary border-primary/30" },
  { id: "retainer", label: "Retainer", tone: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" },
  { id: "lost", label: "Lost", tone: "bg-destructive/15 text-destructive border-destructive/30" },
] as const;

export type PipelineStage = typeof PIPELINE_STAGES[number]["id"];

export function stageMeta(id?: string | null) {
  return PIPELINE_STAGES.find(s => s.id === id) || PIPELINE_STAGES[0];
}

/** Compute a 0–100 confidence score from AI analysis output. */
export function computeConfidence(ai: any | null | undefined): number {
  if (!ai) return 0;
  const clarityScore = ai.scope_clarity === "strong" ? 80 : ai.scope_clarity === "medium" ? 55 : 25;
  const urgencyBoost = ai.urgency === "high" ? 10 : ai.urgency === "medium" ? 5 : 0;
  const riskPenalty = Math.min(40, ((ai.risks?.length || 0) * 8));
  return Math.max(5, Math.min(99, clarityScore + urgencyBoost - riskPenalty));
}

export function confidenceTone(score: number) {
  if (score >= 70) return "text-emerald-500";
  if (score >= 45) return "text-amber-500";
  return "text-destructive";
}