import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, KeyRound, Users, FileDown, Sparkles, AlarmClock, Send } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SendUserNotificationDialog } from "@/components/admin/SendUserNotificationDialog";
import { formatDistanceToNow } from "date-fns";

type Row = {
  user_id: string; email: string; subscription_tier: string;
  workspace_count: number; exports_30d: number; ai_calls_30d: number; has_byo_key: boolean;
};

type DailyRow = {
  user_id: string; email: string; subscription_tier: string;
  ai_used_today: number; ai_max_today: number; last_use_at: string | null; has_byo_key: boolean;
};

export function UsageAnalyticsManager() {
  const [rows, setRows] = useState<Row[]>([]);
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Record<string, DailyRow>>({});
  const [sendOpen, setSendOpen] = useState(false);
  const [sendTargets, setSendTargets] = useState<DailyRow[]>([]);

  useEffect(() => {
    (async () => {
      const [r1, r2] = await Promise.all([
        (supabase as any).from("admin_usage_summary").select("*").order("ai_calls_30d", { ascending: false }).limit(200),
        (supabase as any).from("admin_daily_usage_summary").select("*").order("last_use_at", { ascending: false, nullsFirst: false }).limit(500),
      ]);
      setRows((r1.data as Row[]) || []);
      setDaily((r2.data as DailyRow[]) || []);
      setLoading(false);
    })();
  }, []);

  const totals = rows.reduce((acc, r) => ({
    users: acc.users + 1,
    workspaces: acc.workspaces + (r.workspace_count || 0),
    exports: acc.exports + (r.exports_30d || 0),
    ai: acc.ai + (r.ai_calls_30d || 0),
    byo: acc.byo + (r.has_byo_key ? 1 : 0),
  }), { users: 0, workspaces: 0, exports: 0, ai: 0, byo: 0 });

  const exhaustedToday = daily.filter((d) => d.ai_used_today > 0 && d.ai_used_today >= d.ai_max_today);

  const toggle = (r: DailyRow) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[r.user_id]) delete next[r.user_id]; else next[r.user_id] = r;
      return next;
    });
  };
  const selectedList = Object.values(selected);
  const openSendOne = (r: DailyRow) => { setSendTargets([r]); setSendOpen(true); };
  const openSendBulk = () => { setSendTargets(selectedList); setSendOpen(true); };

  if (loading) return <Skeleton className="h-64 rounded-2xl" />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat icon={Users} label="Users" value={totals.users} />
        <Stat icon={Sparkles} label="Workspaces" value={totals.workspaces} />
        <Stat icon={FileDown} label="Exports (30d)" value={totals.exports} />
        <Stat icon={BarChart3} label="AI calls (30d)" value={totals.ai} />
        <Stat icon={KeyRound} label="BYO key users" value={totals.byo} />
      </div>

      <Tabs defaultValue="exhausted">
        <TabsList>
          <TabsTrigger value="exhausted">
            <AlarmClock className="h-3.5 w-3.5 mr-1.5" />
            Exhausted today ({exhaustedToday.length})
          </TabsTrigger>
          <TabsTrigger value="all">All users (30d)</TabsTrigger>
        </TabsList>

        <TabsContent value="exhausted" className="mt-4 space-y-3">
          {selectedList.length > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
              <span className="text-sm">{selectedList.length} selected</span>
              <Button size="sm" onClick={openSendBulk}>
                <Send className="w-3.5 h-3.5 mr-1" /> Send notification to selected
              </Button>
            </div>
          )}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 w-8"></th>
                  <th className="text-left px-4 py-2">Email</th>
                  <th className="text-left px-4 py-2">Tier</th>
                  <th className="text-right px-4 py-2">Used today</th>
                  <th className="text-left px-4 py-2">Last use</th>
                  <th className="text-center px-4 py-2">BYO</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {exhaustedToday.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No users have exhausted today's AI quota yet.
                  </td></tr>
                )}
                {exhaustedToday.map((r) => (
                  <tr key={r.user_id} className="hover:bg-muted/30">
                    <td className="px-3 py-2">
                      <Checkbox checked={!!selected[r.user_id]} onCheckedChange={() => toggle(r)} />
                    </td>
                    <td className="px-4 py-2 truncate max-w-[260px]">{r.email}</td>
                    <td className="px-4 py-2 capitalize">{r.subscription_tier}</td>
                    <td className="px-4 py-2 text-right font-semibold text-amber-600">
                      {r.ai_used_today}/{r.ai_max_today}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {r.last_use_at ? formatDistanceToNow(new Date(r.last_use_at), { addSuffix: true }) : "—"}
                    </td>
                    <td className="px-4 py-2 text-center">{r.has_byo_key ? "✓" : ""}</td>
                    <td className="px-4 py-2 text-right">
                      <Button size="sm" variant="outline" onClick={() => openSendOne(r)}>
                        <Send className="w-3 h-3 mr-1" /> Notify
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2">Email</th>
              <th className="text-left px-4 py-2">Tier</th>
              <th className="text-right px-4 py-2">Workspaces</th>
              <th className="text-right px-4 py-2">Exports 30d</th>
              <th className="text-right px-4 py-2">AI 30d</th>
              <th className="text-center px-4 py-2">BYO</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {rows.map(r => (
              <tr key={r.user_id} className="hover:bg-muted/30">
                <td className="px-4 py-2 truncate max-w-[260px]">{r.email}</td>
                <td className="px-4 py-2 capitalize">{r.subscription_tier}</td>
                <td className="px-4 py-2 text-right">{r.workspace_count}</td>
                <td className="px-4 py-2 text-right">{r.exports_30d}</td>
                <td className="px-4 py-2 text-right">{r.ai_calls_30d}</td>
                <td className="px-4 py-2 text-center">{r.has_byo_key ? "✓" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
          </div>
        </TabsContent>
      </Tabs>

      <SendUserNotificationDialog
        open={sendOpen}
        onClose={() => { setSendOpen(false); setSelected({}); }}
        targets={sendTargets}
      />
    </div>
  );
}

function Stat({ icon: Icon, label, value }: any) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {label}</div>
      <p className="text-xl font-semibold mt-1">{Number(value).toLocaleString()}</p>
    </div>
  );
}