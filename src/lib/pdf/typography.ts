// Centralized PDF typography system. All branded PDF/print views should
// embed `pdfBaseCss()` so generated documents share consistent rhythm,
// margins, and font sizing — no more cramped/overlapping text.
//
// Tokens use print-friendly absolute units. Tweak in ONE place to retune.

export const PDF_TYPO = {
  fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  displayFont: "'Space Grotesk', 'Inter', system-ui, sans-serif",
  base: { size: 11, lineHeight: 1.6 },
  h1: { size: 26, lineHeight: 1.25, mt: 0,  mb: 14 },
  h2: { size: 18, lineHeight: 1.3,  mt: 26, mb: 12 },
  h3: { size: 14, lineHeight: 1.35, mt: 18, mb: 8 },
  paragraph: { mb: 12 },
  list: { mb: 12, indent: 22, itemSpace: 6 },
  section: { mb: 24 },
  page: { paddingY: "44px", paddingX: "56px", maxWidth: "880px" },
} as const;

export interface PdfThemeTokens {
  primary: string;        // e.g. "#3B82F6"
  primarySoft: string;    // light bg
  primaryBorder: string;  // border
  text: string;           // body text
  muted: string;          // muted text
  bg: string;             // page bg
}

export const DEFAULT_PDF_THEME: PdfThemeTokens = {
  primary: "#3B82F6",
  primarySoft: "#EFF6FF",
  primaryBorder: "#DBEAFE",
  text: "#0F172A",
  muted: "#64748B",
  bg: "#FFFFFF",
};

/**
 * Returns a complete CSS string ready to drop into a <style> tag for
 * window.open()-style PDF print views. Always include `<div class="page">`
 * as the outer wrapper.
 */
export function pdfBaseCss(theme: Partial<PdfThemeTokens> = {}): string {
  const t = { ...DEFAULT_PDF_THEME, ...theme };
  const T = PDF_TYPO;
  return `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap');
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{background:${t.bg};color:${t.text};-webkit-font-smoothing:antialiased}
    body{
      font-family:${T.fontFamily};
      font-size:${T.base.size}pt;
      line-height:${T.base.lineHeight};
      padding:${T.page.paddingY} ${T.page.paddingX};
      max-width:${T.page.maxWidth};
      margin:0 auto;
      position:relative;
    }
    h1,h2,h3,h4{font-family:${T.displayFont};color:${t.text};font-weight:700;letter-spacing:-0.01em}
    h1{font-size:${T.h1.size}pt;line-height:${T.h1.lineHeight};margin:0 0 ${T.h1.mb}px;color:${t.primary}}
    h2{font-size:${T.h2.size}pt;line-height:${T.h2.lineHeight};margin:${T.h2.mt}px 0 ${T.h2.mb}px;color:${t.primary};border-bottom:2px solid ${t.primaryBorder};padding-bottom:6px}
    h3{font-size:${T.h3.size}pt;line-height:${T.h3.lineHeight};margin:${T.h3.mt}px 0 ${T.h3.mb}px;color:${t.text}}
    p{margin:0 0 ${T.paragraph.mb}px;line-height:${T.base.lineHeight}}
    ul,ol{margin:0 0 ${T.list.mb}px ${T.list.indent}px}
    li{margin:0 0 ${T.list.itemSpace}px;line-height:${T.base.lineHeight}}
    li > p{margin:0}
    strong{color:${t.text};font-weight:600}
    em{font-style:italic;color:${t.muted}}
    a{color:${t.primary};text-decoration:none}
    code{background:${t.primarySoft};color:${t.primary};padding:2px 6px;border-radius:4px;font-size:0.92em}
    pre{background:${t.primarySoft};border:1px solid ${t.primaryBorder};padding:14px 16px;border-radius:8px;overflow-x:auto;margin:0 0 ${T.paragraph.mb}px;line-height:1.5}
    blockquote{border-left:3px solid ${t.primary};padding:6px 14px;color:${t.muted};margin:0 0 ${T.paragraph.mb}px;background:${t.primarySoft}}
    hr{border:none;border-top:1px solid ${t.primaryBorder};margin:${T.section.mb}px 0}
    table{width:100%;border-collapse:collapse;margin:0 0 ${T.paragraph.mb}px;font-size:0.95em}
    th,td{padding:8px 10px;border:1px solid ${t.primaryBorder};text-align:left;line-height:1.45}
    th{background:${t.primarySoft};color:${t.text};font-weight:600}
    .section{margin-bottom:${T.section.mb}px}
    .muted{color:${t.muted}}
    .header{border-bottom:3px solid ${t.primary};padding-bottom:18px;margin-bottom:${T.section.mb}px}
    .footer{margin-top:${T.section.mb}px;border-top:1px solid ${t.primaryBorder};padding-top:14px;text-align:center;color:${t.muted};font-size:0.85em}
    .badge{display:inline-flex;align-items:center;gap:6px;background:${t.primarySoft};color:${t.primary};padding:4px 12px;border-radius:999px;font-size:0.8em;font-weight:600;border:1px solid ${t.primaryBorder};margin-bottom:10px}
    .watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:96pt;font-weight:700;color:rgba(15,23,42,0.04);white-space:nowrap;pointer-events:none;z-index:0;font-family:${T.displayFont}}
    .actions{position:fixed;top:16px;right:16px;display:flex;gap:8px;z-index:10}
    .actions button{background:${t.primary};color:#fff;border:none;padding:8px 16px;border-radius:8px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 2px 8px ${t.primary}33}
    .actions button:hover{filter:brightness(0.95)}
    .content{position:relative;z-index:1}
    @media print{
      .actions{display:none}
      body{padding:18mm 16mm;max-width:none}
      h2{page-break-after:avoid}
      h3{page-break-after:avoid}
      pre,blockquote,table{page-break-inside:avoid}
    }
    @page{margin:14mm 14mm 16mm 14mm}
  `;
}
