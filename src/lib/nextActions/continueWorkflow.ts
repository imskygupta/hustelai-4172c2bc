import { toast } from "sonner";
import { trackActivation, type ActivationEventKey } from "./track";
import { getSuggestions, type NextActionTrigger } from "./registry";
import { celebrateMilestone, type MilestoneKey } from "./milestone";

interface ContinueOpts {
  trigger: NextActionTrigger;
  surface?: string;
  /** Optional toast headline, e.g. "Proposal exported" */
  headline?: string;
  /** Optional toast description body */
  description?: string;
}

const MILESTONE_MAP: Partial<Record<NextActionTrigger, { key: MilestoneKey; headline: string; description: string; cta?: { label: string; to: string } }>> = {
  proposal_exported: {
    key: "first_export",
    headline: "First export delivered",
    description: "Your operational workflow is live. Wire delivery next to push every export automatically.",
    cta: { label: "Connect delivery", to: "/settings/integrations" },
  },
  invoice_exported: {
    key: "first_export",
    headline: "First invoice exported",
    description: "Branded billing is now part of your stack. Connect Telegram to deliver instantly.",
    cta: { label: "Connect delivery", to: "/settings/integrations" },
  },
  contract_exported: {
    key: "first_export",
    headline: "First agreement exported",
    description: "You've shipped your first protected document. Async delivery keeps it moving.",
    cta: { label: "Connect delivery", to: "/settings/integrations" },
  },
  doc_exported: {
    key: "first_export",
    headline: "First workspace export",
    description: "Your workspace is now producing deliverables. Keep the momentum going.",
  },
  telegram_connected: {
    key: "first_telegram",
    headline: "Telegram connected",
    description: "Async delivery is now wired. Every future export can route through your chat.",
    cta: { label: "Send a test", to: "/settings/integrations" },
  },
  workspace_created: {
    key: "first_workspace",
    headline: "Workspace activated",
    description: "You now have a single async surface for clients, docs and delivery.",
    cta: { label: "Run a tool", to: "/tools/proposal-generator" },
  },
  onboarding_completed: {
    key: "first_onboarding",
    headline: "Operational defaults set",
    description: "Your workspace is ready. Generate your first deliverable to see it run.",
    cta: { label: "Create export", to: "/tools/proposal-generator" },
  },
};

/**
 * Fire a single "what's next" toast with a primary CTA after a major action.
 * Calm: one toast, one CTA, dismissible. Telemetry is attached automatically.
 */
export function continueWorkflow(opts: ContinueOpts) {
  const { trigger, surface, headline, description } = opts;

  // 1. Log the source event
  void trackActivation(trigger as ActivationEventKey, { surface });

  // 1a. Maybe fire a first-time milestone toast (silent if not first time).
  const milestone = MILESTONE_MAP[trigger];
  if (milestone) {
    void celebrateMilestone({
      key: milestone.key,
      event: trigger as ActivationEventKey,
      surface,
      firstHeadline: milestone.headline,
      firstDescription: milestone.description,
      cta: milestone.cta,
    });
  }

  // 2. Pick the first suggestion as the toast CTA
  const suggestions = getSuggestions(trigger);
  const primary = suggestions[0];
  if (!primary) return;

  toast.success(headline ?? "Done — what's next?", {
    description: description ?? primary.description,
    duration: 7000,
    action: primary.to
      ? {
          label: primary.label,
          onClick: () => {
            void trackActivation("next_action_clicked", {
              surface,
              context: { trigger, action_id: primary.id, via: "toast" },
            });
            window.location.assign(primary.to!);
          },
        }
      : undefined,
  });
}
