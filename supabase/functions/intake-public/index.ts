// Intake OS — public client-facing API (NO auth).
// GET ?slug=xxx  → returns form definition (only if active)
// POST { slug, payload, client_name, client_email, files[] } → creates submission
// Files are expected to be already uploaded via signed URL or base64 (small).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const WORKSPACE_URL = "https://utflzmecghdtcjupgdan.supabase.co";
const WORKSPACE_KEY = "sb_publishable_riUGl3kMundQwxXEg5wcyA_evCjBvqA";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Naive in-memory rate limit (per-IP, per-cold-start). Good enough for spam control;
// real abuse is mitigated by submission_count caps below.
const HITS = new Map<string, { count: number; ts: number }>();
function rateLimited(ip: string) {
  const now = Date.now();
  const rec = HITS.get(ip);
  if (!rec || now - rec.ts > 60_000) { HITS.set(ip, { count: 1, ts: now }); return false; }
  rec.count += 1;
  return rec.count > 8; // 8 req/min/IP
}

async function hashIp(ip: string) {
  const buf = new TextEncoder().encode(ip + ":hustlai-intake");
  const h = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(h)).slice(0, 8).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "0.0.0.0";
  if (rateLimited(ip)) return json({ error: "Too many requests" }, 429);

  const ws = createClient(WORKSPACE_URL, WORKSPACE_KEY, { auth: { persistSession: false } });

  if (req.method === "GET") {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");
    if (!slug) return json({ error: "slug required" }, 400);
    const { data, error } = await ws.from("intake_forms")
      .select("id, title, description, slug, fields, settings, is_active, owner_id")
      .eq("slug", slug).maybeSingle();
    if (error) return json({ error: error.message }, 500);
    if (!data || !data.is_active) return json({ error: "Form not found" }, 404);
    // Don't expose owner_id to public payload
    const { owner_id, ...pub } = data as any;
    return json({ ok: true, form: pub });
  }

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const { slug, payload, client_name, client_email, client_company, files } = body || {};
  if (!slug || typeof slug !== "string") return json({ error: "slug required" }, 400);
  if (!payload || typeof payload !== "object") return json({ error: "payload required" }, 400);

  // basic validation
  const name = String(client_name || "").trim().slice(0, 200);
  const email = String(client_email || "").trim().slice(0, 200);
  if (email && !/\S+@\S+\.\S+/.test(email)) return json({ error: "invalid email" }, 400);

  const { data: form, error: formErr } = await ws.from("intake_forms")
    .select("id, owner_id, workspace_id, is_active, submission_count")
    .eq("slug", slug).maybeSingle();
  if (formErr) return json({ error: formErr.message }, 500);
  if (!form || !form.is_active) return json({ error: "Form not accepting submissions" }, 404);
  if ((form.submission_count || 0) >= 5000) return json({ error: "Form quota exceeded" }, 429);

  const safeFiles = Array.isArray(files)
    ? files.slice(0, 10).map((f: any) => ({
        name: String(f?.name || "file").slice(0, 200),
        path: String(f?.path || "").slice(0, 500),
        size: Number(f?.size) || 0,
        mime: String(f?.mime || "").slice(0, 100),
      }))
    : [];

  const ipHash = await hashIp(ip);
  const ua = (req.headers.get("user-agent") || "").slice(0, 300);

  const { data: sub, error: subErr } = await ws.from("intake_submissions").insert({
    form_id: form.id,
    owner_id: form.owner_id,
    workspace_id: form.workspace_id || null,
    client_name: name || null,
    client_email: email || null,
    client_company: String(client_company || "").slice(0, 200) || null,
    payload,
    files: safeFiles,
    ip_hash: ipHash,
    user_agent: ua,
    status: "new",
  }).select("id").single();
  if (subErr) return json({ error: subErr.message }, 500);

  await ws.from("intake_forms").update({ submission_count: (form.submission_count || 0) + 1 }).eq("id", form.id);

  return json({ ok: true, submission_id: sub.id });
});