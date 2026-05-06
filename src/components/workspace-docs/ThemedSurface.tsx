import type { CSSProperties, ReactNode } from "react";
import { THEMES } from "@/lib/workspace-docs/themes";
import type { ThemeId } from "@/lib/workspace-docs/types";

export function ThemedSurface({
  themeId, format = "a4", children, watermark,
}: {
  themeId: ThemeId;
  format?: "a4" | "card" | "square";
  children: ReactNode;
  watermark?: boolean;
}) {
  const t = THEMES[themeId];
  const dims: Record<string, CSSProperties> = {
    a4: { width: 794, minHeight: 1123 },        // 96dpi A4
    card: { width: 600, height: 360 },          // ~3.5x2.1 inch
    square: { width: 720, height: 720 },
  };
  const style: CSSProperties = {
    background: t.bg,
    color: t.text,
    fontFamily: t.font,
    padding: format === "a4" ? 56 : format === "card" ? 28 : 40,
    position: "relative",
    boxShadow: "0 30px 80px -20px rgba(0,0,0,0.4)",
    borderRadius: format === "a4" ? 6 : 18,
    overflow: "hidden",
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