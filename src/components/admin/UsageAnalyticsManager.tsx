import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, KeyRound, Users, FileDown, Sparkles } from "lucide-react";

type Row = {
  user_id: string; email: string; subscription_tier: string;
  workspace_count: number; exports_30d: number; ai_calls_30d: number; has_byo_key: boolean;
};

export function UsageAnalyticsManager() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("admin_usage_summary")
        .select("*")
        .order("ai_calls_30d", { ascending: false })
        .limit(200);
      setRows((data as Row[]) || []);
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