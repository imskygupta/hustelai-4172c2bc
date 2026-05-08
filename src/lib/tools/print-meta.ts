/**
 * Wrap window.print() so the resulting PDF has friendly metadata
 * (browsers use document.title as the PDF Title) and so we can run
 * post-print side-effects (delight toasts).
 */
export function printWithMeta(opts: { docTitle: string; afterPrint?: () => void }) {
  const prev = document.title;
  // Browsers serialise document.title into the PDF Title metadata field.
  // Including a URL here gives the saved PDF a clickable provenance link.
  document.title = `${opts.docTitle} · hustlaiapp.in`;
  const restore = () => {
    document.title = prev;
    window.removeEventListener("afterprint", restore);
    try { opts.afterPrint?.(); } catch {}
  };
  window.addEventListener("afterprint", restore);
  // Safety net for browsers that don't fire afterprint reliably.
  setTimeout(restore, 4000);
  window.print();
}

export type WatermarkMode = "full" | "datetime" | "none";

export function watermarkModeForTier(tier: string | undefined): WatermarkMode {
  if (tier === "elite" || tier === "infinity") return "none";
  if (tier === "pro") return "datetime";
  return "full";
}