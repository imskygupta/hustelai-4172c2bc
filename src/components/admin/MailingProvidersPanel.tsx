import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Server, Send } from "lucide-react";

export function MailingProvidersPanel() {
  const [cfg, setCfg] = useState<any>(null);
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from("mailing_provider_config" as any).select("*").eq("id", 1).maybeSingle();
    setCfg(data || { id: 1, default_provider: "brevo", fallback_provider: "mailersend", brevo_enabled: true, mailersend_enabled: true, from_email: "noreply@hustlaiapp.in", from_name: "HustleAI", reply_to: "support@hustlaiapp.in" });
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    const { error } = await supabase.from("mailing_provider_config" as any).update(cfg).eq("id", 1);
    if (error) toast.error(error.message); else toast.success("Saved");
  };

  const testProvider = async (provider: "brevo" | "mailersend") => {
    if (!testEmail) { toast.error("Enter test email"); return; }
    setTesting(provider);
    const { data, error } = await supabase.functions.invoke("mailer-send", {
      body: { to: testEmail, template: "welcome", data: { name: "Test" }, provider },
    });
    setTesting(null);
    if (error || (data as any)?.ok === false) toast.error((error as any)?.message || (data as any)?.error || "Failed");
    else toast.success(`${provider} sent ✓`);
  };

  if (!cfg) return <div>Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2"><Server className="w-5 h-5" /> Mailing Providers</h2>
        <p className="text-sm text-muted-foreground">Brevo is the default sender; MailerSend kicks in if Brevo fails.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Routing</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Default provider</Label>
              <Select value={cfg.default_provider} onValueChange={v => setCfg({ ...cfg, default_provider: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="brevo">Brevo</SelectItem>
                  <SelectItem value="mailersend">MailerSend</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Fallback provider</Label>
              <Select value={cfg.fallback_provider || ""} onValueChange={v => setCfg({ ...cfg, fallback_provider: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="brevo">Brevo</SelectItem>
                  <SelectItem value="mailersend">MailerSend</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><Label>From email</Label><Input value={cfg.from_email} onChange={e => setCfg({ ...cfg, from_email: e.target.value })} /></div>
            <div><Label>From name</Label><Input value={cfg.from_name} onChange={e => setCfg({ ...cfg, from_name: e.target.value })} /></div>
            <div><Label>Reply-to</Label><Input value={cfg.reply_to || ""} onChange={e => setCfg({ ...cfg, reply_to: e.target.value })} /></div>
          </div>
          <Button onClick={save}>Save</Button>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {(["brevo", "mailersend"] as const).map(p => (
          <Card key={p}>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="capitalize">{p}</span>
                <Badge variant={cfg.default_provider === p ? "default" : "secondary"}>
                  {cfg.default_provider === p ? "default" : cfg.fallback_provider === p ? "fallback" : "off"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Switch checked={p === "brevo" ? cfg.brevo_enabled : cfg.mailersend_enabled}
                  onCheckedChange={v => setCfg(p === "brevo" ? { ...cfg, brevo_enabled: v } : { ...cfg, mailersend_enabled: v })} />
                <Label>Enabled</Label>
              </div>
              <div className="text-xs text-muted-foreground">
                API key: {p === "brevo" ? "BREVO_API_KEY" : "MAILERSEND_API_KEY"} (configured in Lovable Cloud secrets)
              </div>
              <Button size="sm" variant="outline" onClick={() => testProvider(p)} disabled={testing === p}>
                <Send className="w-4 h-4 mr-1" /> {testing === p ? "Sending…" : "Send test"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Input placeholder="test@email.com" value={testEmail} onChange={e => setTestEmail(e.target.value)} className="max-w-sm" />
        <span className="text-xs text-muted-foreground">Used by "Send test" buttons</span>
      </div>
    </div>
  );
}