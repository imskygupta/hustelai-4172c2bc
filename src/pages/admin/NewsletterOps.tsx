import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Sparkles, Send, RefreshCw, CheckCircle2, XCircle, Mail, Clock, ArrowLeft, Loader2, Eye, AlertTriangle, Wand2, Upload, ShieldCheck } from "lucide-react";

type Issue = {
  id: string;
  subject: string;
  preheader: string | null;
  sections: Array<{ id: string; title: string; body_md: string }>;
  status: string;
  provider: string | null;
  scheduled_at: string | null;
  approved_at: string | null;
  sent_at: string | null;
  error: string | null;
  created_at: string;
  body_html: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  ready: "bg-violet-100 text-violet-700",
  approved: "bg-emerald-100 text-emerald-700",
  scheduled: "bg-blue-100 text-blue-700",
  sending: "bg-amber-100 text-amber-700",
  sent: "bg-emerald-100 text-emerald-700",
  failed: "bg-rose-100 text-rose-700",
  rejected: "bg-rose-100 text-rose-700",
};

function md2html(md: string): string {
  return md
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/^- (.*)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>")
    .split(/\n{2,}/)
    .map((p) => (p.startsWith("<") ? p : `<p>${p.replace(/\n/g, "<br/>")}</p>`))
    .join("");
}

