import { THEMES } from "@/lib/workspace-docs/themes";
import type { ServiceCardData, ThemeId } from "@/lib/workspace-docs/types";
import { ThemedSurface } from "../ThemedSurface";

export function ServiceCardTemplate({ data, themeId, watermark }: { data: ServiceCardData; themeId: ThemeId; watermark?: boolean }) {
  const t = THEMES[themeId];
  return (
    <ThemedSurface themeId={themeId} format="square" watermark={watermark}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 11, letterSpacing: 4, color: t.muted, margin: 0, textTransform: "uppercase" }}>{data.brand.name}</p>
          <h1 style={{ fontFamily: t.display, fontSize: 44, lineHeight: 1.1, margin: "16px 0 8px", color: t.text }}>{data.service}</h1>
          <p style={{ fontSize: 18, color: t.muted, margin: 0, lineHeight: 1.4 }}>{data.hook}</p>
        </div>

        <div style={{ margin: "32px 0" }}>
          {data.bullets.map((b, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "8px 0", borderBottom: `1px solid ${t.divider}` }}>
              <span style={{ color: t.accent, fontSize: 18, lineHeight: 1 }}>✦</span>
              <span style={{ fontSize: 15, color: t.text }}>{b}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <p style={{ fontSize: 11, letterSpacing: 2, color: t.muted, margin: 0, textTransform: "uppercase" }}>From</p>
            <p style={{ fontFamily: t.display, fontSize: 36, color: t.accent, margin: 0, fontWeight: 700 }}>{data.price}</p>
          </div>
          <div style={{ padding: "12px 20px", background: t.badgeBg, color: t.badgeText, borderRadius: 999, fontSize: 13, fontWeight: 600 }}>
            {data.cta}
          </div>
        </div>
      </div>
    </ThemedSurface>
  );
}