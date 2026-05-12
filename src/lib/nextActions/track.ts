import { supabase } from "@/integrations/supabase/client";

export type ActivationEventKey =
  | "proposal_exported"
  | "invoice_exported"
  | "contract_exported"
  | "doc_exported"
  | "telegram_connected"
  | "workspace_created"
  | "onboarding_completed"
  | "ai_generation_completed"
  | "next_action_clicked"
  | "next_action_dismissed"
  | "workflow_continued"
  | "workflow_abandoned";

export interface TrackOpts {
  surface?: string;
  context?: Record<string, unknown>;
}

/**
 * Fire-and-forget activation telemetry.
 * Silently no-ops for guests so we don't crash flows for anonymous users.
 */
export async function trackActivation(
  event: ActivationEventKey,
  opts: TrackOpts = {},
): Promise<void> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) return;
    await (supabase as any).from("activation_events").insert({
      user_id: user.id,
      event_key: event,
      surface: opts.surface ?? null,
      context: opts.context ?? {},
    });
  } catch {
    // never block UX on telemetry
  }
}
