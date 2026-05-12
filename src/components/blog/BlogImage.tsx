import { imageSrcSet, optimizedImage, DEFAULT_SIZES } from "@/lib/blog-image";

interface Props {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
  sizes?: string;
}

/**
 * Editorial image — WebP, responsive srcset, dimension-reserved.
 * Use `priority` on hero images to drop lazy-loading + add fetchpriority.
 */
export function BlogImage({
  src, alt, width = 1280, height = 720,
  priority = false, className = "", sizes = DEFAULT_SIZES,
}: Props) {
  if (!src) return null;
  const optimized = optimizedImage(src, width);
  const srcSet = imageSrcSet(src);
  return (
    <img
      src={optimized}
      srcSet={srcSet || undefined}
      sizes={sizes}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      {...({ fetchpriority: priority ? "high" : "low" } as any)}
      className={className}
    />
  );
}