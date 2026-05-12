// queue-cleanup — periodic worker that runs the queue_purge_expired() RPC
// to enforce retention windows, archive failed jobs, populate the DLQ, and
// snapshot queue health metrics. Designed to be invoked by pg_cron hourly,
// but also callable on-demand by admins.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const started = Date.now();
    const { data, error } = await sb.rpc("queue_purge_expired");
    if (error) throw error;

    return new Response(
      JSON.stringify({ ok: true, duration_ms: Date.now() - started, result: data }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("queue-cleanup failed:", (err as Error).message);
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});