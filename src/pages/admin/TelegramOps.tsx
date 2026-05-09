import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Loader2, RefreshCw, Trash2, Send, Database, Search, Filter } from "lucide-react";

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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cacheFilter, setCacheFilter] = useState<string>("all");

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

  const filtered = rows.filter(r => {
    if (search && !`${r.title} ${r.export_type}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (cacheFilter === "cached" && !r.telegram_file_id) return false;
    if (cacheFilter === "uncached" && r.telegram_file_id) return false;
    return true;
  });

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
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2"><Send className="h-5 w-5 text-emerald-500" /> Telegram Ops</h1>
            <p className="text-sm text-muted-foreground mt-1">Delivery monitoring, cache stats and storage cleanup.</p>
          </div>
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

        <div className="flex flex-col md:flex-row gap-2 md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title or type…" className="pl-8" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="all">All status</option>
            <option value="ready">Ready</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
            <option value="expired">Expired</option>
            <option value="revoked">Revoked</option>
            <option value="telegram_only">Telegram-only</option>
          </select>
          <select value={cacheFilter} onChange={e => setCacheFilter(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="all">All cache</option>
            <option value="cached">Cached</option>
            <option value="uncached">Not cached</option>
          </select>
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-2" /> Refresh</Button>
          <Button variant="outline" size="sm" onClick={cleanup} disabled={busy === "cleanup"}>
            {busy === "cleanup" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Cleanup
          </Button>
        </div>

        <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between gap-2 text-sm font-medium">
            <div className="flex items-center gap-2"><Database className="h-4 w-4" /> Recent exports</div>
            <span className="text-xs font-normal text-muted-foreground">{filtered.length} of {rows.length}</span>
          </div>
          {loading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="divide-y divide-border/40">
              {filtered.map(r => (
                <div key={r.id} className="px-4 py-3 flex items-center gap-3 text-sm flex-wrap md:flex-nowrap">
                  <div className="flex-1 min-w-0 w-full md:w-auto">
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
              {filtered.length === 0 && (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                  {rows.length === 0 ? "No exports yet." : "No matches for current filters."}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}