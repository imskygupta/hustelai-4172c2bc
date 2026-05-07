// Quaternary Supabase client — Docs OS only (public read).
// Isolated from auth/billing, workspace, and community DBs.
import { createClient } from "@supabase/supabase-js";

const URL = "https://rnyllarpzgamrkvgcjbg.supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_ahNYzemWxt8KC4hzFbLDNA_mKFSYtZm";

export const docsDb = createClient(URL, PUBLISHABLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    storageKey: "hustlai-docs-anon",
  },
});

export type DocsCategory = {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  sort_order: number;
};

export type DocsPage = {
  id: string;
  category_id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  toc: { level: number; text: string; slug: string }[];
  meta_title: string | null;
  meta_description: string | null;
  og_image: string | null;
  tags: string[];
  reading_time: number;
  is_published: boolean;
  sort_order: number;
  version: string;
  updated_at: string;
};

export async function listDocsCategories(): Promise<DocsCategory[]> {
  const { data } = await docsDb
    .from("docs_categories")
    .select("*")
    .order("sort_order");
  return (data as any) ?? [];
}

export async function listDocsPages(): Promise<DocsPage[]> {
  const { data } = await docsDb
    .from("docs_pages")
    .select("*")
    .eq("is_published", true)
    .order("sort_order");
  return (data as any) ?? [];
}

export async function fetchDocsPage(slug: string): Promise<DocsPage | null> {
  const { data } = await docsDb
    .from("docs_pages")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return (data as any) ?? null;
}