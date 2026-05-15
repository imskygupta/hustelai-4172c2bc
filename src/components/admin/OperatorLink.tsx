import { forwardRef, MouseEvent, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Anchor-first link for admin operator surfaces.
 *
 * Rendered as a real <a href> so the browser handles:
 *   - Cmd/Ctrl + click  → open in new tab
 *   - Middle click       → open in new tab
 *   - Shift + click      → open in new window
 *   - "Open link in new tab" right-click menu
 *
 * Plain left-click is intercepted and routed via React Router so we keep
 * SPA navigation. Use this everywhere admins navigate between pages.
 */
export type OperatorLinkProps = {
  to: string;
  children: ReactNode;
  className?: string;
  /** Show a small ↗ icon hinting that the row supports new-tab. */
  showExternalHint?: boolean;
  /** Force open in a new tab (no SPA nav). */
  newTab?: boolean;
  title?: string;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
};

export const OperatorLink = forwardRef<HTMLAnchorElement, OperatorLinkProps>(
  function OperatorLink(
    { to, children, className, showExternalHint, newTab, title, onClick },
    ref,
  ) {
    const navigate = useNavigate();
    const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e);
      if (e.defaultPrevented) return;
      if (newTab) return; // let the browser take over via target=_blank
      // Let the browser handle modifier/middle clicks.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      navigate(to);
    };
    return (
      <a
        ref={ref}
        href={to}
        title={title}
        target={newTab ? "_blank" : undefined}
        rel={newTab ? "noreferrer" : undefined}
        onClick={handleClick}
        className={cn("inline-flex items-center gap-2", className)}
        data-operator-link
      >
        {children}
        {showExternalHint && (
          <ExternalLink className="w-3 h-3 opacity-40 group-hover:opacity-80 transition" />
        )}
      </a>
    );
  },
);
