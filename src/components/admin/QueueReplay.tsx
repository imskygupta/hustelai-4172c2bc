// QueueReplay — DLQ inspector + replay history. Admin-only.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { RotateCw, ShieldAlert, History } from "lucide-react";

type DlqRow = {
  id: string; queue: string; ref_id: string; reason: string;
  last_error: string | null; replay_count: number; max_replays: number;
  replay_locked_until: string | null; last_seen_at: string; resolved: boolean;
};
type ReplayRow = {
  id: string; dlq_id: string; queue: string; original_ref_id: string; new_ref_id: string | null;
  status: string; reason: string | null; forced: boolean; created_at: string;
};

function fmtCooldown(iso: string | null): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return null;
  return `${Math.ceil(ms / 1000)}s`;
}

export default function QueueReplay() {
  const { toast } = useToast();
  const [dlq, setDlq] = useState<DlqRow[]>([]);
  const [history, setHistory] = useState<ReplayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const [d, h] = await Promise.all([
      supabase.from("queue_dead_letter").select("*").eq("resolved", false)
        .order("last_seen_at", { ascending: false }).limit(50),
      supabase.rpc("queue_replay_history", { _limit: 50 }),
    ]);
    setDlq((d.data as DlqRow[]) ?? []);
    setHistory((h.data as ReplayRow[]) ?? []);
    setLoading(false);
  }

  async function replay(row: DlqRow, force = false) {
    setBusy(row.id);
    try {
      const { data, error } = await supabase.rpc("queue_replay", {
        _dlq_id: row.id, _force: force, _notes: null,
      });
      if (error) throw error;
      const res = data as { ok: boolean; reason?: string; new_id?: string };
      if (!res?.ok) {
        toast({
          title: res?.reason === "cooldown" ? "Cooldown active" : "Replay blocked",
          description: res?.reason === "loop_blocked"
            ? "Replay cap reached. Use force to override."
            : "Wait for cooldown or use force.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Replayed", description: `${row.queue} → ${res.new_id?.slice(0,8)}` });
      }
      await load();
    } catch (e: any) {
      toast({ title: "Replay failed", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => { load(); const t = setInterval(load, 30_000); return () => clearInterval(t); }, []);

  return (
    <div className="space-y-4">
      <Card className="bg-card/40 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldAlert className="h-3.5 w-3.5 text-red-400" /> Dead-letter queue
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? <div className="p-4"><Skeleton className="h-32" /></div> : dlq.length === 0 ? (
            <p className="text-xs text-muted-foreground p-4 text-center">No unresolved dead-letter entries.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground bg-muted/20">
                  <tr>
                    <th className="text-left p-2 font-medium">Queue</th>
                    <th className="text-left p-2 font-medium">Ref</th>
                    <th className="text-left p-2 font-medium">Reason</th>
                    <th className="text-right p-2 font-medium">Replays</th>
                    <th className="text-right p-2 font-medium">Last seen</th>
                    <th className="text-right p-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dlq.map((r) => {
                    const cd = fmtCooldown(r.replay_locked_until);
                    const exhausted = r.replay_count >= r.max_replays;
                    return (
                      <tr key={r.id} className="border-t border-border/30 hover:bg-muted/10">
                        <td className="p-2 font-mono">{r.queue}</td>
                        <td className="p-2 font-mono text-muted-foreground">{r.ref_id.slice(0,8)}</td>
                        <td className="p-2 truncate max-w-[260px]" title={r.last_error || r.reason}>
                          {r.last_error || r.reason}
                        </td>
                        <td className="p-2 text-right tabular-nums">
                          {r.replay_count}/{r.max_replays}
                          {exhausted && <Badge variant="outline" className="ml-1 text-[10px] border-red-500/40 text-red-400">cap</Badge>}
                        </td>
                        <td className="p-2 text-right text-muted-foreground">
                          {new Date(r.last_seen_at).toLocaleString()}
                        </td>
                        <td className="p-2 text-right">
                          <Button
                            size="sm" variant="ghost" className="h-7 text-xs gap-1.5"
                            disabled={busy === r.id}
                            onClick={() => replay(r, exhausted || !!cd)}
                            title={cd ? `Cooldown ${cd} (force)` : exhausted ? "Force replay" : "Replay"}
                          >
                            <RotateCw className={`h-3 w-3 ${busy === r.id ? "animate-spin" : ""}`} />
                            {cd ? `Force (${cd})` : exhausted ? "Force" : "Replay"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card/40 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-3.5 w-3.5 text-primary" /> Replay history
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? <div className="p-4"><Skeleton className="h-32" /></div> : history.length === 0 ? (
            <p className="text-xs text-muted-foreground p-4 text-center">No replays yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground bg-muted/20">
                  <tr>
                    <th className="text-left p-2 font-medium">When</th>
                    <th className="text-left p-2 font-medium">Queue</th>
                    <th className="text-left p-2 font-medium">Original</th>
                    <th className="text-left p-2 font-medium">New</th>
                    <th className="text-left p-2 font-medium">Status</th>
                    <th className="text-left p-2 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="border-t border-border/30 hover:bg-muted/10">
                      <td className="p-2 text-muted-foreground">{new Date(h.created_at).toLocaleString()}</td>
                      <td className="p-2 font-mono">{h.queue}</td>
                      <td className="p-2 font-mono text-muted-foreground">{h.original_ref_id.slice(0,8)}</td>
                      <td className="p-2 font-mono">{h.new_ref_id?.slice(0,8) || "—"}</td>
                      <td className="p-2">
                        <Badge variant="outline" className={`font-mono text-[10px] uppercase ${
                          h.status === "success" ? "border-emerald-500/40 text-emerald-400"
                          : h.status === "cooldown" ? "border-amber-500/40 text-amber-400"
                          : "border-red-500/40 text-red-400"
                        }`}>
                          {h.status}{h.forced ? " · forced" : ""}
                        </Badge>
                      </td>
                      <td className="p-2 text-muted-foreground truncate max-w-[260px]">{h.reason || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}