import { LegalLayout } from "@/components/legal/LegalLayout";

export default function About() {
  return (
    <LegalLayout
      eyebrow="Company"
      title="About HustleAI"
      summary="HustleAI is a software platform and brand focused on operational tooling for modern freelancers, creators, consultants, and async teams. We build the systems that turn independent work into a real business."
      updated="May 13, 2026"
      canonicalPath="/about"
      metaDescription="HustleAI is operational software for freelancers, creators, consultants and async teams — a workspace OS built on async-first principles."
      sections={[
        {
          id: "mission",
          title: "Mission",
          body: (
            <>
              <p>
                HustleAI exists to make independent operators feel like real software companies.
                We believe the modern freelancer, agency owner, and creator deserves the same
                operational discipline — workflows, telemetry, automations, audit trails — that
                product teams have enjoyed for a decade.
              </p>
              <p>
                Our work is to compress that operational stack into a single calm workspace,
                without the overhead of stitching together a CRM, a docs tool, an invoicing
                tool, an analytics tool, and three AI subscriptions.
              </p>
            </>
          ),
        },
        {
          id: "philosophy",
          title: "Operational philosophy",
          body: (
            <>
              <p>
                We design for <strong>async-first</strong> work. The platform assumes its
                users live across timezones, juggle multiple clients, and value durable
                systems over real-time chatter.
              </p>
              <ul>
                <li><strong>Workflows over features.</strong> Every surface is built around a real operational outcome.</li>
                <li><strong>Documents are first-class.</strong> Proposals, contracts, invoices and roadmaps are durable artifacts, not chat messages.</li>
                <li><strong>AI assists, it does not replace.</strong> Generation is always reviewable, exportable, and attributable.</li>
                <li><strong>Telemetry is honest.</strong> Usage, limits and entitlements are visible, never hidden behind upgrade walls.</li>
              </ul>
            </>
          ),
        },
        {
          id: "audience",
          title: "Who we build for",
          body: (
            <>
              <p>
                HustleAI is used by independent operators who treat their work as a serious
                business: solo freelancers running multiple client engagements, two- to
                ten-person agencies, async product consultants, technical writers,
                researchers, designers, and creators monetizing their craft.
              </p>
              <p>
                We are not optimized for traditional employment, transactional gig work, or
                large enterprise teams.
              </p>
            </>
          ),
        },
        {
          id: "infrastructure",
          title: "Infrastructure principles",
          body: (
            <>
              <ul>
                <li>Operational data, content infrastructure, and media pipelines are isolated across separate database boundaries.</li>
                <li>The runtime database is reserved for core application state. Editorial, narrative, and media systems run on dedicated databases to keep IO predictable.</li>
                <li>All external work — generation, indexing, screenshot ingestion, billing webhooks — is queued and observable.</li>
                <li>We prefer reversible changes, durable logs, and explicit feature flags over silent rollouts.</li>
              </ul>
            </>
          ),
        },
        {
          id: "privacy",
          title: "Privacy and security posture",
          body: (
            <p>
              We treat customer data as the most sensitive surface of the product.
              Row-level security, scoped service tokens, audited admin controls, and
              encrypted transport are non-negotiable defaults. See the{" "}
              <a href="/security">Security</a> and <a href="/data-policy">Data Policy</a>{" "}
              documents for specifics.
            </p>
          ),
        },
        {
          id: "ecosystem",
          title: "Product ecosystem",
          body: (
            <p>
              The HustleAI workspace covers client intake, pipeline tracking, document
              authoring, proposal and contract generation, invoicing, AI assists,
              workflow automations, and a public knowledge surface that includes the{" "}
              <a href="https://blogs.hustlaiapp.in">HustleAI editorial</a> and our public
              documentation.
            </p>
          ),
        },
        {
          id: "contact",
          title: "Contact",
          body: (
            <p>
              For partnerships, press, security disclosures, or general questions,
              reach the team through the <a href="/contact">contact page</a>.
            </p>
          ),
        },
      ]}
    />
  );
}
