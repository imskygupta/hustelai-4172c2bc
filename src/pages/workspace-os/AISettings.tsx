import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { KeyRound, Loader2, CheckCircle2, XCircle, Zap, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

const PROVIDERS = [
  {
    id: "gemini",
    name: "Google Gemini",
    tagline: "Free tier — 15 requests/min. Best for structured extraction.",
    href: "https://aistudio.google.com/apikey",
    color: "from-blue-500/30 to-cyan-500/20",
    placeholder: "AIza…",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    tagline: "Pay-per-use. Access 100+ models.",
    href: "https://openrouter.ai/keys",
    color: "from-violet-500/30 to-fuchsia-500/20",
    placeholder: "sk-or-…",
  },
  {
    id: "openai",
    name: "OpenAI",
    tagline: "Premium quality. Bring your own credits.",
    href: "https://platform.openai.com/api-keys",
    color: "from-emerald-500/30 to-teal-500/20",
    placeholder: "sk-…",
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    tagline: "Long-context reasoning. Ideal for docs & analysis.",
    href: "https://console.anthropic.com/settings/keys",
    color: "from-amber-500/30 to-orange-500/20",
    placeholder: "sk-ant-…",
  },
  {
    id: "groq",
    name: "Groq",
    tagline: "Ultra-low latency. Best for real-time agent loops.",
    href: "https://console.groq.com/keys",
    color: "from-rose-500/30 to-red-500/20",
    placeholder: "gsk_…",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    tagline: "Cost-efficient reasoning. Strong on code & math.",
    href: "https://platform.deepseek.com/api_keys",
    color: "from-sky-500/30 to-indigo-500/20",
    placeholder: "sk-…",
  },
] as const;

export default function AISettings() {
  const { user } = useAuth();
  const [provider, setProvider] = useState<string>("gemini");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [active, setActive] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);

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
    const { data } = await supabase.functions.invoke("ai-key-test", {
      body: { provider, api_key: apiKey, model: model || undefined },
    });
    setTesting(false);
    setTestResult({ ok: !!data?.ok, msg: data?.reply || data?.error || "Unknown" });
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
    setActive({ provider, model });
    setApiKey("");
  }

  async function disconnect() {
    if (!user) return;
    const { error } = await (supabase as any).from("user_ai_keys").delete().eq("user_id", user.id);
    if (error) return toast.error(error.message);
    setActive(null);
    setApiKey("");
    toast.success("Disconnected — falling back to platform AI");
  }

  const selected = PROVIDERS.find(p => p.id === provider)!;

  return (
    <div className="max-w-3xl space-y-8">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-primary">
          <Zap className="h-5 w-5" />
          <span className="text-xs uppercase tracking-wider font-medium">Fuel up your AI</span>
        </div>
        <h2 className="text-3xl font-semibold tracking-tight">Connect your AI fuel</h2>
        <p className="text-sm text-muted-foreground max-w-xl">
          We give you the workspace OS. You can plug in your own AI key for unlimited generations — at provider cost. No key? No problem — the platform AI works automatically.
        </p>
      </header>

      {active && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <div>
              <p className="text-sm font-medium">Connected: {PROVIDERS.find(p => p.id === active.provider)?.name || active.provider}</p>
              <p className="text-xs text-muted-foreground">{active.model || "default model"}</p>
            </div>
          </div>
          <button onClick={disconnect} className="text-xs text-muted-foreground hover:text-destructive">
            Disconnect
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PROVIDERS.map(p => (
          <button
            key={p.id}
            onClick={() => { setProvider(p.id); setTestResult(null); }}
            className={`text-left rounded-2xl border p-4 transition-all bg-gradient-to-br ${p.color} ${
              provider === p.id ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/40"
            }`}
          >
            <p className="font-medium text-sm">{p.name}</p>
            <p className="text-xs text-muted-foreground mt-1">{p.tagline}</p>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> {selected.name} API key
          </label>
          <a href={selected.href} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
            Get a key <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <Input
          type="password"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder={selected.placeholder}
        />
        <Input
          value={model}
          onChange={e => setModel(e.target.value)}
          placeholder="Model (optional, e.g. gemini-2.5-flash)"
        />

        {testResult && (
          <div className={`text-xs rounded-lg p-3 flex items-start gap-2 ${
            testResult.ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-destructive/10 text-destructive"
          }`}>
            {testResult.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
            <span className="break-all">{testResult.msg}</span>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={test}
            disabled={testing || !apiKey}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Test connection
          </button>
          <button
            onClick={save}
            disabled={saving || !apiKey}
            className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-lg shadow-primary/30 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Save & activate
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Your key is stored encrypted at rest and never exposed to other users. Used only for your workspace AI calls.
        </p>
      </div>
    </div>
  );
}