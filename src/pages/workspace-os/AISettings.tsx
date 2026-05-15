import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  KeyRound, Loader2, CheckCircle2, XCircle, Zap, ExternalLink,
  Cpu, Gauge, Sparkles, Brain, Coins, Globe, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkspace } from "@/lib/workspace/context";

type Speed = "instant" | "fast" | "balanced" | "deep";

const SPEED_LABEL: Record<Speed, string> = {
  instant: "Instant",
  fast: "Fast",
  balanced: "Balanced",
  deep: "Deep think",
};

const PROVIDERS: ReadonlyArray<{
  id: string;
  name: string;
  tagline: string;
  href: string;
  placeholder: string;
  icon: typeof Sparkles;
  accent: string;        // bg + text class for icon chip
  ring: string;          // selected ring class
  specialty: string;     // 1-line specialty
  bestFor: string[];     // 2-3 short use cases
  speed: Speed;
  costHint: string;
  defaultModel?: string;
  models?: string[];     // curated model list — drives the dropdown
}> = [
  {
    id: "anthropic",
    name: "Claude",
    tagline: "Long-context reasoning. Editorial-grade writing.",
    href: "https://console.anthropic.com/settings/keys",
    placeholder: "sk-ant-…",
    icon: Brain,
    accent: "bg-amber-500/10 text-amber-600",
    ring: "ring-amber-400/40 border-amber-400/60",
    specialty: "Writing & strategy",
    bestFor: ["Long-form strategy", "Client docs & briefs", "Editorial polish"],
    speed: "balanced",
    costHint: "$$$ premium",
    defaultModel: "claude-3-5-sonnet-20241022",
    models: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229", "claude-3-haiku-20240307"],
  },
  {
    id: "openai",
    name: "OpenAI",
    tagline: "All-rounder reasoning. Multimodal capable.",
    href: "https://platform.openai.com/api-keys",
    placeholder: "sk-…",
    icon: Sparkles,
    accent: "bg-emerald-500/10 text-emerald-600",
    ring: "ring-emerald-400/40 border-emerald-400/60",
    specialty: "General reasoning",
    bestFor: ["Mixed workloads", "Code + text", "Reliable defaults"],
    speed: "balanced",
    costHint: "$$ standard",
    defaultModel: "gpt-4o-mini",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
  },
  {
    id: "gemini",
    name: "Gemini",
    tagline: "Massive context window. Free tier available.",
    href: "https://aistudio.google.com/apikey",
    placeholder: "AIza…",
    icon: Globe,
    accent: "bg-sky-500/10 text-sky-600",
    ring: "ring-sky-400/40 border-sky-400/60",
    specialty: "Research & context",
    bestFor: ["Research synthesis", "Structured extraction", "Free tier OK"],
    speed: "fast",
    costHint: "Free tier",
    defaultModel: "gemini-2.5-flash",
    models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.5-flash-lite", "gemini-1.5-pro"],
  },
  {
    id: "groq",
    name: "Groq",
    tagline: "Ultra-low latency on open models.",
    href: "https://console.groq.com/keys",
    placeholder: "gsk_…",
    icon: Zap,
    accent: "bg-rose-500/10 text-rose-600",
    ring: "ring-rose-400/40 border-rose-400/60",
    specialty: "Ultra-fast generation",
    bestFor: ["Real-time agent loops", "Bulk classification", "Live UX"],
    speed: "instant",
    costHint: "$ low",
    defaultModel: "llama-3.1-8b-instant",
    models: ["llama-3.1-8b-instant", "llama-3.3-70b-versatile", "mixtral-8x7b-32768", "gemma2-9b-it"],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    tagline: "Cost-efficient reasoning. Strong on code & math.",
    href: "https://platform.deepseek.com/api_keys",
    placeholder: "sk-…",
    icon: Coins,
    accent: "bg-indigo-500/10 text-indigo-600",
    ring: "ring-indigo-400/40 border-indigo-400/60",
    specialty: "Cost-efficient bulk ops",
    bestFor: ["Bulk content", "Code generation", "Background jobs"],
    speed: "fast",
    costHint: "¢ ultra-low",
    defaultModel: "deepseek-chat",
    models: ["deepseek-chat", "deepseek-reasoner"],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    tagline: "Pay-per-use access to 100+ models.",
    href: "https://openrouter.ai/keys",
    placeholder: "sk-or-…",
    icon: Cpu,
    accent: "bg-violet-500/10 text-violet-600",
    ring: "ring-violet-400/40 border-violet-400/60",
    specialty: "Multi-model gateway",
    bestFor: ["Model experimentation", "Routing fallback", "Pay-as-you-go"],
    speed: "balanced",
    costHint: "$ pay-per-use",
    defaultModel: "google/gemini-2.5-flash-lite",
    models: ["google/gemini-2.5-flash-lite", "google/gemini-2.5-pro", "anthropic/claude-3.5-sonnet", "openai/gpt-4o-mini", "meta-llama/llama-3.1-70b-instruct"],
  },
] as const;

