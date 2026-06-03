import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAIWithFallback } from "../_shared/ai-fallback.ts";
import { enforceAIQuota } from "../_shared/tier/enforce-ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * PDF Studio – Revise.
 * Input: { document_id, instruction }
 * Reads latest revision blocks, asks AI for the new blocks, inserts a new revision.
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

    const { document_id, instruction } = await req.json();
    if (!document_id || !instruction) return json({ error: "document_id and instruction required" }, 400);

    const gate = await enforceAIQuota(user.id, "pdf_studio:revise", corsHeaders);
    if (gate) return gate;

    const svc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: doc } = await svc.from("pdf_studio_documents").select("user_id").eq("id", document_id).single();
    if (!doc || doc.user_id !== user.id) return json({ error: "Not found" }, 404);

    const { data: prev } = await svc.from("pdf_studio_revisions")
      .select("version, blocks_json").eq("document_id", document_id)
      .order("version", { ascending: false }).limit(1).single();
    if (!prev) return json({ error: "No base revision" }, 400);

    const sys = `You revise an existing document represented as a JSON block list.
You will receive the current blocks and a natural language instruction.
Return STRICT JSON {"blocks":[...]} with the same shape: {id,type,text,meta}.
- Keep block ids stable when content carries over.
- Add new ids (b{n}) only for inserted blocks.
- Drop blocks the user wants removed.
- Recompute totals if line items change.
- JSON only, no markdown.`;
    const userMsg = `INSTRUCTION:\n${instruction}\n\nCURRENT_BLOCKS:\n${JSON.stringify(prev.blocks_json)}`;
    const { content } = await callAIWithFallback({
      messages: [{ role: "system", content: sys }, { role: "user", content: userMsg }],
      temperature: 0.3,
    });
    let blocks: any[];
    try {
      const cleaned = content.replace(/```json\s*|\s*```/g, "").trim();
      const obj = JSON.parse(cleaned);
      blocks = Array.isArray(obj?.blocks) ? obj.blocks : prev.blocks_json;
    } catch {
      blocks = prev.blocks_json;
    }

    const nextVersion = (prev.version || 1) + 1;
    const { data: rev, error: rErr } = await svc
      .from("pdf_studio_revisions")
      .insert({ document_id, version: nextVersion, blocks_json: blocks, ai_instruction: instruction, created_by: user.id })
      .select().single();
    if (rErr) throw rErr;

    return json({ revision_id: rev.id, version: nextVersion, blocks });
  } catch (e) {
    console.error("pdf-studio-revise error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}