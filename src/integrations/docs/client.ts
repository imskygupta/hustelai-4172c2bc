// Phase 7B: Docs/Handbook now lives on Admin DB (rqqiujmiagauzohdqjmi).
// Standalone Docs DB (rnyllarpzgamrkvgcjbg) is RETIRED.
// Frontend reads go through the `docs-read-public` edge function which
// holds the only Admin-DB-aware service-role credential.
import { supabase } from "@/integrations/supabase/client";
import { runWithDeadline } from "@/lib/async/timeout";

// Phase 8F.1 — `docsDb` proxy export removed. Docs reads MUST go through the
// `docs-read-public` edge function (Admin DB-aware). Only helper functions
// below remain in this module.

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

async function call(op: string, slug?: string) {
  try {
    const qs = new URLSearchParams({ op, ...(slug ? { slug } : {}) }).toString();
    const { data, error } = await runWithDeadline(
      () => supabase.functions.invoke(`docs-read-public?${qs}`, { method: "GET" }),
      `docs.${op}`,
      { timeoutMs: 5_000 },
    );
    if (error) return null;
    return (data as any)?.data ?? null;
  } catch {
    return null;
  }
}

export async function listDocsCategories(): Promise<DocsCategory[]> {
  return ((await call("categories")) as DocsCategory[]) ?? [];
}

export async function listDocsPages(): Promise<DocsPage[]> {
  return ((await call("pages")) as DocsPage[]) ?? [];
}

export async function fetchDocsPage(slug: string): Promise<DocsPage | null> {
  return ((await call("page", slug)) as DocsPage | null) ?? null;
}