import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { SeoLanding } from "@/components/SeoLanding";
import { fetchPublishedPage, fetchAnyPage, type SeoPageRow } from "@/lib/seo-cms";
import NotFound from "@/pages/NotFound";
import { Loader2 } from "lucide-react";

interface Props { slug?: string; preview?: boolean }

export default function DynamicSeoPage({ slug: slugProp, preview = false }: Props) {
  const params = useParams();
  const [search] = useSearchParams();
  const slug = slugProp ?? params.slug ?? "";
  const isPreview = preview || search.get("preview") === "1";
  const [row, setRow] = useState<SeoPageRow | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = isPreview ? await fetchAnyPage(slug) : await fetchPublishedPage(slug);
      if (!cancelled) setRow(r);
    })();
    return () => { cancelled = true; };
  }, [slug, isPreview]);

  if (row === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!row) return <NotFound />;

  return (
    <SeoLanding
      path={`/${row.slug}`}
      title={row.title}
      description={row.meta_description}
      h1={row.h1}
      subhead={row.subhead}
      bullets={row.bullets ?? []}
      sections={(row.sections ?? []).map((s) => ({
        title: s.title,
        body: <div dangerouslySetInnerHTML={{ __html: s.body }} />,
      }))}
      faqs={row.faqs ?? []}
      related={row.related_links ?? []}
      ctaLabel={row.cta_label ?? undefined}
      ctaHref={row.cta_href ?? undefined}
      badge={row.badge ?? undefined}
      noindex={!row.is_indexed || isPreview}
      ogImage={row.og_image ?? undefined}
      extraJsonLd={row.json_ld ?? []}
    />
  );
}