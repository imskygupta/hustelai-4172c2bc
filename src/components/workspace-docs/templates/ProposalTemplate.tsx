import { THEMES } from "@/lib/workspace-docs/themes";
import type { ProposalData, ThemeId } from "@/lib/workspace-docs/types";
import { ThemedSurface } from "../ThemedSurface";

export function ProposalTemplate({ data, themeId, watermark }: { data: ProposalData; themeId: ThemeId; watermark?: boolean }) {
  const t = THEMES[themeId];
  const Section = ({ title, body }: { title: string; body: string }) => (
    <section data-pdf-break style={{ marginTop: 22 }}>
      <h3 style={{ fontFamily: t.display, fontSize: 13, color: t.accent, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 2 }}>{title}</h3>
      <p style={{ fontSize: 12.5, lineHeight: 1.65, color: t.text, margin: 0, whiteSpace: "pre-wrap" }}>{body}</p>
    </section>
  );
  return (
    <ThemedSurface themeId={themeId} watermark={watermark} footerText={(data as any).brand?.footer}>
      <header data-pdf-break style={{ paddingBottom: 22, borderBottom: `1px solid ${t.divider}` }}>
        {data.brand.logo && <img src={data.brand.logo} alt="" style={{ width: 48, height: 48, objectFit: "contain", borderRadius: 6, marginBottom: 8 }} />}
        <p style={{ fontSize: 11, letterSpacing: 4, color: t.muted, margin: 0, textTransform: "uppercase" }}>Proposal · {data.brand.name}</p>
        <h1 style={{ fontFamily: t.display, fontSize: 34, margin: "10px 0 6px", color: t.text, lineHeight: 1.15 }}>{data.title}</h1>
        <p style={{ fontSize: 12, color: t.muted, margin: 0 }}>
          Prepared for <strong style={{ color: t.text }}>{data.client.name}</strong>{data.client.company ? ` · ${data.client.company}` : ""} · #{data.number} · {data.date}
        </p>
      </header>

      <Section title="Executive summary" body={data.summary} />
      <Section title="The problem" body={data.problem} />
      <Section title="Our approach" body={data.approach} />

      <section data-pdf-break style={{ marginTop: 22 }}>
        <h3 style={{ fontFamily: t.display, fontSize: 13, color: t.accent, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 2 }}>Deliverables</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {data.deliverables.map((d, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, color: t.text, padding: "6px 10px", border: `1px solid ${t.border}`, borderRadius: 8, background: t.surface }}>
              <span style={{ color: t.accent }}>✦</span>{d}
            </div>
          ))}
        </div>
      </section>

      <Section title="Timeline" body={data.timeline} />
      <Section title="Investment" body={data.investment} />
      <Section title="Why us" body={data.whyUs} />

      {(data.sections || []).map((s, i) => <Section key={i} title={s.heading} body={s.body} />)}

      <div data-pdf-break style={{ marginTop: 36, padding: "18px 20px", background: t.badgeBg, color: t.badgeText, borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ fontSize: 10, letterSpacing: 2, margin: 0, textTransform: "uppercase", opacity: 0.7 }}>Next step</p>
          <p style={{ fontSize: 16, margin: "2px 0 0", fontWeight: 600 }}>{data.cta}</p>
        </div>
        <p style={{ fontSize: 11, margin: 0, opacity: 0.7 }}>{data.brand.email || data.brand.site || ""}</p>
      </div>
    </ThemedSurface>
  );
}