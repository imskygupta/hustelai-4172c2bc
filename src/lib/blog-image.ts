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

/**
 * Hosts that used to serve hero images but no longer resolve.
 * `source.unsplash.com` was deprecated by Unsplash in 2024 and now
 * returns 503 — so any legacy DB row pointing there must be treated as
 * "no image" by the public reader, otherwise weserv proxies a broken
 * upstream and the browser falls back to rendering alt text in place
 * of the hero.
 */
const DEAD_IMAGE_HOSTS = [
  /^https?:\/\/source\.unsplash\.com\//i,
];

/** Returns true if `url` looks like a real image we can attempt to render. */
export function isUsableImageUrl(url?: string | null): url is string {
  if (!url) return false;
  const trimmed = String(url).trim();
  if (!trimmed) return false;
  if (DEAD_IMAGE_HOSTS.some((re) => re.test(trimmed))) return false;
  return true;
}

/** Returns a single optimized URL (WebP, width capped). */
export function optimizedImage(url: string, width = 1024): string {
  if (!url || url.startsWith("data:") || isProxied(url)) return url;
  if (!isUsableImageUrl(url)) return "";
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