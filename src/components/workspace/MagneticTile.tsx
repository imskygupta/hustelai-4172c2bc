import { CSSProperties, MouseEvent, ReactNode, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Lightweight cursor-tracking tile. CSS variables (--mx, --my) are written
 * directly on the element on pointer move and consumed by .ws-magnetic in
 * workspace.css to render a soft radial spotlight.
 *
 * Zero re-renders per pointer move — the variables are set on the DOM node,
 * not React state. Perf cost ≈ a CSS variable write per frame.
 */
export function MagneticTile({
  as: As = "div",
  className,
  children,
  style,
  onClick,
  ...rest
}: {
  as?: any;
  className?: string;
  children: ReactNode;
  style?: CSSProperties;
  onClick?: (e: MouseEvent) => void;
  [k: string]: any;
}) {
  const ref = useRef<HTMLElement | null>(null);

  const handleMove = useCallback((e: MouseEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    el.style.setProperty("--mx", `${x}%`);
    el.style.setProperty("--my", `${y}%`);
  }, []);

  const handleLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--mx", `50%`);
    el.style.setProperty("--my", `-20%`);
  }, []);

  return (
    <As
      ref={ref}
      className={cn("ws-magnetic", className)}
      style={style}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      onClick={onClick}
      {...rest}
    >
      {children}
    </As>
  );
}