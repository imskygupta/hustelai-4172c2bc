import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { THEMES } from "@/lib/workspace-docs/themes";
import type { BusinessCardData, ThemeId } from "@/lib/workspace-docs/types";
import { ThemedSurface } from "../ThemedSurface";

export function BusinessCardTemplate({ data, themeId, watermark }: { data: BusinessCardData; themeId: ThemeId; watermark?: boolean }) {
  const t = THEMES[themeId];
  const [qr, setQr] = useState<string>("");
  useEffect(() => {
    const url = data.brand.site || data.socials[0]?.url || `mailto:${data.brand.email || ""}`;
    if (!url) return;
    QRCode.toDataURL(url, { margin: 0, color: { dark: t.text, light: "#00000000" }, width: 200 }).then(setQr).catch(() => {});
  }, [data, t.text]);

  return (
    <ThemedSurface themeId={themeId} format="card" watermark={watermark}>
      <div style={{ display: "flex", height: "100%", gap: 20 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 9, letterSpacing: 3, color: t.muted, margin: 0, textTransform: "uppercase" }}>{data.brand.name}</p>
            <h1 style={{ fontFamily: t.display, fontSize: 22, color: t.text, margin: "6px 0 2px" }}>{data.fullName}</h1>
            <p style={{ fontSize: 11, color: t.accent, margin: 0, fontWeight: 500 }}>{data.role}</p>
          </div>
          <div style={{ fontSize: 9, color: t.muted, lineHeight: 1.6 }}>
            {data.brand.email && <div>✉ {data.brand.email}</div>}
            {data.brand.phone && <div>☎ {data.brand.phone}</div>}
            {data.brand.site && <div>⌘ {data.brand.site}</div>}
            {data.socials.slice(0, 2).map((s, i) => (
              <div key={i}>↗ {s.label}</div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center", gap: 6 }}>
          {qr && <img src={qr} alt="QR" style={{ width: 80, height: 80 }} />}
          <p style={{ fontSize: 8, color: t.muted, margin: 0, letterSpacing: 1 }}>SCAN ME</p>
        </div>
      </div>
    </ThemedSurface>
  );
}