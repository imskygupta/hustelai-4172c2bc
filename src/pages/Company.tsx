import { LegalLayout } from "@/components/legal/LegalLayout";
import { BRAND } from "@/config/branding";

export default function Company() {
  return (
    <LegalLayout
      eyebrow="Company"
      title="The HustleAI company"
      summary={`${BRAND.name} is the operational software platform behind HustleAI. We build durable workspace infrastructure for freelancers, agencies, consultants, and async teams.`}
      updated="May 13, 2026"
      canonicalPath="/company"
      metaDescription="HustleAI is operational SaaS for independent operators — workspaces, intake, documents, AI assists and async automations."
      sections={[
        {
          id: "what-we-do",
          title: "What we do",
          body: (
            <p>
              We build a workspace operating system: client intake, pipeline tracking,
              documents, proposals, contracts, invoicing, AI assists, and async
              automations — delivered as a single calm interface instead of a stack of
              disconnected tools.
            </p>
          ),
        },
        {
          id: "positioning",
          title: "Positioning",
          body: (
            <>
              <p>
                {BRAND.name} is positioned as an <strong>operational workspace platform</strong>
                {" "}for independent operators. We are not a productivity gimmick, an AI
                content farm, or a generic side-hustle marketplace.
              </p>
              <ul>
                <li>Async-first systems software</li>
                <li>Operational tooling for freelancers, agencies, consultants and creators</li>
                <li>Durable client and revenue infrastructure</li>
              </ul>
            </>
          ),
        },
        {
          id: "company",
          title: "Company entity",
          body: (
            <>
              <p>
                {BRAND.name} is operated from Prayagraj, Uttar Pradesh, India. Billing
                and tax obligations are handled through our merchant of record and
                regional payment partners, including Cashfree and Dodo Payments.
              </p>
              <p>
                Operational headquarters and engineering are remote-first. The team
                writes, ships, and operates the platform on a fully async cadence.
              </p>
            </>
          ),
        },
        {
          id: "products",
          title: "Product surfaces",
          body: (
            <ul>
              <li>Workspace OS — client, project and document operations</li>
              <li>AI assists and workflow automations</li>
              <li>Knowledge Hub and operational documentation</li>
              <li>Editorial system at <a href="https://blogs.hustlaiapp.in">blogs.hustlaiapp.in</a></li>
              <li>Public APIs and integrations for partner platforms</li>
            </ul>
          ),
        },
        {
          id: "stance",
          title: "What we will not do",
          body: (
            <ul>
              <li>We will not sell or rent customer data.</li>
              <li>We will not silently change pricing on existing customers.</li>
              <li>We will not promote outcomes that depend on misleading claims about AI.</li>
              <li>We will not operate features that we cannot also operate on weekends — every shipped surface must be observable and recoverable.</li>
            </ul>
          ),
        },
        {
          id: "press",
          title: "Press and partnerships",
          body: (
            <p>
              For press, integrations, distribution partnerships and academic outreach,
              use the <a href="/contact">contact page</a>. Security disclosures should
              follow the dedicated process in our <a href="/security">Security</a> document.
            </p>
          ),
        },
      ]}
    />
  );
}
