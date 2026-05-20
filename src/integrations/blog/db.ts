// Direct Supabase client for the Blogs/CMS DB (Phase 7C).
//
// Project: ynvfxxmhowlvhtqiigfc.
// Public reads only (anon key). All writes go through the existing
// `blog-*` edge functions exposed by `blogApi` in `./client.ts`, which use
// the service role on the same project.
//
// Use `blogDb` for low-latency public reads of side_hustles, seo_pages,
// seo_topics, blog_categories, seo_redirects. Do NOT read from primary
// for these tables anymore.
import { createClient } from "@supabase/supabase-js";

const URL = "https://ynvfxxmhowlvhtqiigfc.supabase.co";
// Anon publishable key. If/when rotated, update here only.
const PUBLISHABLE_KEY: string = "sb_publishable_blog_replace_me";

export const blogDbReady =
  (PUBLISHABLE_KEY as string) !== "sb_publishable_blog_replace_me" &&
  PUBLISHABLE_KEY.length > 20;

const real = blogDbReady
  ? createClient(URL, PUBLISHABLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        storageKey: "hustlai-blog-anon",
      },
    })
  : null;

if (real) {
  console.info("Blogs DB connected");
} else {
  console.warn("Blogs DB unavailable: missing publishable key");
}

function emptyQueryStub() {
  const empty = { data: [], count: 0, error: null };
  const callable = () => proxy;
  const proxy: any = new Proxy(callable, {
    get(_target, prop) {
      if (prop === "then") {
        return (resolve: any, reject: any) => {
          console.warn("Blogs DB query skipped: publishable key missing");
          return Promise.resolve(empty).then(resolve, reject);
        };
      }
      if (prop === "catch") return Promise.resolve(empty).catch.bind(Promise.resolve(empty));
      if (prop === "finally") return Promise.resolve(empty).finally.bind(Promise.resolve(empty));
      return proxy;
    },
    apply() { return proxy; },
  });
  return proxy;
}

// Fail-open facade — no silent primary fallback, but also no boot deadlocks.
export const blogDb: any = real ?? new Proxy(
  {},
  {
    get(_t, prop) {
      if (prop === "from" || prop === "rpc" || prop === "channel") {
        return () => emptyQueryStub();
      }
      return () => {
        console.warn("Blogs DB operation skipped: publishable key missing");
        return Promise.resolve({ data: [], count: 0, error: null });
      };
    },
  },
);