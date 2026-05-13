import { LegalLayout } from "@/components/legal/LegalLayout";
import { BRAND, SUPPORT_EMAIL, BILLING_EMAIL } from "@/config/branding";

export default function RefundPolicy() {
  return (
    <LegalLayout
      eyebrow="Billing"
      title="Refund Policy"
      summary={`Refund and cancellation terms for ${BRAND.name} subscriptions and AI assist credits.`}
      updated="May 13, 2026"
      effective="May 13, 2026"
      canonicalPath="/refund-policy"
      sections={[
        { id: "summary", title: "1. Summary",
          body: <p><strong>All subscription payments and AI assist credit purchases are final and non-refundable.</strong> You can cancel future renewals at any time and continue to use the platform until the end of the current paid period.</p> },
        { id: "digital", title: "2. Why digital services are non-refundable",
          body: <p>{BRAND.name} delivers a digital SaaS workspace — workspaces, CRM, document generation, AI assists, and client portals. Access is provisioned instantly on payment, so services cannot be returned in the traditional sense.</p> },
        { id: "subscriptions", title: "3. Subscriptions",
          body: <p>Pro, Elite, and Infinity subscriptions are non-refundable once charged. Cancellation stops future renewals. Access continues until the current cycle ends.</p> },
        { id: "credits", title: "4. AI assist credits",
          body: <p>Pay-as-you-go AI assist credits are non-refundable once issued, including unused balances at the time of cancellation or downgrade.</p> },
        { id: "exceptions", title: "5. Limited exceptions",
          body: <ul>
            <li>You were charged more than once for the same transaction due to a verifiable technical error.</li>
            <li>The platform was demonstrably unavailable for an extended period during your active subscription.</li>
            <li>A fraudulent transaction occurred on your account and is confirmed by our payment processor.</li>
          </ul> },
        { id: "disputes", title: "6. Disputes",
          body: <p>Raise billing disputes within 7 days of the transaction. We review and respond within 3–5 business days.</p> },
        { id: "contact", title: "7. Billing contact",
          body: <p>Billing: <a href={`mailto:${BILLING_EMAIL}`}>{BILLING_EMAIL}</a><br/>Support: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p> },
      ]}
    />
  );
}
