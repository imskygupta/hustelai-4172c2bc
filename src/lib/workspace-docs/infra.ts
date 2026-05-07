import { supabase } from "@/integrations/supabase/client";
import type { DocType, ThemeId } from "./types";

// ---------- Types ----------
export interface BrandKit {
  id?: string;
  user_id?: string;
  business_name?: string | null;
  tagline?: string | null;
  logo_url?: string | null;
  signature_url?: string | null;
  stamp_url?: string | null;
  brand_color?: string | null;
  accent_color?: string | null;
  footer_text?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  tax_label?: string | null;
  tax_id?: string | null;
  default_currency?: string | null;
  default_theme?: ThemeId | null;
  default_payment_terms?: string | null;
}

export type BlockKind =
  | "payment_terms" | "revisions" | "scope" | "onboarding"
  | "cancellation" | "delivery" | "ip" | "custom";

export interface DocBlock {
  id: string;
  user_id: string;
  kind: BlockKind;
  title: string;
  body: string;
  is_default: boolean;
}

export interface ClientProfile {
  id: string;
  user_id: string;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  timezone?: string | null;
  currency?: string | null;
  notes?: string | null;
  default_payment_terms?: string | null;
  last_used_at?: string | null;
}

export const DOC_STATUSES = ["draft", "sent", "viewed", "approved", "paid", "void"] as const;
export type DocStatus = (typeof DOC_STATUSES)[number];

export const STATUS_LABELS: Record<DocStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  approved: "Approved",
  paid: "Paid",
  void: "Void",
};

export const STATUS_TONE: Record<DocStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-500/10 text-blue-500",
  viewed: "bg-amber-500/10 text-amber-600",
  approved: "bg-emerald-500/10 text-emerald-600",
  paid: "bg-emerald-600 text-white",
  void: "bg-destructive/10 text-destructive",
};

// ---------- Brand Kit ----------
export async function getBrandKit(userId: string): Promise<BrandKit | null> {
  const { data } = await (supabase as any)
    .from("brand_kits").select("*").eq("user_id", userId).maybeSingle();
  return data as BrandKit | null;
}

export async function upsertBrandKit(userId: string, kit: Partial<BrandKit>) {
  const { data, error } = await (supabase as any)
    .from("brand_kits")
    .upsert({ user_id: userId, ...kit }, { onConflict: "user_id" })
    .select("*").single();
  if (error) throw error;
  return data as BrandKit;
}

export async function uploadBrandAsset(userId: string, file: File, kind: "logo" | "signature" | "stamp"): Promise<string> {
  const ext = file.name.split(".").pop() || "png";
  const path = `${userId}/${kind}-${Date.now()}.${ext}`;
  const up = await supabase.storage.from("brand-assets").upload(path, file, { upsert: true, contentType: file.type });
  if (up.error) throw up.error;
  const { data } = supabase.storage.from("brand-assets").getPublicUrl(path);
  return data.publicUrl;
}

/** Apply Brand Kit defaults onto a document data object (non-destructive). */
export function applyBrandToDoc(data: any, kit: BrandKit | null): any {
  if (!kit || !data) return data;
  const next = structuredClone(data);
  next.brand = next.brand || {};
  if (kit.business_name && !next.brand.name) next.brand.name = kit.business_name;
  if (kit.tagline && !next.brand.tagline) next.brand.tagline = kit.tagline;
  if (kit.logo_url) next.brand.logo = kit.logo_url;
  if (kit.email && !next.brand.email) next.brand.email = kit.email;
  if (kit.phone && !next.brand.phone) next.brand.phone = kit.phone;
  if (kit.website && !next.brand.site) next.brand.site = kit.website;
  if (kit.signature_url) next.brand.signature = kit.signature_url;
  if (kit.stamp_url) next.brand.stamp = kit.stamp_url;
  if (kit.footer_text) next.brand.footer = kit.footer_text;
  if (kit.tax_label && kit.tax_id) next.brand.tax = `${kit.tax_label}: ${kit.tax_id}`;
  if (kit.default_currency && "currency" in next && !next.currency) next.currency = kit.default_currency;
  if (kit.default_payment_terms) {
    if ("paymentStructure" in next && !next.paymentStructure) next.paymentStructure = kit.default_payment_terms;
    if ("paymentTerms" in next && !next.paymentTerms) next.paymentTerms = kit.default_payment_terms;
  }
  return next;
}

// ---------- Blocks ----------
export async function listBlocks(userId: string, kind?: BlockKind): Promise<DocBlock[]> {
  let q = (supabase as any).from("doc_blocks").select("*").eq("user_id", userId).order("is_default", { ascending: false }).order("title");
  if (kind) q = q.eq("kind", kind);
  const { data } = await q;
  return (data as DocBlock[]) || [];
}

export async function saveBlock(userId: string, block: Partial<DocBlock>) {
  if (block.id) {
    const { data, error } = await (supabase as any).from("doc_blocks").update(block).eq("id", block.id).select("*").single();
    if (error) throw error; return data as DocBlock;
  }
  const { data, error } = await (supabase as any).from("doc_blocks").insert({ user_id: userId, ...block }).select("*").single();
  if (error) throw error; return data as DocBlock;
}

export async function deleteBlock(id: string) {
  await (supabase as any).from("doc_blocks").delete().eq("id", id);
}

