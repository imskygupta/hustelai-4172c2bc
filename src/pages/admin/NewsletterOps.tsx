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
import { Sparkles, Send, RefreshCw, CheckCircle2, XCircle, Mail, Clock, ArrowLeft, Loader2, Eye, AlertTriangle } from "lucide-react";

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
  const [focus, setFocus] = useState("weekly digest");
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
      const { data, error } = await supabase.functions.invoke("brevo-newsletter", {
        body: { action: "generate_sections", focus, provider: "brevo", channel: "email" },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Draft generated");
      load();
    } catch (e: any) { toast.error(e.message || "Generation failed"); }
    finally { setGenerating(false); }
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
    if (!window.confirm("Dispatch this approved issue to all active subscribers?")) return;
    setBusyId(id);
    try {
      const { data, error } = await supabase.functions.invoke("brevo-newsletter", {
        body: { action: "dispatch_issue", issue_id: id },
      });
      if (error) throw error;
      const r = data as any;
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
          <h1 className="text-2xl font-semibold tracking-tight">Newsletter Ops</h1>
          <p className="text-sm text-muted-foreground">AI-curated weekly digest · approval-gated · channel-agnostic.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Input value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="Focus theme" className="h-9 w-56" />
          <Button onClick={generate} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
            Generate draft
          </Button>
        </div>
      </div>

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