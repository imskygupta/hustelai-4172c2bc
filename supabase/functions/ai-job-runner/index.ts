// Cron-driven AI job worker. Claims jobs, executes via callAIWithFallback, reports progress.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAIWithFallback, estimateProviderCost } from "../_shared/ai-fallback.ts";
import { isFeatureEnabledServer } from "../_shared/flags/resolve.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function logEvent(jobId: string, level: string, message: string, data?: any) {
  await sb.from("ai_job_events").insert({ job_id: jobId, level, message, data: data ?? null });
}

async function reportProgress(jobId: string, progress: number, message: string, data?: any) {
  await sb.rpc("report_ai_job_progress", {
    _id: jobId, _progress: progress, _message: message, _data: data ?? null, _level: "progress",
  });
}

async function executeJob(job: any) {
  const startedAt = Date.now();
  const jobTimeout = Number(job.input?.timeout_ms) || 120_000;
  const hardKill = setTimeout(() => {
    // Hard ceiling: this just makes sure logs still get flushed even if a worker invocation hangs
    console.warn(`job ${job.id} exceeded hard ceiling`);
  }, jobTimeout + 5_000);
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

    await reportProgress(job.id, 5, "executing", { model });

    // Throttle progress writes: at most one DB write per 750ms while streaming.
    let lastWrite = 0;
    let lastReported = 0;
    const tokensInEstimate = messages.reduce((n, m) => n + Math.ceil(String(m.content || "").length / 4), 0);

    const { content, usedProvider, provider } = await callAIWithFallback({
      messages, model, temperature,
      timeout_ms: Number(job.input?.timeout_ms) || undefined,
      onDelta: async (_chunk, total) => {
        const now = Date.now();
        if (now - lastWrite < 750) return;
        lastWrite = now;
        // Heuristic progress: ramp 10 → 90 based on output growth, capped.
        const outTokens = Math.ceil(total.length / 4);
        const ratio = Math.min(1, outTokens / Math.max(200, (job.input?.expected_tokens || 800)));
        const pct = Math.max(lastReported + 1, Math.min(90, 10 + Math.round(ratio * 80)));
        lastReported = pct;
        await reportProgress(job.id, pct, "streaming", { tokens_out: outTokens, provider: usedProviderHint() });
      },
    });

    function usedProviderHint() { return null; }

    const tokensOut = Math.ceil(content.length / 4);
    const cost = provider ? estimateProviderCost(provider, tokensInEstimate, tokensOut) : 0;

    await sb.rpc("complete_ai_job", {
      _id: job.id,
      _output: { content },
      _provider: usedProvider,
      _model: model || null,
      _tokens_in: tokensInEstimate,
      _tokens_out: tokensOut,
      _cost: cost,
    });
    await logEvent(job.id, "info", "succeeded", {
      ms: Date.now() - startedAt, provider: usedProvider, tokens_in: tokensInEstimate,
      tokens_out: tokensOut, cost,
    });
  } catch (e) {
    const msg = String((e as Error).message || e).slice(0, 1000);
    await logEvent(job.id, "error", "failed", { error: msg });
    await sb.rpc("fail_ai_job", { _id: job.id, _error: msg });
  } finally {
    clearTimeout(hardKill);
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
