import { useEffect, useRef, useState } from "react";
import { Maximize2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  /** Title shown in fullscreen mode header (mobile only) */
  fullscreenTitle?: string;
  /** Hide the fullscreen-expand button entirely (e.g. on tiny inputs) */
  hideExpand?: boolean;
  id?: string;
  ariaLabel?: string;
  /** Disable autosize behavior (default true) */
  autosize?: boolean;
}

/**
 * Mobile-first textarea with auto-grow and an optional "fullscreen compose"
 * mode that gives users a distraction-free editing surface (ChatGPT-style).
 * Keyboard-safe via 100dvh and safe-area padding.
 */
export function FullscreenTextarea({
  value,
  onChange,
  placeholder,
  rows = 4,
  className,
  fullscreenTitle = "Compose",
  hideExpand = false,
  id,
  ariaLabel,
  autosize = true,
}: Props) {
  const inlineRef = useRef<HTMLTextAreaElement | null>(null);
  const fsRef = useRef<HTMLTextAreaElement | null>(null);
  const [fs, setFs] = useState(false);

  // Auto-grow inline textarea
  useEffect(() => {
    if (!autosize || !inlineRef.current) return;
    const el = inlineRef.current;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 360) + "px";
  }, [value, autosize]);

  // Lock body scroll while fullscreen
  useEffect(() => {
    if (!fs) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setTimeout(() => fsRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFs(false); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [fs]);

  return (
    <div className="relative">
      <textarea
        ref={inlineRef}
        id={id}
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={cn(
          "w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm",
          "ring-offset-background placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50 resize-none leading-relaxed",
          className,
        )}
      />
      {!hideExpand && (
        <button
          type="button"
          onClick={() => setFs(true)}
          aria-label="Expand to fullscreen compose"
          className="absolute top-1.5 right-1.5 inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 active:scale-95 transition md:hidden"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Fullscreen overlay (mobile-friendly, keyboard-safe) */}
      {fs && (
        <div className="fixed inset-0 z-[60] bg-background flex flex-col" role="dialog" aria-modal="true" aria-label={fullscreenTitle}>
          <div className="flex items-center justify-between px-3 py-2 border-b border-border pt-safe">
            <button
              type="button"
              onClick={() => setFs(false)}
              aria-label="Close compose"
              className="inline-flex items-center justify-center min-h-tap min-w-tap rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 active:scale-95 transition"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-sm font-medium truncate px-2">{fullscreenTitle}</div>
            <button
              type="button"
              onClick={() => setFs(false)}
              className="text-sm font-medium text-primary px-3 py-2 min-h-tap rounded-md hover:bg-primary/10 active:scale-95 transition"
            >
              Done
            </button>
          </div>
          <textarea
            ref={fsRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 w-full px-4 py-4 text-base leading-relaxed bg-background border-0 outline-none resize-none placeholder:text-muted-foreground"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
          />
        </div>
      )}
    </div>
  );
}