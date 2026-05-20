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
const PUBLISHABLE_KEY = "sb_publishable_blog_replace_me";

export const blogDb = createClient(URL, PUBLISHABLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    storageKey: "hustlai-blog-anon",
  },
});