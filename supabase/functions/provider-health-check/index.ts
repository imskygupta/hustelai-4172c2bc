import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Provider = "lovable" | "gemini" | "longcat" | "openai" | "zhipu";

interface ProbeResult {
  provider: Provider;
  ok: boolean;
  latency_ms: number;
  error?: string;
}

const TIMEOUT_MS = 8000;

async function probe(
  provider: Provider,
  fn: () => Promise<Response>,
): Promise<ProbeResult> {
  const started = Date.now();
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const r = await fn().finally(() => clearTimeout(t));
    const latency = Date.now() - started;
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      return { provider, ok: false, latency_ms: latency, error: `${r.status} ${txt.slice(0, 160)}` };
    }
    await r.text().catch(() => "");
    return { provider, ok: true, latency_ms: latency };
  } catch (e: any) {
    return {
      provider,
      ok: false,
      latency_ms: Date.now() - started,
      error: e?.message ?? String(e),
    };
  }
}

function chatProbe(url: string, headers: Record<string, string>, body: any) {
  return () =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
}

async function runProbes(): Promise<ProbeResult[]> {
  const LOVABLE = Deno.env.get("LOVABLE_API_KEY");
  const GEMINI = Deno.env.get("GEMINI_API_KEY");
  const LONGCAT = Deno.env.get("LONGCAT_API_KEY");
  const OPENAI = Deno.env.get("OPENAI_API_KEY");
  const ZHIPU = Deno.env.get("ZHIPU_API_KEY");

  const tasks: Promise<ProbeResult>[] = [];

  if (LOVABLE) {
    tasks.push(
      probe(
        "lovable",
        chatProbe(
          "https://ai.gateway.lovable.dev/v1/chat/completions",
          { Authorization: `Bearer ${LOVABLE}` },
          {
            model: "google/gemini-3-flash-preview",
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 1,
          },
        ),
      ),
    );
  } else {
    tasks.push(Promise.resolve({ provider: "lovable", ok: false, latency_ms: 0, error: "no_key" }));
  }

  if (GEMINI) {
    tasks.push(
      probe(
        "gemini",
        () =>
          fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: "ping" }] }],
                generationConfig: { maxOutputTokens: 1 },
              }),
            },
          ),
      ),
    );
  } else {
    tasks.push(Promise.resolve({ provider: "gemini", ok: false, latency_ms: 0, error: "no_key" }));
  }

  if (LONGCAT) {
    tasks.push(
      probe(
        "longcat",
        chatProbe(
          "https://api.longcat.chat/openai/v1/chat/completions",
          { Authorization: `Bearer ${LONGCAT}` },
          { model: "LongCat-Flash-Chat", messages: [{ role: "user", content: "ping" }], max_tokens: 1 },
        ),
      ),
    );
  } else {
    tasks.push(Promise.resolve({ provider: "longcat", ok: false, latency_ms: 0, error: "no_key" }));
  }

  if (OPENAI) {
    tasks.push(
      probe(
        "openai",
        chatProbe(
          "https://api.openai.com/v1/chat/completions",
          { Authorization: `Bearer ${OPENAI}` },
          { model: "gpt-4o-mini", messages: [{ role: "user", content: "ping" }], max_tokens: 1 },
        ),
      ),
    );
  } else {
    tasks.push(Promise.resolve({ provider: "openai", ok: false, latency_ms: 0, error: "no_key" }));
  }

  if (ZHIPU) {
    tasks.push(
      probe(
        "zhipu",
        chatProbe(
          "https://open.bigmodel.cn/api/paas/v4/chat/completions",
          { Authorization: `Bearer ${ZHIPU}` },
          { model: "glm-4-flash", messages: [{ role: "user", content: "ping" }], max_tokens: 1 },
        ),
      ),
    );
  } else {
    tasks.push(Promise.resolve({ provider: "zhipu", ok: false, latency_ms: 0, error: "no_key" }));
  }

  return await Promise.all(tasks);
}

function classify(consecFailures: number, latency: number, ok: boolean) {
  if (!ok && consecFailures >= 3) return "unhealthy";
  if (!ok) return "degraded";
  if (latency > 5000) return "degraded";
  return "healthy";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const probes = await runProbes();
    const { data: existing } = await supabase
      .from("api_provider_health")
      .select("provider,consecutive_failures,consecutive_successes,total_checks,total_failures,manually_disabled,disabled_until");

    const byProvider = new Map((existing ?? []).map((r: any) => [r.provider, r]));
    const now = new Date();

    const updates = probes.map((p) => {
      const prev: any = byProvider.get(p.provider) ?? {};
      const nextFailures = p.ok ? 0 : (prev.consecutive_failures ?? 0) + 1;
      const nextSuccesses = p.ok ? (prev.consecutive_successes ?? 0) + 1 : 0;
      const totalChecks = (prev.total_checks ?? 0) + 1;
      const totalFailures = (prev.total_failures ?? 0) + (p.ok ? 0 : 1);
      const successRate = Number((((totalChecks - totalFailures) / totalChecks) * 100).toFixed(2));

      // Circuit breaker: 3 failures => disable for 5 min, 5 failures => 30 min
      let disabledUntil = prev.disabled_until ?? null;
      if (!p.ok && nextFailures >= 5) {
        disabledUntil = new Date(now.getTime() + 30 * 60_000).toISOString();
      } else if (!p.ok && nextFailures >= 3) {
        disabledUntil = new Date(now.getTime() + 5 * 60_000).toISOString();
      } else if (p.ok) {
        disabledUntil = null;
      }

      const status = prev.manually_disabled
        ? "disabled"
        : disabledUntil && new Date(disabledUntil) > now
        ? "unhealthy"
        : classify(nextFailures, p.latency_ms, p.ok);

      return {
        provider: p.provider,
        status,
        latency_ms: p.latency_ms,
        success_rate: successRate,
        last_check_at: now.toISOString(),
        consecutive_failures: nextFailures,
        consecutive_successes: nextSuccesses,
        total_checks: totalChecks,
        total_failures: totalFailures,
        disabled_until: disabledUntil,
        last_error: p.ok ? null : (p.error ?? "unknown"),
      };
    });

    // Cost stabilization: only UPDATE when something materially changed.
    // Skip pure timestamp/latency-jitter writes to kill WAL + realtime churn
    // on this 5-row table (previously ~31k UPDATEs / 72h).
    const latencyBucket = (ms: number) => {
      if (ms <= 0) return 0;
      if (ms < 250) return 1;
      if (ms < 500) return 2;
      if (ms < 1000) return 3;
      if (ms < 2500) return 4;
      if (ms < 5000) return 5;
      return 6;
    };
    let written = 0;
    let skipped = 0;
    for (const u of updates) {
      const prev: any = byProvider.get(u.provider) ?? null;
      const materiallyChanged =
        !prev ||
        prev.status !== u.status ||
        latencyBucket(prev.latency_ms ?? 0) !== latencyBucket(u.latency_ms) ||
        (prev.consecutive_failures ?? 0) !== u.consecutive_failures ||
        (prev.consecutive_successes === 0) !== (u.consecutive_successes === 0) ||
        (prev.disabled_until ?? null) !== (u.disabled_until ?? null) ||
        Math.abs((prev.success_rate ?? 0) - u.success_rate) >= 1; // >=1% delta
      if (!materiallyChanged) {
        skipped++;
        continue;
      }
      await supabase.from("api_provider_health").upsert(u, { onConflict: "provider" });
      written++;
    }

    return new Response(JSON.stringify({ ok: true, written, skipped, results: updates }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});