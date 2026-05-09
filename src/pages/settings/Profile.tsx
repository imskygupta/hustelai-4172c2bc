import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SettingsSection, SettingsField } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Lock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { canPhoneNumber } from "@/lib/tier-gates";
import { Link } from "react-router-dom";

const CATEGORIES = [
  "Designer", "Developer", "Writer", "Marketer", "Video editor",
  "Photographer", "Consultant", "Coach", "Agency owner", "Other",
];

const SOCIAL_KEYS = ["twitter", "linkedin", "github", "instagram", "youtube"] as const;
type SocialKey = typeof SOCIAL_KEYS[number];

export default function ProfileSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tier, setTier] = useState<string>("free");
  const [form, setForm] = useState({
    display_name: "",
    username: "",
    headline: "",
    bio: "",
    company: "",
    website: "",
    timezone: "",
    freelancer_category: "",
    avatar_url: "",
    phone_number: "",
  });
  const [social, setSocial] = useState<Record<SocialKey, string>>({
    twitter: "", linkedin: "", github: "", instagram: "", youtube: "",
  });
  const [portfolio, setPortfolio] = useState<{ label: string; url: string }[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (data) {
        setTier((data as any).subscription_tier || "free");
        setForm({
          display_name: data.display_name ?? "",
          username: data.username ?? "",
          headline: (data as any).headline ?? "",
          bio: data.bio ?? "",
          company: (data as any).company ?? "",
          website: (data as any).website ?? "",
          timezone: (data as any).timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
          freelancer_category: (data as any).freelancer_category ?? "",
          avatar_url: (data as any).avatar_url ?? "",
          phone_number: (data as any).phone_number ?? "",
        });
        const sl = ((data as any).social_links ?? {}) as Record<string, string>;
        setSocial({
          twitter: sl.twitter ?? "",
          linkedin: sl.linkedin ?? "",
          github: sl.github ?? "",
          instagram: sl.instagram ?? "",
          youtube: sl.youtube ?? "",
        });
        const pl = ((data as any).portfolio_links ?? []) as { label: string; url: string }[];
        setPortfolio(Array.isArray(pl) ? pl : []);
      }
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { avatar_url, ...rest } = form;
    const { error } = await supabase.from("profiles").update({
      ...rest,
      social_links: social as any,
      portfolio_links: portfolio as any,
    } as any).eq("user_id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <SettingsSection title="Identity" description="How you appear across HustleAI.">
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-16 w-16">
            <AvatarImage src={form.avatar_url} />
            <AvatarFallback>{(form.display_name || user?.email || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="space-y-1.5 flex-1">
            <SettingsField label="Avatar URL">
              <Input value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} placeholder="https://..." />
            </SettingsField>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SettingsField label="Display name">
            <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
          </SettingsField>
          <SettingsField label="Username" hint="Your @handle on HustleAI.">
            <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase() })} />
          </SettingsField>
          <SettingsField label="Headline" hint="One-liner shown on your public profile.">
            <Input value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} placeholder="Indie designer building AI tools" />
          </SettingsField>
          <SettingsField label="Freelancer category">
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.freelancer_category}
              onChange={(e) => setForm({ ...form, freelancer_category: e.target.value })}
            >
              <option value="">Select…</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </SettingsField>
          <SettingsField label="Company">
            <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          </SettingsField>
          <SettingsField label="Website">
            <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://yourdomain.com" />
          </SettingsField>
          <SettingsField label="Timezone">
            <Input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} placeholder="Asia/Kolkata" />
          </SettingsField>
          <SettingsField
            label="Phone number"
            hint={canPhoneNumber(tier) ? "Used for account recovery and 2FA." : (
              <span className="inline-flex items-center gap-1 text-amber-500"><Lock className="h-3 w-3" /> Available on Pro and above. <Link to="/payment" className="underline">Upgrade</Link></span>
            )}
          >
            <Input
              type="tel"
              value={form.phone_number}
              disabled={!canPhoneNumber(tier)}
              onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
              placeholder={canPhoneNumber(tier) ? "+91 98765 43210" : "Upgrade to add phone"}
            />
          </SettingsField>
        </div>
        <div className="mt-4">
          <SettingsField label="Bio">
            <Textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </SettingsField>
        </div>
      </SettingsSection>

      <SettingsSection title="Social links" description="Optional — appears on your public profile.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SOCIAL_KEYS.map((k) => (
            <SettingsField key={k} label={k.charAt(0).toUpperCase() + k.slice(1)}>
              <Input
                value={social[k]}
                onChange={(e) => setSocial({ ...social, [k]: e.target.value })}
                placeholder={`https://${k}.com/...`}
              />
            </SettingsField>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Portfolio links"
        description="Showcase your best work."
        action={
          <Button size="sm" variant="outline" onClick={() => setPortfolio([...portfolio, { label: "", url: "" }])}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        }
      >
        {portfolio.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No portfolio links yet.</p>
        ) : (
          <div className="space-y-3">
            {portfolio.map((p, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  className="w-1/3"
                  placeholder="Label"
                  value={p.label}
                  onChange={(e) => {
                    const c = [...portfolio]; c[i].label = e.target.value; setPortfolio(c);
                  }}
                />
                <Input
                  className="flex-1"
                  placeholder="https://..."
                  value={p.url}
                  onChange={(e) => {
                    const c = [...portfolio]; c[i].url = e.target.value; setPortfolio(c);
                  }}
                />
                <Button variant="ghost" size="icon" onClick={() => setPortfolio(portfolio.filter((_, j) => j !== i))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </SettingsSection>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save changes
        </Button>
      </div>
    </div>
  );
}