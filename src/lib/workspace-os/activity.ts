import { supabase } from "@/integrations/supabase/client";

export async function logActivity(params: {
  workspaceId: string;
  ownerId: string;
  event_type: string;
  message: string;
  metadata?: any;
}) {
  try {
    await (supabase as any).from("workspace_activity").insert({
      workspace_id: params.workspaceId,
      owner_id: params.ownerId,
      event_type: params.event_type,
      message: params.message,
      metadata: params.metadata || {},
    });
  } catch (e) {
    console.error("activity log failed", e);
  }
}