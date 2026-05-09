import jsPDF from "jspdf";
import { createExport, blobToBase64 } from "@/lib/exports/api";
import html2canvas from "html2canvas";

export type PageFormat = "a4" | "card" | "square";

const SIZES: Record<PageFormat, { w: number; h: number; orientation: "portrait" | "landscape" }> = {
  a4: { w: 210, h: 297, orientation: "portrait" },
  card: { w: 90, h: 55, orientation: "landscape" },
  square: { w: 200, h: 200, orientation: "portrait" },
};

/**
 * Wait for fonts + images so html2canvas captures the final layout.
 */
async function waitForReady(root: HTMLElement) {
  try { await (document as any).fonts?.ready; } catch { /* ignore */ }
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map(img =>
      img.complete && img.naturalWidth > 0
        ? Promise.resolve()
        : new Promise<void>(res => {
            img.onload = () => res();
            img.onerror = () => res();
            setTimeout(res, 1500);
          }),
    ),
  );
  // Give the browser one paint so layout/fonts settle before capture.
  await new Promise<void>(res => requestAnimationFrame(() => requestAnimationFrame(() => res())));
}

/**
 * Walk the cloned DOM and return a sorted list of "safe break" Y offsets
 * (relative to the captured target's top, in CSS pixels). These come from:
 *  - element boundaries marked with data-pdf-break (sections, table rows)
 *  - <section>, <tr>, <h1>-<h3>, <p> bottoms as a fallback heuristic
 * The exporter snaps each page slice to the nearest safe boundary at-or-
 * before the page edge so headings, paragraphs, and table rows are never
 * cut in half across A4 pages.
 */
function collectSafeBreaks(target: HTMLElement): number[] {
  const targetTop = target.getBoundingClientRect().top;
  const breaks = new Set<number>();
  const selector = [
    "[data-pdf-break]",
    "section",
    "tr",
    "h1", "h2", "h3",
    "p",
    "li",
  ].join(",");
  target.querySelectorAll<HTMLElement>(selector).forEach(el => {
    const r = el.getBoundingClientRect();
    // bottom edge relative to target top
    const yBottom = Math.round(r.bottom - targetTop);
    if (yBottom > 0) breaks.add(yBottom);
    // also offer the top as an "above-this-element" break
    const yTop = Math.round(r.top - targetTop);
    if (yTop > 0) breaks.add(yTop);
  });
  return Array.from(breaks).sort((a, b) => a - b);
}

/**
 * Render the source node into an off-screen, full-scale clone so CSS
 * transforms (preview scaling) cannot corrupt text layout in the PDF.
 */
async function renderClone(
  node: HTMLElement,
  scale = 2,
): Promise<{ canvas: HTMLCanvasElement; safeBreaksPx: number[]; cssHeight: number }> {
  const host = document.createElement("div");
  // Off-screen but still laid out and painted (display:none breaks fonts/measurements).
  Object.assign(host.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    zIndex: "-1",
    pointerEvents: "none",
    background: "transparent",
  } as CSSStyleDeclaration);
  const clone = node.cloneNode(true) as HTMLElement;
  // Strip any preview transform / scaling that the editor applied to wrappers.
  clone.style.transform = "none";
  clone.style.zoom = "1" as any;
  host.appendChild(clone);
  document.body.appendChild(host);
  try {
    await waitForReady(clone);
    const target = (clone.firstElementChild as HTMLElement) || clone;
    const cssHeight = target.scrollHeight;
    const safeBreaksCss = collectSafeBreaks(target);
    const canvas = await html2canvas(target, {
      scale,
      useCORS: true,
      backgroundColor: null,
      logging: false,
      windowWidth: target.scrollWidth,
      windowHeight: target.scrollHeight,
    });
    // Convert CSS-px breakpoints to canvas-px (account for html2canvas scale).
    const ratio = canvas.height / cssHeight || scale;
    const safeBreaksPx = safeBreaksCss.map(y => Math.round(y * ratio));
    return { canvas, safeBreaksPx, cssHeight };
  } finally {
    document.body.removeChild(host);
  }
}

