// Public docs/handbook reader backed by Admin DB (rqqiujmiagauzohdqjmi).
// Replaces the retired standalone Docs DB (rnyllarpzgamrkvgcjbg).
// 60s in-memory cache per shape — docs are slow-moving.
import { getAdmin } from "../_shared/clients.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const cache = new Map<string, { at: number; data: unknown }>();
const TTL = 60_000;

async function getCached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data as T;
  const fresh = await fn();
  cache.set(key, { at: Date.now(), data: fresh });
  return fresh;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const op = url.searchParams.get("op") ?? "pages";
    const slug = url.searchParams.get("slug");
    const admin = getAdmin();

    let data: unknown;
    if (op === "categories") {
      data = await getCached("categories", async () => {
        const { data } = await admin.from("docs_categories").select("*").order("sort_order");
        return data ?? [];
      });
    } else if (op === "pages") {
      data = await getCached("pages", async () => {
        const { data } = await admin
          .from("docs_pages")
          .select("*")
          .eq("is_published", true)
          .order("sort_order");
        return data ?? [];
      });
    } else if (op === "page" && slug) {
      data = await getCached(`page:${slug}`, async () => {
        const { data } = await admin
          .from("docs_pages")
          .select("*")
          .eq("slug", slug)
          .maybeSingle();
        return data ?? null;
      });
    } else {
      return new Response(JSON.stringify({ error: "unknown op" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
    });
  } catch (e: any) {
    // Never break docs UI — return empty.
    return new Response(JSON.stringify({ data: null, error: e?.message ?? String(e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});