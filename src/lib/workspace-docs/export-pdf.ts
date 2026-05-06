import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export type PageFormat = "a4" | "card" | "square";

const SIZES: Record<PageFormat, { w: number; h: number; orientation: "portrait" | "landscape" }> = {
  a4: { w: 210, h: 297, orientation: "portrait" },
  card: { w: 90, h: 55, orientation: "landscape" },
  square: { w: 200, h: 200, orientation: "portrait" },
};

export async function exportNodeToPdf(node: HTMLElement, filename: string, format: PageFormat = "a4") {
  const cfg = SIZES[format];
  const canvas = await html2canvas(node, {
    scale: 2,
    useCORS: true,
    backgroundColor: null,
    logging: false,
  });
  const img = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ unit: "mm", format: format === "a4" ? "a4" : [cfg.w, cfg.h], orientation: cfg.orientation });

  // Maintain aspect ratio inside the page
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const ratio = canvas.width / canvas.height;
  let renderW = pageW;
  let renderH = pageW / ratio;
  if (renderH > pageH) {
    renderH = pageH;
    renderW = pageH * ratio;
  }
  const x = (pageW - renderW) / 2;
  const y = (pageH - renderH) / 2;
  pdf.addImage(img, "PNG", x, y, renderW, renderH);
  pdf.save(filename);
}

export function nextDocNumber(prefix: string): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `${prefix}-${stamp}-${Math.floor(1000 + Math.random() * 9000)}`;
}