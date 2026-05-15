import { Info, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Inline "what does this do?" hint for operator settings.
 * Renders an info (or warning) icon with a tooltip body.
 */
export function OpsHint({
  children,
  variant = "info",
  className,
}: {
  children: ReactNode;
  variant?: "info" | "warning";
  className?: string;
}) {
  const Icon = variant === "warning" ? AlertTriangle : Info;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="More info"
            className={cn(
              "inline-flex items-center justify-center rounded-full text-muted-foreground/70 hover:text-foreground transition",
              variant === "warning" && "text-amber-500/80 hover:text-amber-400",
              className,
            )}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
