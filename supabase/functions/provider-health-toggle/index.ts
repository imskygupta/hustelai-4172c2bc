// Admin-only: toggle a provider's manually_disabled flag on Admin DB.
// Replaces the previous direct frontend UPDATE against primary.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { getAdmin } from "../_shared/clients.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function isAdmin(authHeader: string | null): Promise<boolean> {
  if (!authHeader) return false;
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return false;
  const svc = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data } = await svc
    .from("user_roles")
    .select("role")
    .eq("user_id", u.user.id)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!(await isAdmin(req.headers.get("Authorization")))) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const body = await req.json().catch(() => ({}));
    const provider = String(body?.provider ?? "");
    const disabled = Boolean(body?.disabled);
    if (!provider) {
      return new Response(JSON.stringify({ error: "provider required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = getAdmin();
    const { error } = await admin
      .from("api_provider_health")
      .update({
        manually_disabled: disabled,
        status: disabled ? "disabled" : "unknown",
        disabled_until: null,
      })
      .eq("provider", provider);
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});