export default function NewsletterOps() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [subStats, setSubStats] = useState({ active: 0, unsubscribed: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [tab, setTab] = useState("queue");
  const [mode, setMode] = useState<"automation" | "manual">("automation");
  const [focus, setFocus] = useState("the Sunday Brief — what changed this week in AI + side hustles in India");
  const [manualSubject, setManualSubject] = useState("");
  const [manualPreheader, setManualPreheader] = useState("");
  const [manualBody, setManualBody] = useState("");
  const [bulkEmails, setBulkEmails] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [previewIssue, setPreviewIssue] = useState<Issue | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data: rows } = await supabase
        .from("newsletter_issues" as any)
        .select("*").order("created_at", { ascending: false }).limit(50);
      setIssues((rows as any) || []);
      const { data: subs } = await supabase
        .from("newsletter_subscribers" as any)
        .select("id,email,name,status,source,created_at")
        .order("created_at", { ascending: false }).limit(200);
      setSubscribers((subs as any) || []);
      const all = (subs as any[]) || [];
      setSubStats({
        active: all.filter((s) => s.status === "active").length,
        unsubscribed: all.filter((s) => s.status === "unsubscribed").length,
        total: all.length,
      });
    } catch (e: any) {
      toast.error(e.message);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const generate = async () => {
    setGenerating(true);
    try {
      if (mode === "manual") {
        if (!manualSubject.trim() || !manualBody.trim()) {
          toast.error("Subject and body are required");
          return;
        }
        const { data, error } = await supabase.functions.invoke("brevo-newsletter", {
          body: { action: "create_manual_issue", subject: manualSubject, preheader: manualPreheader, body_md: manualBody },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        toast.success("Manual draft created");
        setManualSubject(""); setManualPreheader(""); setManualBody("");
      } else {
        const { data, error } = await supabase.functions.invoke("brevo-newsletter", {
          body: { action: "generate_sections", focus, provider: "brevo", channel: "email" },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        toast.success("Sunday Brief draft generated");
      }
      load();
    } catch (e: any) { toast.error(e.message || "Generation failed"); }
    finally { setGenerating(false); }
  };

  const bulkAdd = async () => {
    if (!bulkEmails.trim()) { toast.error("Paste at least one email"); return; }
    setBulkBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("brevo-newsletter", {
        body: { action: "bulk_add_subscribers", emails: bulkEmails },
      });
      if (error) throw error;
      const r = data as any;
      if (r?.error) throw new Error(r.error);
      toast.success(`Added ${r.added} · reactivated ${r.reactivated} · skipped ${r.skipped}`);
      setBulkEmails("");
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setBulkBusy(false); }
  };

  const regenerate = async (issue: Issue, sectionId: string, hint: string) => {
    setBusyId(issue.id + ":" + sectionId);
    try {
      const { data, error } = await supabase.functions.invoke("brevo-newsletter", {
        body: { action: "regenerate_section", issue_id: issue.id, section_id: sectionId, hint },
      });
      if (error) throw error;
      toast.success("Section regenerated");
      const next = { ...issue, sections: (data as any).sections };
      setPreviewIssue(next);
      setIssues((prev) => prev.map((i) => (i.id === issue.id ? next : i)));
    } catch (e: any) { toast.error(e.message); }
    finally { setBusyId(null); }
  };

  const updateSection = async (issue: Issue, sectionId: string, patch: Partial<{ title: string; body_md: string }>) => {
    const sections = issue.sections.map((s) => (s.id === sectionId ? { ...s, ...patch } : s));
    const next = { ...issue, sections };
    setPreviewIssue(next);
    setIssues((prev) => prev.map((i) => (i.id === issue.id ? next : i)));
    await supabase.from("newsletter_issues" as any).update({ sections } as any).eq("id", issue.id);
  };

  const approve = async (id: string) => {
    setBusyId(id);
    try {
      const { error } = await supabase.rpc("newsletter_approve_issue", { _issue: id, _scheduled_at: null });
      if (error) throw error;
      toast.success("Approved — ready to dispatch");
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusyId(null); }
  };
  const reject = async (id: string) => {
    const reason = window.prompt("Reject reason?") || "rejected";
    setBusyId(id);
    try {
      const { error } = await supabase.rpc("newsletter_reject_issue", { _issue: id, _reason: reason });
      if (error) throw error;
      toast.success("Rejected"); load();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusyId(null); }
  };
  const sendTest = async (id: string) => {
    if (!testEmail) { toast.error("Enter test email first"); return; }
    setBusyId(id);
    try {
      const { data, error } = await supabase.functions.invoke("brevo-newsletter", {
        body: { action: "test_issue", issue_id: id, to_email: testEmail },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Test sent to ${testEmail}`);
    } catch (e: any) { toast.error(e.message); }
    finally { setBusyId(null); }
  };
  const dispatch = async (id: string) => {
    if (!window.confirm("Send this issue to ALL active subscribers? Only one newsletter per 6 days is allowed.")) return;
    setBusyId(id);
    try {
      const { data, error } = await supabase.functions.invoke("brevo-newsletter", {
        body: { action: "dispatch_issue", issue_id: id },
      });
      if (error) throw error;
      const r = data as any;
      if (r?.error === "throttled") {
        const force = window.confirm(`${r.message}\n\nOverride and send anyway?`);
        if (!force) { toast.message("Send cancelled"); return; }
        const { data: d2, error: e2 } = await supabase.functions.invoke("brevo-newsletter", {
          body: { action: "dispatch_issue", issue_id: id, force: true },
        });
        if (e2) throw e2;
        const r2 = d2 as any;
        if (r2?.error) throw new Error(r2.error);
        toast.success(`Dispatched (override) · sent ${r2.sent} · failed ${r2.failed}`);
        load();
        return;
      }
      if (r?.error) throw new Error(r.error);
      toast.success(`Dispatched · sent ${r.sent} · failed ${r.failed}`);
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusyId(null); }
  };
  const retryFailed = async (id: string) => {
    setBusyId(id);
    try {
      const { data, error } = await supabase.functions.invoke("brevo-newsletter", {
        body: { action: "retry_failed", issue_id: id },
      });
      if (error) throw error;
      const r = data as any;
      toast.success(`Retried · sent ${r.sent ?? 0} · failed ${r.failed ?? 0}`);
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusyId(null); }
  };

  const drafts = useMemo(() => issues.filter((i) => ["draft", "ready"].includes(i.status)), [issues]);
  const approvedQ = useMemo(() => issues.filter((i) => ["approved", "scheduled", "sending"].includes(i.status)), [issues]);
  const sent = useMemo(() => issues.filter((i) => i.status === "sent"), [issues]);
  const failed = useMemo(() => issues.filter((i) => ["failed", "rejected"].includes(i.status)), [issues]);

  const renderRow = (i: Issue, withActions = true) => (
    <div key={i.id} className="border rounded-lg p-3 space-y-2 bg-card">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={STATUS_COLORS[i.status] || "bg-slate-100"}>{i.status}</Badge>
            <span className="text-xs text-muted-foreground">{new Date(i.created_at).toLocaleString()}</span>
            {i.provider && <span className="text-xs text-muted-foreground">· {i.provider}</span>}
          </div>
          <div className="font-medium mt-1 truncate">{i.subject}</div>
          {i.preheader && <div className="text-xs text-muted-foreground truncate">{i.preheader}</div>}
          {i.error && <div className="text-xs text-rose-600 mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{i.error}</div>}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => setPreviewIssue(i)}><Eye className="h-3.5 w-3.5 mr-1" />Preview</Button>
          {withActions && ["draft", "ready"].includes(i.status) && (
            <>
              <Button size="sm" variant="outline" onClick={() => sendTest(i.id)} disabled={busyId === i.id}><Mail className="h-3.5 w-3.5 mr-1" />Test</Button>
              <Button size="sm" onClick={() => approve(i.id)} disabled={busyId === i.id}><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Approve</Button>
              <Button size="sm" variant="outline" onClick={() => reject(i.id)} disabled={busyId === i.id}><XCircle className="h-3.5 w-3.5 mr-1" />Reject</Button>
            </>
          )}
          {withActions && ["approved", "scheduled"].includes(i.status) && (
            <Button size="sm" onClick={() => dispatch(i.id)} disabled={busyId === i.id}>
              {busyId === i.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />}
              Dispatch
            </Button>
          )}
          {withActions && i.status === "failed" && (
            <Button size="sm" variant="outline" onClick={() => retryFailed(i.id)} disabled={busyId === i.id}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" />Retry failed
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="container max-w-6xl py-8">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2"><Link to="/admin/communications"><ArrowLeft className="h-3.5 w-3.5 mr-1" /> Communications</Link></Button>
          <h1 className="text-2xl font-semibold tracking-tight">The Sunday Brief · unified newsletter</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
            <span>One email every Sunday · blends <strong>hustlaiapp.in</strong> + <strong>blogs.hustlaiapp.in</strong></span>
            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 text-[11px]"><ShieldCheck className="h-3 w-3" /> Hard cap: 1 send / 6 days</span>
          </p>
        </div>
      </div>

      {/* Composer — automation default, advanced manual write */}
      <Card className="mb-5 border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-violet-600" /> Compose this week's brief
            </CardTitle>
            <div className="inline-flex rounded-md border bg-muted/40 p-0.5 text-xs">
              <button
                onClick={() => setMode("automation")}
                className={`px-3 py-1.5 rounded-[5px] ${mode === "automation" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
              >Automation (default)</button>
              <button
                onClick={() => setMode("manual")}
                className={`px-3 py-1.5 rounded-[5px] ${mode === "manual" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
              >Advanced · write my own</button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {mode === "automation" ? (
            <>
              <Label className="text-xs text-muted-foreground">Focus / angle for this week (optional)</Label>
              <Input value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="e.g. AI side hustles trending in India this week" />
              <div className="text-[11px] text-muted-foreground">
                AI writes a single email with 4 blocks: one featured read, a tech & AI pulse, one HustleAI tool how-to, and a CTA to the app + blog. Approval-gated — nothing sends until you click Approve → Dispatch.
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Subject</Label>
                  <Input value={manualSubject} onChange={(e) => setManualSubject(e.target.value)} placeholder="Subject line ≤ 60 chars" />
                </div>
                <div>
                  <Label className="text-xs">Preheader (inbox teaser)</Label>
                  <Input value={manualPreheader} onChange={(e) => setManualPreheader(e.target.value)} placeholder="One-line teaser ≤ 90 chars" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Body (markdown)</Label>
                <Textarea value={manualBody} onChange={(e) => setManualBody(e.target.value)} rows={8} className="font-mono text-sm" placeholder="Write the full email in markdown — headings, bullets, [links](https://...)." />
              </div>
            </>
          )}
          <div className="flex justify-end">
            <Button onClick={generate} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
              {mode === "manual" ? "Save as draft" : "Generate Sunday Brief"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { l: "Drafts", v: drafts.length, icon: Sparkles },
          { l: "Approved queue", v: approvedQ.length, icon: Clock },
          { l: "Sent", v: sent.length, icon: CheckCircle2 },
          { l: "Subscribers", v: subStats.active, icon: Mail },
        ].map((s) => (
          <Card key={s.l}><CardContent className="p-4 flex items-center justify-between">
            <div><div className="text-xs text-muted-foreground">{s.l}</div><div className="text-2xl font-semibold">{s.v}</div></div>
            <s.icon className="h-5 w-5 text-muted-foreground" />
          </CardContent></Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="queue">Draft queue ({drafts.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approvedQ.length})</TabsTrigger>
          <TabsTrigger value="sent">Sent ({sent.length})</TabsTrigger>
          <TabsTrigger value="failed">Failed ({failed.length})</TabsTrigger>
          <TabsTrigger value="subscribers">Subscribers ({subStats.total})</TabsTrigger>
        </TabsList>

        <div className="mt-3">
          <div className="flex items-center gap-2 mb-3">
            <Label className="text-xs text-muted-foreground">Test email:</Label>
            <Input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="you@hustlaiapp.in" className="h-9 max-w-xs" />
            <Button size="sm" variant="ghost" onClick={load} disabled={loading}><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /></Button>
          </div>

          <TabsContent value="queue" className="space-y-2">{drafts.length === 0 ? <Empty msg="No drafts. Click Generate to create one." /> : drafts.map((i) => renderRow(i))}</TabsContent>
          <TabsContent value="approved" className="space-y-2">{approvedQ.length === 0 ? <Empty msg="No approved issues." /> : approvedQ.map((i) => renderRow(i))}</TabsContent>
          <TabsContent value="sent" className="space-y-2">{sent.length === 0 ? <Empty msg="No sent issues yet." /> : sent.map((i) => renderRow(i, false))}</TabsContent>
          <TabsContent value="failed" className="space-y-2">{failed.length === 0 ? <Empty msg="No failed sends." /> : failed.map((i) => renderRow(i))}</TabsContent>
          <TabsContent value="subscribers" className="space-y-1">
            <div className="text-xs text-muted-foreground mb-2">{subStats.active} active · {subStats.unsubscribed} unsubscribed · {subStats.total} total</div>

            {/* Bulk add — CSV / comma / newline separated */}
            <Card className="mb-3 border-slate-200">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Upload className="h-4 w-4" /> Add subscribers in bulk</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Textarea value={bulkEmails} onChange={(e) => setBulkEmails(e.target.value)} rows={4} placeholder="Paste a CSV column, or emails separated by commas / newlines / spaces — duplicates and invalids are skipped." className="font-mono text-xs" />
                <div className="flex items-center justify-between">
                  <div className="text-[11px] text-muted-foreground">Existing unsubscribed addresses are reactivated automatically.</div>
                  <Button size="sm" onClick={bulkAdd} disabled={bulkBusy}>
                    {bulkBusy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
                    Add to list
                  </Button>
                </div>
              </CardContent>
            </Card>

            {subscribers.map((s) => (
              <div key={s.id} className="flex items-center justify-between border rounded-md px-3 py-2 text-sm">
                <div className="min-w-0"><div className="truncate">{s.email}</div><div className="text-xs text-muted-foreground">{s.source} · {new Date(s.created_at).toLocaleDateString()}</div></div>
                <Badge variant={s.status === "active" ? "default" : "secondary"}>{s.status}</Badge>
              </div>
            ))}
          </TabsContent>
        </div>
      </Tabs>

      <Dialog open={!!previewIssue} onOpenChange={(o) => !o && setPreviewIssue(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base">{previewIssue?.subject}</DialogTitle></DialogHeader>
          {previewIssue && (
            <div className="space-y-4">
              {previewIssue.preheader && <p className="text-sm text-muted-foreground italic">{previewIssue.preheader}</p>}
              {previewIssue.sections?.map((sec) => (
                <div key={sec.id} className="border rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Input value={sec.title} onChange={(e) => updateSection(previewIssue, sec.id, { title: e.target.value })} className="h-8 font-medium max-w-md" />
                    <Button size="sm" variant="ghost" onClick={() => regenerate(previewIssue, sec.id, "tighter, fresher")} disabled={busyId === previewIssue.id + ":" + sec.id}>
                      {busyId === previewIssue.id + ":" + sec.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                  <Textarea value={sec.body_md} onChange={(e) => updateSection(previewIssue, sec.id, { body_md: e.target.value })} rows={5} className="text-sm font-mono" />
                  <div className="prose prose-sm max-w-none border-t pt-2" dangerouslySetInnerHTML={{ __html: md2html(sec.body_md) }} />
                </div>
              ))}
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            {previewIssue && ["draft", "ready"].includes(previewIssue.status) && (
              <>
                <Button variant="outline" onClick={() => sendTest(previewIssue.id)}><Mail className="h-3.5 w-3.5 mr-1" />Send test</Button>
                <Button onClick={() => { approve(previewIssue.id); setPreviewIssue(null); }}><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Approve</Button>
              </>
            )}
            {previewIssue && ["approved", "scheduled"].includes(previewIssue.status) && (
              <Button onClick={() => { dispatch(previewIssue.id); setPreviewIssue(null); }}><Send className="h-3.5 w-3.5 mr-1" />Dispatch</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="border rounded-lg p-8 text-center text-sm text-muted-foreground">{msg}</div>;
}