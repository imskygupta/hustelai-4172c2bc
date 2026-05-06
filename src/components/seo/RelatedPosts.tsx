import { Link } from "react-router-dom";
import type { SeoBlogRow, SeoPageRow } from "@/lib/seo-cms";

export function RelatedPosts({ posts, title = "Related guides" }: { posts: SeoBlogRow[]; title?: string }) {
  if (!posts?.length) return null;
  return (
    <section className="mt-16">
      <h2 className="text-xl font-display font-bold mb-4">{title}</h2>
      <div className="grid md:grid-cols-2 gap-3">
        {posts.map((p) => (
          <Link key={p.id} to={`/insights/${p.slug}`} className="glass rounded-xl p-4 hover:border-primary/40 transition-colors">
            <div className="text-xs text-muted-foreground mb-1">{p.category}</div>
            <div className="font-medium">{p.title}</div>
            {p.excerpt && <div className="text-sm text-muted-foreground line-clamp-2 mt-1">{p.excerpt}</div>}
          </Link>
        ))}
      </div>
    </section>
  );
}

export function RelatedPages({ pages, title = "Explore the cluster" }: { pages: SeoPageRow[]; title?: string }) {
  if (!pages?.length) return null;
  return (
    <section className="mt-16">
      <h2 className="text-xl font-display font-bold mb-4">{title}</h2>
      <div className="grid md:grid-cols-2 gap-3">
        {pages.map((p) => (
          <Link key={p.id} to={`/${p.slug}`} className="glass rounded-xl p-4 hover:border-primary/40 transition-colors">
            <div className="font-medium">{p.h1 || p.title}</div>
            {p.subhead && <div className="text-sm text-muted-foreground line-clamp-2 mt-1">{p.subhead}</div>}
          </Link>
        ))}
      </div>
    </section>
  );
}