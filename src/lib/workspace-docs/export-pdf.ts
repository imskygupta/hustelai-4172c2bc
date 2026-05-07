import jsPDF from "jspdf";
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
}

/**
 * Render the source node into an off-screen, full-scale clone so CSS
 * transforms (preview scaling) cannot corrupt text layout in the PDF.
 */
async function renderClone(node: HTMLElement, scale = 2): Promise<HTMLCanvasElement> {
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
    const canvas = await html2canvas(target, {
      scale,
      useCORS: true,
      backgroundColor: null,
      logging: false,
      windowWidth: target.scrollWidth,
      windowHeight: target.scrollHeight,
    });
    return canvas;
  } finally {
    document.body.removeChild(host);
  }
}

export async function exportNodeToPdf(node: HTMLElement, filename: string, format: PageFormat = "a4") {
  const cfg = SIZES[format];
  const canvas = await renderClone(node, 2);
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
    return;
  }

  // A4 multi-page: slice the tall capture into A4-sized pages so long
  // documents do not collide / overlap on a single squished page.
  const pxPerMm = canvas.width / pageW;          // captured pixels per mm
  const pageHeightPx = Math.floor(pageH * pxPerMm);
  const totalHeightPx = canvas.height;

  let renderedPx = 0;
  let pageIndex = 0;
  while (renderedPx < totalHeightPx) {
    const sliceHeightPx = Math.min(pageHeightPx, totalHeightPx - renderedPx);
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = sliceHeightPx;
    const ctx = slice.getContext("2d");
    if (!ctx) break;
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
  }

  pdf.save(filename);
}

export function nextDocNumber(prefix: string): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `${prefix}-${stamp}-${Math.floor(1000 + Math.random() * 9000)}`;
}