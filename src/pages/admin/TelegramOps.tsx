import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, RefreshCw, Trash2, Send, Database } from "lucide-react";

interface ExportRow {
  id: string;
  title: string;
  export_type: string;
  status: string;
  delivery_method?: string | null;
  telegram_file_id?: string | null;
  size_bytes: number;
  created_at: string;
}

export default function TelegramOps() {
  const [rows, setRows] = useState<ExportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, cached: 0, delivered: 0, failed: 0 });
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("generated_exports" as any)
      .select("id, title, export_type, status, delivery_method, telegram_file_id, size_bytes, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    const list = (data || []) as unknown as ExportRow[];
    setRows(list);
    setStats({
      total: list.length,
      cached: list.filter(r => r.telegram_file_id).length,
      delivered: list.filter(r => r.status === "delivered").length,
      failed: list.filter(r => r.status === "failed").length,
    });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const retry = async (id: string) => {
    setBusy(id);
    const { error } = await supabase.functions.invoke("export-deliver-telegram", { body: { export_id: id } });
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success("Re-delivery queued"); load(); }
  };

  const cleanup = async () => {
    setBusy("cleanup");
    const { data, error } = await supabase.functions.invoke("export-storage-cleanup", { body: {} });
    setBusy(null);
    if (error) toast.error(error.message);
    else toast.success(`Cleanup: removed ${(data as any)?.removed || 0} of ${(data as any)?.scanned || 0}`);
    load();
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><Send className="h-5 w-5 text-emerald-500" /> Telegram Ops</h1>
          <p className="text-sm text-muted-foreground mt-1">Delivery monitoring, cache stats and storage cleanup.</p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total exports", value: stats.total },
            { label: "Cached on TG", value: stats.cached },
            { label: "Delivered", value: stats.delivered },
            { label: "Failed", value: stats.failed },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-border/60 bg-card p-4">
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="text-2xl font-semibold mt-1">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4 mr-2" /> Refresh</Button>
          <Button variant="outline" onClick={cleanup} disabled={busy === "cleanup"}>
            {busy === "cleanup" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Run storage cleanup
          </Button>
        </div>

        <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border/40 flex items-center gap-2 text-sm font-medium">
            <Database className="h-4 w-4" /> Recent exports
          </div>
          {loading ? (
            <div className="p-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="divide-y divide-border/40">
              {rows.map(r => (
                <div key={r.id} className="px-4 py-3 flex items-center gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{r.title}</div>
                    <div className="text-xs text-muted-foreground">{r.export_type} · {new Date(r.created_at).toLocaleString()}</div>
                  </div>
                  <Badge variant={r.status === "delivered" ? "default" : r.status === "failed" ? "destructive" : "secondary"}>
                    {r.status}
                  </Badge>
                  {r.telegram_file_id && <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">cached</Badge>}
                  <Button size="sm" variant="ghost" disabled={busy === r.id} onClick={() => retry(r.id)}>
                    {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Re-deliver"}
                  </Button>
                </div>
              ))}
              {rows.length === 0 && <div className="px-4 py-10 text-center text-sm text-muted-foreground">No exports yet.</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}