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

// Hard-fail facade — no silent primary fallback. Phase 7C.3.
export const blogDb: any = real ?? new Proxy(
  {},
  {
    get(_t, prop) {
      if (prop === "from" || prop === "rpc" || prop === "channel") {
        return (..._args: any[]) => {
          const stub: any = new Proxy({}, { get: () => stub });
          stub.then = () => {
            throw new Error(
              "Blogs DB not configured (anon key missing). " +
                "Cannot read side_hustles/seo_*/newsletter_* — fix src/integrations/blog/db.ts.",
            );
          };
          return stub;
        };
      }
      return () => {
        throw new Error("Blogs DB not configured.");
      };
    },
  },
);