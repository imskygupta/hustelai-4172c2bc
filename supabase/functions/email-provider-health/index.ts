// Admin-only: pings Resend + Brevo to verify credentials and report status.
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
    const { data: { user } } = await sb.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return j({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await sb.rpc("has_role", { _user_id: user.id, _role: "admin" as any }).catch(() => ({ data: false }));
    if (!isAdmin) return j({ error: "Forbidden" }, 403);

    const resend = await checkResend();
    const brevo = await checkBrevo();
    const mailersend = await checkMailerSend();

    const { data: lastSent } = await sb
      .from("email_logs")
      .select("created_at, metadata, template")
      .eq("status", "sent")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return j({ resend, brevo, mailersend, last_sent: lastSent });
  } catch (e) {
    return j({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

async function checkResend() {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return { configured: false, healthy: false, message: "No RESEND_API_KEY" };
  try {
    const r = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${key}` } });
    if (r.ok) {
      const data = await r.json().catch(() => ({}));
      const domains = (data as any)?.data || [];
      return { configured: true, healthy: true, message: `${domains.length} domain(s) registered`, domains: domains.map((d: any) => ({ name: d.name, status: d.status })) };
    }
    return { configured: true, healthy: false, message: `HTTP ${r.status}` };
  } catch (e) {
    return { configured: true, healthy: false, message: e instanceof Error ? e.message : String(e) };
  }
}

async function checkBrevo() {
  const key = Deno.env.get("BREVO_API_KEY");
  if (!key) return { configured: false, healthy: false, message: "No BREVO_API_KEY" };
  try {
    const r = await fetch("https://api.brevo.com/v3/account", { headers: { "api-key": key, accept: "application/json" } });
    if (r.ok) {
      const data = await r.json().catch(() => ({}));
      return { configured: true, healthy: true, message: `${(data as any)?.email || "OK"}`, plan: (data as any)?.plan };
    }
    return { configured: true, healthy: false, message: `HTTP ${r.status}` };
  } catch (e) {
    return { configured: true, healthy: false, message: e instanceof Error ? e.message : String(e) };
  }
}

async function checkMailerSend() {
  const key = Deno.env.get("MAILERSEND_API_KEY");
  if (!key) return { configured: false, healthy: false, message: "No MAILERSEND_API_KEY" };
  try {
    const r = await fetch("https://api.mailersend.com/v1/domains?limit=1", { headers: { Authorization: `Bearer ${key}` } });
    return { configured: true, healthy: r.ok, message: r.ok ? "OK" : `HTTP ${r.status}` };
  } catch (e) {
    return { configured: true, healthy: false, message: e instanceof Error ? e.message : String(e) };
  }
}

function j(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
}