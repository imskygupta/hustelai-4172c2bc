import { LegalLayout } from "@/components/legal/LegalLayout";
import { BRAND, SUPPORT_EMAIL } from "@/config/branding";

export default function DataPolicy() {
  return (
    <LegalLayout
      eyebrow="Trust"
      title="Data Policy"
      summary={`How ${BRAND.name} processes, stores, and returns customer data across the lifecycle of an account.`}
      updated="May 13, 2026"
      canonicalPath="/data-policy"
      sections={[
        { id: "ownership", title: "1. Customer ownership",
          body: <p>You own the content you create inside your workspace — clients, projects, documents, intake submissions, generated artifacts, and exported files. {BRAND.name} processes that content as a service provider, not as a controller.</p> },
        { id: "categories", title: "2. Data categories",
          body: <ul>
            <li><strong>Identity</strong> — name, email, profile metadata.</li>
            <li><strong>Workspace</strong> — clients, deals, documents, files, AI outputs.</li>
            <li><strong>Operational</strong> — usage counters, entitlements, audit events.</li>
            <li><strong>Billing</strong> — subscription state, invoice references, wallet ledger entries. Card data lives only with our payment processors.</li>
          </ul> },
        { id: "isolation", title: "3. Storage isolation",
          body: <p>Operational data lives on the primary runtime database. Editorial, narrative, media, and community workloads run on dedicated databases to keep IO predictable and to limit cross-system blast radius.</p> },
        { id: "retention", title: "4. Retention",
          body: <p>Workspace data is retained for the lifetime of the account. Audit logs, billing records, and security telemetry are retained for up to 24 months to satisfy operational and statutory obligations.</p> },
        { id: "export", title: "5. Export",
          body: <p>You can export documents, invoices, intake submissions, and generated artifacts from inside the workspace. Bulk exports are available on request through <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p> },
        { id: "deletion", title: "6. Deletion",
          body: <p>You can request account deletion from settings. Personal data is removed within 30 days. Anonymous, aggregated telemetry may persist in analytics systems where individual identification is no longer possible.</p> },
        { id: "subprocessors", title: "7. Subprocessors",
          body: <p>We use vetted subprocessors for hosting, payments, email delivery, and AI inference. The current list is published in the <a href="/compliance">Compliance</a> document and is updated when a subprocessor is added or removed.</p> },
        { id: "ai-training", title: "8. AI training",
          body: <p>{BRAND.name} does not train foundation models on customer workspace data. AI assists are inference-only, and we contractually require providers to honor a no-training posture for our traffic.</p> },
      ]}
    />
  );
}
