import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Retry a failed/cancelled AI job. Resets attempt counter, clears error,
 * and re-queues for the runner. Owner-only (admins bypass via service role).
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization") || "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const { job_id } = await req.json().catch(() => ({}));
    if (!job_id) return json({ error: "job_id required" }, 400);

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: row, error: rerr } = await sb.from("ai_jobs")
      .select("id,user_id,status,max_attempts").eq("id", job_id).maybeSingle();
    if (rerr) throw rerr;
    if (!row) return json({ error: "not_found" }, 404);
    if (row.user_id !== user.id) return json({ error: "forbidden" }, 403);
    if (!["failed", "cancelled"].includes(row.status)) {
      return json({ error: "not_retryable", status: row.status }, 409);
    }

    const { error: uerr } = await sb.from("ai_jobs").update({
      status: "queued",
      error: null,
      attempt: 0,
      progress: 0,
      finished_at: null,
      started_at: null,
      cancelled_at: null,
      scheduled_at: new Date().toISOString(),
      max_attempts: Math.max(row.max_attempts || 3, 3),
      updated_at: new Date().toISOString(),
    }).eq("id", job_id);
    if (uerr) throw uerr;

    return json({ ok: true });
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}