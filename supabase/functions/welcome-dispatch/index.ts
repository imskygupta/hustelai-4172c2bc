// Triggers welcome email for any signed-in user (covers OAuth users who
// bypass the signup form). Idempotent — safe to call on every login.
// Internal use only: invoked from useAuth on first session per user.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return j({ error: "Unauthorized" }, 401);

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error } = await sb.auth.getUser(token);
    if (error || !user?.email) return j({ error: "Unauthorized" }, 401);

    // Idempotency: skip if already sent
    const { data: already } = await sb.rpc("welcome_email_already_sent", { _email: user.email.toLowerCase() });
    if (already) return j({ ok: true, skipped: true, reason: "already_sent" });

    // Get display name from profile
    const { data: profile } = await sb.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();
    const displayName = profile?.display_name || (user.user_metadata as any)?.full_name || user.email.split("@")[0];

    // Call send-welcome-email via service role
    const resp = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-welcome-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
        apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      },
      body: JSON.stringify({ email: user.email, displayName, source: "welcome-dispatch" }),
    });
    const result = await resp.json().catch(() => ({}));
    return j({ ok: true, dispatched: true, result });
  } catch (e) {
    return j({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function j(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
}