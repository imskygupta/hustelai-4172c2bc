import type { SeoToolRow } from "@/lib/seo-cms";
import { RelatedTools } from "./RelatedTools";

export function FrequentlyUsedTogether({ tools }: { tools: SeoToolRow[] }) {
  if (!tools?.length) return null;
  return <RelatedTools tools={tools} title="Frequently used together" />;
}