import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Rocket, CheckCircle2, AlertCircle, TrendingUp, Wallet, CreditCard, Activity, IndianRupee, Users } from "lucide-react";
import { motion } from "framer-motion";

type Product = {
  id: string; mode: string; internal_key: string; kind: string;
  dodo_product_id: string; name: string; amount_inr: number; credits: number | null; is_active: boolean;
};
type Sub = {
  id: string; user_id: string; mode: string; dodo_subscription_id: string;
  internal_key: string | null; status: string; amount: number; currency: string;
  current_period_end: string | null; cancel_at_period_end: boolean; created_at: string;
};
type EventRow = {
  id: string; event_id: string; event_type: string; status: string;
  user_id: string | null; error: string | null; created_at: string;
};

export function DodoAdminPanel() {
  const [tab, setTab] = useState<"overview" | "products" | "subs" | "events">("overview");
  const [products, setProducts] = useState<Product[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [mode, setMode] = useState<string>("test");

  const load = async () => {
    setRefreshing(true);
    const [p, s, e] = await Promise.all([
      supabase.from("dodo_products" as any).select("*").order("amount_inr"),
      supabase.from("dodo_subscriptions" as any).select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("dodo_events" as any).select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    if (p.data) setProducts(p.data as any);
    if (s.data) setSubs(s.data as any);
    if (e.data) setEvents(e.data as any);
    if ((p.data as any)?.[0]?.mode) setMode((p.data as any)[0].mode);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  const bootstrap = async () => {
    if (!confirm(`Create all 7 Dodo products (3 plans + 4 wallet packs) in ${mode.toUpperCase()} mode? Existing entries are skipped.`)) return;
    setBootstrapping(true);
    try {
      const { data, error } = await supabase.functions.invoke("dodo-bootstrap", {
        body: { action: "bootstrap" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const created = data.results.filter((r: any) => r.status === "created").length;
      const exists = data.results.filter((r: any) => r.status === "exists").length;
      const errs = data.results.filter((r: any) => r.status === "error");
      toast({
        title: `✅ Bootstrap complete (${data.mode})`,
        description: `${created} created · ${exists} already existed${errs.length ? ` · ${errs.length} errors` : ""}`,
        variant: errs.length ? "destructive" : "default",
      });
      if (errs.length) console.error("Dodo bootstrap errors:", errs);
      load();
    } catch (err: any) {
      toast({ title: "Bootstrap failed", description: err.message, variant: "destructive" });
    } finally { setBootstrapping(false); }
  };

  // ===== analytics =====
  const stats = useMemo(() => {
    const active = subs.filter(s => s.status === "active");
    const mrr = active.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
    const tierCount = active.reduce((acc: any, s) => {
      const k = s.internal_key || "unknown";
      acc[k] = (acc[k] || 0) + 1; return acc;
    }, {});
    const failedEvents = events.filter(e => e.status === "failed").length;
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return d.toISOString().slice(0, 10);
    });
    const dailySignups = last7Days.map(date => ({
      date,
      count: subs.filter(s => s.created_at.slice(0, 10) === date).length,
    }));
    return { active: active.length, total: subs.length, mrr, tierCount, failedEvents, dailySignups };
  }, [subs, events]);

  const maxDay = Math.max(1, ...stats.dailySignups.map(d => d.count));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display font-bold text-2xl flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" /> Dodo Payments
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Subscriptions, wallet top-ups, GST, and multi-currency — all via Dodo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={mode === "live" ? "default" : "outline"}
            className={mode === "live" ? "bg-emerald-600 text-white" : "border-amber-500/50 text-amber-500"}>
            {mode.toUpperCase()} MODE
          </Badge>
          <Button variant="outline" size="sm" onClick={load} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button onClick={bootstrap} disabled={bootstrapping}
            className="bg-gradient-to-r from-primary to-purple-600 text-white">
            {bootstrapping ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Rocket className="w-4 h-4 mr-1" />}
            Bootstrap Products
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([
          { k: "overview", label: "Overview", icon: TrendingUp },
          { k: "products", label: `Products (${products.length})`, icon: Wallet },
          { k: "subs", label: `Subscriptions (${subs.length})`, icon: Users },
          { k: "events", label: `Events (${events.length})`, icon: Activity },
        ] as const).map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-all ${
              tab === t.k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={Users} label="Active subscriptions" value={stats.active} accent="text-emerald-500" />
            <StatCard icon={IndianRupee} label="MRR (active)" value={`₹${stats.mrr.toLocaleString()}`} accent="text-primary" />
            <StatCard icon={Activity} label="Total subs (all-time)" value={stats.total} />
            <StatCard icon={AlertCircle} label="Failed webhook events" value={stats.failedEvents} accent={stats.failedEvents > 0 ? "text-destructive" : ""} />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-5">
              <h3 className="text-sm font-semibold mb-4">New subscriptions · last 7 days</h3>
              <div className="flex items-end gap-2 h-36">
                {stats.dailySignups.map(d => (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-gradient-to-t from-primary/70 to-primary/20 rounded-t-md transition-all"
                      style={{ height: `${(d.count / maxDay) * 100}%`, minHeight: 2 }} />
                    <span className="text-[10px] text-muted-foreground">{d.date.slice(5)}</span>
                    <span className="text-[10px] font-semibold">{d.count}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-5">
              <h3 className="text-sm font-semibold mb-4">Active subscribers by plan</h3>
              <div className="space-y-2">
                {["pro", "elite", "infinity"].map(k => {
                  const n = stats.tierCount[k] || 0;
                  const pct = stats.active > 0 ? (n / stats.active) * 100 : 0;
                  return (
                    <div key={k}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium uppercase">{k}</span>
                        <span className="text-muted-foreground">{n} · {pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-primary to-purple-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                {stats.active === 0 && <p className="text-xs text-muted-foreground">No active subscriptions yet.</p>}
              </div>
            </motion.div>
          </div>

          {products.length === 0 && (
            <div className="rounded-xl p-4 border border-amber-500/40 bg-amber-500/5 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold">No products created yet.</p>
                <p className="text-muted-foreground">Click <strong>Bootstrap Products</strong> above to create all 7 Dodo products in one click.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PRODUCTS */}
      {tab === "products" && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {products.map(p => (
            <div key={p.id} className="glass rounded-xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{p.name}</p>
                  <Badge variant="outline" className="text-[10px] mt-1">{p.kind === "subscription" ? "Subscription" : "One-time"}</Badge>
                </div>
                <p className="text-lg font-display font-bold text-primary">₹{p.amount_inr}</p>
              </div>
              <div className="text-[10px] text-muted-foreground font-mono break-all">
                <span className="text-emerald-500">{p.internal_key}</span> → {p.dodo_product_id}
              </div>
              {p.credits && <p className="text-xs">{p.credits} wallet credits</p>}
            </div>
          ))}
          {products.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-8">No products yet — click Bootstrap above.</p>}
        </div>
      )}

      {/* SUBSCRIPTIONS */}
      {tab === "subs" && (
        <div className="space-y-2">
          {subs.map(s => (
            <div key={s.id} className="glass rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`text-[10px] ${
                    s.status === "active" ? "bg-emerald-600" :
                    s.status === "cancelled" || s.status === "expired" ? "bg-muted text-muted-foreground" :
                    "bg-amber-500"
                  } text-white`}>{s.status}</Badge>
                  <span className="font-semibold uppercase text-xs">{s.internal_key || "—"}</span>
                  {s.cancel_at_period_end && <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30">Cancels at period end</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-mono truncate">user {s.user_id?.slice(0, 8)} · {s.dodo_subscription_id}</p>
                {s.current_period_end && <p className="text-[10px] text-muted-foreground">Renews {new Date(s.current_period_end).toLocaleDateString()}</p>}
              </div>
              <p className="text-sm font-semibold text-primary">{s.currency} {Number(s.amount).toLocaleString()}</p>
            </div>
          ))}
          {subs.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No subscriptions yet.</p>}
        </div>
      )}

      {/* EVENTS */}
      {tab === "events" && (
        <div className="space-y-1.5">
          {events.map(e => (
            <div key={e.id} className="text-xs p-2.5 rounded-lg bg-muted/30 border border-border/40 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {e.status === "processed" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  : e.status === "failed" ? <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                  : <Activity className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                <code className="font-mono truncate">{e.event_type}</code>
                {e.error && <span className="text-destructive text-[10px] truncate">{e.error}</span>}
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">{new Date(e.created_at).toLocaleString()}</span>
            </div>
          ))}
          {events.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No webhook events received yet.</p>}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: any) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <p className={`text-2xl font-display font-bold mt-1 ${accent || ""}`}>{value}</p>
    </div>
  );
}