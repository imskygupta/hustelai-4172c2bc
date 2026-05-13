import { LegalLayout } from "@/components/legal/LegalLayout";
import { BRAND, SUPPORT_EMAIL } from "@/config/branding";

export default function Compliance() {
  return (
    <LegalLayout
      eyebrow="Trust"
      title="Compliance"
      summary={`Regulatory posture, subprocessors, and operational transparency for ${BRAND.name}.`}
      updated="May 13, 2026"
      canonicalPath="/compliance"
      sections={[
        { id: "jurisdiction", title: "1. Jurisdiction",
          body: <p>{BRAND.name} is operated from India and bills customers globally through licensed payment partners. We comply with applicable Indian information-technology, data-protection, and consumer-protection regulations.</p> },
        { id: "payments", title: "2. Payment partners",
          body: <ul>
            <li><strong>Cashfree</strong> — UPI, cards, and wallet flows for Indian customers.</li>
            <li><strong>Dodo Payments</strong> — international subscriptions and merchant-of-record support.</li>
          </ul> },
        { id: "subprocessors", title: "3. Subprocessors",
          body: <ul>
            <li>Hosting and managed databases — Supabase, Vercel.</li>
            <li>Email — Resend, Zoho Mail, Brevo.</li>
            <li>AI inference — Google Gemini, OpenAI, Zhipu, LongCat (routed via the Lovable AI Gateway).</li>
            <li>Analytics — Yandex Metrica.</li>
            <li>Error reporting — Sentry.</li>
          </ul> },
        { id: "data-residency", title: "4. Data residency",
          body: <p>Customer workspace data is stored on managed infrastructure in regions selected for latency and durability. We do not currently offer per-customer regional pinning. Contact us if your contract requires a specific data-residency commitment.</p> },
        { id: "tax", title: "5. Tax",
          body: <p>Subscription invoices include applicable GST for Indian customers. International customers receive invoices issued through our merchant-of-record partners with VAT or local equivalents where required.</p> },
        { id: "audit", title: "6. Audit and reporting",
          body: <p>Operational events, billing transitions, and admin actions are persisted in an append-only audit log. Customers on enterprise contracts can request a scoped extract of their audit history.</p> },
        { id: "contact", title: "7. Contact",
          body: <p>Compliance and legal inquiries: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p> },
      ]}
    />
  );
}
