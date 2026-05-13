import { LegalLayout } from "@/components/legal/LegalLayout";
import { BRAND, SUPPORT_EMAIL } from "@/config/branding";

export default function SecurityPage() {
  return (
    <LegalLayout
      eyebrow="Trust"
      title="Security"
      summary={`How ${BRAND.name} protects customer data, infrastructure, and operations.`}
      updated="May 13, 2026"
      canonicalPath="/security"
      metaDescription="Security posture for HustleAI: encryption, access controls, audit logging, vulnerability disclosure."
      sections={[
        { id: "overview", title: "1. Overview",
          body: <p>{BRAND.name} treats security as a first-class operational concern, not a compliance afterthought. This document describes the controls in place across infrastructure, application, and operations.</p> },
        { id: "infrastructure", title: "2. Infrastructure",
          body: <ul>
            <li>Managed cloud infrastructure with geographically redundant regions.</li>
            <li>Operational, content, and media databases are isolated across distinct boundaries to limit blast radius.</li>
            <li>All inter-service traffic uses TLS. Data at rest is encrypted by the underlying storage provider.</li>
            <li>Edge functions are stateless and deploy through an audited pipeline.</li>
          </ul> },
        { id: "access", title: "3. Access controls",
          body: <ul>
            <li>Row-level security policies on every customer-facing table.</li>
            <li>Service-role tokens are scoped to specific functions and never exposed to the client.</li>
            <li>Administrative actions require an authenticated super-admin session and are logged with actor, target, and timestamp.</li>
            <li>Impersonation is gated behind an auditable backdoor used only for incident response.</li>
          </ul> },
        { id: "auth", title: "4. Authentication",
          body: <p>We support email + password with custom 6-digit OTP verification, Google OAuth, and JWT-backed session tokens. Token rotation is automatic. Compromised sessions are forcibly invalidated.</p> },
        { id: "data", title: "5. Data handling",
          body: <p>See the <a href="/data-policy">Data Policy</a> for the full lifecycle. In summary: workspace data is owned by the customer, processed under contract, never sold, and removable on request.</p> },
        { id: "ai-isolation", title: "6. AI provider isolation",
          body: <p>AI inference is routed through a gateway that enforces per-provider rate limits, prompt redaction, and credential isolation. Customer data is sent only as required to satisfy the immediate request.</p> },
        { id: "logging", title: "7. Logging and observability",
          body: <p>Application errors are captured via Sentry with PII filtering. Operational events flow through a durable event pipeline with admin-visible dashboards. Security-relevant events trigger admin alerts.</p> },
        { id: "incident", title: "8. Incident response",
          body: <p>We operate a documented incident-response playbook. Severity-1 incidents are acknowledged within 1 hour and resolved with a postmortem published to affected customers.</p> },
        { id: "disclosure", title: "9. Vulnerability disclosure",
          body: <p>If you believe you have found a security issue, email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with the subject line <em>Security Disclosure</em>. We acknowledge reports within 48 hours and do not pursue legal action against good-faith researchers.</p> },
        { id: "compliance", title: "10. Compliance",
          body: <p>See the <a href="/compliance">Compliance</a> document for regulatory posture, payment processor obligations, and data-residency commitments.</p> },
      ]}
    />
  );
}
