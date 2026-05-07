import type { CSSProperties, ReactNode } from "react";
import { THEMES } from "@/lib/workspace-docs/themes";
import type { ThemeId } from "@/lib/workspace-docs/types";

export function ThemedSurface({
  themeId, format = "a4", children, watermark, footerText,
}: {
  themeId: ThemeId;
  format?: "a4" | "card" | "square";
  children: ReactNode;
  watermark?: boolean;
  footerText?: string;
}) {
  const t = THEMES[themeId];
  const dims: Record<string, CSSProperties> = {
    a4: { width: 794, minHeight: 1123 },        // 96dpi A4
    card: { width: 600, height: 360 },          // ~3.5x2.1 inch
    square: { width: 720, height: 720 },
  };
  // Reserve bottom padding so absolutely-positioned footer/watermark badge
  // never overlaps the last paragraph or table row.
  const padBottom = format === "a4" ? 96 : format === "card" ? 28 : 56;
  const style: CSSProperties = {
    background: t.bg,
    color: t.text,
    fontFamily: t.font,
    padding: format === "a4" ? 56 : format === "card" ? 28 : 40,
    paddingBottom: padBottom,
    position: "relative",
    boxShadow: "0 30px 80px -20px rgba(0,0,0,0.4)",
    borderRadius: format === "a4" ? 6 : 18,
    overflow: "hidden",
    wordBreak: "break-word",
    overflowWrap: "anywhere",
    ...dims[format],
  };
  return (
    <div style={style}>
      {children}
      {watermark && (
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 80, fontWeight: 900, color: t.text, opacity: 0.04,
          transform: "rotate(-30deg)", letterSpacing: 4,
        }}>
          HUSTLAI
        </div>
      )}
      {footerText && (
        <div style={{
          position: "absolute", bottom: 28, left: 0, right: 0,
          textAlign: "center", fontSize: 10, color: t.muted, letterSpacing: 0.5,
          padding: "0 56px",
        }}>{footerText}</div>
      )}
      {watermark && (
        <div style={{
          position: "absolute", bottom: 14, left: 0, right: 0,
          textAlign: "center", fontSize: 10, color: t.muted, letterSpacing: 1,
        }}>
          Made with HustleAI · hustlaiapp.in
        </div>
      )}
    </div>
  );
}