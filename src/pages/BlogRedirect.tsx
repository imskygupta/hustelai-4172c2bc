import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SEO } from "@/components/SEO";

const BLOG_HOST = "https://blogs.hustlaiapp.in";

/**
 * /blog (and /blog/*) on the main app domain is a permanent gateway into the
 * dedicated editorial publication at blogs.hustlaiapp.in.
 *
 * We perform a client-side redirect (the closest we can get to a 301 from a
 * static SPA host) and set a canonical pointing at the publication so search
 * engines consolidate authority on the subdomain instead of duplicating it.
 */
export default function BlogRedirect() {
  const { pathname, search } = useLocation();
  const target =
    pathname === "/blog" || pathname === "/blog/"
      ? `${BLOG_HOST}/`
      : `${BLOG_HOST}${pathname.replace(/^\/blog/, "")}${search}`;

  useEffect(() => {
    window.location.replace(target);
  }, [target]);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <SEO
        title="HustleAI Notes — Operational publication"
        description="The HustleAI editorial publication has moved to blogs.hustlaiapp.in — operational writing on freelance workflows, async client systems and AI exports."
        path="/blog"
        canonical={`${BLOG_HOST}/`}
      />
      <link rel="canonical" href={`${BLOG_HOST}/`} />
      <meta httpEquiv="refresh" content={`0; url=${target}`} />
      <div className="max-w-md text-center space-y-4">
        <div className="font-serif text-2xl tracking-tight">HustleAI Notes</div>
        <p className="text-sm text-muted-foreground">
          Our editorial publication now lives on its own domain.
          Redirecting you to <span className="text-foreground">blogs.hustlaiapp.in</span>…
        </p>
        <a
          href={target}
          className="inline-block rounded-md bg-foreground text-background px-4 py-2 text-xs font-medium"
        >
          Open the publication →
        </a>
      </div>
    </div>
  );
}