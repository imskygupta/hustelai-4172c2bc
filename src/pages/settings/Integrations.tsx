import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Send, Check, Copy, Zap, Bell, Loader2, ExternalLink, Plug, Crown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Integration {
  id: string;
  provider: string;
  status: string;
  provider_chat_id: string | null;
  provider_username: string | null;
  last_active_at: string | null;
  last_error: string | null;
}

const PROVIDERS = [
  { id: "telegram", name: "Telegram", desc: "Real-time alerts in your Telegram chat", icon: Send, available: true },
  { id: "discord", name: "Discord", desc: "Coming soon — DM or channel webhooks", icon: Plug, available: false },
  { id: "slack", name: "Slack", desc: "Coming soon — workspace integration", icon: Plug, available: false },
  { id: "webhook", name: "Custom Webhook", desc: "Coming soon — POST to any URL", icon: Plug, available: false },
];

const EVENT_CATEGORIES = [
  { key: "payment_success", label: "Payment success", category: "billing" },
  { key: "payment_failed", label: "Payment failed", category: "billing" },
  { key: "wallet_low_balance", label: "Wallet low balance", category: "billing" },
  { key: "subscription_renewal", label: "Subscription renewal", category: "billing" },
  { key: "affiliate_commission", label: "Affiliate commissions", category: "growth" },
  { key: "ai_task_completed", label: "AI task completed", category: "ai" },
  { key: "lead_alert", label: "New lead alerts", category: "growth" },
  { key: "workspace_mention", label: "Workspace mentions", category: "collab" },
  { key: "security_alert", label: "Security alerts", category: "security" },
  { key: "system_incident", label: "System incidents", category: "system" },
  { key: "product_announcement", label: "Product announcements", category: "system" },
];

