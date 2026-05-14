import { Sparkles } from "lucide-react";

/**
 * Inline, low-key entry point for the Workspace Copilot.
 * Drop into a tool/page to offer contextual help without dominating the UI.
 *
 * Example:
 *   <CopilotPrompt prefill="Help me draft this proposal" label="Draft this with Copilot" />
 */
export function CopilotPrompt({
  prefill,
  label = "Ask your Workspace Copilot",
  className = "",
}: {
  prefill: string;
  label?: string;
  className?: string;
}) {
  function open() {
    window.dispatchEvent(new CustomEvent("open-hustlebot", { detail: { prefill } }));
  }
  return (
    <button
      type="button"
      onClick={open}
      className={`inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline underline-offset-4 ${className}`}
    >
      <Sparkles className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}