import { Helmet } from "react-helmet-async";

const SITE = "https://hustlaiapp.in";
const DEFAULT_OG = `${SITE}/favicon.png`;

export interface SEOProps {
  title: string;
  description: string;
  path?: string;
  image?: string;
  noindex?: boolean;
  /** Override the robots meta directive entirely (e.g. "noindex,follow"). Takes precedence over `noindex`. */
  robots?: string;
  type?: "website" | "article";
  jsonLd?: Record<string, any> | Record<string, any>[];
}

export function SEO({ title, description, path = "", image = DEFAULT_OG, noindex = false, robots, type = "website", jsonLd }: SEOProps) {
  const url = `${SITE}${path}`;
  const blocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
  const robotsContent = robots ?? (noindex ? "noindex,nofollow" : null);
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {robotsContent && <meta name="robots" content={robotsContent} />}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      {blocks.map((b, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(b)}</script>
      ))}
    </Helmet>
  );
}

export const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "HustleAI Workspace",
  url: SITE,
  logo: DEFAULT_OG,
  email: "hustlaiapp@zohomail.in",
  sameAs: [],
};

export const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "HustleAI Workspace",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  description: "Client operations workspace for freelancers and agencies — proposals, onboarding, invoices, projects and client portals.",
};

export const faqJsonLd = (qa: { q: string; a: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: qa.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
});

export const breadcrumbJsonLd = (items: { name: string; path: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: it.name,
    item: `${SITE}${it.path}`,
  })),
});