import { THEMES } from "@/lib/workspace-docs/themes";
import type { QuotationData, ThemeId } from "@/lib/workspace-docs/types";
import { ThemedSurface } from "../ThemedSurface";

export function QuotationTemplate({ data, themeId, watermark }: { data: QuotationData; themeId: ThemeId; watermark?: boolean }) {
  const t = THEMES[themeId];
  const subtotal = data.items.reduce((s, i) => s + i.qty * i.rate, 0);
  const cur = data.currency || "INR";
  return (
    <ThemedSurface themeId={themeId} watermark={watermark}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 24, borderBottom: `1px solid ${t.divider}` }}>
        <div>
          <p style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: t.muted, margin: 0 }}>Quotation</p>
          <h1 style={{ fontFamily: t.display, fontSize: 32, margin: "6px 0 4px", color: t.text }}>{data.brand.name}</h1>
          {data.brand.tagline && <p style={{ fontSize: 12, color: t.muted, margin: 0 }}>{data.brand.tagline}</p>}
        </div>
        <div style={{ textAlign: "right", fontSize: 11, color: t.muted, lineHeight: 1.6 }}>
          <div><strong style={{ color: t.text }}>#{data.number}</strong></div>
          <div>Date: {data.date}</div>
          {data.validUntil && <div>Valid until: {data.validUntil}</div>}
        </div>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginTop: 28 }}>
        <div>
          <p style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: t.muted, margin: "0 0 6px" }}>Prepared for</p>
          <p style={{ fontSize: 16, fontWeight: 600, margin: 0, color: t.text }}>{data.client.name}</p>
          {data.client.company && <p style={{ fontSize: 13, color: t.muted, margin: "2px 0 0" }}>{data.client.company}</p>}
          {data.client.email && <p style={{ fontSize: 12, color: t.muted, margin: "2px 0 0" }}>{data.client.email}</p>}
        </div>
        <div>
          <p style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: t.muted, margin: "0 0 6px" }}>Service</p>
          <p style={{ fontSize: 16, fontWeight: 600, margin: 0, color: t.text }}>{data.service}</p>
          <p style={{ fontSize: 12, color: t.muted, margin: "4px 0 0", lineHeight: 1.5 }}>{data.scope}</p>
        </div>
      </section>

      <section style={{ marginTop: 36 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${t.divider}` }}>
              <th style={{ textAlign: "left", padding: "10px 0", color: t.muted, fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Item</th>
              <th style={{ textAlign: "right", padding: "10px 0", color: t.muted, fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Qty</th>
              <th style={{ textAlign: "right", padding: "10px 0", color: t.muted, fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Rate</th>
              <th style={{ textAlign: "right", padding: "10px 0", color: t.muted, fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((it, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${t.divider}` }}>
                <td style={{ padding: "12px 0" }}>
                  <div style={{ color: t.text, fontWeight: 500 }}>{it.title}</div>
                  {it.description && <div style={{ color: t.muted, fontSize: 11, marginTop: 2 }}>{it.description}</div>}
                </td>
                <td style={{ textAlign: "right", color: t.text }}>{it.qty}</td>
                <td style={{ textAlign: "right", color: t.text }}>{cur} {it.rate.toLocaleString()}</td>
                <td style={{ textAlign: "right", color: t.text, fontWeight: 600 }}>{cur} {(it.qty * it.rate).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
          <div style={{ minWidth: 240 }}>
            <Row label="Subtotal" value={`${cur} ${subtotal.toLocaleString()}`} t={t} />
            <div style={{ height: 1, background: t.divider, margin: "8px 0" }} />
            <Row label="Total" value={`${cur} ${subtotal.toLocaleString()}`} t={t} bold />
          </div>
        </div>
      </section>

      <section style={{ marginTop: 36, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <Block t={t} label="Revisions" value={`${data.revisions}`} />
        <Block t={t} label="Timeline" value={data.timeline} />
        <Block t={t} label="Payment" value={data.paymentStructure} />
      </section>

      {data.notes && (
        <section style={{ marginTop: 28, padding: 16, background: t.surface, borderRadius: 8, border: `1px solid ${t.border}` }}>
          <p style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: t.muted, margin: "0 0 6px" }}>Notes</p>
          <p style={{ fontSize: 12, color: t.text, margin: 0, lineHeight: 1.6 }}>{data.notes}</p>
        </section>
      )}
    </ThemedSurface>
  );
}

function Row({ label, value, t, bold }: any) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
      <span style={{ color: t.muted }}>{label}</span>
      <span style={{ color: t.text, fontWeight: bold ? 700 : 500, fontSize: bold ? 16 : 13 }}>{value}</span>
    </div>
  );
}

function Block({ t, label, value }: any) {
  return (
    <div style={{ padding: 14, border: `1px solid ${t.border}`, borderRadius: 8, background: t.surface }}>
      <p style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: t.muted, margin: "0 0 4px" }}>{label}</p>
      <p style={{ fontSize: 13, color: t.text, margin: 0, fontWeight: 500 }}>{value}</p>
    </div>
  );
}