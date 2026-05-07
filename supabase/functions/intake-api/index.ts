// Intake OS — owner-side API (auth required).
// Lists/creates/updates intake forms, lists submissions, runs AI analysis,
// converts a submission into a workspace + seed docs.
// All writes go to DB2 (workspace project utflzmecghdtcjupgdan).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRIMARY_URL  = Deno.env.get("SUPABASE_URL")!;
const PRIMARY_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const WORKSPACE_URL = "https://utflzmecghdtcjupgdan.supabase.co";
const WORKSPACE_KEY = "sb_publishable_riUGl3kMundQwxXEg5wcyA_evCjBvqA";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function slugify(s: string) {
  const base = s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "form";
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

function makeToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(18)))
    .map(b => b.toString(16).padStart(2, "0")).join("");
}

const VALID_STATUSES = new Set([
  // legacy
  "new", "reviewed", "converted", "archived",
]);
const VALID_STAGES = new Set([
  "lead", "qualified", "proposal_sent", "negotiation", "won", "active", "retainer", "lost",
]);

async function analyzeSubmission(payload: any) {
  if (!LOVABLE_API_KEY) return null;
  const sys = `You are an AI project analyst for a freelancer. Given a client intake submission, return STRICT JSON only:
{"detected_type": string, "urgency": "low"|"medium"|"high", "scope_clarity": "weak"|"medium"|"strong", "risks": string[], "next_actions": string[], "suggested_price_range": string, "summary": string}`;
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `Client submission:\n${JSON.stringify(payload).slice(0, 4000)}` },
        ],
      }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    const txt = d.choices?.[0]?.message?.content || "";
    const m = txt.match(/\{[\s\S]*\}/);
    if (!m) return null;
    return JSON.parse(m[0]);
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  const primary = createClient(PRIMARY_URL, PRIMARY_ANON, { global: { headers: { Authorization: auth } } });
  const { data: claimsRes, error: claimsErr } = await primary.auth.getClaims(auth.replace("Bearer ", ""));
  if (claimsErr || !claimsRes?.claims?.sub) return json({ error: "Unauthorized" }, 401);
  const userId = claimsRes.claims.sub as string;

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const kind = body?.kind as string;
  if (!kind) return json({ error: "Missing kind" }, 400);

  const ws = createClient(WORKSPACE_URL, WORKSPACE_KEY, { auth: { persistSession: false } });

  try {
    switch (kind) {
      case "form.list": {
        const { data, error } = await ws.from("intake_forms").select("*").eq("owner_id", userId).order("created_at", { ascending: false });
        if (error) throw error;
        return json({ ok: true, rows: data || [] });
      }
      case "form.create": {
        const title = String(body.title || "").trim().slice(0, 120);
        if (!title) return json({ error: "title required" }, 400);
        const fields = Array.isArray(body.fields) ? body.fields.slice(0, 30) : [];
        const slug = slugify(title);
        const { data, error } = await ws.from("intake_forms").insert({
          owner_id: userId,
          workspace_id: body.workspace_id || null,
          title,
          description: String(body.description || "").slice(0, 600),
          slug,
          fields,
          settings: body.settings || {},
        }).select().single();
        if (error) throw error;
        return json({ ok: true, row: data });
      }
      case "form.update": {
        if (!body.id) return json({ error: "id required" }, 400);
        const patch: any = {};
        for (const k of ["title", "description", "fields", "settings", "is_active", "workspace_id"]) {
          if (k in body) patch[k] = body[k];
        }
        const { data, error } = await ws.from("intake_forms").update(patch).eq("id", body.id).eq("owner_id", userId).select().single();
        if (error) throw error;
        return json({ ok: true, row: data });
      }
      case "form.delete": {
        if (!body.id) return json({ error: "id required" }, 400);
        const { error } = await ws.from("intake_forms").delete().eq("id", body.id).eq("owner_id", userId);
        if (error) throw error;
        return json({ ok: true });
      }
      case "submission.list": {
        let q = ws.from("intake_submissions").select("*").eq("owner_id", userId).order("created_at", { ascending: false }).limit(200);
        if (body.form_id) q = q.eq("form_id", body.form_id);
        if (body.status) q = q.eq("status", body.status);
        const { data, error } = await q;
        if (error) throw error;
        return json({ ok: true, rows: data || [] });
      }
      case "submission.get": {
        if (!body.id) return json({ error: "id required" }, 400);
        const { data, error } = await ws.from("intake_submissions").select("*").eq("id", body.id).eq("owner_id", userId).maybeSingle();
        if (error) throw error;
        return json({ ok: true, row: data });
      }
      case "submission.update_status": {
        if (!body.id || !body.status) return json({ error: "id + status required" }, 400);
        if (!VALID_STATUSES.has(body.status)) return json({ error: "invalid status" }, 400);
        const { error } = await ws.from("intake_submissions").update({ status: body.status }).eq("id", body.id).eq("owner_id", userId);
        if (error) throw error;
        return json({ ok: true });
      }
      case "submission.set_stage": {
        if (!body.id || !body.stage) return json({ error: "id + stage required" }, 400);
        if (!VALID_STAGES.has(body.stage)) return json({ error: "invalid stage" }, 400);
        const { error } = await ws.from("intake_submissions")
          .update({ pipeline_stage: body.stage })
          .eq("id", body.id).eq("owner_id", userId);
        if (error) throw error;
        return json({ ok: true });
      }
      case "submission.generate_portal_link": {
        if (!body.id) return json({ error: "id required" }, 400);
        const { data: sub } = await ws.from("intake_submissions")
          .select("portal_token, workspace_id").eq("id", body.id).eq("owner_id", userId).maybeSingle();
        if (!sub) return json({ error: "Not found" }, 404);
        let token = sub.portal_token;
        if (!token) {
          token = makeToken();
          await ws.from("intake_submissions").update({ portal_token: token }).eq("id", body.id).eq("owner_id", userId);
          await ws.from("client_portal_links").insert({
            owner_id: userId,
            workspace_id: sub.workspace_id || null,
            submission_id: body.id,
            token,
          });
        }
        return json({ ok: true, token });
      }
      case "submission.mark_converted": {
        if (!body.id) return json({ error: "id required" }, 400);
        const patch: any = { status: "converted", pipeline_stage: body.stage || "won" };
        if (body.workspace_id) {
          patch.workspace_id = body.workspace_id;
          patch.converted_workspace_id = body.workspace_id;
        }
        const { error } = await ws.from("intake_submissions").update(patch).eq("id", body.id).eq("owner_id", userId);
        if (error) throw error;
        return json({ ok: true });
      }
      case "submission.analyze": {
        if (!body.id) return json({ error: "id required" }, 400);
        const { data: sub, error } = await ws.from("intake_submissions").select("*").eq("id", body.id).eq("owner_id", userId).maybeSingle();
        if (error || !sub) return json({ error: "Not found" }, 404);
        const ai = await analyzeSubmission({
          client: { name: sub.client_name, email: sub.client_email, company: sub.client_company },
          payload: sub.payload,
        });
        if (!ai) return json({ error: "AI analysis failed" }, 502);
        await ws.from("intake_submissions").update({ ai_analysis: ai }).eq("id", body.id).eq("owner_id", userId);
        return json({ ok: true, ai_analysis: ai });
      }
      case "submission.convert": {
        // Mark converted; the frontend handles workspace/doc creation via existing infra.
        if (!body.id) return json({ error: "id required" }, 400);
        const { error } = await ws.from("intake_submissions").update({
          status: "converted",
          workspace_id: body.workspace_id || null,
        }).eq("id", body.id).eq("owner_id", userId);
        if (error) throw error;
        return json({ ok: true });
      }
      default:
        return json({ error: "Unknown kind" }, 400);
    }
  } catch (e: any) {
    console.error("[intake-api]", e?.message || e);
    return json({ error: e?.message || "Internal error" }, 500);
  }
});