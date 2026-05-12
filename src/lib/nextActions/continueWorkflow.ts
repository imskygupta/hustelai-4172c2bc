import { toast } from "sonner";
import { trackActivation, type ActivationEventKey } from "./track";
import { getSuggestions, type NextActionTrigger } from "./registry";

interface ContinueOpts {
  trigger: NextActionTrigger;
  surface?: string;
  /** Optional toast headline, e.g. "Proposal exported" */
  headline?: string;
  /** Optional toast description body */
  description?: string;
}

/**
 * Fire a single "what's next" toast with a primary CTA after a major action.
 * Calm: one toast, one CTA, dismissible. Telemetry is attached automatically.
 */
export function continueWorkflow(opts: ContinueOpts) {
  const { trigger, surface, headline, description } = opts;

  // 1. Log the source event
  void trackActivation(trigger as ActivationEventKey, { surface });

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
