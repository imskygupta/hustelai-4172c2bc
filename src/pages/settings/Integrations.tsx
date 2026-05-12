import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Send, Check, Copy, Zap, Bell, Loader2, ExternalLink, Plug, Crown, X, MessageSquare, Sparkles, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { continueWorkflow } from "@/lib/nextActions/continueWorkflow";

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
  { id: "discord", name: "Discord", desc: "Link your account from the Community tab — roles auto-sync.", icon: MessageSquare, available: false, externalManage: "/community" },
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
  const [modalState, setModalState] = useState<"idle" | "preparing" | "waiting" | "success" | "error" | "expired">("idle");
  const [modalError, setModalError] = useState<string | null>(null);
  const [discordLinked, setDiscordLinked] = useState<boolean>(false);

  const allowed = ["pro", "elite", "infinity"].includes(tier.toLowerCase());

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: profile }, { data: integ }, { data: pref }, { data: dl }] = await Promise.all([
      supabase.from("profiles").select("subscription_tier").eq("user_id", user.id).maybeSingle(),
      supabase.from("notification_integrations" as any).select("*").eq("user_id", user.id),
      supabase.from("notification_preferences").select("channel_prefs, preset").eq("user_id", user.id).maybeSingle(),
      supabase.from("discord_links" as any).select("discord_username").eq("user_id", user.id).maybeSingle(),
    ]);
    setTier(profile?.subscription_tier || "free");
    setIntegrations((integ || []) as any);
    setPrefs(((pref as any)?.channel_prefs as Record<string, string[]>) || {});
    setPreset(((pref as any)?.preset as string) || "default");
    setDiscordLinked(!!dl);
    setLoading(false);
  };

  const startConnect = async (provider: string) => {
    setConnecting(provider);
    setLinkInfo(null);
    setModalError(null);
    setModalState("preparing");
    try {
      const { data, error } = await supabase.functions.invoke("notifications-connect", {
        body: { provider },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.message || data.error);
      setLinkInfo({ deep_link: data.deep_link, bot_username: data.bot_username, token: data.connect_token });
      setModalState("waiting");
      // Auto-open Telegram in a new tab to reduce friction
      try { window.open(data.deep_link, "_blank", "noopener"); } catch { /* ignore */ }
      // Poll for connected status
      setPolling(true);
      const start = Date.now();
      const interval = setInterval(async () => {
        if (Date.now() - start > 5 * 60 * 1000) {
          clearInterval(interval);
          setPolling(false);
          setModalState("expired");
          return;
        }
        const { data: rows } = await supabase
          .from("notification_integrations" as any)
          .select("*").eq("user_id", user!.id).eq("provider", provider).eq("status", "connected").maybeSingle();
        if (rows) {
          clearInterval(interval);
          setPolling(false);
          setModalState("success");
          load();
          if (provider === "telegram") {
            continueWorkflow({
              trigger: "telegram_connected",
              surface: "settings.integrations",
              headline: "Telegram connected",
              description: "Enable export delivery or send a test message.",
            });
          }
          // Auto-close after a brief celebratory state
          setTimeout(() => {
            setModalState("idle");
            setLinkInfo(null);
          }, 2200);
        }
      }, 2500);
    } catch (e: any) {
      setModalError(e?.message || "Could not start connection");
      setModalState("error");
    } finally {
      setConnecting(null);
    }
  };

  const closeModal = () => {
    setModalState("idle");
    setLinkInfo(null);
    setPolling(false);
    setModalError(null);
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
                      {!p.available && (p as any).externalManage && (
                        <Link
                          to={(p as any).externalManage}
                          className="flex items-center gap-1.5 text-xs rounded-md bg-[#5865F2]/15 ring-1 ring-[#5865F2]/40 text-[#a5b4fc] px-3 py-1.5 hover:bg-[#5865F2]/25"
                        >
                          {discordLinked && p.id === "discord" ? (
                            <><Check className="h-3.5 w-3.5" /> Linked · Manage</>
                          ) : (
                            <>Manage in Community <ArrowRight className="h-3.5 w-3.5" /></>
                          )}
                        </Link>
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

        {/* Polished Telegram Connect Modal */}
        <Dialog open={modalState !== "idle"} onOpenChange={(o) => { if (!o) closeModal(); }}>
          <DialogContent className="sm:max-w-md bg-zinc-950 border-white/[0.08] text-zinc-100 p-0 overflow-hidden">
            <div className="relative">
              {/* Ambient gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-sky-500/10 pointer-events-none" />
              <div className="relative p-6 sm:p-7">
                {/* Header / Telegram glyph */}
                <div className="flex justify-center mb-5">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-2xl bg-emerald-500/30 blur-2xl animate-pulse" />
                    <div className={`relative h-16 w-16 rounded-2xl flex items-center justify-center ring-1 ring-emerald-400/40 ${
                      modalState === "success" ? "bg-emerald-500/25" : "bg-white/[0.04]"
                    }`}>
                      {modalState === "success" ? (
                        <Check className="h-8 w-8 text-emerald-300" strokeWidth={3} />
                      ) : modalState === "error" || modalState === "expired" ? (
                        <X className="h-8 w-8 text-red-300" strokeWidth={2.5} />
                      ) : (
                        <Send className="h-7 w-7 text-emerald-300" />
                      )}
                    </div>
                  </div>
                </div>

                {modalState === "preparing" && (
                  <div className="text-center space-y-2">
                    <h3 className="text-base font-semibold">Preparing secure link…</h3>
                    <p className="text-xs text-zinc-400">Generating a one-time connection token.</p>
                    <div className="flex justify-center pt-3"><Loader2 className="h-4 w-4 animate-spin text-emerald-400" /></div>
                  </div>
                )}

                {modalState === "waiting" && linkInfo && (
                  <div className="space-y-4">
                    <div className="text-center space-y-1.5">
                      <h3 className="text-base font-semibold">Opening Telegram…</h3>
                      <p className="text-xs text-zinc-400">
                        Press <b className="text-zinc-200">Start</b> in Telegram to complete the connection. We'll detect it automatically.
                      </p>
                    </div>

                    {/* Step indicator */}
                    <div className="flex items-center justify-center gap-2 py-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span className="h-1.5 w-8 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-400/30 animate-pulse" />
                      <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
                    </div>

                    <div className="rounded-lg bg-white/[0.03] ring-1 ring-white/[0.06] p-3 flex items-center gap-3">
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-zinc-300">Waiting for confirmation from <span className="text-emerald-300">@{linkInfo.bot_username}</span></div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">Polls every 2.5s · expires in 15 min</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <a href={linkInfo.deep_link} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 text-xs rounded-md bg-emerald-500/20 ring-1 ring-emerald-500/40 text-emerald-200 px-3 py-2 hover:bg-emerald-500/30">
                        <ExternalLink className="h-3.5 w-3.5" /> Open Telegram
                      </a>
                      <button onClick={() => { navigator.clipboard.writeText(linkInfo.deep_link); toast({ title: "Link copied" }); }}
                        className="flex items-center justify-center gap-1.5 text-xs rounded-md bg-white/[0.04] ring-1 ring-white/10 px-3 py-2 hover:text-emerald-300">
                        <Copy className="h-3.5 w-3.5" /> Copy link
                      </button>
                    </div>

                    <button onClick={closeModal} className="w-full text-[11px] text-zinc-500 hover:text-zinc-300 pt-1">
                      Cancel
                    </button>
                  </div>
                )}

                {modalState === "success" && (
                  <div className="text-center space-y-2">
                    <h3 className="text-base font-semibold flex items-center justify-center gap-2">
                      <Sparkles className="h-4 w-4 text-emerald-300" /> Telegram connected
                    </h3>
                    <p className="text-xs text-zinc-400">You'll get real-time alerts in your Telegram chat.</p>
                  </div>
                )}

                {modalState === "expired" && (
                  <div className="text-center space-y-3">
                    <h3 className="text-base font-semibold">Link expired</h3>
                    <p className="text-xs text-zinc-400">The connection token timed out. Generate a fresh one to try again.</p>
                    <div className="flex justify-center gap-2 pt-1">
                      <button onClick={closeModal} className="text-xs rounded-md bg-white/[0.04] ring-1 ring-white/10 px-3 py-1.5">Close</button>
                      <button onClick={() => startConnect("telegram")} className="text-xs rounded-md bg-emerald-500/20 ring-1 ring-emerald-500/40 text-emerald-200 px-3 py-1.5">Retry</button>
                    </div>
                  </div>
                )}

                {modalState === "error" && (
                  <div className="text-center space-y-3">
                    <h3 className="text-base font-semibold">Could not start connection</h3>
                    <p className="text-xs text-red-300/80">{modalError}</p>
                    <div className="flex justify-center gap-2 pt-1">
                      <button onClick={closeModal} className="text-xs rounded-md bg-white/[0.04] ring-1 ring-white/10 px-3 py-1.5">Close</button>
                      <button onClick={() => startConnect("telegram")} className="text-xs rounded-md bg-emerald-500/20 ring-1 ring-emerald-500/40 text-emerald-200 px-3 py-1.5">Retry</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Preferences */}
        {tgIntegration && (
          <section>
            <h2 className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-3">Automation preset</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-6">
              {PRESETS.map(p => (
                <button key={p.id} onClick={() => applyPreset(p.id)}
                  className={`text-left rounded-xl border p-3 transition ${
                    preset === p.id ? "border-emerald-500/40 bg-emerald-500/[0.05]" : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]"
                  }`}>
                  <div className="text-sm font-medium text-zinc-100">{p.label}</div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{p.desc}</p>
                </button>
              ))}
            </div>
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