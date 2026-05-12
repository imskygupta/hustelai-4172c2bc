import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { trackActivation, type ActivationEventKey } from "./track";

/**
 * Operational milestone celebrations.
 * Calm, premium, async-feeling — fires only on the FIRST occurrence per user
 * of the given milestone (e.g. first_export, first_delivery, first_workspace,
 * first_telegram). After the first time, it falls back to a quiet success toast.
 *
 * No confetti. No emojis. No gamification.
 */

export type MilestoneKey =
  | "first_export"
  | "first_delivery"
  | "first_workspace"
  | "first_telegram"
  | "first_async_workflow"
  | "first_onboarding";

const LS_PREFIX = "hai.milestone.v1.";

function lsKey(userId: string, key: MilestoneKey) {
  return `${LS_PREFIX}${userId}.${key}`;
}

async function isFirstTime(userId: string, key: MilestoneKey, eventKey: ActivationEventKey): Promise<boolean> {
  // Fast local check
  try {
    if (typeof window !== "undefined" && localStorage.getItem(lsKey(userId, key))) return false;
  } catch { /* ignore */ }

  try {
    const { count } = await (supabase as any)
      .from("activation_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("event_key", eventKey);
    return (count ?? 0) <= 1; // current event already inserted by trackActivation; first means count = 1
  } catch {
    return true; // fail-open to celebratory once; LS will dedupe future fires
  }
}

function markSeen(userId: string, key: MilestoneKey) {
  try { localStorage.setItem(lsKey(userId, key), "1"); } catch { /* ignore */ }
}

interface CelebrateOpts {
  /** Milestone identifier (controls "first time" gating). */
  key: MilestoneKey;
  /** Activation event already fired (used to determine first-time count). */
  event: ActivationEventKey;
  /** Surface for telemetry. */
  surface?: string;
  /** Headline shown on first-time only. */
  firstHeadline: string;
  /** Description shown on first-time only. */
  firstDescription: string;
  /** Optional CTA on the first-time toast. */
  cta?: { label: string; to: string };
}

/**
 * Fire a milestone toast. First time → premium, contextual celebration.
 * Subsequent times → silent (no extra toast — the action's own UI handles success).
 */
export async function celebrateMilestone(opts: CelebrateOpts): Promise<void> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) return;

    const first = await isFirstTime(user.id, opts.key, opts.event);
    if (!first) return;
    markSeen(user.id, opts.key);

    void trackActivation("workflow_continued", {
      surface: opts.surface,
      context: { milestone: opts.key, kind: "first_time" },
    });

    toast.success(opts.firstHeadline, {
      description: opts.firstDescription,
      duration: 8000,
      action: opts.cta
        ? {
            label: opts.cta.label,
            onClick: () => window.location.assign(opts.cta!.to),
          }
        : undefined,
    });
  } catch {
    /* silent */
  }
}
