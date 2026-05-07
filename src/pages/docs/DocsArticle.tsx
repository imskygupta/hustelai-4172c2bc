import { useEffect, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { ChevronRight, Clock, Tag } from "lucide-react";
import {
  fetchDocsPage,
  type DocsCategory,
  type DocsPage,
} from "@/integrations/docs/client";
import { SEO } from "@/components/SEO";
import { Skeleton } from "@/components/ui/skeleton";

type Ctx = { cats: DocsCategory[]; pages: DocsPage[] };

export default function DocsArticle() {
  const { slug = "" } = useParams();
  const { cats, pages } = useOutletContext<Ctx>();
  const [page, setPage] = useState<DocsPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchDocsPage(slug).then((p) => {
      setPage(p);
      setLoading(false);
    });
  }, [slug]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-bold mb-2">Page not found</h1>
        <p className="text-muted-foreground mb-6">
          The doc you're looking for doesn't exist or was moved.
        </p>
        <Link to="/docs" className="text-primary hover:underline">
          ← Back to docs home
        </Link>
      </div>
    );
  }

  const cat = cats.find((c) => c.id === page.category_id);
  const sameCat = pages.filter((p) => p.category_id === page.category_id);
  const idx = sameCat.findIndex((p) => p.id === page.id);
  const prev = idx > 0 ? sameCat[idx - 1] : null;
  const next = idx >= 0 && idx < sameCat.length - 1 ? sameCat[idx + 1] : null;

  return (
    <article className="max-w-3xl">
      <SEO
        title={page.meta_title || `${page.title} — HustleAI Docs`}
        description={page.meta_description || page.description}
        path={`/docs/${page.slug}`}
      />

      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground mb-6">
        <ol className="flex items-center flex-wrap gap-1">
          <li>
            <Link to="/docs" className="hover:text-foreground">Docs</Link>
          </li>
          {cat && (
            <>
              <ChevronRight className="w-3 h-3 opacity-50" />
              <li className="text-foreground/80">{cat.title}</li>
            </>
          )}
          <ChevronRight className="w-3 h-3 opacity-50" />
          <li className="text-foreground/80">{page.title}</li>
        </ol>
      </nav>

      <header className="mb-8 pb-6 border-b border-border">
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mb-3">
          {page.title}
        </h1>
        {page.description && (
          <p className="text-lg text-muted-foreground">{page.description}</p>
        )}
        <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> {page.reading_time || 1} min read
          </span>
          <span>Updated {new Date(page.updated_at).toLocaleDateString()}</span>
          {page.tags?.length > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Tag className="w-3 h-3" /> {page.tags.join(", ")}
            </span>
          )}
        </div>
      </header>

      <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:scroll-mt-24 prose-a:text-primary prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-code:before:content-none prose-code:after:content-none prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded">
        <ReactMarkdown>{page.content || ""}</ReactMarkdown>
      </div>

      <nav className="mt-12 pt-6 border-t border-border grid grid-cols-2 gap-4">
        {prev ? (
          <Link
            to={`/docs/${prev.slug}`}
            className="rounded-lg border border-border p-4 hover:border-primary/40 transition-colors"
          >
            <div className="text-xs text-muted-foreground mb-1">← Previous</div>
            <div className="font-medium">{prev.title}</div>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            to={`/docs/${next.slug}`}
            className="rounded-lg border border-border p-4 hover:border-primary/40 transition-colors text-right"
          >
            <div className="text-xs text-muted-foreground mb-1">Next →</div>
            <div className="font-medium">{next.title}</div>
          </Link>
        )}
      </nav>
    </article>
  );
}