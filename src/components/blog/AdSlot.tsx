/**
 * Non-aggressive AdSense-ready ad slot.
 * Reserves space to keep CLS low. Renders only the placeholder until
 * window.__ADSENSE_CLIENT__ is configured at runtime — keeps the editorial
 * surface clean and lets us flip a single switch when AdSense approval lands.
 */
export function AdSlot({
  slot,
  format = "fluid",
  className = "",
  height = 250,
  label = "Sponsored",
}: {
  slot?: string;
  format?: "fluid" | "rectangle" | "leaderboard";
  className?: string;
  height?: number;
  label?: string;
}) {
  const client = (typeof window !== "undefined" && (window as any).__ADSENSE_CLIENT__) || null;
  return (
    <aside
      aria-label={label}
      className={`my-10 mx-auto rounded-md border border-border/40 bg-muted/30 flex items-center justify-center text-[11px] tracking-wide uppercase text-muted-foreground/70 ${className}`}
      style={{ minHeight: height }}
    >
      {client && slot ? (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <ins className="adsbygoogle" style={{ display: "block", width: "100%", height }} data-ad-client={client} data-ad-slot={slot} data-ad-format={format} data-full-width-responsive="true" />
      ) : (
        <span>Ad space · {format}</span>
      )}
    </aside>
  );
}