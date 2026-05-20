import { blogDb } from "@/integrations/blog/db";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Send, Mail } from "lucide-react";

export default function AdminCommunications() {
  const [tab, setTab] = useState("compose");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("all");
  const [tier, setTier] = useState("infinity");
  const [sending, setSending] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  const load = async () => {
    const { data: c } = await supabase.from("email_campaigns" as any).select("*").order("created_at", { ascending: false }).limit(50);
    setCampaigns((c as any) || []);
    const { data: l } = await blogDb.from("email_logs" as any).select("*").order("created_at", { ascending: false }).limit(100);
    setLogs((l as any) || []);
  };
  useEffect(() => { load(); }, []);

  const send = async () => {
    if (!subject || !body) { toast.error("Subject and body required"); return; }
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let q: any = supabase.from("profiles").select("user_id,email");
      if (audience === "tier") q = q.eq("subscription_tier", tier);
      const { data: targets } = await q.limit(2000);
      const emails = ((targets as any[]) || []).map((t: any) => t.email).filter(Boolean);
      const { data: campaign } = await supabase.from("email_campaigns" as any).insert({
        created_by: user!.id, title: title || subject, subject, body_html: body,
        audience, audience_filter: audience === "tier" ? { tier } : {},
        status: "sending",
      }).select().single();

      let sent = 0, failed = 0;
      for (let i = 0; i < emails.length; i += 50) {
        const chunk = emails.slice(i, i + 50);
        const { data } = await supabase.functions.invoke("workspace-email", {
          body: { to: chunk, template: "broadcast",
            data: { subject, title: title || subject, body_html: body },
            from: "hello", campaign_id: (campaign as any)?.id },
        });
        const results = (data as any)?.results || [];
        sent += results.filter((r: any) => r.status === "sent").length;
        failed += results.filter((r: any) => r.status === "failed").length;
      }
      await supabase.from("email_campaigns" as any).update({
        status: "sent", sent_count: sent, failed_count: failed, sent_at: new Date().toISOString(),
      }).eq("id", (campaign as any)!.id);
      toast.success(`Sent ${sent} · Failed ${failed}`);
      setTitle(""); setSubject(""); setBody("");
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSending(false); }
  };

  return (
    <div className="container max-w-5xl py-8">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Communications</h1>
          <p className="text-sm text-muted-foreground">Send announcements and monitor email delivery.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/communications/newsletter"><Mail className="h-3.5 w-3.5 mr-1.5" /> Newsletter Ops</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/communications/telegram"><Send className="h-3.5 w-3.5 mr-1.5" /> Telegram Ops Center</Link>
          </Button>
        </div>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="compose">Compose</TabsTrigger><TabsTrigger value="campaigns">Campaigns</TabsTrigger><TabsTrigger value="logs">Email log</TabsTrigger></TabsList>

        <TabsContent value="compose" className="mt-4">
          <Card><CardHeader><CardTitle className="text-base">New broadcast</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Internal title</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="May product update" /></div>
              <div><Label>Subject line</Label><Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="What's new in HustleAI Workspace OS" /></div>
              <div><Label>Body (HTML allowed)</Label><Textarea rows={8} value={body} onChange={e => setBody(e.target.value)} placeholder="<p>Hi —</p>" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Audience</Label>
                  <Select value={audience} onValueChange={setAudience}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All users</SelectItem>
                      <SelectItem value="tier">By tier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {audience === "tier" && (
                  <div><Label>Tier</Label>
                    <Select value={tier} onValueChange={setTier}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="elite">Elite</SelectItem>
                        <SelectItem value="infinity">Infinity</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <Button onClick={send} disabled={sending}>{sending ? "Sending…" : "Send broadcast"}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="mt-4 space-y-2">
          {campaigns.map((c: any) => (
            <Card key={c.id}><CardContent className="py-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{c.title}</div>
                <div className="text-xs text-muted-foreground">{c.subject} · {new Date(c.created_at).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="secondary">{c.status}</Badge>
                <span className="text-emerald-600">{c.sent_count} sent</span>
                {c.failed_count > 0 && <span className="text-red-500">{c.failed_count} failed</span>}
              </div>
            </CardContent></Card>
          ))}
          {campaigns.length === 0 && <div className="text-sm text-muted-foreground">No campaigns yet.</div>}
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card><CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground"><tr><th className="text-left p-2">When</th><th className="text-left p-2">To</th><th className="text-left p-2">Template</th><th className="text-left p-2">Status</th></tr></thead>
              <tbody>{logs.map((l: any) => (
                <tr key={l.id} className="border-t"><td className="p-2 text-xs">{new Date(l.created_at).toLocaleString()}</td>
                <td className="p-2">{l.recipient}</td><td className="p-2">{l.template}</td>
                <td className="p-2"><Badge variant={l.status === "sent" ? "default" : l.status === "failed" ? "destructive" : "secondary"}>{l.status}</Badge>{l.error && <span className="ml-2 text-xs text-red-500">{l.error}</span>}</td></tr>
              ))}</tbody>
            </table>
            {logs.length === 0 && <div className="text-sm text-muted-foreground p-4">No emails logged yet.</div>}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}