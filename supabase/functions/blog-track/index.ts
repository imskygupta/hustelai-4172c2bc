import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const blog = createClient(Deno.env.get("BLOG_SUPABASE_URL")!, Deno.env.get("BLOG_SUPABASE_SERVICE_ROLE")!);

async function hash(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const b = await req.json();
    const ua = req.headers.get("user-agent") ?? "";
    const ip = req.headers.get("x-forwarded-for") ?? "";
    await blog.from("blog_analytics_events").insert({
      post_id: b.post_id ?? null,
      kind: String(b.kind ?? "view").slice(0, 32),
      ref: String(b.ref ?? "").slice(0, 200),
      ua_hash: await hash(ua + ip),
    });
    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, "content-type": "application/json" } });
  }
});