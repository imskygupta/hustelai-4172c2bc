import { Helmet } from "react-helmet-async";

const BLOG_SITE = "https://blogs.hustlaiapp.in";

export interface BlogSEOProps {
  title: string;
  description: string;
  path?: string;
  image?: string;
  noindex?: boolean;
  type?: "website" | "article";
  jsonLd?: Record<string, any> | Record<string, any>[];
  publishedAt?: string;
  updatedAt?: string;
  author?: string;
  /** Hero image to <link rel="preload"> for LCP. */
  preloadImage?: string;
}

export function BlogSEO({
  title, description, path = "", image, noindex = false, type = "website",
  jsonLd, publishedAt, updatedAt, author, preloadImage,
}: BlogSEOProps) {
  const url = `${BLOG_SITE}${path}`;
  const blocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
  const safeTitle = title.length > 65 ? title.slice(0, 62) + "…" : title;
  const safeDesc = description.length > 165 ? description.slice(0, 162) + "…" : description;
  return (
    <Helmet>
      <title>{safeTitle}</title>
      <meta name="description" content={safeDesc} />
      <link rel="canonical" href={url} />
      {preloadImage && <link rel="preload" as="image" href={preloadImage} {...({ fetchpriority: "high" } as any)} />}
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      <meta property="og:title" content={safeTitle} />
      <meta property="og:description" content={safeDesc} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      {image && <meta property="og:image" content={image} />}
      <meta property="og:site_name" content="HustleAI Blog" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={safeTitle} />
      <meta name="twitter:description" content={safeDesc} />
      {image && <meta name="twitter:image" content={image} />}
      {publishedAt && <meta property="article:published_time" content={publishedAt} />}
      {updatedAt && <meta property="article:modified_time" content={updatedAt} />}
      {author && <meta name="author" content={author} />}
      {blocks.map((b, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(b)}</script>
      ))}
    </Helmet>
  );
}

export const blogOrgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "HustleAI",
  url: BLOG_SITE,
  logo: "https://hustlaiapp.in/favicon.png",
};