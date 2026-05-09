import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
  children?: ReactNode;
}

/**
 * Standardized empty state. Use whenever a list/table/section has no data.
 * Replaces ad-hoc "no data" divs scattered across pages.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "glass rounded-2xl p-10 flex flex-col items-center text-center gap-3",
        className,
      )}
    >
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
          <Icon className="w-5 h-5 text-muted-foreground" />
        </div>
      )}
      <h3 className="font-display font-semibold text-base">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} size="sm" className="mt-2">
          {action.label}
        </Button>
      )}
      {children}
    </div>
  );
}