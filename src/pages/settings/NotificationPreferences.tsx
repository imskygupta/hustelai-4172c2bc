import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { isMascotEnabled, setMascotEnabled } from "@/components/MascotCompanion";
import { isDelightMuted, setDelightMuted } from "@/lib/delight-bus";

const FIELDS: { key: string; label: string; desc: string }[] = [
  { key: "email_enabled", label: "Email notifications", desc: "Master switch — turn off all non-critical emails." },
  { key: "invoice_reminders", label: "Invoice reminders", desc: "Issued, due, overdue invoice notifications." },
  { key: "workspace_updates", label: "Workspace updates", desc: "Approvals, agreements, project events." },
  { key: "payment_alerts", label: "Payment alerts", desc: "Subscription, billing and wallet events." },
  { key: "collaboration_alerts", label: "Collaboration", desc: "Client portal activity and invites." },
  { key: "community_notifications", label: "Community", desc: "Forum mentions and community invites." },
  { key: "product_announcements", label: "Product announcements", desc: "Releases and platform updates." },
];

export default function NotificationPreferences() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mascot, setMascot] = useState<boolean>(true);
  const [delight, setDelight] = useState<boolean>(true);

  useEffect(() => {
    setMascot(isMascotEnabled());
    setDelight(!isDelightMuted());
  }, []);

  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("notification_preferences" as any).select("*").eq("user_id", user.id).maybeSingle();
    if (data) setPrefs(data as any);
    else setPrefs(Object.fromEntries(FIELDS.map(f => [f.key, true])));
    setLoading(false);
  })(); }, []);

  const save = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const payload = { user_id: user.id, ...Object.fromEntries(FIELDS.map(f => [f.key, prefs[f.key] ?? true])) };
    const { error } = await supabase.from("notification_preferences" as any).upsert(payload);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Preferences saved");
  };

  return (
    <div className="container max-w-2xl py-10">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Notification preferences</h1>
      <p className="text-sm text-muted-foreground mb-6">Choose which workspace emails you'd like to receive.</p>
      <Card>
        <CardHeader><CardTitle className="text-base">Email channels</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          {loading ? <div className="text-sm text-muted-foreground">Loading…</div> : FIELDS.map(f => (
            <div key={f.key} className="flex items-start justify-between gap-4">
              <div>
                <Label className="text-sm font-medium">{f.label}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
              </div>
              <Switch checked={prefs[f.key] ?? true} onCheckedChange={(v) => setPrefs(p => ({ ...p, [f.key]: v }))} />
            </div>
          ))}
          <div className="pt-2"><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save preferences"}</Button></div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-base">In-app delight</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Label className="text-sm font-medium">Companion mascot 🐱</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Tiny animated cat that greets you and drops the occasional tip.</p>
            </div>
            <Switch checked={mascot} onCheckedChange={(v) => { setMascot(v); setMascotEnabled(v); }} />
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <Label className="text-sm font-medium">Action toasts</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Celebratory popups after generating PDFs and other wins.</p>
            </div>
            <Switch checked={delight} onCheckedChange={(v) => { setDelight(v); setDelightMuted(!v); }} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
