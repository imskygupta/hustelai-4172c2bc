import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Megaphone, Activity, AlertTriangle, CheckCircle2, Send } from "lucide-react";

type Stats = { total: number; sent: number; failed: number; skipped: number };
type CatStat = { category: string; count: number };
type ProviderStat = { provider: string; sent: number; failed: number; uptime: number };

export default function AdminNotifications() {
  const [stats, setStats] = useState<Stats>({ total: 0, sent: 0, failed: 0, skipped: 0 });
  const [byCategory, setByCategory] = useState<CatStat[]>([]);
  const [providers, setProviders] = useState<ProviderStat[]>([]);
  const [recentFailures, setRecentFailures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // broadcast composer
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [tier, setTier] = useState<"all" | "free" | "pro" | "elite" | "infinity">("all");
  const [external, setExternal] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const since = new Date(Date.now() - 7 * 86400_000).toISOString();
    const [{ data: deliv }, { data: events }, { data: failures }] = await Promise.all([
      supabase.from("notification_deliveries" as any).select("provider,status,created_at").gte("created_at", since).limit(5000),
      supabase.from("notification_events" as any).select("category").gte("created_at", since).limit(5000),
      supabase.from("notification_deliveries" as any).select("provider,last_error,created_at").eq("status", "failed").order("created_at", { ascending: false }).limit(15),
    ]);

    const s: Stats = { total: 0, sent: 0, failed: 0, skipped: 0 };
    const pmap: Record<string, { sent: number; failed: number }> = {};
    for (const d of (deliv as any[]) || []) {
      s.total++;
      if (d.status === "sent") s.sent++;
      else if (d.status === "failed") s.failed++;
      else if (d.status === "skipped") s.skipped++;
      pmap[d.provider] = pmap[d.provider] || { sent: 0, failed: 0 };
      if (d.status === "sent") pmap[d.provider].sent++;
      if (d.status === "failed") pmap[d.provider].failed++;
    }
    setStats(s);
    setProviders(Object.entries(pmap).map(([provider, v]) => ({
      provider, sent: v.sent, failed: v.failed,
      uptime: v.sent + v.failed === 0 ? 100 : Math.round((v.sent / (v.sent + v.failed)) * 1000) / 10,
    })));

    const cmap: Record<string, number> = {};
    for (const e of (events as any[]) || []) cmap[e.category] = (cmap[e.category] || 0) + 1;
    setByCategory(Object.entries(cmap).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count));
    setRecentFailures((failures as any[]) || []);
    setLoading(false);
  }

  async function sendBroadcast() {
    if (!title.trim() || !message.trim()) { toast.error("Title + message required"); return; }
    setSending(true);
    const { data, error } = await supabase.functions.invoke("notifications-broadcast", {
      body: { title, message, link, target_tier: tier, dispatch_external: external },
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Broadcast sent to ${data?.sent_to || 0} users`);
    setTitle(""); setMessage(""); setLink("");
    void load();
  }

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground">Last 7 days · deliveries, provider uptime and broadcast composer.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Activity} label="Sent" value={stats.sent} tone="green" />
        <StatCard icon={AlertTriangle} label="Failed" value={stats.failed} tone="red" />
        <StatCard icon={CheckCircle2} label="Skipped" value={stats.skipped} tone="amber" />
        <StatCard icon={Megaphone} label="Total" value={stats.total} tone="blue" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Provider uptime</CardTitle></CardHeader>
          <CardContent>
            {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : providers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No deliveries yet.</p>
            ) : (
              <div className="space-y-3">
                {providers.map((p) => (
                  <div key={p.provider} className="flex items-center justify-between text-sm">
                    <span className="capitalize font-medium">{p.provider}</span>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-emerald-600">{p.sent} sent</span>
                      <span className="text-rose-600">{p.failed} failed</span>
                      <span className={`font-bold ${p.uptime > 95 ? "text-emerald-600" : p.uptime > 80 ? "text-amber-600" : "text-rose-600"}`}>
                        {p.uptime}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Top categories</CardTitle></CardHeader>
          <CardContent>
            {byCategory.length === 0 ? <p className="text-sm text-muted-foreground">No events yet.</p> : (
              <div className="space-y-2">
                {byCategory.slice(0, 8).map((c) => (
                  <div key={c.category} className="flex justify-between text-sm">
                    <span className="capitalize">{c.category}</span>
                    <span className="text-muted-foreground font-mono">{c.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Megaphone className="w-4 h-4" /> Broadcast</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Maintenance window — 9–10pm IST" />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label>Link (optional)</Label>
              <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="/dashboard" />
            </div>
            <div>
              <Label>Target tier</Label>
              <select value={tier} onChange={(e) => setTier(e.target.value as any)}
                className="w-full h-10 rounded-md border bg-background px-3 text-sm">
                <option value="all">All users</option>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="elite">Elite</option>
                <option value="infinity">Infinity</option>
              </select>
            </div>
            <div className="flex items-end justify-between gap-3">
              <div>
                <Label>Push external</Label>
                <p className="text-[10px] text-muted-foreground">Also send via Telegram/email.</p>
              </div>
              <Switch checked={external} onCheckedChange={setExternal} />
            </div>
          </div>
          <Button onClick={sendBroadcast} disabled={sending}>
            <Send className="w-4 h-4 mr-2" /> {sending ? "Sending…" : "Send broadcast"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent failures</CardTitle></CardHeader>
        <CardContent>
          {recentFailures.length === 0 ? <p className="text-sm text-muted-foreground">No recent failures. 🎉</p> : (
            <div className="space-y-2">
              {recentFailures.map((f, i) => (
                <div key={i} className="text-xs border-l-2 border-rose-300 pl-3 py-1">
                  <span className="font-medium capitalize">{f.provider}</span>
                  <span className="text-muted-foreground ml-2">{new Date(f.created_at).toLocaleString()}</span>
                  <p className="text-rose-700 mt-0.5 truncate">{f.last_error}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }: any) {
  const tones: Record<string, string> = {
    green: "bg-emerald-500/10 text-emerald-700",
    red: "bg-rose-500/10 text-rose-700",
    amber: "bg-amber-500/10 text-amber-700",
    blue: "bg-primary/10 text-primary",
  };
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tones[tone]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-2xl font-bold leading-none">{value}</div>
          <div className="text-[11px] text-muted-foreground mt-1">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}