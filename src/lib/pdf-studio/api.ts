import { supabase } from "@/integrations/supabase/client";

export type Block = {
  id: string;
  type: "heading" | "paragraph" | "list" | "line_item" | "total" | "signature" | string;
  text: string;
  meta?: Record<string, any>;
};

export type Revision = {
  id: string;
  document_id: string;
  version: number;
  blocks_json: Block[];
  ai_instruction: string | null;
  created_at: string;
};

export type StudioDocument = {
  id: string;
  title: string;
  client_profile_id: string | null;
  source_storage_path: string | null;
  created_at: string;
  doc_kind?: string;
  status?: string;
};

export type Annotation = {
  id: string;
  revision_id: string;
  document_id: string;
  anchor_json: any;
  comment: string;
  client_name: string | null;
  client_email: string | null;
  status: string;
  kind?: "comment" | "change_request" | "approval";
  created_at: string;
};

async function bearer() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}

/** Browser-side PDF text extraction using pdfjs-dist. */
export async function extractPdfText(file: File): Promise<string> {
  // @ts-ignore – ESM-only worker import
  const pdfjs: any = await import("pdfjs-dist/build/pdf.mjs");
  // @ts-ignore
  const worker: any = await import("pdfjs-dist/build/pdf.worker.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  let out = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    out += tc.items.map((it: any) => it.str).join(" ") + "\n\n";
    if (out.length > 80_000) break;
  }
  return out.trim();
}

export async function uploadSourcePdf(userId: string, file: File): Promise<string> {
  const safeName = file.name.replace(/[^a-z0-9.\-_]/gi, "_");
  const path = `${userId}/${crypto.randomUUID()}_${safeName}`;
  const { error } = await supabase.storage.from("pdf-studio").upload(path, file, {
    cacheControl: "3600", upsert: false, contentType: file.type || "application/pdf",
  });
  if (error) throw error;
  return path;
}

/** Signed URL so pdf.js (or an <iframe>) can render the original PDF from the private bucket. */
export async function getSourcePdfUrl(path: string, expiresIn = 60 * 60): Promise<string> {
  const { data, error } = await supabase.storage.from("pdf-studio").createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export type ClientLite = { id: string; name: string; company?: string | null; email?: string | null };

/** Lightweight client picker source — reads `client_profiles` on the primary DB. */
export async function listClientProfilesLite(): Promise<ClientLite[]> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data, error } = await (supabase as any).from("client_profiles")
    .select("id,name,company,email").eq("user_id", u.user.id)
    .order("updated_at", { ascending: false }).limit(200);
  if (error) return [];
  return (data as ClientLite[]) ?? [];
}

export async function createClientProfileLite(name: string, company?: string, email?: string): Promise<ClientLite | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data, error } = await (supabase as any).from("client_profiles")
    .insert({ user_id: u.user.id, name, company: company || null, email: email || null })
    .select("id,name,company,email").single();
  if (error) throw error;
  return data as ClientLite;
}

export async function parsePdf(input: {
  title: string; raw_text: string; source_path?: string | null;
  client_profile_id?: string | null;
}) {
  const { data, error } = await supabase.functions.invoke("pdf-studio-parse", { body: input });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as { document_id: string; revision_id: string; version: number; blocks: Block[] };
}

export async function revisePdf(document_id: string, instruction: string) {
  const { data, error } = await supabase.functions.invoke("pdf-studio-revise", {
    body: { document_id, instruction },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as { revision_id: string; version: number; blocks: Block[] };
}

export async function listDocuments(): Promise<StudioDocument[]> {
  const { data, error } = await supabase
    .from("pdf_studio_documents" as any)
    .select("id,title,client_profile_id,source_storage_path,created_at")
    .order("created_at", { ascending: false }).limit(50);
  if (error) throw error;
  return (data as any) ?? [];
}

export async function listRevisions(document_id: string): Promise<Revision[]> {
  const { data, error } = await supabase
    .from("pdf_studio_revisions" as any)
    .select("*").eq("document_id", document_id)
    .order("version", { ascending: false });
  if (error) throw error;
  return (data as any) ?? [];
}

export async function ensureShareLink(document_id: string): Promise<string> {
  const { data: existing } = await supabase
    .from("pdf_studio_share_links" as any)
    .select("slug").eq("document_id", document_id).maybeSingle();
  if (existing && (existing as any).slug) return (existing as any).slug;
  const slug = crypto.randomUUID().replace(/-/g, "").slice(0, 14);
  const { error } = await supabase
    .from("pdf_studio_share_links" as any)
    .insert({ document_id, slug, is_active: true });
  if (error) throw error;
  return slug;
}

export async function listAnnotations(document_id: string): Promise<Annotation[]> {
  const { data, error } = await supabase
    .from("pdf_studio_annotations" as any)
    .select("*").eq("document_id", document_id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as any) ?? [];
}

export async function resolveShare(slug: string) {
  const { data, error } = await supabase.rpc("pdf_studio_resolve_share" as any, { p_slug: slug });
  if (error) throw error;
  return data as null | {
    document_id: string; title: string; revision_id: string;
    version: number; blocks: Block[]; created_at: string;
  };
}

export async function submitAnnotation(input: {
  slug: string; anchor: any; comment: string;
  client_name?: string; client_email?: string;
  kind?: "comment" | "change_request" | "approval";
}) {
  const { data, error } = await supabase.rpc("pdf_studio_insert_annotation" as any, {
    p_slug: input.slug,
    p_anchor: input.anchor ?? {},
    p_comment: input.comment,
    p_client_name: input.client_name ?? "",
    p_client_email: input.client_email ?? "",
    p_kind: input.kind ?? "comment",
  });
  if (error) throw error;
  return data as string;
}

void bearer;