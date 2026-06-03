import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAIWithFallback } from "../_shared/ai-fallback.ts";
import { enforceAIQuota } from "../_shared/tier/enforce-ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * PDF Studio – Parse.
 * Input: { title, raw_text, source_path?, client_profile_id?, doc_kind? }
 * Output: { document_id, revision_id, version: 1, blocks }
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const raw_text: string = String(body.raw_text || "").slice(0, 60_000);
    const title: string = String(body.title || "Untitled document").slice(0, 200);
    const source_path: string | null = body.source_path || null;
    const client_profile_id: string | null = body.client_profile_id || null;
    const doc_kind: string = body.doc_kind || "pdf";
    if (!raw_text || raw_text.length < 20) return json({ error: "raw_text required (min 20 chars)" }, 400);

    const gate = await enforceAIQuota(user.id, "pdf_studio:parse", corsHeaders);
    if (gate) return gate;

    const sys = `You convert raw document text into a clean editable block list.
Return STRICT JSON: {"blocks":[{"id":"b1","type":"heading|paragraph|list|line_item|total|signature","text":"...","meta":{}}, ...]}.
- Preserve order.
- For invoices/proposals, extract line items as type:"line_item" with meta:{description,qty,rate,amount}.
- Use type:"total" for grand totals with meta:{label,amount,currency}.
- Keep ids stable (b1, b2, ...).
- No prose, no markdown fences. JSON only.`;

    const { content } = await callAIWithFallback({
      messages: [{ role: "system", content: sys }, { role: "user", content: raw_text }],
      temperature: 0.2,
    });
    const blocks = parseBlocks(content);

    const svc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: doc, error: dErr } = await svc
      .from("pdf_studio_documents")
      .insert({ user_id: user.id, title, source_storage_path: source_path, client_profile_id, doc_kind })
      .select().single();
    if (dErr) throw dErr;

    const { data: rev, error: rErr } = await svc
      .from("pdf_studio_revisions")
      .insert({
        document_id: doc.id, version: 1,
        blocks_json: blocks,
        overlays_json: [],
        background_pdf_path: source_path,
        created_by: user.id,
        ai_instruction: "Initial parse",
      })
      .select().single();
    if (rErr) throw rErr;

    return json({ document_id: doc.id, revision_id: rev.id, version: 1, blocks });
  } catch (e) {
    console.error("pdf-studio-parse error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function parseBlocks(s: string): any[] {
  try {
    const cleaned = s.replace(/```json\s*|\s*```/g, "").trim();
    const obj = JSON.parse(cleaned);
    if (Array.isArray(obj?.blocks)) return obj.blocks;
  } catch { /* fallthrough */ }
  // graceful fallback: one paragraph
  return [{ id: "b1", type: "paragraph", text: s.slice(0, 4000), meta: {} }];
}

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}