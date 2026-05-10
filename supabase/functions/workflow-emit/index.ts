// workflow-emit — single entry point for emitting events into the workflow
// engine. Inserts into workflow_events and enqueues runs for any matching
// enabled workflows. Idempotent on (name, dedupe_key).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { flagGuard } from "../_shared/flags/resolve.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Identify the caller (best effort) so the event carries user_id.
    let userId: string | null = null;
    const auth = req.headers.get("Authorization") ?? "";
    if (auth.startsWith("Bearer ")) {
      try {
        const { data } = await createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: auth } } },
        ).auth.getClaims(auth.replace("Bearer ", ""));
        userId = (data?.claims?.sub as string) ?? null;
      } catch { /* anonymous */ }
    }

    // Master engine kill switch — emit returns 503 so callers can decide.
    const blocked = await flagGuard(userId, "automation.engine", corsHeaders, { endpoint: "workflow-emit" });
    if (blocked) return blocked;

    const body = await req.json().catch(() => ({}));
    const events = Array.isArray(body) ? body : [body];
    const out: any[] = [];

    for (const ev of events) {
      const name = String(ev?.name ?? "").trim();
      if (!name) { out.push({ error: "missing_name" }); continue; }
      const { data, error } = await sb.rpc("enqueue_workflow_runs", {
        _event_name: name,
        _payload: ev.payload ?? {},
        _user_id: ev.user_id ?? userId,
        _dedupe_key: ev.dedupe_key ?? null,
        _source: ev.source ?? "edge",
      });
      if (error) { out.push({ name, error: error.message }); continue; }
      const row = (data as any[])?.[0] ?? null;
      out.push({ name, event_id: row?.event_id ?? null, runs_enqueued: row?.runs_enqueued ?? 0 });
    }

    return new Response(JSON.stringify({ ok: true, events: out }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});