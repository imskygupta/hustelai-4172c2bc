import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { isMascotEnabled, setMascotEnabled, getMascotPet, setMascotPet, PETS, PetKey } from "@/components/MascotCompanion";
import { isDelightMuted, setDelightMuted } from "@/lib/delight-bus";
import { useAuth } from "@/hooks/useAuth";
import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
  const { profile } = useAuth();
  const navigate = useNavigate();
  const tier = ((profile?.subscription_tier as string) || "free").toLowerCase();
  const canPickPet = tier !== "free";
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mascot, setMascot] = useState<boolean>(true);
  const [delight, setDelight] = useState<boolean>(true);
  const [pet, setPet] = useState<PetKey>("cat");

  useEffect(() => {
    setMascot(isMascotEnabled());
    setDelight(!isDelightMuted());
    setPet(getMascotPet());
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
              <p className="text-xs text-muted-foreground mt-0.5">Tiny animated pet that greets you, drifts around, and drops tips. Drag it anywhere on screen.</p>
            </div>
            <Switch checked={mascot} onCheckedChange={(v) => { setMascot(v); setMascotEnabled(v); }} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Pick your pet PA</Label>
              {!canPickPet && (
                <button onClick={() => navigate("/payment")} className="text-[11px] inline-flex items-center gap-1 text-fuchsia-600 hover:text-fuchsia-700 font-medium">
                  <Lock className="w-3 h-3" /> Pro+ only — upgrade
                </button>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(PETS) as PetKey[]).map((k) => {
                const meta = PETS[k];
                const active = pet === k;
                const locked = !canPickPet && k !== "cat";
                return (
                  <button
                    key={k}
                    onClick={() => { if (locked) return; setPet(k); setMascotPet(k); }}
                    disabled={locked}
                    className={`relative rounded-xl border p-3 flex flex-col items-center gap-1 transition ${active ? "border-fuchsia-400 ring-2 ring-fuchsia-200" : "border-slate-200 hover:border-slate-300"} ${locked ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${meta.bg} flex items-center justify-center text-xl shadow`}>
                      {meta.emoji}
                    </div>
                    <span className="text-[11px] font-medium text-slate-700">{meta.label}</span>
                    {locked && <Lock className="w-3 h-3 text-slate-400 absolute top-1.5 right-1.5" />}
                  </button>
                );
              })}
            </div>
            {!canPickPet && (
              <p className="text-[11px] text-slate-500 mt-2">Free plan is locked to the Cat. Upgrade to Pro to choose Dog, Fox or Bunny — more mascots rolling out soon.</p>
            )}
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
