import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ALLOWED_SOURCES = new Set(["website","footer","onboarding","exit_intent","scroll","time","modal","sheet","signup","manual"]);

/**
 * Public newsletter subscribe endpoint.
 * - Validates email
 * - Upserts subscriber via service role (RLS-friendly, dedupe-safe)
 * - Re-activates previously-unsubscribed addresses on opt-in
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    const name = body?.name ? String(body.name).slice(0, 120) : null;
    const source = ALLOWED_SOURCES.has(body?.source) ? body.source : "website";
    const tags = Array.isArray(body?.tags) ? body.tags.filter((t: any) => typeof t === "string").slice(0, 10) : [];

    if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
      return json({ error: "invalid_email" }, 400);
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Try to attach to logged-in user (best-effort via auth header)
    let user_id: string | null = null;
    const authHeader = req.headers.get("authorization") || "";
    if (authHeader) {
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: u } = await userClient.auth.getUser();
      user_id = u?.user?.id ?? null;
    }

    const { data: existing } = await sb.from("newsletter_subscribers")
      .select("id, status").eq("email", email).maybeSingle();

    if (existing) {
      await sb.from("newsletter_subscribers").update({
        status: "active",
        is_active: true,
        unsubscribed_at: null,
        user_id: user_id ?? undefined,
        name: name ?? undefined,
      }).eq("id", existing.id);
      return json({ ok: true, already_subscribed: true });
    }

    const { error } = await sb.from("newsletter_subscribers").insert({
      email, name, source, tags, user_id,
      status: "active", is_active: true,
    });
    if (error) {
      if ((error as any).code === "23505") return json({ ok: true, already_subscribed: true });
      throw error;
    }
    return json({ ok: true });
  } catch (e: any) {
    return json({ error: String(e?.message || e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status, headers: { ...cors, "Content-Type": "application/json" },
  });
}