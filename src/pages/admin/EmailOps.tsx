import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Mail, RefreshCw, Send, AlertTriangle, CheckCircle2, XCircle, Activity, ArrowLeft } from "lucide-react";

type LogRow = { id: string; created_at: string; recipient: string; template: string; status: string; error: string | null; metadata: any };

const RANGES = [
  { label: "Last 24h", ms: 24 * 3600_000 },
  { label: "Last 7 days", ms: 7 * 86400_000 },
  { label: "Last 30 days", ms: 30 * 86400_000 },
];

export default function EmailOps() {
  const [health, setHealth] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [rangeIdx, setRangeIdx] = useState(1);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [templateFilter, setTemplateFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({ total: 0, sent: 0, failed: 0, skipped: 0, bouncePct: 0 });
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [recentWelcome, setRecentWelcome] = useState<string | null>(null);
  const [unwelcomedCount, setUnwelcomedCount] = useState<number>(0);

  const since = useMemo(() => new Date(Date.now() - RANGES[rangeIdx].ms).toISOString(), [rangeIdx]);

  const loadHealth = async () => {
    setHealthLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("email-provider-health", { body: {} });
      if (error) throw error;
      setHealth(data);
    } catch (e: any) {
      toast.error("Health check failed: " + (e.message || e));
    } finally {
      setHealthLoading(false);
    }
  };

  const loadLogs = async () => {
    let q = supabase.from("email_logs").select("id,created_at,recipient,template,status,error,metadata").gte("created_at", since).order("created_at", { ascending: false }).limit(500);
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    if (templateFilter !== "all") q = q.eq("template", templateFilter);
    if (search.trim()) q = q.ilike("recipient", `%${search.trim()}%`);
    const { data } = await q;
    setLogs((data as any) || []);

    // Stats — compute from broader unfiltered set within range
    const { data: agg } = await supabase.from("email_logs").select("status").gte("created_at", since).limit(5000);
    const rows = (agg as any[]) || [];
    const sent = rows.filter(r => r.status === "sent").length;
    const failed = rows.filter(r => r.status === "failed").length;
    const skipped = rows.filter(r => r.status === "skipped").length;
    const total = rows.length;
    setStats({ total, sent, failed, skipped, bouncePct: sent > 0 ? Math.round((failed / (sent + failed)) * 100) : 0 });
  };

  const loadWelcomeAudit = async () => {
    const { data: w } = await supabase.from("email_logs").select("created_at").eq("template", "welcome").eq("status", "sent").order("created_at", { ascending: false }).limit(1).maybeSingle();
    setRecentWelcome((w as any)?.created_at || null);

    // Profiles created in last 24h
    const since24 = new Date(Date.now() - 86400_000).toISOString();
    const { data: recents } = await supabase.from("profiles").select("email, created_at").gte("created_at", since24).limit(500);
    const emails = ((recents as any[]) || []).map(r => (r.email || "").toLowerCase()).filter(Boolean);
    if (emails.length === 0) { setUnwelcomedCount(0); return; }
    const { data: sentRows } = await supabase.from("email_logs").select("recipient").eq("template", "welcome").eq("status", "sent").in("recipient", emails);
    const sentSet = new Set(((sentRows as any[]) || []).map(r => r.recipient));
    setUnwelcomedCount(emails.filter(e => !sentSet.has(e)).length);
  };

  useEffect(() => { loadHealth(); loadWelcomeAudit(); }, []);
  useEffect(() => { loadLogs(); }, [since, statusFilter, templateFilter, search]);

  const sendTestWelcome = async () => {
    if (!testEmail.trim()) { toast.error("Enter an email"); return; }
    setSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-welcome-email", {
        body: { email: testEmail.trim(), displayName: testEmail.split("@")[0], source: "admin-test", force: true },
      });
      if (error) throw error;
      toast.success(`Sent via ${(data as any)?.provider || "unknown"}`);
      setTimeout(() => { loadLogs(); loadWelcomeAudit(); }, 1500);
    } catch (e: any) {
      toast.error("Test failed: " + (e.message || e));
    } finally {
      setSendingTest(false);
    }
  };

  const retry = async (row: LogRow) => {
    try {
      if (row.template === "welcome") {
        await supabase.functions.invoke("send-welcome-email", { body: { email: row.recipient, source: "retry", force: true } });
      } else {
        await supabase.functions.invoke("workspace-email", {
          body: { to: row.recipient, template: row.template, data: row.metadata || {} },
        });
      }
      toast.success("Retried");
      setTimeout(loadLogs, 1500);
    } catch (e: any) {
      toast.error("Retry failed: " + (e.message || e));
    }
  };

  const distinctTemplates = useMemo(() => Array.from(new Set(logs.map(l => l.template))).sort(), [logs]);

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
            <Link to="/admin/communications"><ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Communications</Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Email Operations</h1>
          <p className="text-sm text-muted-foreground">Provider health, delivery analytics, recent sends, retries.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="test@email.com" value={testEmail} onChange={e => setTestEmail(e.target.value)} className="h-9 w-48" />
          <Button size="sm" onClick={sendTestWelcome} disabled={sendingTest}>
            <Send className="h-3.5 w-3.5 mr-1.5" /> {sendingTest ? "Sending…" : "Send test welcome"}
          </Button>
        </div>
      </div>

      {/* Welcome audit banner */}
      {(unwelcomedCount > 0 || recentWelcome) && (
        <div className={`rounded-lg border px-4 py-3 text-sm flex items-center justify-between flex-wrap gap-2 ${unwelcomedCount > 0 ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-emerald-50 border-emerald-200 text-emerald-900"}`}>
          <div className="flex items-center gap-2">
            {unwelcomedCount > 0 ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            <span>
              Last welcome sent: <strong>{recentWelcome ? new Date(recentWelcome).toLocaleString() : "never"}</strong>
              {unwelcomedCount > 0 && <> · <strong>{unwelcomedCount}</strong> signup{unwelcomedCount === 1 ? "" : "s"} in last 24h with no welcome email yet</>}
            </span>
          </div>
        </div>
      )}

      {/* Provider health */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" /> Provider Health</CardTitle>
          <Button size="sm" variant="ghost" onClick={loadHealth} disabled={healthLoading}>
            <RefreshCw className={`h-3.5 w-3.5 ${healthLoading ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-3">
          {["resend", "brevo", "mailersend"].map(name => {
            const p = health?.[name];
            const status = !p?.configured ? "muted" : p?.healthy ? "ok" : "fail";
            return (
              <div key={name} className="border rounded-lg p-3 flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium capitalize">{name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{p?.message || "—"}</div>
                </div>
                <Badge variant={status === "ok" ? "default" : status === "fail" ? "destructive" : "secondary"}>
                  {status === "ok" ? <CheckCircle2 className="h-3 w-3 mr-1" /> : status === "fail" ? <XCircle className="h-3 w-3 mr-1" /> : null}
                  {status === "ok" ? "Healthy" : status === "fail" ? "Failing" : "Not configured"}
                </Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={String(rangeIdx)} onValueChange={v => setRangeIdx(Number(v))}>
          <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>{RANGES.map((r, i) => <SelectItem key={i} value={String(i)}>{r.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Sent" value={stats.sent} tone="emerald" />
        <StatCard label="Failed" value={stats.failed} tone="rose" />
        <StatCard label="Skipped" value={stats.skipped} tone="amber" />
        <StatCard label="Bounce %" value={`${stats.bouncePct}%`} tone={stats.bouncePct > 5 ? "rose" : "emerald"} />
      </div>

      {/* Recent emails */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" /> Recent Emails</CardTitle>
            <div className="flex items-center gap-2">
              <Input placeholder="Search recipient…" value={search} onChange={e => setSearch(e.target.value)} className="h-8 w-48" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="skipped">Skipped</SelectItem>
                </SelectContent>
              </Select>
              <Select value={templateFilter} onValueChange={setTemplateFilter}>
                <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All templates</SelectItem>
                  {distinctTemplates.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="all">
            <TabsList className="mx-3"><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="failed">Failed only</TabsTrigger></TabsList>
            {(["all", "failed"] as const).map(tab => (
              <TabsContent key={tab} value={tab} className="m-0">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground border-b">
                    <tr>
                      <th className="text-left p-2">When</th>
                      <th className="text-left p-2">Recipient</th>
                      <th className="text-left p-2">Template</th>
                      <th className="text-left p-2">Provider</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Error</th>
                      <th className="text-right p-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.filter(l => tab === "all" || l.status === "failed").map(l => (
                      <tr key={l.id} className="border-t">
                        <td className="p-2 text-xs whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td>
                        <td className="p-2 text-xs">{l.recipient}</td>
                        <td className="p-2 text-xs">{l.template}</td>
                        <td className="p-2 text-xs text-muted-foreground">{l.metadata?.provider || "—"}</td>
                        <td className="p-2"><Badge variant={l.status === "sent" ? "default" : l.status === "failed" ? "destructive" : "secondary"}>{l.status}</Badge></td>
                        <td className="p-2 text-xs text-rose-600 max-w-xs truncate" title={l.error || ""}>{l.error || ""}</td>
                        <td className="p-2 text-right">
                          {l.status === "failed" && (
                            <Button size="sm" variant="outline" onClick={() => retry(l)}>
                              <RefreshCw className="h-3 w-3 mr-1" /> Retry
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {logs.filter(l => tab === "all" || l.status === "failed").length === 0 && (
                      <tr><td colSpan={7} className="p-6 text-center text-sm text-muted-foreground">No emails in this range.</td></tr>
                    )}
                  </tbody>
                </table>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number | string; tone?: "emerald" | "rose" | "amber" }) {
  const color = tone === "emerald" ? "text-emerald-600" : tone === "rose" ? "text-rose-600" : tone === "amber" ? "text-amber-600" : "text-foreground";
  return (
    <Card><CardContent className="p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold ${color}`}>{value}</div>
    </CardContent></Card>
  );
}