/**
 * Image pipeline helpers for the blog reader.
 *
 * We don't run our own image worker — instead we proxy through
 * images.weserv.nl which delivers:
 *   - on-demand WebP / AVIF
 *   - responsive resize
 *   - cache + CDN
 *
 * This keeps the blog editorial workflow simple (paste any URL)
 * while serving low-CLS, low-byte images.
 */

const PROXY = "https://images.weserv.nl/";
const SIZES = [480, 768, 1024, 1440, 1920];

function strip(u: string) {
  return u.replace(/^https?:\/\//, "");
}

function isProxied(url: string) {
  return /^https?:\/\/images\.weserv\.nl\//.test(url);
}

/** Returns a single optimized URL (WebP, width capped). */
export function optimizedImage(url: string, width = 1024): string {
  if (!url || url.startsWith("data:") || isProxied(url)) return url;
  if (!/^https?:\/\//.test(url)) return url; // local/relative — leave alone
  const q = new URLSearchParams({
    url: strip(url),
    w: String(width),
    output: "webp",
    q: "78",
    we: "",
  });
  return `${PROXY}?${q.toString()}`;
}

/** Returns srcset string for responsive <img>. */
export function imageSrcSet(url: string, sizes: number[] = SIZES): string {
  if (!url || !/^https?:\/\//.test(url) || isProxied(url)) return "";
  return sizes
    .map((w) => `${optimizedImage(url, w)} ${w}w`)
    .join(", ");
}

/** Default `sizes` attribute for content images inside the reader column. */
export const DEFAULT_SIZES =
  "(min-width: 1024px) 720px, (min-width: 640px) 90vw, 100vw";

/** Default 16:9 aspect for hero images. */
export const HERO_RATIO = 16 / 9;