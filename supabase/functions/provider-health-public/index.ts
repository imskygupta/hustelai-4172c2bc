// Public read of api_provider_health from Admin DB (rqqiujmiagauzohdqjmi).
// Cached 30s to keep AI router fast and Admin DB cool.
// No auth required — provider health is non-sensitive operational data.
import { getAdmin } from "../_shared/clients.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

let cache: { at: number; data: unknown[] } | null = null;
const TTL_MS = 30_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (cache && Date.now() - cache.at < TTL_MS) {
      return new Response(JSON.stringify({ data: cache.data, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=30" },
      });
    }
    const sb = getAdmin();
    const { data, error } = await sb.from("api_provider_health").select("*");
    if (error) throw error;
    cache = { at: Date.now(), data: data ?? [] };
    return new Response(JSON.stringify({ data: data ?? [], cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=30" },
    });
  } catch (e: any) {
    // Never break the AI router — return empty array on Admin DB miss.
    return new Response(JSON.stringify({ data: [], error: e?.message ?? String(e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});