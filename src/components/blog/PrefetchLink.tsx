import { Link, LinkProps } from "react-router-dom";
import { useEffect, useRef } from "react";
import { blogApi } from "@/integrations/blog/client";
import { onIdle } from "@/lib/blog-cache";

type Props = LinkProps & {
  /** Post slug to prefetch (without leading "/"). */
  prefetchPost?: string;
  /** Category slug — prefetches the cluster feed. */
  prefetchCategory?: string;
  /** If true, prefetch when the link enters the viewport (idle). */
  prefetchOnView?: boolean;
};

/**
 * Drop-in <Link> that warms the SWR cache on hover, focus, touch, or
 * viewport entry. Avoids spinners on the next navigation.
 */
export function PrefetchLink({
  prefetchPost: post,
  prefetchCategory: category,
  prefetchOnView = true,
  children,
  ...rest
}: Props) {
  const ref = useRef<HTMLAnchorElement | null>(null);

  const warm = () => {
    if (post) blogApi.prefetchPost(post);
    if (category) blogApi.prefetchFeed({ category, limit: 30, mode: "cluster" });
  };

  useEffect(() => {
    if (!prefetchOnView || !ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          onIdle(warm);
          io.disconnect();
          break;
        }
      }
    }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post, category, prefetchOnView]);

  return (
    <Link
      {...rest}
      ref={ref}
      onMouseEnter={(e) => { warm(); rest.onMouseEnter?.(e); }}
      onFocus={(e) => { warm(); rest.onFocus?.(e); }}
      onTouchStart={(e) => { warm(); rest.onTouchStart?.(e as any); }}
    >
      {children}
    </Link>
  );
}