/**
 * Minimal text-to-PDF helper for the Universal Delivery Layer.
 *
 * Used when a generator wants "Send PDF to Telegram" but doesn't already
 * produce a Blob — we synthesize a clean, branded text PDF from the same
 * `text` payload that powers WhatsApp/Telegram-text delivery.
 *
 * Heavyweight html2canvas captures are intentionally avoided here: the
 * goal is a fast, reliable PDF that always renders, not a pixel-perfect
 * copy of the on-screen preview.
 */
import jsPDF from "jspdf";

export function buildTextPdfBlob({
  title,
  text,
  footer = "Sent via HustleAI · hustlaiapp.in",
}: {
  title: string;
  text: string;
  footer?: string;
}): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 18;
  const marginTop = 22;
  const marginBottom = 18;
  const maxW = pageW - marginX * 2;
  let y = marginTop;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  const titleLines = doc.splitTextToSize(title || "Document", maxW);
  doc.text(titleLines, marginX, y);
  y += titleLines.length * 7 + 4;

  // Thin rule
  doc.setDrawColor(220);
  doc.line(marginX, y, pageW - marginX, y);
  y += 6;

  // Body
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(40);
  const lines = doc.splitTextToSize(text || "", maxW);
  const lineHeight = 5.6;
  for (const ln of lines) {
    if (y + lineHeight > pageH - marginBottom) {
      doc.addPage();
      y = marginTop;
    }
    doc.text(ln, marginX, y);
    y += lineHeight;
  }

  // Footer on every page
  const pageCount = (doc as any).internal.getNumberOfPages?.() ?? 1;
  doc.setFontSize(9);
  doc.setTextColor(140);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(footer, marginX, pageH - 10);
    doc.text(`${i} / ${pageCount}`, pageW - marginX, pageH - 10, { align: "right" });
  }

  return doc.output("blob");
}
