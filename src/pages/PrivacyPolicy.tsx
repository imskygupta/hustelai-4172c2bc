import { LegalLayout } from "@/components/legal/LegalLayout";
import { BRAND, SUPPORT_EMAIL } from "@/config/branding";

export default function PrivacyPolicy() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Privacy Policy"
      summary={`How ${BRAND.name} collects, processes, stores, and protects information when you use the platform.`}
      updated="May 13, 2026"
      effective="May 13, 2026"
      canonicalPath="/privacy-policy"
      sections={[
        { id: "scope", title: "1. Scope",
          body: <p>This policy covers information processed by {BRAND.name} across the web application at <a href={BRAND.url}>{BRAND.domain}</a>, the editorial subdomain, public APIs, transactional email, and supporting backend infrastructure.</p> },
        { id: "data-we-collect", title: "2. Information we collect",
          body: <ul>
            <li><strong>Account data</strong> — name, email, profile metadata, authentication identifiers.</li>
            <li><strong>Workspace content</strong> — clients, projects, documents, intake forms and assets you create inside the platform.</li>
            <li><strong>Operational telemetry</strong> — feature usage, AI assist counts, document exports, error reports.</li>
            <li><strong>Billing metadata</strong> — subscription state, invoice references, wallet credit balances. Card details are handled exclusively by our payment processors.</li>
            <li><strong>Device and request metadata</strong> — IP address, user agent, referrer, page-level analytics.</li>
          </ul> },
        { id: "purpose", title: "3. How we use information",
          body: <ul>
            <li>Provide, secure, and improve the workspace platform.</li>
            <li>Personalize the operational surfaces you see (entitlements, recommended workflows).</li>
            <li>Send transactional notifications and material product updates.</li>
            <li>Enforce usage limits, prevent abuse, and respond to support requests.</li>
            <li>Generate aggregate, non-identifying analytics for capacity planning.</li>
          </ul> },
        { id: "legal-basis", title: "4. Legal basis",
          body: <p>We process personal data on the basis of contract performance (delivering the service), legitimate interest (securing the platform, preventing abuse), legal obligation (tax, accounting), and consent where required (optional marketing).</p> },
        { id: "storage", title: "5. Storage and security",
          body: <p>Data is stored on managed cloud infrastructure with encryption in transit and at rest. Access is gated by row-level security policies, scoped service tokens, and audited admin controls. See the <a href="/security">Security</a> document for control specifics.</p> },
        { id: "sharing", title: "6. Sharing with third parties",
          body: <ul>
            <li><strong>Payment processors</strong> — Cashfree, Dodo Payments.</li>
            <li><strong>Email infrastructure</strong> — Resend, Zoho Mail, Brevo (transactional + newsletter).</li>
            <li><strong>AI inference providers</strong> — Google Gemini, OpenAI, Zhipu, LongCat, routed via our gateway.</li>
            <li><strong>Analytics</strong> — Yandex Metrica (anonymized session telemetry on public surfaces).</li>
          </ul> },
        { id: "ai", title: "7. AI processing",
          body: <p>AI assists send only the minimum content required to satisfy the user request. We do not train foundation models on your workspace data. Generated outputs are logged for billing, abuse detection, and quality review for a limited retention window.</p> },
        { id: "retention", title: "8. Retention",
          body: <p>We retain personal data for as long as your account is active or as required to comply with legal, accounting, and operational obligations. You can request deletion of your account from settings; certain audit logs are retained for up to 24 months.</p> },
        { id: "rights", title: "9. Your rights",
          body: <p>You can access, update, export, or delete personal information from inside your account. For requests that cannot be completed in-app, contact <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. We respond to verified requests within 30 days.</p> },
        { id: "international", title: "10. International transfers",
          body: <p>Backend infrastructure is operated in multiple regions. Where data crosses borders, we rely on standard contractual clauses or equivalent safeguards offered by our infrastructure partners.</p> },
        { id: "children", title: "11. Children",
          body: <p>{BRAND.name} is not directed to anyone under 18. We do not knowingly collect data from minors.</p> },
        { id: "changes", title: "12. Changes",
          body: <p>Material changes are communicated by email or in-app notification. The "Last updated" date at the top of this document always reflects the current version.</p> },
        { id: "contact", title: "13. Contact",
          body: <p>For privacy questions or data requests, contact <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p> },
      ]}
    />
  );
}
