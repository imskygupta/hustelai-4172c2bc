// Pre-signup guard. Validates email against policy BEFORE the client calls
// supabase.auth.signUp. Logs blocked attempts and notifies admin via SkyMedia.
// Public endpoint (no JWT required) — only validates an email string.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { checkEmailPolicy } from "../_shared/email-policy.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({} as any));
    const email = String(body?.email || "");
    const source = String(body?.source || "");
    const result = checkEmailPolicy(email);

    if (result.ok) {
      return json({ ok: true });
    }

    // Log + notify (fire-and-forget)
    const sb = admin();
    void sb.from("signup_blocked_log").insert({
      email: email.toLowerCase().trim(),
      reason: result.reason,
      source: source || null,
      ip: req.headers.get("x-forwarded-for") || null,
      user_agent: req.headers.get("user-agent") || null,
    }).then(() => undefined, () => undefined);

    void fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/admin-bot-notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "signup_blocked",
        payload: {
          email,
          reason: result.reason,
          source,
          timestamp: new Date().toISOString(),
        },
      }),
    }).catch(() => undefined);

    return json({ ok: false, reason: result.reason, message: result.message }, 200);
  } catch (e: any) {
    return json({ ok: false, reason: "error", message: String(e?.message || e) }, 200);
  }
});

function json(b: any, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}