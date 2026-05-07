import { THEMES } from "@/lib/workspace-docs/themes";
import type { AgreementData, ThemeId } from "@/lib/workspace-docs/types";
import { ThemedSurface } from "../ThemedSurface";

export function AgreementTemplate({ data, themeId, watermark }: { data: AgreementData; themeId: ThemeId; watermark?: boolean }) {
  const t = THEMES[themeId];
  const Section = ({ title, body }: { title: string; body: string }) => (
    <div data-pdf-break style={{ marginTop: 18 }}>
      <h3 style={{ fontFamily: t.display, fontSize: 14, color: t.accent, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 2 }}>{title}</h3>
      <p style={{ fontSize: 12, lineHeight: 1.65, color: t.text, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{body}</p>
    </div>
  );
  return (
    <ThemedSurface themeId={themeId} watermark={watermark} footerText={(data as any).brand?.footer}>
      <header data-pdf-break style={{ textAlign: "center", paddingBottom: 24, borderBottom: `1px solid ${t.divider}` }}>
        {data.brand.logo && <img src={data.brand.logo} alt="" style={{ width: 56, height: 56, objectFit: "contain", borderRadius: 8, margin: "0 auto 8px", display: "block" }} />}
        <p style={{ fontSize: 11, letterSpacing: 4, color: t.muted, margin: 0 }}>SERVICE AGREEMENT</p>
        <h1 style={{ fontFamily: t.display, fontSize: 28, margin: "8px 0 4px" }}>{data.brand.name} × {data.client.name}</h1>
        <p style={{ fontSize: 11, color: t.muted, margin: 0 }}>#{data.number} · {data.date}</p>
      </header>

      <Section title="1. Scope of work" body={data.scope} />
      <Section title="2. Revisions" body={data.revisions} />
      <Section title="3. Payment terms" body={data.paymentTerms} />
      <Section title="4. Delivery" body={data.delivery} />
      <Section title="5. Cancellation" body={data.cancellation} />
      <Section title="6. IP ownership" body={data.ipOwnership} />
      {data.jurisdiction && <Section title="7. Jurisdiction" body={data.jurisdiction} />}

      <div data-pdf-break style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 48 }}>
        <SignatureBlock t={t} label="Service provider" name={data.brand.name} signatureUrl={(data as any).brand?.signature} />
        <SignatureBlock t={t} label="Client" name={data.client.name} />
      </div>
    </ThemedSurface>
  );
}

function SignatureBlock({ t, label, name, signatureUrl }: any) {
  return (
    <div>
      <p style={{ fontSize: 10, letterSpacing: 2, color: t.muted, textTransform: "uppercase", margin: "0 0 32px" }}>{label}</p>
      {signatureUrl && <img src={signatureUrl} alt="signature" style={{ maxHeight: 48, maxWidth: 180, objectFit: "contain", marginBottom: 4 }} />}
      <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 6 }}>
        <p style={{ fontSize: 13, color: t.text, margin: 0, fontWeight: 600 }}>{name}</p>
        <p style={{ fontSize: 10, color: t.muted, margin: "2px 0 0" }}>Signature & date</p>
      </div>
    </div>
  );
}