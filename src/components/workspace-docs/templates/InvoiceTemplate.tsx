import { THEMES } from "@/lib/workspace-docs/themes";
import type { InvoiceData, ThemeId } from "@/lib/workspace-docs/types";
import { ThemedSurface } from "../ThemedSurface";

export function InvoiceTemplate({ data, themeId, watermark }: { data: InvoiceData; themeId: ThemeId; watermark?: boolean }) {
  const t = THEMES[themeId];
  const subtotal = data.items.reduce((s, i) => s + i.qty * i.rate, 0);
  const tax = (subtotal * (data.taxPercent || 0)) / 100;
  const total = subtotal + tax;
  const cur = data.currency || "INR";

  return (
    <ThemedSurface themeId={themeId} watermark={watermark} footerText={(data as any).brand?.footer}>
      <header style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 11, letterSpacing: 3, color: t.muted, margin: 0, textTransform: "uppercase" }}>Invoice</p>
          <h1 style={{ fontFamily: t.display, fontSize: 36, margin: "6px 0 0" }}>{data.brand.name}</h1>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ display: "inline-block", padding: "6px 12px", background: t.badgeBg, color: t.badgeText, borderRadius: 999, fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>
            {data.status || "draft"}
          </div>
          <p style={{ fontSize: 11, color: t.muted, margin: "10px 0 0", lineHeight: 1.5 }}>
            <strong style={{ color: t.text }}>#{data.number}</strong><br />
            Issued: {data.date}<br />
            Due: <strong style={{ color: t.accent }}>{data.dueDate}</strong>
          </p>
        </div>
      </header>

      <section style={{ marginTop: 28, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div>
          <p style={{ fontSize: 10, letterSpacing: 2, color: t.muted, margin: "0 0 6px", textTransform: "uppercase" }}>Bill from</p>
          <p style={{ fontSize: 13, color: t.text, margin: 0, fontWeight: 600 }}>{data.brand.name}</p>
          {data.brand.email && <p style={{ fontSize: 11, color: t.muted, margin: "2px 0 0" }}>{data.brand.email}</p>}
        </div>
        <div>
          <p style={{ fontSize: 10, letterSpacing: 2, color: t.muted, margin: "0 0 6px", textTransform: "uppercase" }}>Bill to</p>
          <p style={{ fontSize: 13, color: t.text, margin: 0, fontWeight: 600 }}>{data.client.name}</p>
          {data.client.company && <p style={{ fontSize: 11, color: t.muted, margin: "2px 0 0" }}>{data.client.company}</p>}
          {data.client.email && <p style={{ fontSize: 11, color: t.muted, margin: "2px 0 0" }}>{data.client.email}</p>}
        </div>
      </section>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 28, fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${t.divider}` }}>
            <th style={{ textAlign: "left", padding: "10px 0", color: t.muted, fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: 1 }}>Description</th>
            <th style={{ textAlign: "right", padding: "10px 0", color: t.muted, fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: 1 }}>Qty</th>
            <th style={{ textAlign: "right", padding: "10px 0", color: t.muted, fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: 1 }}>Rate</th>
            <th style={{ textAlign: "right", padding: "10px 0", color: t.muted, fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: 1 }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((it, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${t.divider}` }}>
              <td style={{ padding: "12px 0", color: t.text }}>{it.title}</td>
              <td style={{ textAlign: "right", padding: "12px 0", color: t.text }}>{it.qty}</td>
              <td style={{ textAlign: "right", padding: "12px 0", color: t.text }}>{cur} {it.rate.toLocaleString()}</td>
              <td style={{ textAlign: "right", padding: "12px 0", color: t.text, fontWeight: 600 }}>{cur} {(it.qty * it.rate).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
        <div style={{ minWidth: 260 }}>
          <Row t={t} label="Subtotal" value={`${cur} ${subtotal.toLocaleString()}`} />
          {!!data.taxPercent && <Row t={t} label={`Tax (${data.taxPercent}%)`} value={`${cur} ${tax.toLocaleString()}`} />}
          <div style={{ height: 1, background: t.divider, margin: "10px 0" }} />
          <Row t={t} label="Total due" value={`${cur} ${total.toLocaleString()}`} bold />
        </div>
      </div>

      {data.notes && (
        <section style={{ marginTop: 28, fontSize: 12, color: t.muted, lineHeight: 1.6 }}>{data.notes}</section>
      )}
    </ThemedSurface>
  );
}

function Row({ t, label, value, bold }: any) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
      <span style={{ color: t.muted }}>{label}</span>
      <span style={{ color: bold ? t.accent : t.text, fontWeight: bold ? 700 : 500, fontSize: bold ? 18 : 13 }}>{value}</span>
    </div>
  );
}