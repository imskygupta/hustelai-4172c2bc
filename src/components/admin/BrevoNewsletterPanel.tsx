import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Mail, Sparkles, Send, Calendar, Users, History, Loader2, Eye } from "lucide-react";

export function BrevoNewsletterPanel() {
  const [tab, setTab] = useState("compose");
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any>(null);

  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [html, setHtml] = useState("");
  const [fromName, setFromName] = useState("HustleAI");
  const [fromEmail, setFromEmail] = useState("noreply@hustlaiapp.in");
  const [aiPrompt, setAiPrompt] = useState("Generate a weekly digest about new AI tools, side-hustle tips, and platform updates for Indian creators.");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [aiUsed, setAiUsed] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => { load(); }, []);
  async function load() {
    const [{ data: subs }, { data: camps }, { data: sched }] = await Promise.all([
      supabase.from("newsletter_subscribers").select("*").order("subscribed_at", { ascending: false }).limit(500),
      supabase.from("email_campaigns").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("newsletter_schedules").select("*").limit(1).maybeSingle(),
    ]);
    setSubscribers(subs || []);
    setCampaigns(camps || []);
    setSchedule(sched);
  }

  const activeCount = subscribers.filter(s => s.is_active !== false).length;

  async function generateAI() {
    setAiGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("brevo-newsletter", {
        body: { action: "generate_ai", prompt: aiPrompt },
      });
      if (error) throw error;
      setSubject(data.subject || "");
      setPreviewText(data.previewText || "");
      setHtml(data.html || "");
      setAiUsed(true);
      toast({ title: "✨ AI generated!", description: "Review and edit before sending." });
    } catch (e: any) {
      toast({ title: "AI failed", description: e.message, variant: "destructive" });
    }
    setAiGenerating(false);
  }

  async function sendTest() {
    if (!testEmail) return toast({ title: "Enter test email", variant: "destructive" });
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("brevo-newsletter", {
        body: { action: "send_test", subject, html, previewText, toEmail: testEmail, fromName, fromEmail },
      });
      if (error) throw error;
      toast({ title: "Test sent ✉️", description: testEmail });
    } catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
    setSending(false);
  }

  async function sendNow() {
    if (!subject || !html) return toast({ title: "Subject and content required", variant: "destructive" });
    if (!confirm(`Send to ${activeCount} active subscribers via Brevo?`)) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("brevo-newsletter", {
        body: { action: "send_now", subject, html, previewText, fromName, fromEmail, aiGenerated: aiUsed },
      });
      if (error) throw error;
      toast({ title: "Campaign sent 🚀", description: `${data.sent} sent · ${data.failed} failed` });
      setSubject(""); setHtml(""); setPreviewText(""); setAiUsed(false);
      load();
    } catch (e: any) { toast({ title: "Send failed", description: e.message, variant: "destructive" }); }
    setSending(false);
  }

  async function saveSchedule() {
    if (!schedule) return;
    const { error } = await supabase.from("newsletter_schedules").update({
      enabled: schedule.enabled, frequency: schedule.frequency, send_day: schedule.send_day,
      send_hour: schedule.send_hour, ai_prompt: schedule.ai_prompt,
      from_name: schedule.from_name, from_email: schedule.from_email,
    }).eq("id", schedule.id);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Schedule saved" });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display font-bold text-2xl flex items-center gap-2">
            <Mail className="w-6 h-6 text-primary" /> Newsletter & Broadcasts
          </h2>
          <p className="text-sm text-muted-foreground">Powered by Brevo · 300/day free · {activeCount} active subscribers</p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">BREVO</Badge>
          <Badge variant="outline">{subscribers.length} total</Badge>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="compose"><Sparkles className="w-4 h-4 mr-1" />Compose</TabsTrigger>
          <TabsTrigger value="schedule"><Calendar className="w-4 h-4 mr-1" />Weekly AI</TabsTrigger>
          <TabsTrigger value="subscribers"><Users className="w-4 h-4 mr-1" />Subscribers</TabsTrigger>
          <TabsTrigger value="history"><History className="w-4 h-4 mr-1" />History</TabsTrigger>
        </TabsList>

        {/* COMPOSE */}
        <TabsContent value="compose" className="space-y-4 mt-4">
          <Card className="p-5 space-y-4 bg-gradient-to-br from-primary/5 to-purple-500/5 border-primary/20">
            <div className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /><h3 className="font-bold">AI Compose</h3></div>
            <Textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="Tell AI what this campaign is about..." rows={3} />
            <Button onClick={generateAI} disabled={aiGenerating} className="bg-gradient-to-r from-primary to-purple-500">
              {aiGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Generate with AI
            </Button>
          </Card>

          <Card className="p-5 space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>From name</Label><Input value={fromName} onChange={e => setFromName(e.target.value)} /></div>
              <div><Label>From email (must be verified in Brevo)</Label><Input value={fromEmail} onChange={e => setFromEmail(e.target.value)} /></div>
            </div>
            <div><Label>Subject</Label><Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="✨ This week at HustleAI..." /></div>
            <div><Label>Preview text (inbox snippet)</Label><Input value={previewText} onChange={e => setPreviewText(e.target.value)} /></div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>HTML body</Label>
                <Button size="sm" variant="ghost" onClick={() => setShowPreview(!showPreview)}><Eye className="w-3 h-3 mr-1" />{showPreview ? "Edit" : "Preview"}</Button>
              </div>
              {showPreview ? (
                <div className="border rounded-lg p-4 bg-white text-black min-h-[300px] prose max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
              ) : (
                <Textarea value={html} onChange={e => setHtml(e.target.value)} rows={14} className="font-mono text-xs" />
              )}
            </div>
            <div className="flex flex-wrap gap-2 items-end pt-2 border-t">
              <div className="flex-1 min-w-[200px]"><Label>Test email</Label><Input value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="you@example.com" /></div>
              <Button variant="outline" onClick={sendTest} disabled={sending}>Send Test</Button>
              <Button onClick={sendNow} disabled={sending} className="bg-gradient-to-r from-emerald-500 to-teal-500">
                {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Send to {activeCount} subscribers
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* SCHEDULE */}
        <TabsContent value="schedule" className="space-y-4 mt-4">
          {schedule && (
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" />Auto AI Weekly Digest</h3>
                  <p className="text-xs text-muted-foreground mt-1">When enabled, AI generates and sends a weekly digest automatically.</p>
                </div>
                <Switch checked={schedule.enabled} onCheckedChange={(v) => setSchedule({ ...schedule, enabled: v })} />
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <Label>Frequency</Label>
                  <select className="w-full h-10 rounded-md border bg-background px-3" value={schedule.frequency} onChange={e => setSchedule({ ...schedule, frequency: e.target.value })}>
                    <option value="weekly">Weekly</option>
                    <option value="daily">Daily</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div><Label>Day of week (0=Sun)</Label><Input type="number" min={0} max={6} value={schedule.send_day || 1} onChange={e => setSchedule({ ...schedule, send_day: +e.target.value })} /></div>
                <div><Label>Hour (UTC 0-23)</Label><Input type="number" min={0} max={23} value={schedule.send_hour} onChange={e => setSchedule({ ...schedule, send_hour: +e.target.value })} /></div>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div><Label>From name</Label><Input value={schedule.from_name || ""} onChange={e => setSchedule({ ...schedule, from_name: e.target.value })} /></div>
                <div><Label>From email</Label><Input value={schedule.from_email || ""} onChange={e => setSchedule({ ...schedule, from_email: e.target.value })} /></div>
              </div>
              <div>
                <Label>AI prompt (what should each digest cover?)</Label>
                <Textarea rows={5} value={schedule.ai_prompt} onChange={e => setSchedule({ ...schedule, ai_prompt: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <Button onClick={saveSchedule}>Save Schedule</Button>
                <Button variant="outline" onClick={async () => {
                  if (!confirm("Trigger digest now?")) return;
                  const { data, error } = await supabase.functions.invoke("brevo-newsletter", { body: { action: "run_scheduled" } });
                  if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
                  else { toast({ title: "Sent ✨", description: `${data.sent} sent` }); load(); }
                }}>Run Now</Button>
              </div>
              <p className="text-xs text-muted-foreground">Last run: {schedule.last_run_at ? new Date(schedule.last_run_at).toLocaleString() : "never"}</p>
            </Card>
          )}
        </TabsContent>

        {/* SUBSCRIBERS */}
        <TabsContent value="subscribers" className="mt-4">
          <Card className="p-5">
            <div className="max-h-[500px] overflow-y-auto space-y-1">
              {subscribers.map(s => (
                <div key={s.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className={`w-4 h-4 ${s.is_active === false ? "text-muted-foreground" : "text-primary"}`} />
                    <span>{s.email}</span>
                    {s.is_active === false && <Badge variant="outline" className="text-xs">unsub</Badge>}
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(s.subscribed_at).toLocaleDateString()}</span>
                </div>
              ))}
              {subscribers.length === 0 && <p className="text-center text-muted-foreground py-8">No subscribers yet.</p>}
            </div>
          </Card>
        </TabsContent>

        {/* HISTORY */}
        <TabsContent value="history" className="mt-4">
          <Card className="p-5">
            <div className="space-y-2">
              {campaigns.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/10">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{c.subject}</span>
                      {c.ai_generated && <Badge className="bg-purple-500/15 text-purple-600 text-xs">AI</Badge>}
                      <Badge variant={c.status === "sent" ? "default" : c.status === "failed" ? "destructive" : "outline"} className="text-xs">{c.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {c.sent_count} sent · {c.failed_count} failed · {c.sent_at ? new Date(c.sent_at).toLocaleString() : new Date(c.created_at).toLocaleString()}
                    </p>
                    {c.error_message && <p className="text-xs text-destructive mt-1 truncate">{c.error_message}</p>}
                  </div>
                </div>
              ))}
              {campaigns.length === 0 && <p className="text-center text-muted-foreground py-8">No campaigns yet.</p>}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}