function SpeedBars({ speed }: { speed: Speed }) {
  const filled = { instant: 4, fast: 3, balanced: 2, deep: 1 }[speed];
  return (
    <span className="inline-flex items-end gap-[2px] h-3" aria-label={`Speed: ${SPEED_LABEL[speed]}`}>
      {[1, 2, 3, 4].map(i => (
        <span key={i} className={`w-[3px] rounded-sm ${i <= filled ? "bg-current" : "bg-current/20"}`} style={{ height: `${i * 25}%` }} />
      ))}
    </span>
  );
}

export default function AISettings() {
  const { user } = useAuth();
  const { refreshProvider } = useWorkspace();
  const [provider, setProvider] = useState<string>("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [active, setActive] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string; ms?: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [showKeyForm, setShowKeyForm] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any).from("user_ai_keys").select("*").eq("user_id", user.id).maybeSingle();
      if (data) {
        setActive(data);
        setProvider(data.provider);
        setModel(data.model || "");
      }
    })();
  }, [user]);

  async function test() {
    if (!apiKey) return toast.error("Paste an API key first");
    setTesting(true);
    setTestResult(null);
    const t0 = performance.now();
    const { data } = await supabase.functions.invoke("ai-key-test", {
      body: { provider, api_key: apiKey, model: model || undefined },
    });
    const ms = Math.round(performance.now() - t0);
    setTesting(false);
    setTestResult({ ok: !!data?.ok, msg: data?.reply || data?.error || "Unknown", ms });
  }

  async function save() {
    if (!user) return;
    if (!apiKey) return toast.error("Paste an API key first");
    setSaving(true);
    const { error } = await (supabase as any).from("user_ai_keys").upsert({
      user_id: user.id,
      provider,
      api_key: apiKey,
      model: model || null,
      is_active: true,
      last_test_ok: testResult?.ok ?? null,
      last_tested_at: testResult ? new Date().toISOString() : null,
    }, { onConflict: "user_id" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("AI fuel connected");
    setActive({ provider, model, last_test_ok: testResult?.ok ?? null });
    setApiKey("");
    setShowKeyForm(false);
    refreshProvider();
  }

  async function disconnect() {
    if (!user) return;
    const { error } = await (supabase as any).from("user_ai_keys").delete().eq("user_id", user.id);
    if (error) return toast.error(error.message);
    setActive(null);
    setApiKey("");
    toast.success("Disconnected");
    refreshProvider();
  }

  const selected = PROVIDERS.find(p => p.id === provider)!;
  const activeProviderMeta = active ? PROVIDERS.find(p => p.id === active.provider) : null;

  return (
    <div className="max-w-5xl space-y-6">
      {/* AI Fuel hero — BYOK is the workspace's strongest differentiator. */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[hsl(222_40%_8%)] via-[hsl(222_45%_5%)] to-[hsl(258_50%_8%)] p-8 sm:p-10"
      >
        <div aria-hidden className="absolute -top-24 -right-20 h-72 w-72 rounded-full" style={{ background: "radial-gradient(circle, hsl(160 84% 45% / 0.30), transparent 60%)", filter: "blur(40px)" }} />
        <div aria-hidden className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full" style={{ background: "radial-gradient(circle, hsl(258 80% 64% / 0.30), transparent 60%)", filter: "blur(50px)" }} />
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-md mb-5">
            <span className="ws-dot ws-dot--ok" />
            <span className="text-[10px] uppercase tracking-[0.22em] text-white/70">AI Fuel · BYOK</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white leading-[1.1] max-w-2xl">
            Use your own AI power.<br />
            <span className="ws-gradient-text">Unlimited workflows. No platform credits.</span>
          </h1>
          <p className="mt-4 text-sm sm:text-base text-white/60 max-w-2xl leading-relaxed">
            HustleAI Workspace runs on <span className="text-white">your</span> provider keys.
            Cheaper per token, faster than rate-limited platforms, and you own every byte that flows through your projects.
          </p>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl">
            {[
              { k: "Cheaper", v: "Pay providers direct" },
              { k: "Faster", v: "No shared queue" },
              { k: "Yours", v: "Keys never leave you" },
              { k: "Limitless", v: "Pick any model" },
            ].map(b => (
              <div key={b.k} className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-3">
                <div className="text-[10px] uppercase tracking-wider text-emerald-300/80">{b.k}</div>
                <div className="text-xs text-white/70 mt-0.5">{b.v}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Cpu className="h-4 w-4" />
            <span className="text-[10px] uppercase tracking-[0.18em] font-semibold">AI Infrastructure</span>
          </div>
          <h2 className="text-3xl font-semibold tracking-tight mt-1">Control Center</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Bring your own AI stack into one operational workspace. Mix providers per workload.
          </p>
        </div>
        {active ? (
          <div className="rounded-full border border-emerald-300/40 bg-emerald-50/30 px-3 py-1.5 text-xs font-medium text-emerald-700 inline-flex items-center gap-2">
            <span className="ws-dot ws-dot--ok" />
            <span>{activeProviderMeta?.name || active.provider} active</span>
            {active.model && <span className="text-emerald-600/70">· {active.model}</span>}
            <button onClick={disconnect} className="ml-1 text-emerald-700/60 hover:text-destructive" aria-label="Disconnect">×</button>
          </div>
        ) : (
          <div className="rounded-full border border-amber-300/60 bg-amber-50/40 px-3 py-1.5 text-xs font-medium text-amber-700 inline-flex items-center gap-2">
            <span className="ws-dot ws-dot--warn ws-pulse-soft" /> No provider connected
          </div>
        )}
      </header>

      {/* Provider grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {PROVIDERS.map((p, i) => {
          const isActive = active?.provider === p.id;
          const isSelected = provider === p.id;
          const Icon = p.icon;
          return (
            <motion.button
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => {
                setProvider(p.id);
                setModel(p.defaultModel || "");
                setTestResult(null);
                setShowKeyForm(true);
              }}
              className={`group text-left rounded-2xl border bg-card p-4 ws-launch-card transition-all ${
                isSelected ? `ring-2 ${p.ring}` : "border-border/60 hover:border-border"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`h-9 w-9 rounded-xl ${p.accent} flex items-center justify-center`}>
                  <Icon className="h-4 w-4" />
                </div>
                {isActive ? (
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-emerald-700 font-semibold">
                    <span className="ws-dot ws-dot--ok" /> Active
                  </span>
                ) : (
                  <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider opacity-60 ${p.accent.split(" ")[1]}`}>
                    <SpeedBars speed={p.speed} /> {SPEED_LABEL[p.speed]}
                  </span>
                )}
              </div>

              <p className="font-semibold text-sm tracking-tight">{p.name}</p>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 mt-0.5">{p.specialty}</p>

              <ul className="mt-3 space-y-1">
                {p.bestFor.map(b => (
                  <li key={b} className="text-xs text-muted-foreground/90 flex items-center gap-1.5">
                    <span className="h-[3px] w-[3px] rounded-full bg-muted-foreground/40" /> {b}
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/40">
                <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                  <Gauge className="h-3 w-3" /> {p.costHint}
                </span>
                <span className="text-[11px] font-medium text-primary opacity-0 group-hover:opacity-100 transition">
                  {isActive ? "Re-key" : "Connect →"}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Key form (slides in when a provider is picked) */}
      {showKeyForm && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border/60 ws-surface p-5 space-y-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`h-9 w-9 rounded-xl ${selected.accent} flex items-center justify-center`}>
                <selected.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-tight">Connect {selected.name}</p>
                <p className="text-[11px] text-muted-foreground">{selected.tagline}</p>
              </div>
            </div>
            <a href={selected.href} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1 hover:underline shrink-0">
              Get a key <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
                <KeyRound className="h-3 w-3" /> API key
              </label>
              <Input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={selected.placeholder} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
                <Cpu className="h-3 w-3" /> Model
              </label>
              {selected.models && selected.models.length > 0 ? (
                <Select value={model || selected.defaultModel || ""} onValueChange={v => { setModel(v); setTestResult(null); }}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder={selected.defaultModel || "Pick a model"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {selected.models.map(m => (
                      <SelectItem key={m} value={m} className="text-sm font-mono">{m}</SelectItem>
                    ))}
                    <SelectItem value="__custom__" className="text-xs italic text-muted-foreground">Use custom model name…</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input value={model} onChange={e => setModel(e.target.value)} placeholder={selected.defaultModel || "default"} />
              )}
              {model === "__custom__" && (
                <Input
                  autoFocus
                  value=""
                  onChange={e => setModel(e.target.value)}
                  placeholder="Enter exact model id"
                  className="mt-1.5 font-mono text-xs"
                />
              )}
            </div>
          </div>

          {testResult && (
            <div className={`text-xs rounded-lg p-3 flex items-start gap-2 ${
              testResult.ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-destructive/10 text-destructive"
            }`}>
              {testResult.ok ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 shrink-0 mt-0.5" />}
              <div className="min-w-0">
                <p className="font-medium">
                  {testResult.ok ? "Connection healthy" : "Connection failed"}
                  {testResult.ms != null && <span className="ml-2 opacity-70">· {testResult.ms}ms</span>}
                </p>
                <p className="break-all opacity-80 mt-0.5">{testResult.msg}</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3" /> Stored encrypted. Used only for your workspace calls.
            </p>
            <div className="flex gap-2">
              <button
                onClick={test} disabled={testing || !apiKey}
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
              >
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Test connection
              </button>
              <button
                onClick={save} disabled={saving || !apiKey}
                className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Save & activate
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
