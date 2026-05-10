// Cron-driven AI job worker. Claims jobs, executes via callAIWithFallback, reports progress.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAIWithFallback } from "../_shared/ai-fallback.ts";
import { isFeatureEnabledServer } from "../_shared/flags/resolve.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function logEvent(jobId: string, level: string, message: string, data?: any) {
  await sb.from("ai_job_events").insert({ job_id: jobId, level, message, data: data ?? null });
}

async function executeJob(job: any) {
  const startedAt = Date.now();
  try {
    let messages: any[] = [];
    let model: string | undefined;
    let temperature: number | undefined;

    switch (job.kind) {
      case "completion":
      case "chat": {
        messages = job.input?.messages || [];
        if (!messages.length && job.input?.prompt) {
          messages = [{ role: "user", content: String(job.input.prompt) }];
          if (job.input?.system) messages.unshift({ role: "system", content: String(job.input.system) });
        }
        model = job.input?.model;
        temperature = job.input?.temperature;
        break;
      }
      default: {
        // Generic single-prompt jobs
        const prompt = job.input?.prompt || JSON.stringify(job.input);
        messages = [{ role: "user", content: String(prompt) }];
      }
    }

    if (!messages.length) throw new Error("no input messages or prompt");

    await logEvent(job.id, "progress", "executing", { provider: "fallback", model });
    const { content, usedProvider } = await callAIWithFallback({ messages, model, temperature });
    const tokensIn = messages.reduce((n, m) => n + Math.ceil(String(m.content || "").length / 4), 0);
    const tokensOut = Math.ceil(content.length / 4);

    await sb.rpc("complete_ai_job", {
      _id: job.id,
      _output: { content },
      _provider: usedProvider,
      _model: model || null,
      _tokens_in: tokensIn,
      _tokens_out: tokensOut,
      _cost: 0,
    });
    await logEvent(job.id, "info", "succeeded", { ms: Date.now() - startedAt, provider: usedProvider });
  } catch (e) {
    const msg = String((e as Error).message || e).slice(0, 1000);
    await logEvent(job.id, "error", "failed", { error: msg });
    await sb.rpc("fail_ai_job", { _id: job.id, _error: msg });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    if (!(await isFeatureEnabledServer(null, "ai_jobs.engine"))) {
      return new Response(JSON.stringify({ skipped: "engine_disabled" }), { headers: cors });
    }
    const url = new URL(req.url);
    const limit = Number(url.searchParams.get("limit") || 5);
    const { data: claimed, error } = await sb.rpc("claim_ai_jobs", { _limit: limit });
    if (error) throw error;
    const jobs = (claimed as any[]) || [];
    if (jobs.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), { headers: { ...cors, "Content-Type": "application/json" } });
    }
    // Execute concurrently up to claimed batch
    await Promise.all(jobs.map(executeJob));
    return new Response(JSON.stringify({ processed: jobs.length }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), { status: 500, headers: cors });
  }
});
