import { useMemo } from "react";
import type { SeoInternalLinkRow } from "@/lib/seo-cms";

function escapeRegExp(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

export function autoLinkHtml(html: string, links: SeoInternalLinkRow[]): string {
  let out = html;
  const used = new Set<string>();
  const sorted = [...links].sort((a, b) => b.keyword.length - a.keyword.length);
  for (const link of sorted) {
    const kw = link.keyword.trim();
    if (!kw || used.has(kw.toLowerCase())) continue;
    const re = new RegExp(`(?<!<a[^>]*>)\\b(${escapeRegExp(kw)})\\b(?![^<]*<\\/a>)`, "i");
    if (re.test(out)) {
      const href = link.target_type === "blog" ? `/insights/${link.target_slug}` : `/${link.target_slug}`;
      out = out.replace(re, `<a href="${href}" class="text-primary underline underline-offset-2">$1</a>`);
      used.add(kw.toLowerCase());
    }
  }
  return out;
}

export function AutoLinkedHtml({ html, links, enabled = true, className }: { html: string; links: SeoInternalLinkRow[]; enabled?: boolean; className?: string }) {
  const final = useMemo(() => (enabled ? autoLinkHtml(html, links) : html), [html, links, enabled]);
  return <div className={className} dangerouslySetInnerHTML={{ __html: final }} />;
}