export async function exportNodeToPdf(node: HTMLElement, filename: string, format: PageFormat = "a4") {
  const cfg = SIZES[format];
  const { canvas, safeBreaksPx } = await renderClone(node, 2);
  const pdf = new jsPDF({
    unit: "mm",
    format: format === "a4" ? "a4" : [cfg.w, cfg.h],
    orientation: cfg.orientation,
    compress: true,
  });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  if (format !== "a4") {
    // Single fixed-size card / square — fit to page, preserve aspect.
    const img = canvas.toDataURL("image/png");
    const ratio = canvas.width / canvas.height;
    let renderW = pageW;
    let renderH = pageW / ratio;
    if (renderH > pageH) { renderH = pageH; renderW = pageH * ratio; }
    pdf.addImage(img, "PNG", (pageW - renderW) / 2, (pageH - renderH) / 2, renderW, renderH);
    pdf.save(filename);
    void archiveExport(pdf, filename, format);
    return;
  }

  // A4 multi-page: slice the tall capture into A4-sized pages, snapping
  // each slice to a "safe break" so headings, paragraphs, and table rows
  // are never cut in half across pages.
  const pxPerMm = canvas.width / pageW;          // captured pixels per mm
  const maxPageHeightPx = Math.floor(pageH * pxPerMm);
  // Don't snap higher than 75% of the page — avoids huge whitespace.
  const minPageHeightPx = Math.floor(maxPageHeightPx * 0.75);
  const totalHeightPx = canvas.height;

  let renderedPx = 0;
  let pageIndex = 0;
  while (renderedPx < totalHeightPx) {
    const remaining = totalHeightPx - renderedPx;
    let sliceHeightPx = Math.min(maxPageHeightPx, remaining);

    // If more content remains beyond this page, try to snap to a safe break.
    if (remaining > maxPageHeightPx && safeBreaksPx.length > 0) {
      const pageBottomAbs = renderedPx + maxPageHeightPx;
      const minAbs = renderedPx + minPageHeightPx;
      // Find the largest safe break <= pageBottomAbs and >= minAbs.
      let snapped = -1;
      for (let i = safeBreaksPx.length - 1; i >= 0; i--) {
        const bp = safeBreaksPx[i];
        if (bp <= pageBottomAbs && bp >= minAbs) { snapped = bp; break; }
        if (bp < minAbs) break;
      }
      if (snapped > 0) sliceHeightPx = snapped - renderedPx;
    }

    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = sliceHeightPx;
    const ctx = slice.getContext("2d");
    if (!ctx) break;
    // White background so transparent template areas don't render as black.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(
      canvas,
      0, renderedPx, canvas.width, sliceHeightPx,
      0, 0, canvas.width, sliceHeightPx,
    );
    const img = slice.toDataURL("image/png");
    const sliceHeightMm = sliceHeightPx / pxPerMm;
    if (pageIndex > 0) pdf.addPage("a4", "portrait");
    pdf.addImage(img, "PNG", 0, 0, pageW, sliceHeightMm, undefined, "FAST");
    renderedPx += sliceHeightPx;
    pageIndex += 1;
    // Safety: never loop forever
    if (pageIndex > 50) break;
  }

  pdf.save(filename);
  void archiveExport(pdf, filename, format);
}

// Fire-and-forget: also save the PDF to the user's Export Center so they can
// re-download it later or push it to Telegram. Free-tier exports auto-expire.
async function archiveExport(pdf: jsPDF, filename: string, format: PageFormat) {
  try {
    const blob = pdf.output("blob");
    const b64 = await blobToBase64(blob);
    await createExport({
      export_type: "workspace_doc",
      title: filename,
      mime_type: "application/pdf",
      file_b64: b64,
      metadata: { format },
    });
  } catch (e) {
    // never block the user's download flow
    console.warn("archive export failed", e);
  }
}

export function nextDocNumber(prefix: string): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `${prefix}-${stamp}-${Math.floor(1000 + Math.random() * 9000)}`;
}