import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const requestedPath = typeof body.path === "string" ? body.path : "";
    const slug = typeof body.slug === "string" ? body.slug : "";

    const svc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let path = "";
    if (slug) {
      if (!/^[a-zA-Z0-9_-]{6,80}$/.test(slug)) return json({ error: "Invalid share link" }, 400);
      const { data, error } = await svc.rpc("pdf_studio_resolve_share", { p_slug: slug });
      if (error) throw error;
      path = String((data as any)?.background_pdf_path || "");
      if (!path) return json({ error: "Original PDF not available" }, 404);
    } else {
      if (!requestedPath || requestedPath.length > 500 || requestedPath.includes("..")) {
        return json({ error: "Invalid PDF path" }, 400);
      }
      const auth = req.headers.get("Authorization");
      if (!auth) return json({ error: "Unauthorized" }, 401);
      const authed = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: auth } } },
      );
      const { data: { user } } = await authed.auth.getUser();
      if (!user || !requestedPath.startsWith(`${user.id}/`)) return json({ error: "Unauthorized" }, 401);
      path = requestedPath;
    }

    const { data: file, error: downloadError } = await svc.storage.from("pdf-studio").download(path);
    if (downloadError || !file) throw downloadError ?? new Error("PDF not found");

    return new Response(file, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (e) {
    console.error("pdf-studio-download error:", e);
    return json({ error: e instanceof Error ? e.message : "Failed to download PDF" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
