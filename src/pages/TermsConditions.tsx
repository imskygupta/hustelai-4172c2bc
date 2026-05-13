import { LegalLayout } from "@/components/legal/LegalLayout";
import { BRAND, SUPPORT_EMAIL } from "@/config/branding";

export default function TermsConditions() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Terms of Service"
      summary={`The terms that govern access to and use of ${BRAND.name}.`}
      updated="May 13, 2026"
      effective="May 13, 2026"
      canonicalPath="/terms-conditions"
      sections={[
        { id: "acceptance", title: "1. Acceptance",
          body: <p>By accessing or using {BRAND.name} ({BRAND.domain}), you agree to these Terms. If you do not agree, do not use the platform.</p> },
        { id: "service", title: "2. Description of service",
          body: <p>{BRAND.name} is a SaaS workspace platform that provides client, project, document, billing, and AI-assisted operational tooling for independent operators and small teams.</p> },
        { id: "accounts", title: "3. Accounts",
          body: <p>You are responsible for maintaining the confidentiality of your credentials and for all activity under your account. You must be at least 18 years old to register and provide accurate information.</p> },
        { id: "plans", title: "4. Plans and billing",
          body: <p>We offer Free, Pro, Elite, and Infinity subscription tiers, plus pay-as-you-go AI assist credits. Subscriptions renew automatically on a monthly cycle until cancelled. Pricing and tier inclusions may change with prior notice.</p> },
        { id: "cancellation", title: "5. Cancellation",
          body: <p>You can cancel future renewals at any time from billing settings. The current paid period remains active until its end date. See the <a href="/refund-policy">Refund Policy</a>.</p> },
        { id: "acceptable-use", title: "6. Acceptable use",
          body: <p>Use of the platform is governed by our <a href="/acceptable-use">Acceptable Use Policy</a>. Violations can result in suspension or termination.</p> },
        { id: "ai-content", title: "7. AI-generated content",
          body: <p>You retain ownership of content you create inside your workspace, including text generated with our AI assists. You are responsible for ensuring your use of generated outputs complies with applicable law and any platform-specific rules where you publish them.</p> },
        { id: "ip", title: "8. Intellectual property",
          body: <p>All product code, branding, design, and proprietary content of {BRAND.name} are owned by us or our licensors. You receive a limited, non-transferable right to use the service.</p> },
        { id: "warranty", title: "9. Warranty disclaimer",
          body: <p>The platform is provided on an "as is" and "as available" basis, without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, and non-infringement.</p> },
        { id: "liability", title: "10. Limitation of liability",
          body: <p>To the maximum extent permitted by law, {BRAND.name} is not liable for indirect, incidental, special, or consequential damages. Our aggregate liability for any claim is limited to the amounts paid by you in the twelve months preceding the claim.</p> },
        { id: "termination", title: "11. Termination",
          body: <p>We may suspend or terminate accounts that violate these Terms, abuse the service, or pose a security risk to other users or to the platform.</p> },
        { id: "scope", title: "12. Service scope",
          body: <p>{BRAND.name} is a B2B SaaS workspace platform. Supported use cases include SaaS and AI products, digital products and downloads, courses, templates, plugins, and freelancer or agency client operations. Unsupported use cases include physical goods, in-person services, gambling, and any category prohibited by our payment partners.</p> },
        { id: "law", title: "13. Governing law",
          body: <p>These Terms are governed by and construed in accordance with the laws of India. Disputes are subject to the courts of Prayagraj, Uttar Pradesh.</p> },
        { id: "contact", title: "14. Contact",
          body: <p>Questions about these Terms: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p> },
      ]}
    />
  );
}
