export type DocType = "quotation" | "agreement" | "invoice" | "service_card" | "business_card";
export type ThemeId = "minimal-dark" | "glass-gradient" | "corporate-clean" | "creative-studio" | "cyber-neon";

export interface DocBase {
  brand: { name: string; tagline?: string; logo?: string; email?: string; phone?: string; site?: string };
}

export interface QuotationData extends DocBase {
  client: { name: string; company?: string; email?: string };
  number: string;
  date: string;
  validUntil?: string;
  service: string;
  scope: string;
  items: { title: string; description?: string; qty: number; rate: number }[];
  currency: string;
  revisions: number;
  timeline: string;
  paymentStructure: string;
  notes?: string;
}

export interface AgreementData extends DocBase {
  client: { name: string; company?: string };
  number: string;
  date: string;
  scope: string;
  revisions: string;
  paymentTerms: string;
  cancellation: string;
  ipOwnership: string;
  delivery: string;
  jurisdiction?: string;
}

export interface InvoiceData extends DocBase {
  client: { name: string; company?: string; email?: string; address?: string };
  number: string;
  date: string;
  dueDate: string;
  items: { title: string; qty: number; rate: number }[];
  currency: string;
  taxPercent?: number;
  notes?: string;
  status?: "draft" | "sent" | "paid" | "overdue";
}

export interface ServiceCardData extends DocBase {
  service: string;
  hook: string;
  bullets: string[];
  price: string;
  cta: string;
}

export interface BusinessCardData extends DocBase {
  fullName: string;
  role: string;
  socials: { label: string; url: string }[];
}

export type AnyDocData = QuotationData | AgreementData | InvoiceData | ServiceCardData | BusinessCardData;

export const DOC_META: Record<DocType, { label: string; icon: string; tagline: string }> = {
  quotation: { label: "Quotations", icon: "📄", tagline: "Premium project quotes" },
  agreement: { label: "Agreements", icon: "🤝", tagline: "Template-driven contracts" },
  invoice: { label: "Invoices", icon: "🧾", tagline: "Get paid on time" },
  service_card: { label: "Service Cards", icon: "💎", tagline: "Social-shareable offers" },
  business_card: { label: "Business Cards", icon: "🪪", tagline: "Modern brand identity" },
};