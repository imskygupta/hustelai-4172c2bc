import { nextDocNumber } from "./export-pdf";
import type { AgreementData, BusinessCardData, DocType, InvoiceData, QuotationData, ServiceCardData } from "./types";

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

export function defaultBrand(profile: any) {
  return {
    name: profile?.display_name || profile?.username || "Your Studio",
    tagline: profile?.bio?.slice(0, 80) || "Freelance services",
    email: profile?.email || "",
    phone: profile?.phone || "",
    site: "https://hustlaiapp.in",
  };
}

export function defaultDoc(type: DocType, profile: any, workspace: any): any {
  const brand = defaultBrand(profile);
  const client = workspace ? { name: workspace.client_name } : { name: "Client name" };
  switch (type) {
    case "quotation": {
      const q: QuotationData = {
        brand, client,
        number: nextDocNumber("Q"),
        date: today(),
        validUntil: plusDays(14),
        service: workspace?.project_scope?.split(".")[0] || "Project service",
        scope: workspace?.project_scope || "Brief project description.",
        items: (workspace?.deliverables || ["Discovery", "Design", "Build"]).map((d: string) => ({ title: d, qty: 1, rate: 10000 })),
        currency: workspace?.pricing?.currency || "INR",
        revisions: 2,
        timeline: workspace?.deadlines?.map((d: any) => `${d.milestone}: ${d.due}`).join(" · ") || "3 weeks",
        paymentStructure: "50% upfront · 50% on delivery",
        notes: "All deliverables come with one round of revision unless stated otherwise.",
      };
      return q;
    }
    case "agreement": {
      const a: AgreementData = {
        brand, client,
        number: nextDocNumber("A"),
        date: today(),
        scope: workspace?.project_scope || "Detailed project scope.",
        revisions: "Up to 2 rounds of revisions per deliverable. Additional revisions billed hourly.",
        paymentTerms: "50% advance to begin, 50% upon final delivery. Late payments accrue 2% per week.",
        delivery: "Deliverables shared via email or shared drive within agreed timeline.",
        cancellation: "Either party may cancel with 7 days written notice. Work completed up to that point is billable.",
        ipOwnership: "Final IP transfers to the client upon full payment. Service provider retains the right to feature work in portfolio.",
        jurisdiction: "Subject to the jurisdiction of courts in India.",
      };
      return a;
    }
    case "invoice": {
      const inv: InvoiceData = {
        brand,
        client: { name: workspace?.client_name || "Client", email: "" },
        number: nextDocNumber("INV"),
        date: today(),
        dueDate: plusDays(7),
        items: (workspace?.deliverables || ["Project work"]).map((d: string) => ({ title: d, qty: 1, rate: 10000 })),
        currency: workspace?.pricing?.currency || "INR",
        taxPercent: 0,
        notes: "Thank you for your business.",
        status: "draft",
      };
      return inv;
    }
    case "service_card": {
      const s: ServiceCardData = {
        brand,
        service: "Web Design Sprint",
        hook: "Premium 5-page Shopify site, ready in 14 days.",
        bullets: ["Brand-aligned design", "Mobile-first build", "Conversion copy", "Email automation"],
        price: "₹40,000",
        cta: "DM to book",
      };
      return s;
    }
    case "business_card": {
      const b: BusinessCardData = {
        brand,
        fullName: profile?.display_name || "Your Name",
        role: "Freelance Designer",
        socials: [{ label: "Instagram", url: "https://instagram.com" }, { label: "Twitter", url: "https://twitter.com" }],
      };
      return b;
    }
  }
}