export default function Integrations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState("free");
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [prefs, setPrefs] = useState<Record<string, string[]>>({});
  const [connecting, setConnecting] = useState<string | null>(null);
  const [linkInfo, setLinkInfo] = useState<{ deep_link: string; bot_username: string; token: string } | null>(null);
  const [polling, setPolling] = useState(false);
  const [preset, setPreset] = useState<string>("default");

  const allowed = ["pro", "elite", "infinity"].includes(tier.toLowerCase());

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: profile }, { data: integ }, { data: pref }] = await Promise.all([
      supabase.from("profiles").select("subscription_tier").eq("user_id", user.id).maybeSingle(),
      supabase.from("notification_integrations" as any).select("*").eq("user_id", user.id),
      supabase.from("notification_preferences").select("channel_prefs, preset").eq("user_id", user.id).maybeSingle(),
    ]);
    setTier(profile?.subscription_tier || "free");
    setIntegrations((integ || []) as any);
    setPrefs(((pref as any)?.channel_prefs as Record<string, string[]>) || {});
    setPreset(((pref as any)?.preset as string) || "default");
    setLoading(false);
  };

  const startConnect = async (provider: string) => {
    setConnecting(provider);
    setLinkInfo(null);
    try {
      const { data, error } = await supabase.functions.invoke("notifications-connect", {
        body: { provider },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.message || data.error);
      setLinkInfo({ deep_link: data.deep_link, bot_username: data.bot_username, token: data.connect_token });
      // Poll for connected status
      setPolling(true);
      const start = Date.now();
      const interval = setInterval(async () => {
        if (Date.now() - start > 5 * 60 * 1000) { clearInterval(interval); setPolling(false); return; }
        const { data: rows } = await supabase
          .from("notification_integrations" as any)
          .select("*").eq("user_id", user!.id).eq("provider", provider).eq("status", "connected").maybeSingle();
        if (rows) {
          clearInterval(interval);
          setPolling(false);
          setLinkInfo(null);
          toast({ title: "✅ Telegram connected", description: "You'll receive a confirmation message in Telegram." });
          load();
        }
      }, 2500);
    } catch (e: any) {
      toast({ title: "Connect failed", description: e.message, variant: "destructive" });
    } finally {
      setConnecting(null);
    }
  };

  const disconnect = async (id: string) => {
    await supabase.from("notification_integrations" as any).update({ status: "revoked", provider_chat_id: null }).eq("id", id);
    toast({ title: "Disconnected" });
    load();
  };

  const sendTest = async (provider: string) => {
    const { error } = await supabase.functions.invoke("notifications-test", { body: { provider } });
    if (error) toast({ title: "Test failed", description: error.message, variant: "destructive" });
    else toast({ title: "🚀 Test sent", description: "Check your Telegram chat in a few seconds." });
  };

  const togglePref = async (eventKey: string, provider: string) => {
    const cur = new Set(prefs[eventKey] || ["telegram"]);
    if (cur.has(provider)) cur.delete(provider); else cur.add(provider);
    const next = { ...prefs, [eventKey]: Array.from(cur) };
    setPrefs(next);
    await supabase.from("notification_preferences").upsert({
      user_id: user!.id,
      channel_prefs: next as any,
    }, { onConflict: "user_id" });
  };

  const tgIntegration = integrations.find(i => i.provider === "telegram" && i.status === "connected");

  const PRESETS = [
    { id: "default",  label: "Default",         desc: "Everything you've enabled below." },
    { id: "silent",   label: "Silent mode",     desc: "Only the most critical alerts." },
    { id: "critical", label: "Critical only",   desc: "Payments + security only." },
    { id: "growth",   label: "Growth mode",     desc: "Wins: payments, AI tasks, commissions." },
    { id: "ops",      label: "Ops mode",        desc: "Everything, all the time." },
  ];
  const applyPreset = async (id: string) => {
    setPreset(id);
    await supabase.from("notification_preferences").upsert(
      { user_id: user!.id, preset: id } as any, { onConflict: "user_id" }
    );
    toast({ title: "Preset updated", description: PRESETS.find(p => p.id === id)?.label });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <header>
          <div className="flex items-center gap-2 mb-1">
            <Bell className="h-5 w-5 text-emerald-400" />
            <h1 className="text-xl font-semibold tracking-tight">Real-Time Notifications</h1>
          </div>
          <p className="text-sm text-zinc-400">Get instant alerts on Telegram for payments, AI tasks, leads, and security events.</p>
        </header>

        {!allowed && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
            <Crown className="h-5 w-5 text-amber-400 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium text-amber-200">Premium feature</div>
              <p className="text-xs text-amber-200/70 mt-1">Real-time notifications are available on Pro, Elite, and Infinity tiers.</p>
            </div>
            <a href="/payment" className="text-xs rounded-md bg-amber-500/20 ring-1 ring-amber-500/40 text-amber-200 px-3 py-1.5 hover:bg-amber-500/30">Upgrade</a>
          </div>
        )}

        {/* Provider cards */}
        <section>
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-3">Channels</h2>
          {loading ? (
            <div className="space-y-3">{[0,1].map(i => <Skeleton key={i} className="h-24 rounded-xl bg-white/[0.04]" />)}</div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {PROVIDERS.map(p => {
                const integ = integrations.find(i => i.provider === p.id);
                const connected = integ?.status === "connected";
                const Icon = p.icon;
                return (
                  <div key={p.id} className={`rounded-xl border p-4 ${connected ? "border-emerald-500/30 bg-emerald-500/[0.03]" : "border-white/[0.08] bg-white/[0.02]"}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${connected ? "bg-emerald-500/15 text-emerald-300" : "bg-white/[0.04] text-zinc-400"}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-medium flex items-center gap-2">
                            {p.name}
                            {connected && <span className="text-[10px] uppercase rounded px-1.5 py-0.5 bg-emerald-500/15 text-emerald-300">Connected</span>}
                            {!p.available && <span className="text-[10px] uppercase rounded px-1.5 py-0.5 bg-white/[0.04] text-zinc-500">Soon</span>}
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5">{p.desc}</p>
                        </div>
                      </div>
                    </div>
                    {connected && integ && (
                      <div className="text-[11px] text-zinc-500 mb-3">
                        {integ.provider_username ? `@${integ.provider_username}` : "Linked"}
                        {integ.last_active_at && <> · last active {new Date(integ.last_active_at).toLocaleString()}</>}
                      </div>
                    )}
                    <div className="flex gap-2">
                      {p.available && !connected && (
                        <button disabled={!allowed || connecting === p.id} onClick={() => startConnect(p.id)}
                          className="flex items-center gap-1.5 text-xs rounded-md bg-emerald-500/15 ring-1 ring-emerald-500/40 text-emerald-300 px-3 py-1.5 hover:bg-emerald-500/25 disabled:opacity-40">
                          {connecting === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                          Connect
                        </button>
                      )}
                      {connected && (
                        <>
                          <button onClick={() => sendTest(p.id)} className="text-xs rounded-md bg-white/[0.04] ring-1 ring-white/10 px-3 py-1.5 hover:text-emerald-300">Send test</button>
                          <button onClick={() => disconnect(integ!.id)} className="text-xs rounded-md bg-red-500/10 ring-1 ring-red-500/40 text-red-300 px-3 py-1.5 hover:bg-red-500/20">Disconnect</button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Connect link panel */}
        {linkInfo && (
          <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] p-5">
            <div className="flex items-center gap-2 mb-3">
              {polling ? <Loader2 className="h-4 w-4 animate-spin text-emerald-400" /> : <Check className="h-4 w-4 text-emerald-400" />}
              <h3 className="text-sm font-medium text-emerald-200">Step 1 — Open Telegram</h3>
            </div>
            <p className="text-xs text-zinc-400 mb-3">Tap the link below, then press <b>Start</b> in Telegram. We'll detect the connection automatically.</p>
            <div className="flex gap-2 flex-wrap">
              <a href={linkInfo.deep_link} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs rounded-md bg-emerald-500/20 ring-1 ring-emerald-500/40 text-emerald-200 px-3 py-2 hover:bg-emerald-500/30">
                <ExternalLink className="h-3.5 w-3.5" /> Open @{linkInfo.bot_username}
              </a>
              <button onClick={() => { navigator.clipboard.writeText(linkInfo.deep_link); toast({ title: "Link copied" }); }}
                className="flex items-center gap-1.5 text-xs rounded-md bg-white/[0.04] ring-1 ring-white/10 px-3 py-2 hover:text-emerald-300">
                <Copy className="h-3.5 w-3.5" /> Copy link
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 mt-3">Token expires in 15 minutes. Waiting for confirmation…</p>
          </section>
        )}

        {/* Preferences */}
        {tgIntegration && (
          <section>
            <h2 className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-3">Event preferences</h2>
            <div className="rounded-xl border border-white/[0.08] divide-y divide-white/[0.05] bg-white/[0.015]">
              {EVENT_CATEGORIES.map(ev => {
                const enabled = (prefs[ev.key] || ["telegram"]).includes("telegram");
                return (
                  <div key={ev.key} className="flex items-center justify-between px-4 py-3 text-sm">
                    <div>
                      <div className="text-zinc-200">{ev.label}</div>
                      <code className="text-[10px] text-zinc-500">{ev.category}</code>
                    </div>
                    <button onClick={() => togglePref(ev.key, "telegram")}
                      className={`text-xs rounded-md px-3 py-1.5 ring-1 transition ${
                        enabled ? "bg-emerald-500/15 ring-emerald-500/40 text-emerald-300" : "bg-white/[0.03] ring-white/10 text-zinc-500"
                      }`}>
                      {enabled ? "On" : "Off"}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}