import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function notifyAdmin(payload: Record<string, any>) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) return;
  const rows = Object.entries(payload)
    .map(([k, v]) => `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;color:#666"><b>${k}</b></td><td style="padding:6px 12px;border-bottom:1px solid #eee">${Array.isArray(v) ? v.join(", ") : (v ?? "—")}</td></tr>`)
    .join("");
  const html = `<div style="font-family:Arial,sans-serif"><h2>🎯 New Sure-Hit Job Application</h2><table style="border-collapse:collapse;width:100%">${rows}</table><p style="color:#999;font-size:12px;margin-top:16px">Review in admin panel and decide whether to invite to Outlier / Alignerr / Mercor.</p></div>`;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "HustleAI Jobs <noreply@hustlaiapp.in>",
        to: ["samratakash0000@gmail.com"],
        subject: `🎯 New job applicant: ${payload.full_name}`,
        html,
      }),
    });
  } catch (e) {
    console.error("Admin notify failed:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await serviceClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Premium gating
    const { data: profile } = await serviceClient
      .from("profiles").select("subscription_tier").eq("user_id", userId).single();
    const tier = profile?.subscription_tier || "free";
    if (!["pro", "elite", "infinity"].includes(tier)) {
      return new Response(JSON.stringify({ error: "Sure-Hit Jobs is for Pro, Elite, or Infinity members." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const required = ["full_name", "email", "primary_skill", "experience_years"];
    for (const k of required) {
      if (!body[k] || String(body[k]).trim().length < 2) {
        return new Response(JSON.stringify({ error: `Missing field: ${k}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const insertPayload = {
      user_id: userId,
      full_name: String(body.full_name).slice(0, 200),
      email: String(body.email).slice(0, 200),
      phone: body.phone ? String(body.phone).slice(0, 30) : null,
      primary_skill: String(body.primary_skill).slice(0, 200),
      experience_years: String(body.experience_years).slice(0, 30),
      expected_hourly_rate: body.expected_hourly_rate ? String(body.expected_hourly_rate).slice(0, 50) : null,
      portfolio_url: body.portfolio_url ? String(body.portfolio_url).slice(0, 500) : null,
      linkedin_url: body.linkedin_url ? String(body.linkedin_url).slice(0, 500) : null,
      preferred_platforms: Array.isArray(body.preferred_platforms) ? body.preferred_platforms.slice(0, 10) : [],
      availability: body.availability ? String(body.availability).slice(0, 100) : null,
      about: body.about ? String(body.about).slice(0, 2000) : null,
    };

    const { data: inserted, error: insertErr } = await serviceClient
      .from("job_opportunity_submissions").insert(insertPayload).select().single();
    if (insertErr) throw new Error(insertErr.message);

    // Notify admin (non-blocking on failure)
    await notifyAdmin(insertPayload);

    return new Response(JSON.stringify({ success: true, id: inserted.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("job-opportunity-submit error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});