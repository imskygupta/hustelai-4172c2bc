import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { sendTemplated } from "../_shared/mailer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    if (!body.to || !body.template) {
      return new Response(JSON.stringify({ error: "to + template required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const r = await sendTemplated({ to: body.to, templateSlug: body.template, data: body.data || {}, providerOverride: body.provider });
    return new Response(JSON.stringify({ ok: true, ...r }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});