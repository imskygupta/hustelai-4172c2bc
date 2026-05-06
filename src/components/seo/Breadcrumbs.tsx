import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { Helmet } from "react-helmet-async";

export interface Crumb { label: string; to?: string }

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const trail: Crumb[] = [{ label: "Home", to: "/" }, ...items];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      item: c.to ? `https://hustlaiapp.in${c.to}` : undefined,
    })),
  };
  return (
    <>
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground mb-6">
        <ol className="flex items-center flex-wrap gap-1">
          {trail.map((c, i) => (
            <li key={`${c.label}-${i}`} className="flex items-center gap-1">
              {i === 0 && <Home className="w-3 h-3" />}
              {c.to && i < trail.length - 1 ? (
                <Link to={c.to} className="hover:text-primary">{c.label}</Link>
              ) : (
                <span className="text-foreground/80">{c.label}</span>
              )}
              {i < trail.length - 1 && <ChevronRight className="w-3 h-3 opacity-50" />}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}