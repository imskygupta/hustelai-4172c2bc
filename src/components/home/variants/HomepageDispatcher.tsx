import { lazy, Suspense } from "react";
import { useActiveHomepage } from "@/lib/homepage/useActiveHomepage";
import Index from "@/pages/Index";

const HomepageV2 = lazy(() => import("@/pages/HomepageV2"));
const HomepageV3 = lazy(() => import("@/pages/HomepageV3"));
const HomepageV4 = lazy(() => import("@/pages/HomepageV4"));

/**
 * Renders `/` according to the admin-controlled `homepage_variant_setting`.
 * v1 = the current Index page, rendered synchronously and unchanged.
 * v2/v3/v4 = experimental variants, lazy-loaded only when selected.
 */
export default function HomepageDispatcher() {
  const variant = useActiveHomepage();

  if (variant === "v1") return <Index />;

  const Variant = variant === "v2" ? HomepageV2 : variant === "v3" ? HomepageV3 : HomepageV4;
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="h-8 w-8 rounded-full border-2 border-emerald-200 border-t-emerald-500 animate-spin" />
      </div>
    }>
      <Variant />
    </Suspense>
  );
}