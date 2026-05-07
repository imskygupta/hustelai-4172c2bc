import { supabase } from "@/integrations/supabase/client";

export type RoadmapSession = {
  id: string;
  user_id: string;
  workspace_id: string | null;
  title: string;
  input_text: string;
  classification: any;
  roadmap: any;
  suggested_tools: any;
  suggested_docs: any;
  workflow_stage: string;
  created_at: string;
  updated_at: string;
};

function deriveTitle(input: string, classification: any): string {
  const first = (input || "").trim().split(/[.\n]/)[0]?.slice(0, 60);
  if (first && first.length > 6) return first;
  const t = classification?.project_type || "Workflow";
  return `${String(t).replace("_", " ")} roadmap`;
}

export async function saveRoadmapSession(args: {
  userId: string;
  workspaceId?: string | null;
  input: string;
  roadmap: any;
}): Promise<RoadmapSession | null> {
  const { userId, workspaceId, input, roadmap } = args;
  const payload = {
    user_id: userId,
    workspace_id: workspaceId || null,
    title: deriveTitle(input, roadmap?.classification),
    input_text: input,
    classification: roadmap?.classification || {},
    roadmap: { phases: roadmap?.phases || [], next_actions: roadmap?.next_actions || [], suggested_reminders: roadmap?.suggested_reminders || [] },
    suggested_tools: roadmap?.recommended_tools || [],
    suggested_docs: roadmap?.recommended_docs || [],
    workflow_stage: "draft",
  };
  const { data, error } = await (supabase as any).from("roadmap_sessions").insert(payload).select().single();
  if (error) {
    console.warn("saveRoadmapSession failed", error.message);
    return null;
  }
  return data as RoadmapSession;
}

export async function listRoadmapSessions(userId: string, limit = 10): Promise<RoadmapSession[]> {
  const { data } = await (supabase as any)
    .from("roadmap_sessions").select("*")
    .eq("user_id", userId).order("updated_at", { ascending: false }).limit(limit);
  return (data as RoadmapSession[]) || [];
}

export async function getRoadmapSession(id: string): Promise<RoadmapSession | null> {
  const { data } = await (supabase as any).from("roadmap_sessions").select("*").eq("id", id).maybeSingle();
  return (data as RoadmapSession) || null;
}

export async function duplicateRoadmapSession(id: string, userId: string): Promise<RoadmapSession | null> {
  const src = await getRoadmapSession(id);
  if (!src) return null;
  const { id: _i, created_at: _c, updated_at: _u, ...rest } = src as any;
  const { data, error } = await (supabase as any).from("roadmap_sessions")
    .insert({ ...rest, user_id: userId, title: `${src.title} (copy)`, workflow_stage: "draft" })
    .select().single();
  if (error) return null;
  return data as RoadmapSession;
}

export async function updateRoadmapStage(id: string, stage: string) {
  await (supabase as any).from("roadmap_sessions").update({ workflow_stage: stage }).eq("id", id);
}

export async function deleteRoadmapSession(id: string) {
  await (supabase as any).from("roadmap_sessions").delete().eq("id", id);
}