// Yandex Metrica integration — global, SPA-safe, lazy-loaded after hydration.
// Counter ID: 109165009 (HustleAI — covers hustlaiapp.in + blogs.hustlaiapp.in).
// All calls are no-ops in dev / when blocked, never throw.

export const YM_ID = 109165009;

let initialized = false;
let loadPromise: Promise<void> | null = null;

declare global {
  interface Window {
    ym?: ((id: number, action: string, ...args: unknown[]) => void) & {
      a?: unknown[];
      l?: number;
    };
  }
}

function injectScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = new Promise<void>((resolve) => {
    try {
      // Stub queue so calls before script-load are buffered (per Yandex spec)
      const stub: any = function () {
        (stub.a = stub.a || []).push(arguments);
      };
      stub.l = Date.now();
      if (!window.ym) window.ym = stub;

      const src = `https://mc.yandex.ru/metrika/tag.js?id=${YM_ID}`;
      // Skip if already present (e.g. SSR or duplicate import)
      if (Array.from(document.scripts).some((s) => s.src === src)) {
        resolve();
        return;
      }
      const s = document.createElement("script");
      s.async = true;
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => resolve();
      document.head.appendChild(s);
    } catch {
      resolve();
    }
  });
  return loadPromise;
}

export function initYandex(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  // Lazy-load after hydration / idle
  const start = () => {
    injectScript().then(() => {
      try {
        window.ym?.(YM_ID, "init", {
          ssr: true,
          webvisor: true,
          clickmap: true,
          ecommerce: "dataLayer",
          accurateTrackBounce: true,
          trackLinks: true,
          defer: true,
          // We control SPA hits manually via yandexHit() — disable auto pageview
          // so we don't double-count the initial load.
          triggerEvent: true,
        });
      } catch {
        /* ignore */
      }
    });
  };
  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(start, { timeout: 2500 });
  } else {
    setTimeout(start, 1200);
  }
}

/** SPA route change hit — call inside router on location change. */
export function yandexHit(url: string, referer?: string, title?: string): void {
  try {
    window.ym?.(YM_ID, "hit", url, {
      referer: referer ?? document.referrer,
      title: title ?? document.title,
    });
  } catch {
    /* ignore */
  }
}

/** Fire a Yandex goal — used for CTA / signup / pricing / tool engagement. */
export function yandexGoal(name: string, params?: Record<string, unknown>): void {
  try {
    window.ym?.(YM_ID, "reachGoal", name, params);
  } catch {
    /* ignore */
  }
}

/** Generic tracker that maps semantic events to Yandex goals. */
export function yandexTrack(
  event:
    | "cta_click"
    | "signup_start"
    | "signup_complete"
    | "pricing_click"
    | "pricing_view"
    | "tool_open"
    | "tool_generate"
    | "workflow_start"
    | "workflow_complete"
    | "blog_scroll_25"
    | "blog_scroll_50"
    | "blog_scroll_75"
    | "blog_scroll_100"
    | "newsletter_signup"
    | (string & {}),
  params?: Record<string, unknown>,
): void {
  yandexGoal(event, params);
}

/** Identify a user (best-effort; Yandex stores params keyed under UserID). */
export function yandexIdentify(userId: string): void {
  try {
    window.ym?.(YM_ID, "setUserID", userId);
  } catch {
    /* ignore */
  }
}

/** Reset user identity (logout). */
export function yandexReset(): void {
  try {
    window.ym?.(YM_ID, "userParams", { UserID: undefined });
  } catch {
    /* ignore */
  }
}