// ---------- Client Profiles ----------
export async function listClients(userId: string): Promise<ClientProfile[]> {
  const { data } = await (supabase as any)
    .from("client_profiles").select("*").eq("user_id", userId)
    .order("last_used_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false });
  return (data as ClientProfile[]) || [];
}

export async function saveClient(userId: string, c: Partial<ClientProfile>) {
  if (c.id) {
    const { data, error } = await (supabase as any).from("client_profiles").update(c).eq("id", c.id).select("*").single();
    if (error) throw error; return data as ClientProfile;
  }
  const { data, error } = await (supabase as any).from("client_profiles").insert({ user_id: userId, ...c }).select("*").single();
  if (error) throw error; return data as ClientProfile;
}

export async function deleteClient(id: string) {
  await (supabase as any).from("client_profiles").delete().eq("id", id);
}

export async function touchClient(id: string) {
  await (supabase as any).from("client_profiles").update({ last_used_at: new Date().toISOString() }).eq("id", id);
}

/** Apply a client profile onto a doc's `client` field. */
export function applyClientToDoc(data: any, c: ClientProfile): any {
  const next = structuredClone(data);
  next.client = {
    ...(next.client || {}),
    name: c.name,
    company: c.company || next.client?.company,
    email: c.email || next.client?.email,
    address: c.address || next.client?.address,
  };
  if (c.currency && "currency" in next && !next.currency) next.currency = c.currency;
  next.client_profile_id = c.id;
  return next;
}

// ---------- Doc statuses ----------
export async function setDocStatus(docId: string, status: DocStatus) {
  const patch: any = { status };
  const now = new Date().toISOString();
  if (status === "sent") patch.sent_at = now;
  if (status === "viewed") patch.viewed_at = now;
  if (status === "approved") patch.approved_at = now;
  if (status === "paid") patch.paid_at = now;
  await (supabase as any).from("workspace_documents").update(patch).eq("id", docId);
}

// ---------- Conversion (Proposal → Quote → Agreement → Invoice) ----------
const TYPE_PREFIX: Record<DocType, string> = {
  proposal: "P", quotation: "Q", agreement: "A", invoice: "INV",
  service_card: "S", business_card: "B",
};

function nextNumber(prefix: string) {
  const d = new Date();
  const s = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `${prefix}-${s}-${Math.floor(1000 + Math.random() * 9000)}`;
}

/**
 * Convert a source document into a new target type, carrying over brand,
 * client, items, scope, currency, etc. Returns the new DB row.
 */
export async function convertDocument(sourceId: string, targetType: DocType) {
  const { data: src } = await (supabase as any)
    .from("workspace_documents").select("*").eq("id", sourceId).single();
  if (!src) throw new Error("Source document not found");

  const s = src.data || {};
  const today = new Date().toISOString().slice(0, 10);
  const plus = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  const items = s.items || (s.deliverables || []).map((d: string) => ({ title: d, qty: 1, rate: 0 }));
  const currency = s.currency || "INR";
  const baseClient = s.client || { name: "Client" };
  const brand = s.brand || {};

  let next: any = {};
  switch (targetType) {
    case "quotation":
      next = {
        brand, client: baseClient, number: nextNumber("Q"), date: today, validUntil: plus(14),
        service: s.title || s.service || "Project service",
        scope: s.summary || s.scope || s.approach || "",
        items, currency, revisions: 2, timeline: s.timeline || "3 weeks",
        paymentStructure: s.paymentStructure || s.paymentTerms || "50% upfront · 50% on delivery",
        notes: s.notes || "",
      }; break;
    case "agreement":
      next = {
        brand, client: baseClient, number: nextNumber("A"), date: today,
        scope: s.scope || s.summary || "Detailed project scope.",
        revisions: typeof s.revisions === "string" ? s.revisions : `${s.revisions || 2} rounds of revisions per deliverable.`,
        paymentTerms: s.paymentTerms || s.paymentStructure || "50% upfront, 50% on delivery.",
        delivery: s.delivery || "Deliverables shared via email or shared drive within agreed timeline.",
        cancellation: s.cancellation || "Either party may cancel with 7 days written notice.",
        ipOwnership: s.ipOwnership || "Final IP transfers to client upon full payment.",
        jurisdiction: s.jurisdiction || "Subject to the jurisdiction of courts in India.",
      }; break;
    case "invoice":
      next = {
        brand, client: baseClient, number: nextNumber("INV"), date: today, dueDate: plus(7),
        items: items.map((i: any) => ({ title: i.title, qty: i.qty || 1, rate: i.rate || 0 })),
        currency, taxPercent: s.taxPercent || 0, notes: "Thank you for your business.", status: "draft",
      }; break;
    case "proposal":
      next = {
        brand, client: baseClient, number: nextNumber("P"), date: today,
        title: s.service || s.title || "Project Proposal",
        summary: s.scope || s.summary || "", problem: "", approach: "",
        deliverables: items.map((i: any) => i.title),
        timeline: s.timeline || "", investment: `${currency} ${(items.reduce((a: number, i: any) => a + (i.qty || 1) * (i.rate || 0), 0) || 0).toLocaleString()}`,
        whyUs: "", cta: "Book a kick-off call",
      }; break;
    default:
      throw new Error("Unsupported conversion target");
  }

  const insert = {
    workspace_id: src.workspace_id,
    owner_id: src.owner_id,
    doc_type: targetType,
    title: `${targetType[0].toUpperCase()}${targetType.slice(1)} for ${baseClient.name || "client"}`,
    data: next,
    theme: src.theme,
    doc_number: next.number,
    parent_doc_id: src.id,
    client_profile_id: src.client_profile_id,
    status: "draft",
  };
  const { data: row, error } = await (supabase as any)
    .from("workspace_documents").insert(insert).select("*").single();
  if (error) throw error;
  return row;
}

export const CONVERSION_TARGETS: Record<DocType, DocType[]> = {
  proposal: ["quotation", "agreement", "invoice"],
  quotation: ["agreement", "invoice"],
  agreement: ["invoice"],
  invoice: [],
  service_card: [],
  business_card: [],
};