import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Mail, Lock } from "lucide-react";

const CATEGORIES = [
  { key: "product_updates", label: "Product updates", desc: "Launches, releases, major changes." },
  { key: "weekly_newsletter", label: "Weekly newsletter", desc: "Sunday digest. Curated for you." },
  { key: "announcements", label: "Announcements", desc: "Occasional important news." },
];

const LIFECYCLE = [
  { label: "Welcome & onboarding", reason: "Sent once on signup." },
  { label: "Security & login alerts", reason: "Required for account safety." },
  { label: "Billing & payments", reason: "Required for legal/tax reasons." },
  { label: "Critical product notices", reason: "Outages, terms changes." },
];

export default function EmailPreferences() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("newsletter_enabled, newsletter_preferences").eq("user_id", user.id).maybeSingle();
      setEnabled(!!(data as any)?.newsletter_enabled);
      setPrefs(((data as any)?.newsletter_preferences as Record<string, boolean>) || {});
      setLoading(false);
    })();
  }, [user]);

  const save = async (next: { enabled?: boolean; prefs?: Record<string, boolean> }) => {
    if (!user) return;
    const newEnabled = next.enabled ?? enabled;
    const newPrefs = next.prefs ?? prefs;
    setEnabled(newEnabled);
    setPrefs(newPrefs);
    const { error } = await supabase.from("profiles").update({
      newsletter_enabled: newEnabled,
      newsletter_preferences: newPrefs,
    } as any).eq("user_id", user.id);
    if (error) toast.error(error.message); else toast.success("Saved");
  };

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2"><Mail className="h-5 w-5" /> Email preferences</h2>
        <p className="text-sm text-muted-foreground mt-1">Choose what you'd like to hear from us about.</p>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Marketing emails</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4 pb-3 border-b">
            <div>
              <Label className="text-sm font-medium">Master switch</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Turn all marketing emails on or off.</p>
            </div>
            <Switch checked={enabled} onCheckedChange={(v) => save({ enabled: v })} />
          </div>
          {CATEGORIES.map(c => (
            <div key={c.key} className="flex items-start justify-between gap-4">
              <div className={enabled ? "" : "opacity-50"}>
                <Label className="text-sm">{c.label}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">{c.desc}</p>
              </div>
              <Switch disabled={!enabled} checked={!!prefs[c.key]} onCheckedChange={(v) => save({ prefs: { ...prefs, [c.key]: v } })} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4" /> Always on</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {LIFECYCLE.map((c, i) => (
            <div key={i} className="flex items-start justify-between gap-4">
              <div>
                <Label className="text-sm">{c.label}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">{c.reason}</p>
              </div>
              <Badge variant="secondary">Required</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}