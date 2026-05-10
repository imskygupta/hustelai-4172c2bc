// Shared AI provider fallback helper.
// Reads providers from ai_provider_keys (active, ordered by priority asc),
// tries each one in order, returns first successful completion.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface ProviderRow {
  provider_name: string;
  display_name: string;
  api_key: string;
  api_endpoint: string;
  default_model: string;
  priority: number;
  is_active: boolean;
  timeout_ms?: number;
  cost_per_1k_input?: number;
  cost_per_1k_output?: number;
  supports_streaming?: boolean;
}

interface AICallOpts {
  messages: { role: string; content: string }[];
  temperature?: number;
  max_tokens?: number;
  model?: string; // override
  timeout_ms?: number;
  signal?: AbortSignal;
  /** If provided, the runner will stream tokens via this callback. */
  onDelta?: (chunk: string, total: string) => void | Promise<void>;
}

let cachedProviders: ProviderRow[] | null = null;
let cachedAt = 0;
const CACHE_MS = 60_000;

async function loadProviders(): Promise<ProviderRow[]> {
  const now = Date.now();
  if (cachedProviders && now - cachedAt < CACHE_MS) return cachedProviders;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data, error } = await supabase
    .from("ai_provider_keys")
    .select("*")
    .eq("is_active", true)
    .order("priority", { ascending: true });
  if (error) throw error;
  cachedProviders = (data as ProviderRow[]) || [];
  cachedAt = now;
  return cachedProviders;
}

function buildAuth(p: ProviderRow): { url: string; key: string } {
  if (p.provider_name === "lovable_ai") {
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) throw new Error("LOVABLE_API_KEY missing");
    return { url: p.api_endpoint || "https://ai.gateway.lovable.dev/v1/chat/completions", key };
  }
  return { url: p.api_endpoint, key: p.api_key };
}

async function withTimeout<T>(p: Promise<T>, ms: number, parentSignal?: AbortSignal, ctrl?: AbortController): Promise<T> {
  let timer: any;
  const onAbort = () => ctrl?.abort();
  if (parentSignal) parentSignal.addEventListener("abort", onAbort, { once: true });
  try {
    return await Promise.race([
      p,
      new Promise<T>((_, rej) => {
        timer = setTimeout(() => { ctrl?.abort(); rej(new Error(`provider timeout after ${ms}ms`)); }, ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
    if (parentSignal) parentSignal.removeEventListener("abort", onAbort);
  }
}

async function callProviderStreaming(p: ProviderRow, opts: AICallOpts): Promise<string> {
  const model = opts.model || p.default_model;
  const { url, key } = buildAuth(p);
  const ctrl = new AbortController();
  const timeout = opts.timeout_ms ?? p.timeout_ms ?? 60000;
  const body: any = {
    model, messages: opts.messages,
    temperature: opts.temperature ?? 0.7,
    stream: true,
  };
  if (p.provider_name !== "lovable_ai") body.max_tokens = opts.max_tokens ?? 3000;

  const fetchPromise = fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: ctrl.signal,
  });
  const r = await withTimeout(fetchPromise, timeout, opts.signal, ctrl);
  if (!r.ok || !r.body) throw new Error(`${p.provider_name} ${r.status}: ${(await r.text().catch(() => "")).slice(0, 200)}`);

  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let buf = "", total = "";
  // Stall watchdog: bytes must arrive within timeout window
  let lastChunk = Date.now();
  const stallTimer = setInterval(() => {
    if (Date.now() - lastChunk > timeout) { ctrl.abort(); }
  }, 1000);

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      lastChunk = Date.now();
      buf += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") continue;
        try {
          const j = JSON.parse(payload);
          const delta = j?.choices?.[0]?.delta?.content
            ?? j?.candidates?.[0]?.content?.parts?.[0]?.text
            ?? "";
          if (delta) {
            total += delta;
            await opts.onDelta?.(delta, total);
          }
        } catch { /* ignore parse */ }
      }
    }
  } finally {
    clearInterval(stallTimer);
  }
  return total;
}

async function callProviderUnary(p: ProviderRow, opts: AICallOpts): Promise<string> {
  const model = opts.model || p.default_model;
  const { url, key } = buildAuth(p);
  const ctrl = new AbortController();
  const timeout = opts.timeout_ms ?? p.timeout_ms ?? 60000;
  const body: any = { model, messages: opts.messages, temperature: opts.temperature ?? 0.7 };
  if (p.provider_name !== "lovable_ai") body.max_tokens = opts.max_tokens ?? 3000;

  const r = await withTimeout(
    fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    }),
    timeout, opts.signal, ctrl,
  );
  if (!r.ok) throw new Error(`${p.provider_name} ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  return d.choices?.[0]?.message?.content || "";
}

async function callProvider(p: ProviderRow, opts: AICallOpts): Promise<string> {
  if (opts.onDelta && (p.supports_streaming ?? true)) {
    try {
      return await callProviderStreaming(p, opts);
    } catch (e) {
      // Fall back to unary on stream parsing/transport errors so the job can still complete
      console.warn(`stream failed for ${p.provider_name}, falling back to unary:`, (e as Error).message);
    }
  }
  return await callProviderUnary(p, opts);
}

export function estimateProviderCost(
  p: Pick<ProviderRow, "cost_per_1k_input" | "cost_per_1k_output">,
  tokensIn: number, tokensOut: number,
): number {
  const i = (p.cost_per_1k_input ?? 0) * (tokensIn / 1000);
  const o = (p.cost_per_1k_output ?? 0) * (tokensOut / 1000);
  return Number((i + o).toFixed(6));
}

/**
 * Try every active provider in priority order. Returns the first successful response.
 * Throws if all providers fail.
 */
export async function callAIWithFallback(opts: AICallOpts): Promise<{ content: string; usedProvider: string; provider?: ProviderRow }> {
  const providers = await loadProviders();
  if (!providers.length) throw new Error("No AI providers configured");
  const errors: string[] = [];
  for (const p of providers) {
    try {
      const content = await callProvider(p, opts);
      if (content) {
        console.log(`AI fallback: used ${p.provider_name}`);
        return { content, usedProvider: p.provider_name, provider: p };
      }
      errors.push(`${p.provider_name}: empty response`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`Provider ${p.provider_name} failed:`, msg);
      errors.push(msg);
    }
  }
  throw new Error(`All AI providers failed: ${errors.join(" | ")}`);
}
