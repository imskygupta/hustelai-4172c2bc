import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { SeoToolRow } from "@/lib/seo-cms";

export function RelatedTools({ tools, title = "Related tools" }: { tools: SeoToolRow[]; title?: string }) {
  if (!tools?.length) return null;
  return (
    <section className="mt-16">
      <h2 className="text-xl font-display font-bold mb-4">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {tools.map((t) => {
          const isExternal = /^https?:\/\//i.test(t.url);
          const inner = (
            <div className="glass rounded-xl p-4 hover:border-primary/40 transition-colors h-full">
              <div className="text-2xl mb-2">{t.icon}</div>
              <div className="font-medium">{t.label}</div>
              {t.description && <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{t.description}</div>}
              <div className="text-xs text-primary mt-3 inline-flex items-center gap-1">Open <ArrowRight className="w-3 h-3" /></div>
            </div>
          );
          return isExternal ? (
            <a key={t.id} href={t.url} target="_blank" rel="noopener">{inner}</a>
          ) : (
            <Link key={t.id} to={t.url}>{inner}</Link>
          );
        })}
      </div>
    </section>
  );
}