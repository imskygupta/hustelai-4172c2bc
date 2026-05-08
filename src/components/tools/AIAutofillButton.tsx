import { Sparkles, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Small "AI Autofill" trigger. On click it should call the parent's `guard()`
 * with an action like "auto-fill this with AI". For guests this opens the
 * signup gate; for signed-in users we eventually wire it to the AI gateway.
 */
export function AIAutofillIcon({
  onClick,
  label = "Auto-fill with AI",
  className,
}: {
  onClick: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        "group inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md",
        "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/70",
        "transition print:hidden",
        className,
      )}
    >
      <Sparkles className="w-3 h-3 group-hover:rotate-12 transition-transform" />
      <span className="hidden sm:inline">AI fill</span>
    </button>
  );
}

export function AIAutofillButton({
  onClick,
  label = "Auto-fill with AI",
  className,
}: {
  onClick: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 px-3 h-9 rounded-md text-sm font-semibold",
        "text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500",
        "shadow-sm shadow-emerald-600/20 transition print:hidden",
        className,
      )}
    >
      <Wand2 className="w-4 h-4" />
      {label}
    </button>
  );
}