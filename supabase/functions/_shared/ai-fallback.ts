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
}

interface AICallOpts {
  messages: { role: string; content: string }[];
  temperature?: number;
  max_tokens?: number;
  model?: string; // override
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

async function callProvider(p: ProviderRow, opts: AICallOpts): Promise<string> {
  const model = opts.model || p.default_model;

  // Lovable AI uses LOVABLE_API_KEY env, not stored key
  if (p.provider_name === "lovable_ai") {
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) throw new Error("LOVABLE_API_KEY missing");
    const r = await fetch(p.api_endpoint || "https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: opts.messages,
        temperature: opts.temperature ?? 0.7,
      }),
    });
    if (!r.ok) throw new Error(`lovable_ai ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const d = await r.json();
    return d.choices?.[0]?.message?.content || "";
  }

  // OpenAI-compatible providers (LongCat, Zhipu, OpenAI, OpenRouter, etc.)
  const r = await fetch(p.api_endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${p.api_key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.max_tokens ?? 3000,
    }),
  });
  if (!r.ok) throw new Error(`${p.provider_name} ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  return d.choices?.[0]?.message?.content || "";
}

/**
 * Try every active provider in priority order. Returns the first successful response.
 * Throws if all providers fail.
 */
export async function callAIWithFallback(opts: AICallOpts): Promise<{ content: string; usedProvider: string }> {
  const providers = await loadProviders();
  if (!providers.length) throw new Error("No AI providers configured");
  const errors: string[] = [];
  for (const p of providers) {
    try {
      const content = await callProvider(p, opts);
      if (content) {
        console.log(`AI fallback: used ${p.provider_name}`);
        return { content, usedProvider: p.provider_name };
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
